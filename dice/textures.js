// Atlas de chiffres (une case = une face) + pastilles chiffres du D7.
// Chiffres uniquement, fond = couleur du dé, encre auto-contrastée.
import { valuesFor, inkFor } from './config.js';

export const CELL = 128;
const atlasCache = new Map();

function labelOf(def, v) {
  return def.pct ? (v === 0 ? '00' : String(v)) : String(v);
}
function gridSize(nCells) {
  const cols = Math.ceil(Math.sqrt(nCells));
  return { cols, rows: Math.ceil(nCells / cols) };
}
// +1 case vide (faces décoratives : pointes, chanfreins).
export function cellCount(def) {
  return valuesFor(def).length + 1;
}
export function atlasFor(def, bg) {
  const key = def.label + '|' + bg;
  if (atlasCache.has(key)) return atlasCache.get(key);
  const values = valuesFor(def);
  const { cols, rows } = gridSize(values.length + 1);
  const cv = document.createElement('canvas');
  cv.width = cols * CELL; cv.height = rows * CELL;
  const g = cv.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, cv.width, cv.height);
  const ink = inkFor(def.color);
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  values.forEach((v, i) => {
    const cx = (i % cols) * CELL, cy = Math.floor(i / cols) * CELL;
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 5;
    g.strokeRect(cx + 4, cy + 4, CELL - 8, CELL - 8);
    const s = labelOf(def, v);
    g.font = '900 ' + Math.round((s.length > 1 ? 74 : 86) * (def.fontScale || 1)) + 'px system-ui, sans-serif';
    g.fillText(s, cx + CELL / 2, cy + CELL / 2 + 4);
    if (!def.pct && (v === 6 || v === 9)) {
      g.fillRect(cx + CELL / 2 - 26, cy + CELL / 2 + 32, 52, 7); // 6/9 soulignés
    }
  });
  const out = { canvas: cv, cols, rows };
  atlasCache.set(key, out);
  return out;
}

