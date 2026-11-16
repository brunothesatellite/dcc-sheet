// Fabrique de dés 3D : géométrie + texture de chiffres + orientation résultat.
import * as THREE from './lib/three.module.min.js';
import { solidFor, newellNormal, softProject } from './solids.js';
import { atlasFor, CELL } from './textures.js';
import { valuesFor, luminance, shade } from './config.js';

const geoCache = new Map();
const matCache = new Map();
const edgeGeoCache = new Map();
const edgeMatCache = new Map();

function v3norm(n) {
  const m = Math.hypot(n[0], n[1], n[2]) || 1;
  return new THREE.Vector3(n[0] / m, n[1] / m, n[2] / m);
}
function faceNormalV(verts, face) {
  return v3norm(newellNormal(face.map((i) => verts[i])));
}
// D6 authentique : faces opposées = 7.
function cubeLanding(solid) {
  const idx = solid.landingFaces || solid.faces.map((_, i) => i);
  const ns = idx.map((fi) => faceNormalV(solid.verts, solid.faces[fi]));
  const used = new Set(), pairs = [];
  ns.forEach((a, i) => {
    if (used.has(i)) return;
    const j = ns.findIndex((b, k) => !used.has(k) && k !== i && a.dot(b) < -0.999);
    if (j < 0) return;
    used.add(i); used.add(j);
    pairs.push([idx[i], idx[j]]);
  });
  const vals = [[1, 6], [2, 5], [3, 4]];
  const landing = new Array(6);
  pairs.forEach(([a, b], k) => {
    if (!vals[k]) return;
    landing[vals[k][0] - 1] = a; landing[vals[k][1] - 1] = b;
  });
  return landing;
}
// Projection planaire d'une face sur l'axe dominant -> UV dans sa case d'atlas.
function faceUVs(verts, face, cell, cols, atlasW, atlasH, stretch = false) {
  const n = faceNormalV(verts, face);
  const hint = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const uA = new THREE.Vector3().crossVectors(hint, n).normalize();
  const vA = new THREE.Vector3().crossVectors(n, uA).normalize();
  const p0 = verts[face[0]];
  const dots = face.map((i) => {
    const dx = verts[i][0] - p0[0], dy = verts[i][1] - p0[1], dz = verts[i][2] - p0[2];
    return [dx * uA.x + dy * uA.y + dz * uA.z, dx * vA.x + dy * vA.y + dz * vA.z];
  });
  // Centre sur le centroïde géométrique de la face (et non le centre de la
  // boîte englobante) : sur un triangle, le centre de la boîte est décalé —
  // le chiffre, dessiné au centre de la case, semblait alors de travers.
  const m = Math.round(CELL * 0.055); // marge intérieure de case (proportionnelle à la résolution)
  const cx = (cell % cols) * CELL, cy = Math.floor(cell / cols) * CELL;
  if (stretch) { // faces très allongées : remplit la case (étirement assumé),
    // mais centre sur le CENTROÏDE (comme le chemin uniforme) : le milieu de
    // boîte est décalé vers l'apex sur triangles (D16) et kites (D14), le
    // chiffre semblait collé en haut. Clampé à la case (m) : les pointes
    // échantillonnent l'aplat (invisible), pas les cases voisines.
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    let cU = 0, cV = 0;
    for (const [du, dv] of dots) {
      if (du < minU) minU = du;
      if (du > maxU) maxU = du;
      if (dv < minV) minV = dv;
      if (dv > maxV) maxV = dv;
      cU += du; cV += dv;
    }
    cU /= dots.length; cV /= dots.length;
    let su = (CELL - 2 * m) / ((maxU - minU) || 1);
    let sv = (CELL - 2 * m) / ((maxV - minV) || 1);
    // B : anisotropie plafonnée à 1.3 (D16 natif 1.84, D14 natif 1.63) —
    // étirement résiduel discret, le reste retombe en aplat via le clamp.
    const maxA = 1.3;
    if (su > sv * maxA) sv = su / maxA;
    else if (sv > su * maxA) su = sv / maxA;
    const x0 = cx + m, x1 = cx + CELL - m, y0 = cy + m, y1 = cy + CELL - m;
    return dots.map(([du, dv]) => {
      const u = Math.min(x1, Math.max(x0, cx + CELL / 2 + (du - cU) * su)) / atlasW;
      const y = Math.min(y1, Math.max(y0, cy + CELL / 2 - (dv - cV) * sv));
      return [u, 1 - y / atlasH]; // sens atlas v0.2 inchangé
    });
  }
  let cU = 0, cV = 0;
  for (const [du, dv] of dots) { cU += du; cV += dv; }
  cU /= dots.length; cV /= dots.length;
  let maxU = 0, maxV = 0;
  for (const [du, dv] of dots) {
    maxU = Math.max(maxU, Math.abs(du - cU));
    maxV = Math.max(maxV, Math.abs(dv - cV));
  }
  const half = (CELL - 2 * m) / 2;
  // Échelle UNIFORME (facteur unique) : le glyphe garde son aspect sur la face.
  const s = Math.min(half / (maxU || 1), half / (maxV || 1));
  return dots.map(([du, dv]) => {
    const u = (cx + CELL / 2 + (du - cU) * s) / atlasW;
    const y = cy + CELL / 2 - (dv - cV) * s; // axe vertical : sens atlas inchangé
    const v = 1 - y / atlasH;
    return [u, v];
  });
}
function cellCenterUV(cell, cols, atlasW, atlasH) {
  const x = (cell % cols) * CELL + CELL / 2;
  const y = Math.floor(cell / cols) * CELL + CELL / 2;
  return [x / atlasW, 1 - y / atlasH];
}
const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Subdivision barycentrique d'un triangle : chaque sommet garde ses poids
// (pour interpoler les UV de la face d'origine).
function subdivideTriangle(tri, n) {
  const out = [];
  const at = (i, j) => {
    const w0 = (n - i - j) / n, w1 = i / n, w2 = j / n;
    return {
      p: [
        w0 * tri[0][0] + w1 * tri[1][0] + w2 * tri[2][0],
        w0 * tri[0][1] + w1 * tri[1][1] + w2 * tri[2][1],
        w0 * tri[0][2] + w1 * tri[1][2] + w2 * tri[2][2],
      ],
      b: [w0, w1, w2],
    };
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      out.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
      if (i + j < n - 1) out.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  return out;
}
// D3/D5 arrondis : surface maillée fine, normales lisses sur les congés,
// aplat + texture de chiffre conservés au centre des faces numérotées.
function buildSoftGeometry(def, s) {
  if (geoCache.has(def.kind)) return geoCache.get(def.kind);
  const blankCell = valuesFor(def).length;
  const atlas = atlasFor(def, '#ffffff');
  const AW = atlas.canvas.width, AH = atlas.canvas.height;
  const cols = atlas.cols;
  const blankUV = cellCenterUV(blankCell, cols, AW, AH);
  const valueOfFace = new Map();
  s.landing.forEach((fi, vi) => valueOfFace.set(fi, vi));
  const faceNormals = s.landingNormals.map((n) => new THREE.Vector3(n[0], n[1], n[2]).normalize());
  const pos = [], nrm = [], uv = [];
  const N = s.soft.N;
  s.faces.forEach((face, fi) => {
    const vi = valueOfFace.get(fi);
    const cell = vi === undefined ? blankCell : vi;
    const baseUVs = vi === undefined ? null : faceUVs(s.verts, face, cell, cols, AW, AH, false);
    for (let k = 1; k < face.length - 1; k++) {
      const tri = [s.verts[face[0]], s.verts[face[k]], s.verts[face[k + 1]]];
      const triUV = baseUVs ? [baseUVs[0], baseUVs[k], baseUVs[k + 1]] : null;
      for (const sub of subdivideTriangle(tri, N)) {
        const pts = sub.map((v) => v.p);
        for (const v of sub) {
          const sp = softProject(s.soft, v.p, pts);
          let uu = blankUV[0], vv = blankUV[1];
          if (triUV) {
            uu = v.b[0] * triUV[0][0] + v.b[1] * triUV[1][0] + v.b[2] * triUV[2][0];
            vv = v.b[0] * triUV[0][1] + v.b[1] * triUV[1][1] + v.b[2] * triUV[2][1];
          }
          let p = sp.p, n = sp.n;
          // Aplat local sous le chiffre : la surface reste arrondie partout
          // ailleurs, mais le glyphe ne se bombe plus.
          if (vi !== undefined && triUV) {
            const fs = def.fontScale || 1;
            const cxPix = (cell % cols) * CELL + CELL / 2;
            const cyPix = Math.floor(cell / cols) * CELL + CELL / 2;
            const du = Math.abs(uu * AW - cxPix) / (0.22 * CELL * fs);
            const dv = Math.abs((1 - vv) * AH - cyPix) / (0.4 * CELL * fs);
            const flat = 1 - smoothstep(0.85, 1.25, Math.max(du, dv));
            if (flat > 0) {
              const fn = faceNormals[vi];
              p = [
                v.p[0] * flat + sp.p[0] * (1 - flat),
                v.p[1] * flat + sp.p[1] * (1 - flat),
                v.p[2] * flat + sp.p[2] * (1 - flat),
              ];
              let nx = fn.x * flat + sp.n[0] * (1 - flat);
              let ny = fn.y * flat + sp.n[1] * (1 - flat);
              let nz = fn.z * flat + sp.n[2] * (1 - flat);
              const nl = Math.hypot(nx, ny, nz) || 1;
              n = [nx / nl, ny / nl, nz / nl];
            }
          }
          pos.push(p[0], p[1], p[2]);
          nrm.push(n[0], n[1], n[2]);
          uv.push(uu, vv);
        }
      }
    }
  });
  let maxR = 0;
  for (let i = 0; i < pos.length; i += 3) maxR = Math.max(maxR, Math.hypot(pos[i], pos[i + 1], pos[i + 2]));
  if (maxR > 1e-9) for (let i = 0; i < pos.length; i++) pos[i] /= maxR;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const out = {
    geometry: g,
    faceNormals,
    landing: s.landing.map((_, i) => i),
    blank: [...(s.blank || [])],
    bevel: 0,
    soft: true,
    // Axe de lecture du chiffre sur la face : les côtés longs du D3/D5 sont
    // lus dans le grand axe (chiffre tourné dans l'atlas), les bases du D5
    // dans l'axe court.
    faceUp: def.kind === 'd5'
      ? valuesFor(def).map((v) => (v <= 2 ? 'v' : 'u'))
      : valuesFor(def).map(() => 'u'),
  };
  geoCache.set(def.kind, out);
  return out;
}
function buildGeometry(def) {
  const s = solidFor(def.kind);
  if (s.soft) return buildSoftGeometry(def, s);
  if (geoCache.has(def.kind)) return geoCache.get(def.kind);
  const blankCell = valuesFor(def).length;
  const atlas = atlasFor(def, '#ffffff');
  const AW = atlas.canvas.width, AH = atlas.canvas.height;
  const Acols = atlas.cols;
  const landing = s.cube ? cubeLanding(s) : [...s.landing];
  const blankSet = new Set(s.blank || []);
  const valueOfFace = new Array(s.faces.length).fill(blankCell);
  if (landing) landing.forEach((fi, vi) => { valueOfFace[fi] = vi; });
  const pos = [], nrm = [], uv = [];
  const faceNormals = s.faces.map((f) => faceNormalV(s.verts, f));
  s.faces.forEach((face, fi) => {
    const uvs = faceUVs(s.verts, face, valueOfFace[fi], Acols, AW, AH, !!def.stretchUV);
    for (let k = 1; k < face.length - 1; k++) {
      for (const vi of [face[0], face[k], face[k + 1]]) {
        const v = s.verts[vi];
        pos.push(v[0], v[1], v[2]);
        const n = faceNormals[fi];
        nrm.push(n.x, n.y, n.z);
        const t = uvs[face.indexOf(vi)];
        uv.push(t[0], t[1]);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const out = { geometry: g, faceNormals, landing, blank: [...blankSet], bevel: !!s.bevel };
  geoCache.set(def.kind, out);
  return out;
}
function bodyMaterial(def, bg) {
  const key = def.label + '|' + bg;
  if (matCache.has(key)) return matCache.get(key);
  const atlas = atlasFor(def, bg);
  const tex = new THREE.CanvasTexture(atlas.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.08 });
  m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; // les arêtes gagnent le test de profondeur
  matCache.set(key, m);
  return m;
}
// Normale locale (unitaire) de la face portant ce résultat.
export function normalForValue(def, built, value) {
  const fi = def.pct ? built.landing[value / 10] : built.landing[value - 1];
  return built.faceNormals[fi].clone();
}
// Arêtes topologiques (boucles de faces, pas de diagonales de triangulation),
// en coordonnées solide normalisées : suivent le corps via le scale du groupe.
function edgeGeometry(def) {
  if (edgeGeoCache.has(def.kind)) return edgeGeoCache.get(def.kind);
  const s = solidFor(def.kind);
  const seen = new Set(), pos = [];
  for (const face of s.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const key = a < b ? a + ':' + b : b + ':' + a;
      if (seen.has(key)) continue;
      seen.add(key);
      pos.push(s.verts[a][0], s.verts[a][1], s.verts[a][2], s.verts[b][0], s.verts[b][1], s.verts[b][2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  edgeGeoCache.set(def.kind, g);
  return g;
}
// Teinte tonale du dé : foncée sur dé clair, claire sur dé sombre.
function edgeColorFor(bg) {
  return luminance(bg) > 0.45 ? shade(bg, -30) : shade(bg, 30);
}
export function buildDie(def, bg) {
  const built = buildGeometry(def);
  const group = new THREE.Group();
  const body = new THREE.Mesh(built.geometry, bodyMaterial(def, bg));
  body.castShadow = true;
  group.add(body);
  // Surlignage fin des arêtes (1px WebGL) : réservé aux formes sans chanfrein
  // (D7). Sur un dé chanfreiné ou arrondi, les arêtes donnent déjà la
  // séparation des faces ; un trait par-dessus alourdit le rendu.
  if (!built.bevel && !built.soft) {
    const edgeKey = def.label + '|' + bg;
    let edgeMat = edgeMatCache.get(edgeKey);
    if (!edgeMat) {
      edgeMat = new THREE.LineBasicMaterial({ color: edgeColorFor(bg), transparent: true, opacity: 0.35 });
      edgeMatCache.set(edgeKey, edgeMat);
    }
    group.add(new THREE.LineSegments(edgeGeometry(def), edgeMat));
  }
  group.userData = { def, built, body };
  return group;
}
