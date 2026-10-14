// Tapis 3D : scène Three.js transparente sur la feutrine CSS, physique scriptée
// (résultat tiré avant l'animation), collisions disques, gestes, badges.
import * as THREE from './lib/three.module.min.js';
import { buildDie, normalForValue } from './dice3d.js';
import { rollDie } from './rng.js';
import { countTotal } from './total.js';
import { pickShade, formatValue, LONGPRESS_MS, TAP_SLOP, FLING_PX, TRAY_MAX, TOTAL_MS } from './config.js';

const WORLD_BASE = 8; // largeur monde de référence (mobile, inchangée)
const PX_PER_WORLD = 90; // ~90px par unité monde => Ø dé ~121px constant sur PC
const DIE_R = 0.72;
const DIE_COLL = 0.62;
const REST_Y = 0.52;
const GRAV = 18;
const ELEV = (56 * Math.PI) / 180;
const SETTLE_T = 0.28;
// Scratch quaternions/vecteur du guidage (pas d'allocs par frame).
const _w = new THREE.Vector3(), _c = new THREE.Vector3(), _a = new THREE.Quaternion(), _t = new THREE.Quaternion(), _q = new THREE.Quaternion();

export class Tray {
  constructor(trayEl, hooks = {}) {
    this.el = trayEl;
    this.onTotal = hooks.onTotal || (() => {});
    this.toast = hooks.toast || (() => {});
    this.sound = hooks.sound || null;
    this.dice = [];
    this.typeCount = {};
    this.pending = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
    trayEl.appendChild(this.renderer.domElement);

    this.blayer = document.createElement('div');
    this.blayer.id = 'dice-blayer';
    trayEl.appendChild(this.blayer);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2a20, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(6, 10, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 1; key.shadow.camera.far = 30;
    this.key = key;
    this.scene.add(key);
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.28 })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.ray = new THREE.Raycaster();
    this.planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.bodies = new Map();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(trayEl);
    this.wireGestures();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    this.last = -1;
  }
  // --- dimensions ---
  resize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return; // module masqué : rien à recalculer (C6)
    this.pxW = Math.max(1, r.width); this.pxH = Math.max(1, r.height);
    // Monde adaptatif : mobile inchangé (<=720px => 8), PC agrandi pour
    // garder une taille pixel de dé constante (~121px de diamètre).
    this.worldW = Math.max(WORLD_BASE, this.pxW / PX_PER_WORLD);
    this.worldH = (this.worldW * this.pxH) / this.pxW;
    this.bx = this.worldW / 2; this.bz = this.worldH / 2;
    this.scale = this.worldW / this.pxW; // px -> monde
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(this.pxW, this.pxH, false);
    this.camera.aspect = this.pxW / this.pxH;
    this.camera.updateProjectionMatrix();
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = Math.max(this.worldH / 2 / Math.tan(fov / 2), this.worldW / 2 / (Math.tan(fov / 2) * (this.pxW / this.pxH))) * 1.07;
    this.camera.position.set(0, Math.sin(ELEV) * dist, Math.cos(ELEV) * dist);
    this.camera.lookAt(0, 0, 0);
    // Ombres : suit le tapis agrandi.
    if (this.key) {
      const sc = this.key.shadow.camera;
      sc.left = -this.bx - 2; sc.right = this.bx + 2;
      sc.top = this.bz + 2; sc.bottom = -this.bz - 2;
      sc.updateProjectionMatrix();
    }
  }
  // --- pause / reprise (fermeture du module = masquage seul, C6) ---
  pause() {
    this.renderer.setAnimationLoop(null); // pas de CPU/batterie en arrière-plan
    if (this.sound && this.sound.ctx && this.sound.ctx.suspend) {
      try { this.sound.ctx.suspend(); } catch (_) { /* noop */ }
    }
  }
  resume() {
    this.resize();  // le conteneur peut avoir changé de taille pendant la pause
    this.last = -1; // premier dt nul plutôt qu'un saut à la reprise
    if (this.sound && this.sound.ctx && this.sound.ctx.resume) {
      try { this.sound.ctx.resume(); } catch (_) { /* noop */ }
    }
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }
  camDir() {
    return this.camera.position.clone().normalize();
  }
  toScreen(p) {
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.pxW, y: ((1 - v.y) / 2) * this.pxH };
  }
  // --- dés ---
  freeSpot() {
    let best = { x: 0, z: 0 }, bestScore = 1e9;
    for (let i = 0; i < 24; i++) {
      const x = (Math.random() * 2 - 1) * (this.bx - DIE_COLL);
      const z = (Math.random() * 2 - 1) * (this.bz - DIE_COLL);
      let s = 0;
      for (const o of this.dice) {
        const dd = Math.hypot(o.group.position.x - x, o.group.position.z - z);
        if (dd < DIE_COLL * 2) s += DIE_COLL * 2 - dd;
      }
      if (s < bestScore) { bestScore = s; best = { x, z }; }
      if (s === 0) break;
    }
    return best;
  }
  addDie(def) {
    if (this.dice.length >= TRAY_MAX) { this.toast(`Tapis plein (${TRAY_MAX} dés max)`); return null; }
    const k = this.typeCount[def.label] || 0;
    this.typeCount[def.label] = k + 1;
    const bg = pickShade(def.color, k);
    const group = buildDie(def, bg);
    const sizeR = DIE_R * (def.size || 1); // gabarit par type (lisibilité)
    group.scale.setScalar(0.01);
    group.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    const p = this.freeSpot();
    group.position.set(p.x, REST_Y, p.z);
    this.scene.add(group);
    const d = {
      def, bg, group, value: null, faceN: null, twist: 0, mode: 'spawn', spawnT: 0,
      sizeR, coll: DIE_COLL * (def.size || 1),
      vel: new THREE.Vector3(), angVel: new THREE.Vector3(),
      flyTime: 0, settleT: 0, fromQ: new THREE.Quaternion(), toQ: new THREE.Quaternion(),
      badge: null, thrown: false,
    };
    this.bodies.set(group.userData.body.uuid, d);
    this.dice.push(d);
    this.hideTotal();
    return d;
  }
  removeDie(d) {
    const i = this.dice.indexOf(d);
    if (i < 0) return;
    this.dice.splice(i, 1);
    this.bodies.delete(d.group.userData.body.uuid);
    if (d.badge) d.badge.remove();
    this.scene.remove(d.group);
    if (d.thrown && this.pending > 0) {
      d.thrown = false; this.pending--;
      if (this.pending === 0) this.showTotal();
    } else this.hideTotal();
  }
  clear() {
    this.pending = 0;
    [...this.dice].forEach((d) => this.removeDie(d));
    this.hideTotal();
  }
  // --- lancers ---
  throwDie(d, vx, vz, vy, spin = 1) {
    d.mode = 'fly';
    d.flyTime = 0;
    d.thrown = true;
    d.value = rollDie(d.def); // tirage en amont, explicite
    d.faceN = normalForValue(d.def, d.group.userData.built, d.value);
    d.twist = (Math.random() - 0.5) * (Math.PI / 3.6);
    d.vel.set(vx, vy, vz);
    d.angVel.set((Math.random() - 0.5) * 36 * spin, (Math.random() - 0.5) * 36 * spin, (Math.random() - 0.5) * 36 * spin);
    if (d.badge) { d.badge.remove(); d.badge = null; }
    if (this.sound) this.sound.throwClack(); // un bruit par dé (cascade via stagger)
  }
  // Rebond sonore, throttle 70 ms par dé (pas de mitraille à 60 fps).
  dieSound(d, s) {
    if (!this.sound || s <= 0) return;
    const now = performance.now();
    if (now - (d.lastSnd || 0) < 70) return;
    d.lastSnd = now;
    this.sound.bounce(s);
  }
  rollSingle(d) {
    if (d.mode === 'fly' || d.mode === 'settle') return;
    this.hideTotal();
    const a = Math.random() * Math.PI * 2, sp = this.reduced ? 0.6 : 2.2 + Math.random() * 1.5;
    this.throwDie(d, Math.cos(a) * sp, Math.sin(a) * sp, this.reduced ? 0.6 : 3.4 + Math.random() * 1.5, 0.5);
  }
  rollAll() {
    if (!this.dice.length) { this.toast('Ajoute d’abord un dé depuis le haut'); return; }
    this.hideTotal();
    this.pending = this.dice.length;
    this.dice.forEach((d, i) => {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 5;
        this.throwDie(d, Math.cos(a) * sp, Math.sin(a) * sp, 5 + Math.random() * 2.5, 1.15);
      }, i * 70);
    });
  }
  // --- orientation résultat ---
  targetQuat(d, value, tw = (Math.random() - 0.5) * (Math.PI / 3.6)) {
    const built = d.group.userData.built;
    const cam = this.camDir();
    const local = normalForValue(d.def, built, value);
    const target = cam.clone();
    const world = local.applyQuaternion(d.group.quaternion);
    const align = new THREE.Quaternion().setFromUnitVectors(world, target);
    const toQ = align.multiply(d.group.quaternion);
    const twist = new THREE.Quaternion().setFromAxisAngle(target, tw);
    return twist.multiply(toQ);
  }
  // Guidage progressif : pendant que le dé ralentit, sa rotation est attirée
  // vers la présentation finale — le pivot de settle n'a presque plus rien à corriger.
  guide(d, dt) {
    const ramp = Math.min(1, Math.max(0, (d.flyTime - 0.4) / 0.8));
    if (ramp <= 0 || !d.faceN) return;
    const calm = Math.min(1, Math.max(0, 1 - Math.hypot(d.vel.x, d.vel.z) / 3))
               * Math.min(1, Math.max(0, 1 - d.angVel.length() / 8));
    const k = Math.min(1, ramp * calm * dt * 4);
    if (k <= 0) return;
    const cam = this.camDir();
    _w.copy(d.faceN).applyQuaternion(d.group.quaternion);
    _a.setFromUnitVectors(_w, cam);
    _q.copy(d.group.quaternion);
    _a.multiply(_q);
    _t.setFromAxisAngle(cam, d.twist);
    _t.multiply(_a);
    d.group.quaternion.slerp(_t, k);
    d.angVel.multiplyScalar(Math.max(0, 1 - k * 0.9));
  }
  beginSettle(d) {
    d.mode = 'settle';
    d.settleT = 0;
    d.fromQ.copy(d.group.quaternion);
    d.toQ.copy(this.targetQuat(d, d.value, d.twist));
  }
  endSettle(d) {
    d.mode = 'rest';
    d.thrown = false;
    d.vel.set(0, 0, 0);
    d.angVel.set(0, 0, 0);
    this.showBadge(d);
    if (this.sound) this.sound.settle();
    if (!this.reduced && navigator.vibrate) { try { navigator.vibrate(12); } catch (_) { /* noop */ } }
    if (this.pending > 0) {
      this.pending--;
      if (this.pending === 0) this.showTotal();
    }
  }
  // --- badge + total ---
  showBadge(d) {
    if (d.badge) d.badge.remove();
    const el = document.createElement('div');
    el.className = 'bdg pop';
    el.textContent = formatValue(d.def, d.value);
    el.style.borderColor = d.def.color;
    el.style.color = '#ffffff';
    this.blayer.appendChild(el);
    d.badge = el;
    this.placeBadge(d); // positionné de suite, pas à la frame suivante
  }
  placeBadge(d) {
    if (!d.badge) return;
    const rpx = d.sizeR / this.scale;
    const s = this.toScreen(d.group.position);
    d.badge.style.transform = `translate(${s.x + rpx * 0.55}px,${s.y - rpx * 1.15}px)`;
  }
  showTotal() {
    const s = countTotal(this.dice.map((d) => ({ sides: d.def.sides, pct: !!d.def.pct, value: d.value })));
    this.onTotal(`Total : ${s}`);
    clearTimeout(this.totalT);
    this.totalT = setTimeout(() => this.onTotal(null), TOTAL_MS);
  }
  hideTotal() {
    clearTimeout(this.totalT);
    this.onTotal(null);
  }
  // --- physique ---
  stepDie(d, dt) { // modes 'fly' (relance au repos) et 'slide' (garde sa valeur)
    const p = d.group.position;
    if (d.mode === 'spawn') {
      d.spawnT += dt;
      const t = Math.min(1, d.spawnT / 0.25);
      d.group.scale.setScalar(Math.max(0.01, d.sizeR * t));
      if (t >= 1) { d.group.scale.setScalar(d.sizeR); d.mode = 'rest'; }
      return;
    }
    if (d.mode !== 'fly' && d.mode !== 'slide') return;
    d.flyTime += dt;
    d.vel.y -= GRAV * dt;
    p.x += d.vel.x * dt; p.y += d.vel.y * dt; p.z += d.vel.z * dt;
    if (p.y < REST_Y) {
      p.y = REST_Y;
      const impactY = Math.abs(d.vel.y);
      if (impactY > 0.9) { d.vel.y = -d.vel.y * 0.6; this.dieSound(d, Math.min(1, impactY / 6)); }
      else d.vel.y = 0;
      d.vel.x *= 0.8; d.vel.z *= 0.8;
      d.angVel.multiplyScalar(0.85);
    } else {
      d.vel.x *= Math.exp(-0.4 * dt); d.vel.z *= Math.exp(-0.4 * dt);
    }
    if (d.vel.y === 0) { d.vel.x *= Math.exp(-1.8 * dt); d.vel.z *= Math.exp(-1.8 * dt); }
    d.angVel.multiplyScalar(Math.exp(-1.6 * dt));
    // murs (rebond sonore sourd si impact franc)
    const wc = d.coll;
    let ix = 0, iz = 0;
    if (p.x < -this.bx + wc) { ix = Math.abs(d.vel.x); p.x = -this.bx + wc; d.vel.x = Math.abs(d.vel.x) * 0.5; }
    if (p.x > this.bx - wc) { ix = Math.abs(d.vel.x); p.x = this.bx - wc; d.vel.x = -Math.abs(d.vel.x) * 0.5; }
    if (p.z < -this.bz + wc) { iz = Math.abs(d.vel.z); p.z = -this.bz + wc; d.vel.z = Math.abs(d.vel.z) * 0.5; }
    if (p.z > this.bz - wc) { iz = Math.abs(d.vel.z); p.z = this.bz - wc; d.vel.z = -Math.abs(d.vel.z) * 0.5; }
    if (ix > 1.5 || iz > 1.5) this.dieSound(d, Math.min(1, Math.max(ix, iz) / 8) * 0.7);
    // rotation
    const w = d.angVel, wl = w.length();
    if (wl > 1e-4) {
      const dq = new THREE.Quaternion().setFromAxisAngle(w.clone().normalize(), wl * dt);
      d.group.quaternion.premultiply(dq);
    }
    if (d.thrown) this.guide(d, dt);
    const grounded = p.y === REST_Y;
    const slow = Math.hypot(d.vel.x, d.vel.z) < 0.45 && wl < 0.8;
    // Settle seulement si la face est déjà amenée (~20°) : le pivot final reste discret.
    let ready = true;
    if (slow && d.thrown && d.faceN) {
      _w.copy(d.faceN).applyQuaternion(d.group.quaternion);
      ready = _w.dot(_c.copy(this.camDir())) > 0.94;
    }
    if ((grounded && slow && ready) || d.flyTime > 6) {
      if (d.mode === 'slide') { d.mode = 'rest'; d.vel.set(0, 0, 0); d.angVel.set(0, 0, 0); }
      else this.beginSettle(d);
    }
  }
  collide() {
    const ds = this.dice;
    for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
      const a = ds[i], b = ds[j];
      if (a.mode === 'settle' || b.mode === 'settle') continue;
      const pa = a.group.position, pb = b.group.position;
      const dx = pb.x - pa.x, dz = pb.z - pa.z;
      const dist = Math.hypot(dx, dz), min = a.coll + b.coll;
      if (dist < min && dist > 1e-4) {
        const nx = dx / dist, nz = dz / dist, ov = (min - dist) / 2;
        pa.x -= nx * ov; pa.z -= nz * ov;
        pb.x += nx * ov; pb.z += nz * ov;
        const rv = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
        if (rv < 0) {
          const imp = (-(1 + 0.55) * rv) / 2;
          a.vel.x -= imp * nx; a.vel.z -= imp * nz;
          b.vel.x += imp * nx; b.vel.z += imp * nz;
          for (const d of [a, b]) {
            if (d.mode === 'rest') { d.mode = 'slide'; d.flyTime = 0; }
          }
        }
      }
    }
  }
  frame() {
    const now = performance.now();
    if (this.last < 0) this.last = now;
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    const st = this.reduced ? SETTLE_T * 0.3 : SETTLE_T;
    for (const d of this.dice) {
      if (d.mode === 'settle') {
        d.settleT += dt;
        const t = Math.min(1, d.settleT / st);
        const e = t * t * (3 - 2 * t);
        d.group.quaternion.slerpQuaternions(d.fromQ, d.toQ, e);
        d.group.position.y += (REST_Y - d.group.position.y) * Math.min(1, dt * 10);
        if (t >= 1) this.endSettle(d);
      } else this.stepDie(d, dt);
    }
    this.collide();
    // badges projetés
    for (const d of this.dice) this.placeBadge(d);
    this.renderer.render(this.scene, this.camera);
  }
  // --- gestes : tap / appui long / drag / fling ---
  pick(e) {
    const r = this.el.getBoundingClientRect();
    const nd = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    this.ray.setFromCamera(nd, this.camera);
    const hits = this.ray.intersectObjects([...this.bodies.keys()].map((u) => this.bodies.get(u).group.userData.body), false);
    return hits.length ? this.bodies.get(hits[0].object.uuid) : null;
  }
  planeHit(e) {
    const r = this.el.getBoundingClientRect();
    const nd = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    this.ray.setFromCamera(nd, this.camera);
    const out = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.planeY0, out) ? out : null;
  }
  wireGestures() {
    let pid = null, die = null, moved = false, sx = 0, sy = 0, lpT = 0, trail = [], off = null;
    this.el.addEventListener('pointerdown', (e) => {
      if (pid !== null) return;
      if (e.target.closest('button')) return; // tap UI (? / son) : pas de capture, le clic passe
      const d = this.pick(e);
      if (!d || d.mode === 'fly' || d.mode === 'settle' || d.mode === 'spawn') return;
      pid = e.pointerId; die = d; moved = false;
      sx = e.clientX; sy = e.clientY;
      trail = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
      const hit = this.planeHit(e);
      const p = d.group.position;
      off = hit ? { x: p.x - hit.x, z: p.z - hit.z } : { x: 0, z: 0 };
      try { this.el.setPointerCapture(pid); } catch (_) { /* noop */ }
      lpT = setTimeout(() => {
        if (pid === null || moved) return;
        pid = null;
        this.removeDie(d);
        this.toast(`${d.def.label} retiré`);
      }, LONGPRESS_MS);
      e.preventDefault();
    });
    this.el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid || !die) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > TAP_SLOP) {
        moved = true;
        clearTimeout(lpT);
        die.mode = 'drag';
      }
      if (moved) {
        const hit = this.planeHit(e);
        if (hit) {
          const p = die.group.position, bc = die.coll;
          p.x = Math.min(Math.max(hit.x + off.x, -this.bx + bc), this.bx - bc);
          p.z = Math.min(Math.max(hit.z + off.z, -this.bz + bc), this.bz - bc);
          this.pushOthers(die);
        }
        trail.push({ t: performance.now(), x: e.clientX, y: e.clientY });
        if (trail.length > 6) trail.shift();
      }
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      clearTimeout(lpT);
      const d = die; die = null;
      if (!d || this.dice.indexOf(d) < 0) return;
      if (moved) {
        const a = trail[0], b = trail[trail.length - 1];
        const dt = Math.max(16, b.t - a.t) / 1000;
        const vx = ((b.x - a.x) / dt) * this.scale, vz = ((b.y - a.y) / dt) * this.scale;
        if (Math.hypot(vx, vz) > FLING_PX * this.scale) {
          const cl = Math.min(Math.hypot(vx, vz), 12) / Math.hypot(vx, vz);
          this.throwDie(d, vx * cl, vz * cl, 2.5, 0.9);
        } else {
          d.mode = 'rest';
          d.group.position.y = REST_Y;
        }
      } else this.rollSingle(d);
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', () => { pid = null; clearTimeout(lpT); die = null; });
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  pushOthers(d) {
    const p = d.group.position;
    for (const o of this.dice) {
      if (o === d || o.mode === 'fly' || o.mode === 'settle') continue;
      const q = o.group.position;
      const dx = q.x - p.x, dz = q.z - p.z;
      const dist = Math.hypot(dx, dz), min = d.coll + o.coll;
      if (dist < min && dist > 1e-4) {
        q.x += (dx / dist) * (min - dist);
        q.z += (dz / dist) * (min - dist);
        o.mode = 'slide'; o.flyTime = 0;
        o.vel.set((dx / dist) * 2, 0, (dz / dist) * 2);
      }
    }
  }
}
