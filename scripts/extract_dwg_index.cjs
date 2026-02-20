const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '../public/drawings/dwg');
const OUT  = 'E:/DB_data/drawings_index.csv';

const rows = [['series', 'filename', 'extension', 'relative_path']];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else {
      const series = path.basename(path.dirname(fullPath));
      const filename = entry.name;
      const ext = path.extname(filename).slice(1).toUpperCase();
      const relPath = path.relative(BASE, fullPath).split(path.sep).join('/');
      rows.push([series, filename, ext, relPath]);
    }
  }
}

scanDir(BASE);

function escCSV(v) {
  return (v.includes(',') || v.includes('"')) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

const csv = rows.map(r => r.map(escCSV).join(',')).join('\r\n');
fs.writeFileSync(OUT, '\uFEFF' + csv, 'utf8');

console.log('저장 완료:', OUT);
console.log('총 파일 수:', rows.length - 1, '개');

const byS = {};
rows.slice(1).forEach(r => { byS[r[0]] = (byS[r[0]] || 0) + 1; });
console.log('\n시리즈별:');
Object.entries(byS).sort().forEach(([s, n]) => console.log('  ' + s + ': ' + n + '개'));
