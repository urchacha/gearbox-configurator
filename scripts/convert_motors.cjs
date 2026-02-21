/**
 * motor_db.csv → src/data/motors.json 변환 스크립트
 * 사용: node scripts/convert_motors.cjs
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = 'E:/DB_data/motor_db.csv';
const OUT_PATH = path.join(__dirname, '../src/data/motors.json');

const raw = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, ''); // BOM 제거
const lines = raw.split(/\r?\n/).filter((l) => l.trim());

// 헤더 파싱
const headers = lines[0].split(',');
const idx = (name) => headers.indexOf(name);

const COL = {
  id:          idx('id'),
  motorType:   idx('motor_type'),
  brand:       idx('Manufacturer'),
  series:      idx('series'),
  basicType:   idx('basic_type'),
  modelName:   idx('special_type'),
  powerW:      idx('power_P_W'),
  ratedTorque: idx('nominal_output_torque_Tn_Nm'),
  peakTorque:  idx('torque_peak_Tmax_Nm'),
  ratedRPM:    idx('nominal_speed_n_rpm'),
  maxRPM:      idx('max_speed_nmax_rpm'),
  inertia:     idx('inertia_J_kgcm2_e4'),
  weightKg:    idx('mass_m_kg2'),
  shaftDia:    idx('shaft_diameter_D60'),
  shaftLen:    idx('shaft_length_L60'),
  centerDia:   idx('centering_diameter_D61'),
  fixingPcd:   idx('pitch_circle_diameter'),
  fixingHole:  idx('fixing_hole_size'),
  centerDepth: idx('centering_depth_L612'),
  bodySize:    idx('body_size'),
  adapterCode: idx('adapter_code'),
};

// 열 인덱스 검증
const missing = Object.entries(COL).filter(([, v]) => v === -1).map(([k]) => k);
if (missing.length) {
  console.error('누락된 열:', missing);
  process.exit(1);
}

const toNum = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const motors = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (!cols[COL.id] || !cols[COL.id].startsWith('M')) continue;

  const powerW = toNum(cols[COL.powerW]);

  // adapterCode: "(8-30-46-M4)" → mountingTap: "M4"
  const adapterCodeRaw = cols[COL.adapterCode]?.trim().replace(/[()]/g, '') || null;
  const mountingTap = adapterCodeRaw
    ? (adapterCodeRaw.split('-').pop()?.startsWith('M') ? adapterCodeRaw.split('-').pop() : null) ?? null
    : null;

  const motor = {
    id:           cols[COL.id].trim(),
    brand:        cols[COL.brand].trim(),
    series:       cols[COL.series].trim(),
    basicType:    cols[COL.basicType].trim(),
    modelName:    cols[COL.modelName].trim(),
    ratedPower:   powerW != null ? Math.round(powerW / 10) / 100 : null, // W → kW
    ratedTorque:  toNum(cols[COL.ratedTorque]),
    peakTorque:   toNum(cols[COL.peakTorque]),
    ratedRPM:     toNum(cols[COL.ratedRPM]),
    maxRPM:       toNum(cols[COL.maxRPM]),
    inertia:      toNum(cols[COL.inertia]),      // kg·cm² (= kgm² × 10⁻⁴)
    weightKg:     toNum(cols[COL.weightKg]),
    shaftDiameter:toNum(cols[COL.shaftDia]),
    shaftLength:  toNum(cols[COL.shaftLen]),
    centeringDia: toNum(cols[COL.centerDia]),
    fixingPcd:    toNum(cols[COL.fixingPcd]),
    fixingHoleSize: toNum(cols[COL.fixingHole]),
    centeringHeight: toNum(cols[COL.centerDepth]),
    bodySize:     toNum(cols[COL.bodySize]),
    adapterCode:  adapterCodeRaw,
    mountingTap:  mountingTap,
  };

  // null 필드 제거
  Object.keys(motor).forEach((k) => { if (motor[k] === null) delete motor[k]; });

  motors.push(motor);
}

fs.writeFileSync(OUT_PATH, JSON.stringify(motors, null, 2), 'utf-8');
console.log(`변환 완료: ${motors.length}개 → ${OUT_PATH}`);

// 통계 출력
const brands = [...new Set(motors.map((m) => m.brand))].sort();
console.log(`브랜드(${brands.length}): ${brands.join(', ')}`);
const basicTypes = [...new Set(motors.map((m) => m.basicType))].sort();
console.log(`카테고리(${basicTypes.length}): ${basicTypes.join(', ')}`);
