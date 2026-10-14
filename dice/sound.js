// Sons synthétisés (Web Audio, zéro asset) : clac de lancer, rebonds, tick de posé.
// Une voix = bruit filtré + corps résonant, pitch/gain randomisés par événement.
const KEY = 'dicebox.sound';
const MAX_VOICES = 6;

function stored() {
  try { return localStorage.getItem(KEY); } catch (_) { return null; }
}

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.voices = 0;
    this.enabled = stored() !== '0';
    this.mq = matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = this.mq.matches;
    if (this.mq.addEventListener) this.mq.addEventListener('change', (e) => { this.reduced = e.matches; });
  }
  mul() { return this.reduced ? 0.5 : 1; } // mouv. réduits : volume réduit, pas muet
  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.3);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      return true;
    } catch (_) { this.ctx = null; return false; }
  }
  unlock() { // à appeler sur geste utilisateur (autoplay mobile)
    try {
      if (!this.ctx && !this.ensure()) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (_) { /* noop */ }
  }
  state() { // diagnostic affichable : off | suspended | running | unavailable
    if (!this.enabled) return 'off';
    if (!this.ctx) return 'unavailable';
    return this.ctx.state;
  }
  setEnabled(v) {
    this.enabled = !!v;
    try { localStorage.setItem(KEY, this.enabled ? '1' : '0'); } catch (_) { /* noop */ }
  }
  clack({ freq = 1200, q = 0.8, dur = 0.08, gain = 0.5, body = 150 } = {}) {
    if (!this.enabled) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.voices >= MAX_VOICES) return;
    try {
      const t = this.ctx.currentTime;
      const j = () => 0.85 + Math.random() * 0.3;
      const g0 = gain * this.mul();
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.playbackRate.value = j();
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq * j(); bp.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(Math.max(0.001, g0), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + 0.03);
      const o = this.ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = body * j();
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(Math.max(0.001, g0 * 0.7), t);
      og.gain.exponentialRampToValueAtTime(0.001, t + dur * 2.0);
      o.connect(og); og.connect(this.master);
      o.start(t); o.stop(t + dur * 2.0 + 0.03);
      this.voices++;
      setTimeout(() => { this.voices = Math.max(0, this.voices - 1); }, Math.ceil(dur * 1000) + 60);
    } catch (_) { /* noop */ }
  }
  throwClack() { this.clack({ freq: 1300, dur: 0.06, gain: 0.4, body: 150 }); }
  bounce(s) { // s : 0..1 intensité d'impact
    if (s <= 0.05) return;
    this.clack({ freq: 700 + 900 * s, dur: 0.04 + 0.05 * s, gain: 0.15 + 0.4 * s, body: 120 + 60 * s });
  }
  settle() { this.clack({ freq: 1700, dur: 0.045, gain: 0.22, body: 180 }); }
}
