// Tirage équitable : crypto.getRandomValues + rejection sampling (pas de biais modulo).
function bytes(n) {
  const g = globalThis.crypto;
  if (g && g.getRandomValues) {
    const a = new Uint32Array(n);
    g.getRandomValues(a);
    return a;
  }
  const a = new Uint32Array(n); // repli hors navigateur moderne
  for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 0x100000000);
  return a;
}
// Entier uniforme dans [0, n).
export function randInt(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error('randInt: n invalide');
  const RANGE = 0x100000000;
  const limit = RANGE - (RANGE % n);
  for (;;) {
    const v = bytes(1)[0];
    if (v < limit) return v % n;
  }
}
// Résultat d'un dé : D% = dizaines 00-90, sinon 1..sides.
export function rollDie(def) {
  if (def.pct) return randInt(10) * 10;
  return randInt(def.sides) + 1;
}
