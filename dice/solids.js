// Géométrie procédurale des dés : une face de résultat = une face du solide.
// Maths adaptées de https://github.com/SONDLecT/dicebox (MIT, cf. NOTICE.md) :
// bipyramides, trapézoèdres, prisme biseauté (d5), sphère clipée (d7),
// icositétraèdre deltoïdal (d24), triacontaèdre rhombique (d30).
// Pur (aucune dépendance), testable en Node. Sortie : { verts, faces, landing, ... }
// où landing[i] = indice de la face du i-ème résultat (valeur i+1, ou dizaines pour D%).

const TAU = Math.PI * 2;
const norm = (v) => {
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function tetra() {
  const v = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(norm);
  return { verts: v, faces: [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]] };
}
function cube() {
  const v = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push(norm([x, y, z]));
  return { verts: v, faces: [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]] };
}
function octa() {
  const v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  return { verts: v, faces: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]] };
}
function sortRing(idx, verts, n) {
  const c = idx.reduce((a, i) => [a[0] + verts[i][0], a[1] + verts[i][1], a[2] + verts[i][2]], [0, 0, 0])
    .map((x) => x / idx.length);
  const u = norm(sub(verts[idx[0]], c));
  const w = cross(n, u);
  return idx.slice().sort((a, b) => {
    const va = sub(verts[a], c), vb = sub(verts[b], c);
    return Math.atan2(dot(va, w), dot(va, u)) - Math.atan2(dot(vb, w), dot(vb, u));
  });
}
// Faces retrouvées depuis un nuage de sommets (exact pour ces solides).
function hullFaces(verts, size) {
  const faces = [], seen = new Set();
  for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) for (let k = j + 1; k < verts.length; k++) {
    let n = norm(cross(sub(verts[j], verts[i]), sub(verts[k], verts[i])));
    if (!Number.isFinite(n[0])) continue;
    let d = dot(n, verts[i]);
    if (d < 0) { n = n.map((x) => -x); d = -d; }
    if (d < 1e-9) continue;
    const on = [];
    let bounding = true;
    for (let m = 0; m < verts.length; m++) {
      const side = dot(n, verts[m]) - d;
      if (Math.abs(side) < 1e-6) on.push(m);
      else if (side > 1e-6) bounding = false;
    }
    if (!bounding || on.length !== size) continue;
    const key = on.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    faces.push(sortRing(on, verts, n));
  }
  return faces;
}
function dodeca() {
  const p = (1 + Math.sqrt(5)) / 2, q = 1 / p, v = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push(norm([x, y, z]));
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    v.push(norm([0, s * q, t * p])); v.push(norm([s * q, t * p, 0])); v.push(norm([s * p, 0, t * q]));
  }
  return { verts: v, faces: hullFaces(v, 5) };
}
function icosa() {
  const p = (1 + Math.sqrt(5)) / 2, v = [];
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    v.push(norm([0, s, t * p])); v.push(norm([s, t * p, 0])); v.push(norm([s * p, 0, t]));
  }
  return { verts: v, faces: hullFaces(v, 3) };
}
// Bipyramide : 2n faces triangulaires.
function bipyramid(n, height = 1.15) {
  const verts = [[0, height, 0], [0, -height, 0]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    verts.push([Math.cos(a), 0, Math.sin(a)]);
  }
  const ring = (i) => 2 + (i % n);
  const faces = [];
  for (let i = 0; i < n; i++) {
    faces.push([0, ring(i), ring(i + 1)]);
    faces.push([1, ring(i + 1), ring(i)]);
  }
  return { verts, faces };
}
// Trapézoèdre : 2n faces kite, hauteur d'apex exacte pour des faces planes.
function trapezohedron(n, flatten = null) {
  const h = 1;
  const H = 2 / (1 - Math.cos(Math.PI / n)) - 1;
  const squash = (1 / H) * (flatten !== null ? flatten : (n > 6 ? 1.35 : 1.0));
  const verts = [[0, H * squash, 0], [0, -H * squash, 0]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    verts.push([Math.cos(a), h * squash, Math.sin(a)]);
  }
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * TAU;
    verts.push([Math.cos(a), -h * squash, Math.sin(a)]);
  }
  const top = (i) => 2 + (i % n);
  const bot = (i) => 2 + n + (i % n);
  const faces = [];
  for (let i = 0; i < n; i++) {
    faces.push([0, top(i), bot(i), top(i + 1)]);
    faces.push([1, bot(i + n - 1), top(i), bot(i)]);
  }
  return { verts, faces };
}
// Prisme régulier (corps du d5).
function regularPrism(n, half = 0.72) {
  const verts = [];
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n;
    verts.push([Math.cos(a), Math.sin(a), half]);
  }
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n;
    verts.push([Math.cos(a), Math.sin(a), -half]);
  }
  const faces = [
    Array.from({ length: n }, (_, i) => n - 1 - i),
    Array.from({ length: n }, (_, i) => n + i),
  ];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + j, n + i]);
  }
  return { verts, faces };
}
// Chanfrein : une face d'atterrissage par face source, le reste est décoratif.
function bevelSolid(solid, amount = 0.19) {
  const verts = [], inset = solid.faces.map(() => []);
  solid.faces.forEach((face, fi) => {
    const center = face.reduce((s, vi) => [s[0] + solid.verts[vi][0], s[1] + solid.verts[vi][1], s[2] + solid.verts[vi][2]], [0, 0, 0])
      .map((x) => x / face.length);
    face.forEach((vi) => {
      const v = solid.verts[vi];
      inset[fi].push(verts.push([
        v[0] * (1 - amount) + center[0] * amount,
        v[1] * (1 - amount) + center[1] * amount,
        v[2] * (1 - amount) + center[2] * amount,
      ]) - 1);
    });
  });
  const faces = inset.map((f) => [...f]);
  const edgeUses = new Map();
  solid.faces.forEach((face, fi) => face.forEach((vi, ci) => {
    const vj = face[(ci + 1) % face.length];
    const key = vi < vj ? `${vi}:${vj}` : `${vj}:${vi}`;
    if (!edgeUses.has(key)) edgeUses.set(key, []);
    edgeUses.get(key).push({ vi, vj, fi, ci });
  }));
  for (const uses of edgeUses.values()) {
    if (uses.length !== 2) continue;
    const [a, b] = uses;
    const a0 = inset[a.fi][a.ci], a1 = inset[a.fi][(a.ci + 1) % inset[a.fi].length];
    const b0 = inset[b.fi][b.ci], b1 = inset[b.fi][(b.ci + 1) % inset[b.fi].length];
    faces.push(a.vi === b.vi ? [a0, a1, b1, b0] : [a0, a1, b0, b1]);
  }
  const corners = solid.verts.map(() => []);
  solid.faces.forEach((face, fi) => face.forEach((vi, ci) => corners[vi].push(inset[fi][ci])));
  corners.forEach((ids, vi) => {
    if (ids.length < 3) return;
    const axis = norm(solid.verts[vi]);
    const u = norm(sub(verts[ids[0]], solid.verts[vi]));
    const w = cross(axis, u);
    faces.push(ids.slice().sort((a, b) => {
      const va = sub(verts[a], solid.verts[vi]), vb = sub(verts[b], solid.verts[vi]);
      return Math.atan2(dot(va, w), dot(va, u)) - Math.atan2(dot(vb, w), dot(vb, u));
    }));
  });
  return {
    verts, faces,
    landingFaces: Array.from({ length: solid.faces.length }, (_, i) => i),
    faceKinds: faces.map((_, i) => (i < solid.faces.length ? 'landing' : 'bevel')),
  };
}
// Tonneau prismatique : n faces rectangulaires numérotées, pointes décoratives.
function prismBarrel(n) {
  const verts = [];
  const half = 0.62;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    verts.push([Math.cos(a), half, Math.sin(a)]);
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    verts.push([Math.cos(a), -half, Math.sin(a)]);
  }
  const apexTop = verts.push([0, half + 0.55, 0]) - 1;
  const apexBot = verts.push([0, -half - 0.55, 0]) - 1;
  const faces = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + j, n + i]);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([apexTop, j, i]);
    faces.push([apexBot, n + i, n + j]);
  }
  return { verts, faces, landingFaces: Array.from({ length: n }, (_, i) => i) };
}
// --- Duale polaire (d24, d30) ---
function orderedHullPoints(points) {
  let i0 = 0, i1 = 1, i2 = 2, i3 = 3;
  for (let i = 1; i < points.length; i++) if (points[i][0] < points[i0][0]) i0 = i;
  let best = -1;
  for (let i = 0; i < points.length; i++) {
    const d = Math.hypot(...sub(points[i], points[i0]));
    if (i !== i0 && d > best) { best = d; i1 = i; }
  }
  best = -1;
  const line = sub(points[i1], points[i0]);
  for (let i = 0; i < points.length; i++) {
    const area = Math.hypot(...cross(line, sub(points[i], points[i0])));
    if (i !== i0 && i !== i1 && area > best) { best = area; i2 = i; }
  }
  best = -1;
  const plane = norm(cross(sub(points[i1], points[i0]), sub(points[i2], points[i0])));
  for (let i = 0; i < points.length; i++) {
    const distance = Math.abs(dot(plane, sub(points[i], points[i0])));
    if (![i0, i1, i2].includes(i) && distance > best) { best = distance; i3 = i; }
  }
  const seeds = [i0, i1, i2, i3];
  return [...seeds.map((i) => points[i]), ...points.filter((_, i) => !seeds.includes(i))];
}
function polarDual(rawPoints) {
  const points = orderedHullPoints(rawPoints.map(norm));
  const hull = [];
  const addFace = (a, b, c) => {
    const n = norm(cross(sub(points[b], points[a]), sub(points[c], points[a])));
    hull.push({ v: [a, b, c], n, d: dot(n, points[a]) });
  };
  addFace(0, 1, 2); addFace(0, 2, 1);
  for (let p = 3; p < points.length; p++) {
    const visible = hull.map((face) => dot(face.n, points[p]) > face.d + 1e-7);
    if (!visible.some(Boolean)) continue;
    const horizon = new Map();
    hull.forEach((face, fi) => {
      if (!visible[fi]) return;
      for (let i = 0; i < 3; i++) {
        const a = face.v[i], b = face.v[(i + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (horizon.has(key)) horizon.delete(key); else horizon.set(key, [a, b]);
      }
    });
    const kept = hull.filter((_, i) => !visible[i]);
    hull.length = 0; hull.push(...kept);
    for (const [a, b] of horizon.values()) addFace(a, b, p);
  }
  const verts = [], dualByPlane = new Map(), dualForHull = [];
  for (const face of hull) {
    const v = face.n.map((x) => x / (face.d || 1e-9));
    const key = v.map((x) => Math.round(x * 1e7)).join(':');
    let id = dualByPlane.get(key);
    if (id === undefined) { id = verts.length; verts.push(v); dualByPlane.set(key, id); }
    dualForHull.push(id);
  }
  const touching = points.map(() => []);
  hull.forEach((face, fi) => face.v.forEach((v) => touching[v].push(dualForHull[fi])));
  const faces = [];
  points.forEach((p, i) => {
    const ring = [...new Set(touching[i])];
    if (ring.length < 3) return;
    const axis = norm(p);
    const first = verts[ring[0]];
    const ref = norm(sub(first, axis.map((x) => x * dot(axis, first))));
    const side = cross(axis, ref);
    ring.sort((a, b) => {
      const pa = sub(verts[a], p), pb = sub(verts[b], p);
      return Math.atan2(dot(pa, side), dot(pa, ref)) - Math.atan2(dot(pb, side), dot(pb, ref));
    });
    faces.push(ring);
  });
  return { verts, faces };
}
function deltoidalIcositetrahedron() {
  const a = 1 + Math.sqrt(2), points = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const p = [x, y, z]; p[axis] *= a; points.push(p);
    }
  }
  return polarDual(points);
}
function rhombicTriacontahedron() {
  const ico = icosa();
  const seen = new Set(), points = [];
  for (const face of ico.faces) for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length];
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(norm([ico.verts[a][0] + ico.verts[b][0], ico.verts[a][1] + ico.verts[b][1], ico.verts[a][2] + ico.verts[b][2]]));
  }
  return polarDual(points);
}
// --- D14 / D16 : nouvelles formes "type d20" (polyèdres arrondis, faces quasi régulières) ---
// Octaèdre tronqué : 6 carrés + 8 hexagones = 14 faces, aspect bille comme le d20.
// T = profondeur de coupe : T ≈ 0,434 rend les aires carré ≈ hexagone.
function truncatedOctahedron() {
  const T = 0.434;
  const verts = [], seen = new Set();
  const pairs = [[0, 1], [1, 0], [1, 2], [2, 1], [0, 2], [2, 0]];
  for (const [a, b] of pairs) {
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
      const v = [0, 0, 0];
      v[a] = (1 - T) * s1;
      v[b] = T * s2;
      const key = v.join(',');
      if (!seen.has(key)) { seen.add(key); verts.push(v); }
    }
  }
  const faces = [...hullFaces(verts, 4), ...hullFaces(verts, 6)];
  return { verts, faces };
}
// Bipyramide carrée gyro-étirée (Johnson J17) : 16 triangles équilatéraux.
// Version d'origine (allongée, aspect amande) : conservée pour retour arrière
// via d16J17() dans solidFor().
function d16J17() {
  const R = Math.SQRT1_2;                       // rayon des deux couronnes
  const chord = 2 * R * Math.sin(Math.PI / 8);  // corde latérale dans le plan
  const h = Math.sqrt(1 - chord * chord) / 2;   // demi-écart des couronnes
  const apex = h + Math.sqrt(1 - R * R);        // z des deux pointes
  const verts = [
    [0, 0, apex],                                   // 0 pointe haute
    [R, 0, h], [0, R, h], [-R, 0, h], [0, -R, h],  // 1-4 couronne haute
    [0, 0, -apex],                                  // 5 pointe basse
    [0.5, 0.5, -h], [-0.5, 0.5, -h], [-0.5, -0.5, -h], [0.5, -0.5, -h], // 6-9 couronne basse
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],    // pyramide haute
    [5, 7, 6], [5, 8, 7], [5, 9, 8], [5, 6, 9],    // pyramide basse
    [6, 7, 2], [7, 8, 3], [8, 9, 4], [9, 6, 1],    // bande haute
    [1, 2, 6], [2, 3, 7], [3, 4, 8], [4, 1, 9],    // bande basse
  ];
  return { verts, faces };
}
// Forme retenue pour le d16 : même topologie, proportions optimisées.
// h = demi-écart des couronnes (rayon 1), apex = hauteur des pointes :
//   - h = 0.455 et apex = 1.09834 → pôles = équateur (aspect bille) ;
//   - contrainte d'aires égales exactes : (apex - h)² = (2h)² - 0.41421 ;
//   - les 16 triangles sont congruents (côtés 1.414 / 1.189 / 1.189)
//   - plans de faces tous à 0,812 du centre (silhouette quasi sphérique).
function gyroelongatedSquareBipyramid() {
  const h = 0.455;                  // demi-écart des couronnes (rayon 1)
  const apex = 1.09834;             // hauteur des pointes : pôles ≈ équateur
  const s = Math.SQRT1_2;
  const verts = [
    [0, 0, apex],                                   // 0 pointe haute
    [1, 0, h], [0, 1, h], [-1, 0, h], [0, -1, h],  // 1-4 couronne haute
    [0, 0, -apex],                                  // 5 pointe basse
    [s, s, -h], [-s, s, -h], [-s, -s, -h], [s, -s, -h], // 6-9 couronne basse
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],    // pyramide haute
    [5, 7, 6], [5, 8, 7], [5, 9, 8], [5, 6, 9],    // pyramide basse
    [6, 7, 2], [7, 8, 3], [8, 9, 4], [9, 6, 1],    // bande haute
    [1, 2, 6], [2, 3, 7], [3, 4, 8], [4, 1, 9],    // bande basse
  ];
  return { verts, faces };
}
// --- Formes D14/D16 HISTORIQUES (conservées pour retour arrière) ---
// Pour y revenir : dans solidFor(), brancher d14Legacy() / d16Legacy() et
// remettre stretchUV: true sur ces deux dés dans config.js.
function d14Legacy() {
  const t = trapezohedron(7, 0.95);
  return { ...t, landing: t.faces.map((_, i) => i) };
}
function d16Legacy() {
  const b = bipyramid(8, 1.06);
  return { ...b, landing: b.faces.map((_, i) => i) };
}
// --- D7 : sphère clipée par 7 plans (directions Tammes) ---
function newellNormal(ring) {
  const n = [0, 0, 0];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}
