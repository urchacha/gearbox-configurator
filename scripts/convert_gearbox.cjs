/**
 * gplus_gearbox_data.csv → src/data/reducers.json 변환 스크립트
 * 사용: node scripts/convert_gearbox.cjs
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../gplus_gearbox_data.csv');
const ADAPTER_PATH = path.join(__dirname, '../src/data/adapter_new_db.json');
const OUT_PATH = path.join(__dirname, '../src/data/reducers.json');

const raw = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());

const headers = lines[0].split(',');
const idx = (name) => headers.indexOf(name);

const COL = {
  id:           idx('gearbox_data_id'),
  type:         idx('gb_type'),
  series:       idx('gb_series'),
  size:         idx('gb_size'),
  ratio:        idx('gb_ratio'),
  stage:        idx('gb_stage'),
  ratedTorque:  idx('gb_rated_torque'),
  inertia:      idx('gb_inertia'),
  inputSpeed:   idx('gb_input_speed'),
  maxSpeed:     idx('gb_max_speed'),
  rigidity:     idx('gb_rigidity'),
  radialForce:  idx('gb_radial_force'),
  axialForce:   idx('gb_axial_force'),
  efficiency:   idx('gb_efficiency'),
  weight:       idx('gb_weight'),
  noise:        idx('gb_noise'),
  tiltingMoment:idx('gb_tilting_moment'),
};

const missing = Object.entries(COL).filter(([, v]) => v === -1).map(([k]) => k);
if (missing.length) { console.error('누락된 열:', missing); process.exit(1); }

// adapter_new_db에서 모델별 최대 shaftDia 추출
const adapterDb = JSON.parse(fs.readFileSync(ADAPTER_PATH, 'utf-8'));
function getShaftHoleDiameter(modelName) {
  const shafts = adapterDb[modelName];
  if (!shafts) return 0; // 어댑터 데이터 없음(할로우 로터리 등) → 0 = 직결 비교 생략
  const nums = Object.keys(shafts)
    .map((k) => parseFloat(k.replace(/^G0?/, '')))
    .filter((n) => !isNaN(n));
  return nums.length ? Math.max(...nums) : 0;
}

const toNum = (v) => {
  if (!v || v === 'NULL') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

// 감속비 파싱: '3K' → 3, '10k' → 10
const parseRatio = (s) => parseFloat(s.replace(/[Kk]$/, ''));

// 효율로 단수 추정 (gb_stage가 없을 경우 폴백)
const inferStage = (eff) => {
  const e = parseFloat(eff);
  if (e >= 0.96) return 'L1';
  if (e >= 0.93) return 'L2';
  return 'L3';
};

// (series, size) 기준으로 그룹화
const groupMap = new Map(); // key: "GPB|42"

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (!cols[COL.id] || !cols[COL.id].startsWith('G')) continue;

  const series = cols[COL.series]?.trim();
  const size = cols[COL.size]?.trim();
  if (!series || !size) continue;

  const key = `${series}|${size}`;
  const ratio = parseRatio(cols[COL.ratio]);
  if (isNaN(ratio)) continue;

  const torque = toNum(cols[COL.ratedTorque]);
  const eff = toNum(cols[COL.efficiency]);
  const stage = cols[COL.stage]?.trim() || inferStage(cols[COL.efficiency]);

  if (!groupMap.has(key)) {
    // 첫 행으로 공통 필드 초기화
    const sizeNum = parseInt(size);
    const modelName = `${series}${String(sizeNum).padStart(3, '0')}`;
    groupMap.set(key, {
      id: `reducer-${series}-${size}`,
      type: cols[COL.type]?.trim(),
      series,
      size: sizeNum,
      modelName,
      shaftHoleDiameter: getShaftHoleDiameter(modelName),
      maxInputRPM: toNum(cols[COL.inputSpeed]),
      allowedRadialLoad: toNum(cols[COL.radialForce]),
      allowedAxialLoad: toNum(cols[COL.axialForce]),
      efficiency: eff,
      weight: toNum(cols[COL.weight]),
      noise: toNum(cols[COL.noise]),
      rigidity: toNum(cols[COL.rigidity]),
      inertia: toNum(cols[COL.inertia]),
      tiltingMoment: toNum(cols[COL.tiltingMoment]),
      supportedRatios: [],
      ratioData: {},
      maxOutputTorque: 0,
    });
  }

  const entry = groupMap.get(key);
  if (!entry.supportedRatios.includes(ratio)) {
    entry.supportedRatios.push(ratio);
  }
  entry.ratioData[ratio] = {
    torque: torque ?? 0,
    efficiency: eff ?? 0.95,
    stage,
  };
  if ((torque ?? 0) > entry.maxOutputTorque) entry.maxOutputTorque = torque;
}

// 감속비 정렬, null 필드 제거
const reducers = [...groupMap.values()].map((r) => {
  r.supportedRatios.sort((a, b) => a - b);
  // null 필드 제거
  Object.keys(r).forEach((k) => { if (r[k] === null) delete r[k]; });
  return r;
});

fs.writeFileSync(OUT_PATH, JSON.stringify(reducers, null, 2), 'utf-8');
console.log(`변환 완료: ${reducers.length}개 모델 → ${OUT_PATH}`);

// 통계
const types = [...new Set(reducers.map((r) => r.type))].sort();
const series = [...new Set(reducers.map((r) => r.series))].sort();
console.log(`타입(${types.length}): ${types.join(', ')}`);
console.log(`시리즈(${series.length}): ${series.join(', ')}`);
