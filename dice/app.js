// Câblage UI du tapis de dés — portage dice-box-dcc → dcc-sheet (R4).
// Pas de boot auto : dice-tray.js charge ce module en lazy (C5) puis appelle
// initDiceTray(root, opts) une seule fois. Toutes les requêtes sont scopées
// au conteneur #dice-module, ids préfixés dice- (C3).
// R7 : aucune persistance — hors préférence muet du SoundBank
// (localStorage['dicebox.sound'], seule écriture autorisée), rien n'est écrit.
import { DICE } from './config.js';
import { Tray } from './tray.js';
import { renderThumbs } from './thumbs.js';
import { SoundBank } from './sound.js';

export function initDiceTray(root, opts) {
  opts = opts || {};
  const $ = (id) => root.querySelector('#' + id);
  const picker = $('dice-picker');
  const trayEl = $('dice-tray');
  const toastEl = $('dice-toast');
  const totalEl = $('dice-total');
  const helpModal = $('dice-helpModal');
  const emptyHint = $('dice-hint');

  let toastT = null;
  // Toasts redirigés vers showToast de l'app ; repli sur la pastille
  // interne du tapis si aucun orchestrateur n'est fourni.
  function toast(msg, ms = 2200) {
    if (opts.toast) { opts.toast(msg); return; }
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  const sound = new SoundBank();
  // Déblocage autoplay (mobile) : premier geste DANS le module → actif.
  root.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
  root.addEventListener('pointerup', () => sound.unlock(), { passive: true });
  root.addEventListener('keydown', () => sound.unlock());

  const tray = new Tray(trayEl, {
    onTotal: (t) => {
      if (t == null) totalEl.hidden = true;
      else { totalEl.textContent = t; totalEl.hidden = false; }
    },
    toast,
    sound,
  });

  DICE.forEach((def) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.type = 'button';
    b.setAttribute('aria-label', `Ajouter un ${def.label}`);
    const img = document.createElement('img');
    img.alt = '';
    img.style.background = def.color;
    b.append(img, Object.assign(document.createElement('span'), { textContent: def.label }));
    b.addEventListener('click', () => tray.addDie(def));
    picker.appendChild(b);
  });
  // Vignettes : miniatures 3D réellement rendues (WebGL) ; les aplats
  // colorés ci-dessus ne sont que le repli si WebGL échoue (C13).
  try {
    const thumbs = renderThumbs(DICE);
    [...picker.children].forEach((b, i) => {
      const img = b.querySelector('img');
      img.style.background = 'none';
      img.src = thumbs.get(DICE[i].label);
    });
  } catch (err) {
    console.warn('miniatures 3D indisponibles', err);
  }
  // « tapis vide » : visible à l'ouverture, retiré au premier dé (R5).
  if (emptyHint) emptyHint.hidden = false;
  const addDie = tray.addDie.bind(tray);
  tray.addDie = (def) => {
    const d = addDie(def);
    if (d && emptyHint) emptyHint.hidden = true;
    return d;
  };

  $('dice-rollBtn').addEventListener('click', () => tray.rollAll());
  $('dice-clearBtn').addEventListener('click', () => {
    if (!tray.dice.length) { toast('Le tapis est déjà vide'); return; }
    tray.clear();
    toast('Tapis vidé');
  });
  totalEl.addEventListener('click', () => tray.hideTotal());

  const soundBtn = $('dice-soundBtn');
  function paintSound() {
    soundBtn.textContent = sound.enabled ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', sound.enabled ? 'Couper le son' : 'Activer le son');
  }
  soundBtn.addEventListener('click', () => {
    sound.unlock();
    sound.setEnabled(!sound.enabled);
    paintSound();
    const st = sound.state();
    const detail = st === 'running' ? 'moteur actif'
      : st === 'suspended' ? 'moteur en pause — retouchez' : st;
    toast(sound.enabled ? `🔊 Son activé (${detail})` : '🔇 Son coupé');
    if (sound.enabled) sound.settle(); // bip de confirmation
  });
  paintSound();

  $('dice-helpBtn').addEventListener('click', () => { helpModal.hidden = false; });
  $('dice-hClose').addEventListener('click', () => { helpModal.hidden = true; });
  helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.hidden = true; });
  // Pas de handler Échap ici : dice-tray.js gère (modale d'abord, puis
  // module — comportement source conservé, C10).

  // R5 : pas de démo de démarrage (le source ajoutait D20 + D6 + D8).

  // API de cycle de vie pour dice-tray.js (C6) : fermeture = masquage seul,
  // boucle de rendu et AudioContext en veille, état du tapis en mémoire.
  return {
    pause: () => tray.pause(),
    resume: () => tray.resume(),
  };
}
