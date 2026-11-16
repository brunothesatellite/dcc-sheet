// Atlas de chiffres (une case = une face) + pastilles chiffres du D7.
// Chiffres uniquement, fond = couleur du dé, encre auto-contrastée.
import { valuesFor, inkFor } from './config.js';

export const CELL = 256;
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
    const s = labelOf(def, v);
    g.font = '900 ' + Math.round((s.length > 1 ? CELL * 0.58 : CELL * 0.67) * (def.fontScale || 1)) + 'px system-ui, sans-serif';
    // D3 et les côtés du D5 sont des faces longues et étroites : le chiffre
    // est tourné de 90° dans sa case pour que sa hauteur suive le grand axe
    // (sinon la case n'échantillonne qu'une bande du glyphe).
    const rot = def.kind === 'd3' || (def.kind === 'd5' && v >= 3);
    if (rot) {
      g.save();
      g.translate(cx + CELL / 2, cy + CELL / 2);
      g.rotate(Math.PI / 2);
      g.fillText(s, 0, 0);
      g.restore();
    } else {
      g.fillText(s, cx + CELL / 2, cy + CELL / 2 + CELL * 0.03);
    }
    if (!def.pct && (v === 6 || v === 9)) {
      g.fillRect(cx + CELL / 2 - CELL * 0.2, cy + CELL / 2 + CELL * 0.25, CELL * 0.4, CELL * 0.055); // 6/9 soulignés
    }
  });
  const out = { canvas: cv, cols, rows };
  atlasCache.set(key, out);
  return out;
}

