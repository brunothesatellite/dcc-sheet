// Miniatures 3D du picker : chaque type rendu une fois, en data-URL.
import * as THREE from './lib/three.module.min.js';
import { buildDie, normalForValue } from './dice3d.js';
import { valuesFor } from './config.js';

// Présente la première face (1, ou 00) face caméra, chiffre droit :
// la normale de la face vise la caméra, puis on roule autour de cet axe
// pour aligner l'axe « haut » de la texture (le même que faceUVs) avec le
// haut de l'écran.
function presentFace(g, cam) {
  const def = g.userData.def, built = g.userData.built;
  const camDir = cam.position.clone().normalize();
  const n = normalForValue(def, built, valuesFor(def)[0]);
  const target = camDir.clone();
  g.quaternion.setFromUnitVectors(n, target);
  const hint = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(hint, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const upAxis = built.faceUp && built.faceUp[0] === 'u' ? u : v;
  const vWorld = upAxis.applyQuaternion(g.quaternion);
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const ang = Math.atan2(vWorld.dot(camRight), vWorld.dot(camUp));
  g.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(target, -ang));
  // Vue 3/4 réservée au D7 (prisme à faces planes) : de face, il se présente
  // comme une carte plate. Les dés arrondis D3/D5 et les polyèdres gardent
  // leur face de résultat bien centrée, plus lisible dans le picker.
  if (def.kind === 'd7') {
    g.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(camUp, 0.7));
    g.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(camRight, 0.3));
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
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-3, 3, -4);
  scene.add(fill);
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