// Normalisation : rayon max = 1, faces orientées vers l'extérieur.
function normalize(solid) {
  const scale = Math.max(...solid.verts.map((v) => Math.hypot(...v)));
  const verts = solid.verts.map((v) => v.map((x) => x / scale));
  const faces = solid.faces.map((src) => {
    const face = [...src];
    const pts = face.map((i) => verts[i]);
    const center = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
    const w = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    return dot(w, center) < 0 ? face.reverse() : face;
  });
  return { ...solid, verts, faces };
}
const cache = new Map();
// kind -> { verts, faces, landing, blank?, d7? }
export function solidFor(kind) {
  if (cache.has(kind)) return cache.get(kind);
  let s;
  if (kind === 'd3') {
    const b = prismBarrel(3);
    s = { ...b, landing: [...b.landingFaces], blank: b.faces.map((_, i) => i).filter((i) => !b.landingFaces.includes(i)) };
  } else if (kind === 'd4') {
    const t = tetra();
    s = { ...t, landing: [0, 1, 2, 3] };
  } else if (kind === 'd5') {
    const b = bevelSolid(regularPrism(3, 0.72), 0.19);
    s = { ...b, landing: [...b.landingFaces], blank: b.faces.map((_, i) => i).filter((i) => !b.landingFaces.includes(i)) };
  } else if (kind === 'd6') {
    const c = cube();
    s = { ...c, landing: [0, 1, 2, 3, 4, 5], cube: true };
  } else if (kind === 'd7') {
    const b7 = prismBarrel(7);
    s = { ...b7, landing: [...b7.landingFaces], blank: b7.faces.map((_, i) => i).filter((i) => !b7.landingFaces.includes(i)) };
  } else if (kind === 'd8') {
    const o = octa();
    s = { ...o, landing: o.faces.map((_, i) => i) };
  } else if (kind === 'd10') {
    const t = trapezohedron(5);
    s = { ...t, landing: t.faces.map((_, i) => i) };
  } else if (kind === 'd12') {
    const d = dodeca();
    s = { ...d, landing: d.faces.map((_, i) => i) };
  } else if (kind === 'd14') {
    // Forme historique trapézoèdre (type d10) : d14Legacy() ici pour y revenir.
    const t14 = truncatedOctahedron();
    s = { ...t14, landing: t14.faces.map((_, i) => i) };
  } else if (kind === 'd16') {
    // Forme historique bipyramide 8 : d16Legacy() ici pour y revenir.
    // Forme intermédiaire J17 allongée : d16J17() ici pour y revenir.
    const b16 = gyroelongatedSquareBipyramid();
    s = { ...b16, landing: b16.faces.map((_, i) => i) };
  } else if (kind === 'd20') {
    const i = icosa();
    s = { ...i, landing: i.faces.map((_, i2) => i2) };
  } else if (kind === 'd24') {
    const d = deltoidalIcositetrahedron();
    s = { ...d, landing: d.faces.map((_, i) => i) };
  } else if (kind === 'd30') {
    const r = rhombicTriacontahedron();
    s = { ...r, landing: r.faces.map((_, i) => i) };
  } else {
    throw new Error('kind inconnu: ' + kind);
  }
  const out = normalize(s);
  out.landing = s.landing; out.blank = s.blank || []; out.cube = !!s.cube;
  cache.set(kind, out);
  return out;
}
export { newellNormal };
