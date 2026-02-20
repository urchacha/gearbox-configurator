const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '../public/drawings');
const OUT  = path.resolve(__dirname, '../src/data/drawingsIndex.json');

// key: "series|size|stage|shaftDiameter|mountingTap"  →  { pdf: [filenames], step: [filenames] }
const index = {};

function parseFilename(filename) {
  // e.g. GPB042-L1-(8-30-45-M3).PDF
  // series+size, stage, shaftDiameter, mountingTap(마지막 M숫자) 추출
  const m = filename.match(/^([A-Z]+)(\d+)-([^-]+)-\(([0-9.]+)-.*-(M\d+)\)\./i);
  if (!m) return null;
  return {
    series:     m[1].toUpperCase(),
    size:       m[2],
    stage:      m[3].toUpperCase(),
    shaft:      parseFloat(m[4]),
    mountingTap: m[5].toUpperCase(),   // M3, M4, M5, M6, M8, M12 ...
  };
}

function scanDir(dir, type, folder) {
  if (!fs.existsSync(dir)) return;
  const seriesDirs = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const sd of seriesDirs) {
    const seriesDir = path.join(dir, sd.name);
    const files = fs.readdirSync(seriesDir);
    for (const file of files) {
      const info = parseFilename(file);
      if (!info) continue;
      const key = `${info.series}|${info.size}|${info.stage}|${info.shaft}|${info.mountingTap}`;
      if (!index[key]) index[key] = { pdf: [], step: [] };
      const relPath = `${folder}/${sd.name}/${file}`;
      index[key][type].push(relPath);
    }
  }
}

scanDir(path.join(BASE, 'pdf'), 'pdf', 'pdf');
scanDir(path.join(BASE, 'dwg'), 'step', 'dwg');

fs.writeFileSync(OUT, JSON.stringify(index, null, 2), 'utf8');
console.log(`Generated ${Object.keys(index).length} entries → ${OUT}`);
