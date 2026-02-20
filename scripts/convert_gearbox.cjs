const fs = require('fs');
const path = require('path');

const csv = fs.readFileSync('D:/DB_data/gplus_gearbox_db_260219.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());
const headers = lines[0].replace(/^\uFEFF/, '').split(',');

const rows = lines.slice(1).map(l => {
  const v = l.split(',');
  return Object.fromEntries(headers.map((h, i) => [h, (v[i] || '').trim()]));
}).filter(r => r.gb_series && r.gb_Code);

// 감속비 파싱: '3K' → 3, '10k' → 10, '10' → 10
function parseRatio(s) {
  return parseFloat(s.replace(/[Kk]$/, ''));
}

// 효율로 단수 추정
function getStage(ef) {
  const e = parseFloat(ef);
  if (e >= 0.96) return 'L1';
  if (e >= 0.93) return 'L2';
  return 'L3';
}

// 베이스 모델명 추출: 'GPB042-3K' → 'GPB042'
function getBaseModel(code) {
  const parts = code.split('-');
  return parts.slice(0, -1).join('-');
}

// 모델별 그룹핑
const modelMap = new Map();

for (const r of rows) {
  const base = getBaseModel(r.gb_Code);
  if (!base) continue;

  if (!modelMap.has(base)) {
    modelMap.set(base, {
      baseModel: base,
      series: r.gb_series,
      size: parseInt(r.gb_size, 10),
      rows: [],
    });
  }
  modelMap.get(base).rows.push(r);
}

// 감속기 JSON 생성
const reducers = [];
let idx = 1;

for (const [, m] of modelMap) {
  const { baseModel, series, size, rows: mRows } = m;

  // 감속비 오름차순 정렬
  mRows.sort((a, b) => parseRatio(a.gb_ratio) - parseRatio(b.gb_ratio));

  const supportedRatios = mRows.map(r => parseRatio(r.gb_ratio));
  const ratioData = {};

  for (const r of mRows) {
    const ratio = parseRatio(r.gb_ratio);
    ratioData[ratio] = {
      torque: parseFloat(r.gb_T2) || 0,
      efficiency: parseFloat(r.gb_ef) || 0,
      stage: getStage(r.gb_ef),
    };
  }

  // 대표값: 첫 번째 행 기준 (동일 모델 내 공통값)
  const ref = mRows[0];
  const maxOutputTorque = Math.max(...mRows.map(r => parseFloat(r.gb_T2) || 0));

  // 대표 효율: 감속비 10의 값, 없으면 첫 번째
  const ratio10Row = mRows.find(r => parseRatio(r.gb_ratio) === 10) || ref;

  reducers.push({
    id: `reducer-${String(idx++).padStart(3, '0')}`,
    series,
    size,
    modelName: baseModel,
    supportedRatios,
    ratioData,
    maxInputRPM: parseInt(ref.gb_ra_speed, 10) || 3000,
    maxOutputTorque,
    allowedRadialLoad: parseFloat(ref.gb_Fr) || 0,
    allowedAxialLoad: parseFloat(ref.gb_Fa) || 0,
    efficiency: parseFloat(ratio10Row.gb_ef) || 0,
    weight: parseFloat(ref.gb_weight) || 0,
    noise: parseFloat(ref.gb_noise) || 0,
    rigidity: parseFloat(ref.gb_rigidity) || 0,
    inertia: parseFloat(ref.gb_J) || 0,
    shaftHoleDiameter: parseFloat(ref.gb_Dhole) || 0,
    drawings: {
      pdf:      `${baseModel}_2D.pdf`,
      cad_step: `${baseModel}_3D.step`,
      cad_igs:  `${baseModel}_3D.igs`,
    },
  });
}

const outPath = path.join(__dirname, '../src/data/reducers.json');
fs.writeFileSync(outPath, JSON.stringify(reducers, null, 2), 'utf8');

console.log(`완료: ${reducers.length}개 모델 → ${outPath}`);

// 시리즈 통계
const seriesCount = {};
reducers.forEach(r => { seriesCount[r.series] = (seriesCount[r.series] || 0) + 1; });
console.log('\n시리즈별 모델 수:');
Object.entries(seriesCount).sort().forEach(([s, c]) => console.log(`  ${s}: ${c}개`));
