// Miniatures 3D du picker : chaque type rendu une fois, en data-URL.
import * as THREE from './lib/three.module.min.js';
import { buildDie, normalForValue } from './dice3d.js';
import { valuesFor } from './config.js';
import { solidFor } from './solids.js';

// Présente la première face (1, ou 00) face caméra : un chiffre lisible.
function presentFace(g, cam) {
  const def = g.userData.def, built = g.userData.built;
  const camDir = cam.position.clone().normalize();
  const n = normalForValue(def, built, valuesFor(def)[0]);
  const target = camDir.clone();
  g.quaternion.setFromUnitVectors(n, target);
  if (def.kind === 'd16') {
    // d16 : la pointe (pôle) fait saillir un coin dans la face présentée →
    // on l'aligne à la verticale pour une silhouette droite (miroir haut/bas).
    const solid = solidFor(def.kind);
    const face = solid.faces[built.landing[0]];
    const pole = face.reduce((a, b) => (Math.abs(solid.verts[b][2]) > Math.abs(solid.verts[a][2]) ? b : a));
    const v = new THREE.Vector3(...solid.verts[pole]).applyQuaternion(g.quaternion);
    const z = target;
    const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x);
    const ang = Math.atan2(v.dot(x), v.dot(y));
    g.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(target, -ang));
  } else {
    g.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(target, 0.3));
  }
}

export function renderThumbs(defs, size = 112) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223028, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 5, 4);
  scene.add(key);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  cam.position.set(1.9, 2.2, 3.0);
  cam.lookAt(0, 0, 0);
  const out = new Map();
  for (const def of defs) {
    const g = buildDie(def, def.color);
    presentFace(g, cam);
    scene.add(g);
    renderer.render(scene, cam);
    out.set(def.label, renderer.domElement.toDataURL());
    scene.remove(g);
  }
  renderer.dispose();
  renderer.domElement.remove();
  return out;
}
