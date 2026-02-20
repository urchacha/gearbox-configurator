import type { Adapter, Bushing, Motor, Reducer, Suitability } from '../types';
import bushingsData from '../data/bushings.json';
import adapterDbRaw from '../data/adapter_new_db.json';

const adapterDb = adapterDbRaw as Record<string, Record<string, Record<string, string>>>;

const bushings: Bushing[] = bushingsData as Bushing[];

/** 축경 숫자 → "G08", "G14", "G6.35" 형식의 shaft 키 변환 */
function toShaftKey(dia: number): string {
  if (!Number.isInteger(dia)) return `G${dia}`;
  return dia < 10 ? `G0${dia}` : `G${dia}`;
}

/** 어댑터 형번 파싱: "8-30-45-M3" → { shaftDia, centeringDia, fixingPcd, mountingTap } */
function parseAdapterCode(code: string): Pick<Adapter, 'shaftDia' | 'centeringDia' | 'fixingPcd' | 'mountingTap'> {
  const parts = code.split('-');
  const lastPart = parts[parts.length - 1];
  const mountingTap = lastPart.startsWith('M') ? lastPart : null;
  return {
    shaftDia: parseFloat(parts[0]),
    centeringDia: parseFloat(parts[1]),
    fixingPcd: parseFloat(parts[2]),
    mountingTap,
  };
}

/**
 * 감속기 모델명 + 모터 스펙으로 어댑터 형번 조회
 * - 모터에 centeringDia/fixingPcd/mountingTap 있으면 정확 매칭
 * - 없으면 같은 shaft 크기의 첫 번째 SV 어댑터 반환
 */
export function findAdapter(reducerModel: string, motor: Motor): Adapter | null {
  const shaftKey = toShaftKey(motor.shaftDiameter);
  const entries = adapterDb[reducerModel]?.[shaftKey];
  if (!entries) return null;

  // 정확 매칭 시도 (모터에 플랜지 스펙이 있을 때)
  if (motor.centeringDia != null && motor.fixingPcd != null && motor.mountingTap) {
    const targetCode = `${motor.shaftDiameter}-${motor.centeringDia}-${motor.fixingPcd}-${motor.mountingTap}`;
    for (const [type, code] of Object.entries(entries)) {
      if (code === targetCode) {
        return { reducerModel, shaft: shaftKey, type, code, ...parseAdapterCode(code) };
      }
    }
  }

  // 폴백: SV 타입 우선, 없으면 첫 번째 항목
  const svEntry = Object.entries(entries).find(([t]) => t.startsWith('SV'));
  const fallback = svEntry ?? Object.entries(entries)[0];
  if (fallback) {
    const [type, code] = fallback;
    return { reducerModel, shaft: shaftKey, type, code, ...parseAdapterCode(code) };
  }

  return null;
}

/** 모터 축경 + 감속기 홀경으로 부싱 조회. 없으면 null */
export function findBushing(shaftMm: number, holeMm: number): Bushing | null {
  if (shaftMm === holeMm) return null;
  return bushings.find(b => b.shaftMm === shaftMm && b.holeMm === holeMm) ?? null;
}

/** 모터 축경이 감속기 홀경과 직결 or 부싱으로 호환되는지 확인 */
export function isShaftCompatible(shaftMm: number, holeMm: number): boolean {
  if (shaftMm === holeMm) return true;
  if (shaftMm > holeMm) return false;  // 축이 크면 불가
  return findBushing(shaftMm, holeMm) !== null;
}

/** 출력 RPM: 모터 RPM / 감속비 (감속비 0 방어) */
export function calcOutputRPM(motorRPM: number, ratio: number): number {
  if (!ratio || ratio <= 0) return 0;
  return (motorRPM ?? 0) / ratio;
}

/** 출력 토크: 모터 토크 × 감속비 × 효율 */
export function calcOutputTorque(
  motorTorque: number,
  ratio: number,
  efficiency: number,
): number {
  if (!ratio || ratio <= 0) return 0;
  const eff = (efficiency > 0 && efficiency <= 1) ? efficiency : 1;
  return (motorTorque ?? 0) * ratio * eff;
}

/** 감속기의 특정 감속비 효율 반환 (0~1 범위 보정) */
export function getEfficiency(reducer: Reducer, ratio: number): number {
  const eff = reducer.ratioData[ratio]?.efficiency ?? reducer.efficiency ?? 0;
  return (eff > 0 && eff <= 1) ? eff : 1;
}

/** 감속기의 특정 감속비 최대 토크 반환 */
export function getRatedTorque(reducer: Reducer, ratio: number): number {
  return reducer.ratioData[ratio]?.torque ?? reducer.maxOutputTorque ?? 0;
}

/** 서비스 팩터: 감속기 정격 토크 / 출력 토크 (출력 토크 0 방어) */
export function calcServiceFactor(
  appliedTorque: number,
  reducerMaxTorque: number,
): number {
  if (!appliedTorque || appliedTorque <= 0) return 0;
  if (!reducerMaxTorque || reducerMaxTorque <= 0) return 0;
  return reducerMaxTorque / appliedTorque;
}

/** 부하 특성별 서비스 팩터 요구 배수 */
export const LOAD_FACTORS: Record<string, number> = {
  '균일 부하': 1.25,
  '중충격':   1.5,
  '강충격':   2.0,
};

/**
 * 적합성 판정 (부하계수 반영)
 * suitable:   SF >= 1.2 × loadFactor
 * caution:    1.0 × loadFactor <= SF < 1.2 × loadFactor
 * unsuitable: SF < 1.0 × loadFactor 또는 SF = 0
 */
export function getSuitability(serviceFactor: number, loadFactor = 1.0): Suitability {
  if (serviceFactor >= 1.2 * loadFactor) return 'suitable';
  if (serviceFactor >= 1.0 * loadFactor) return 'caution';
  return 'unsuitable';
}
