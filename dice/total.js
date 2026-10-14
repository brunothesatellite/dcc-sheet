// Total d'un lancer : D% compte en dizaines, D10 associé en lecture percentile
// (10 -> 0), et chaque paire (D% à 00, D10 à 10) vaut 100. Pur, testable.
export function countTotal(items) {
  const hasPct = items.some((d) => d.pct);
  let s = 0;
  for (const d of items) {
    const v = d.value == null ? 0 : d.value;
    if (d.pct) s += v;
    else if (hasPct && d.sides === 10) s += v % 10;
    else s += v;
  }
  if (hasPct) {
    const z = items.filter((d) => d.pct && d.value === 0).length;
    const u = items.filter((d) => !d.pct && d.sides === 10 && d.value === 10).length;
    s += Math.min(z, u) * 100;
  }
  return s;
}
