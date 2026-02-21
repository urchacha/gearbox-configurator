export interface Motor {
  id: string;
  brand: string;
  series: string;           // 제품군 (예: HG, MINAS A6, SGM7)
  basicType: string;        // 카테고리 (예: HG-KR, HG-MR, SGM7A)
  modelName: string;
  shaftDiameter: number;    // mm
  ratedPower: number;       // kW
  ratedTorque: number;      // Nm
  peakTorque: number;       // Nm
  ratedRPM: number;
  maxRPM: number;
  inertia: number;          // kg·cm² (= kgm² × 10⁻⁴)
  // 추가 스펙 (선택)
  weightKg?: number;
  shaftLength?: number;
  centeringDia?: number;
  centeringHeight?: number;
  fixingPcd?: number;
  fixingHoleSize?: number;
  bodySize?: number;
  adapterCode?: string;
  mountingTap?: string;     // 마운팅 탭 (M3/M4/M5/M6, adapterCode에서 파싱)
}

export interface RatioSpec {
  torque: number;     // N·m
  efficiency: number; // 0~1
  stage: string;      // L1, L2, M, Z
}

export interface ReducerDrawings {
  pdf?: string;       // 2D 도면 PDF 파일명
  cad_step?: string;  // 3D CAD STEP 파일명
  cad_igs?: string;   // 3D CAD IGS 파일명
}

export interface Reducer {
  id: string;
  series: string;
  size: number;                              // 프레임 크기
  modelName: string;                         // e.g. "GPB-42"
  supportedRatios: number[];
  ratioData: Record<number, RatioSpec>;      // 감속비별 토크/효율
  drawings?: ReducerDrawings;                // 도면/CAD 파일 (선택)
  maxInputRPM: number;
  maxOutputTorque: number;                   // 전 감속비 중 최대값
  allowedRadialLoad: number;                 // N
  allowedAxialLoad: number;                  // N
  efficiency: number;                        // 대표 효율 (최고 단)
  weight: number;                            // kg
  noise: number;                             // dB
  rigidity: number;                          // Nm/arcmin
  inertia: number;                           // kgcm²
  shaftHoleDiameter: number;                 // mm (입력축 홀 직경)
}

export interface Bushing {
  id: string;
  code: string;
  shaftMm: number;   // 모터 축경
  holeMm: number;    // 감속기 홀경
  lenMm: number;     // 부싱 길이 mm
}

export interface Adapter {
  reducerModel: string;   // e.g. "GPB042"
  shaft: string;          // e.g. "G08"
  type: string;           // e.g. "SV1", "ST1"
  code: string;           // e.g. "8-30-45-M3"
  shaftDia: number;       // 8
  centeringDia: number;   // 30
  fixingPcd: number;      // 45
  mountingTap: string | null; // "M3" or null (일부 ST 타입)
}

export type Suitability = 'suitable' | 'caution' | 'unsuitable';

export interface SelectionResult {
  motor: Motor;
  reducer: Reducer;
  selectedRatio: number;
  outputRPM: number;
  outputTorque: number;
  serviceFactor: number;
  suitability: Suitability;
  bushing?: Bushing;   // 부싱 필요 시 설정
  adapter?: Adapter;   // 어댑터 형번
}

export interface OperatingConditions {
  hoursPerDay: number;
  loadType: string;
  mountingDirection: string;
}
