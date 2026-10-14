// Définitions des dés + utils couleur (pur, sans dépendance).
// fontScale = taille du chiffre dans sa case (débordement de face) ;
// size = multiplicateur de gabarit (lisibilité des petites faces).
export const DICE = [
  { sides: 3,  label: 'D3',  color: '#d94848', kind: 'd3' },
  { sides: 4,  label: 'D4',  color: '#ef7d23', kind: 'd4', fontScale: 0.78 },
  { sides: 5,  label: 'D5',  color: '#d9a416', kind: 'd5' },
  { sides: 6,  label: 'D6',  color: '#12a0a8', kind: 'd6' },
  { sides: 7,  label: 'D7',  color: '#2f6fed', kind: 'd7' },
  { sides: 8,  label: 'D8',  color: '#6a4de0', kind: 'd8', fontScale: 0.78 },
  { sides: 10, label: 'D10', color: '#c93b8f', kind: 'd10', fontScale: 0.74 },
  { sides: 10, label: 'D%',  color: '#f272a8', kind: 'd10', pct: true, fontScale: 0.6 },
  { sides: 12, label: 'D12', color: '#9a6a2f', kind: 'd12' },
  // D14/D16 en forme "type d20". Pour reprendre l'ancienne forme + rendu étiré :
  // stretchUV: true ici + d14Legacy()/d16Legacy()/d16J17() dans solids.js.
  { sides: 14, label: 'D14', color: '#7ba428', kind: 'd14', fontScale: 0.8, size: 1.15 },
  { sides: 16, label: 'D16', color: '#64748b', kind: 'd16', fontScale: 0.7, size: 1.15 },
  { sides: 20, label: 'D20', color: '#23262b', kind: 'd20', fontScale: 0.68, size: 1.2 },
  { sides: 24, label: 'D24', color: '#9aa7b5', kind: 'd24', fontScale: 0.72 },
  { sides: 30, label: 'D30', color: '#f2ead8', kind: 'd30', fontScale: 0.72, size: 1.15 },
];

// Écarts de luminosité forcés entre exemplaires d'un même type.
export const OFFS_DARK = [0, 34, -17, 17, -34];
export const OFFS_LIGHT = [0, -34, 17, -17, 34];

export const LONGPRESS_MS = 500;
export const TAP_SLOP = 10;
export const FLING_PX = 260;
export const TRAY_MAX = 14;
export const TOTAL_MS = 8000;

export function hx(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r, g, b) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
export function mix(a, b, t) {
  const A = hx(a), B = hx(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function shade(hex, dl) {
  return dl >= 0 ? mix(hex, '#ffffff', dl / 100) : mix(hex, '#000000', -dl / 100);
}
export function luminance(hex) {
  const c = hx(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function inkFor(hex) {
  return luminance(hex) > 0.45 ? '#1d2126' : '#ffffff';
}
export function pickShade(base, k) {
  const offs = luminance(base) > 0.45 ? OFFS_LIGHT : OFFS_DARK;
  return shade(base, offs[k % offs.length]);
}
// Valeurs affichables d'un type : D% = dizaines, sinon 1..N.
export function valuesFor(def) {
  if (def.pct) return Array.from({ length: 10 }, (_, i) => i * 10);
  return Array.from({ length: def.sides }, (_, i) => i + 1);
}
export function formatValue(def, v) {
  if (def.pct) return v === 0 ? '00' : String(v);
  return String(v);
}
