const fs = require('fs');
const path = require('path');

const csv = fs.readFileSync('D:/DB_data/bushing_data.csv', 'utf8');
const lines = csv.split(/\r?\n/).filter(l => l.trim());
const headers = lines[0].replace(/^\uFEFF/, '').trim().split(',').map(h => h.trim());

const rows = lines.slice(1).map(l => {
  const v = l.split(',').map(x => x.trim());
  return Object.fromEntries(headers.map((h, i) => [h, v[i] ?? '']));
}).filter(r => r.bushing_code);

const bushings = rows.map(r => ({
  id: r.busing_id,
  code: r.bushing_code,
  shaftMm: parseInt(r.shaft_mm, 10),
  holeMm: parseInt(r.hole_mm, 10),
  lenMm: parseInt(r.len_mm, 10) || 0,
}));

const outPath = path.join(__dirname, '../src/data/bushings.json');
fs.writeFileSync(outPath, JSON.stringify(bushings, null, 2), 'utf8');

console.log(`완료: ${bushings.length}개 부싱 → ${outPath}`);
bushings.forEach(b => console.log(`  ${b.code}  shaft=${b.shaftMm}mm → hole=${b.holeMm}mm  len=${b.lenMm}mm`));
