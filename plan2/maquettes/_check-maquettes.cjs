/* Controle rapide des maquettes plan2 (outillage de developpement, pas un test applicatif). */
const { JSDOM } = require('jsdom');
const fs = require('fs');

const dir = 'plan2/maquettes/';
const results = [];

function check(file, name, ok) {
  results.push({ file, name, ok: !!ok });
}

/* 01 — topbar */
{
  const d = new JSDOM(fs.readFileSync(dir + '01-topbar-bouton-des.html', 'utf8')).window.document;
  check('01', '#btn-des present', d.getElementById('btn-des'));
  check('01', '3 pastilles dice-toggle (desktop + 2 telephones)', d.querySelectorAll('.dice-toggle').length === 3);
  const btns = Array.from(d.querySelectorAll('.topbar button'));
  check('01', 'des avant carte (desktop)', btns.findIndex(b => b.classList.contains('dice-toggle')) <
        btns.findIndex(b => b.classList.contains('map-toggle')));
  check('01', 'telephones sans ref-toggle ni theme-toggle', d.querySelectorAll('.mq-phone .ref-toggle, .mq-phone .theme-toggle').length === 0);
  check('01', 'icone svg dans chaque dice-toggle', d.querySelectorAll('.dice-toggle svg').length === 3);
}

/* 02 — menu utilisateur */
{
  const d = new JSDOM(fs.readFileSync(dir + '02-menu-utilisateur.html', 'utf8')).window.document;
  check('02', 'entree class-ref x2 (desktop + mobile)', d.querySelectorAll('[data-action="class-ref"]').length === 2);
  check('02', 'entree toggle-theme x2', d.querySelectorAll('[data-action="toggle-theme"]').length === 2);
  for (const menu of d.querySelectorAll('.user-menu')) {
    const btns = Array.from(menu.querySelectorAll('button'));
    check('02', 'class-ref avant change-theme', btns.findIndex(b => b.getAttribute('data-action') === 'class-ref') <
          btns.findIndex(b => b.getAttribute('data-action') === 'change-theme'));
    check('02', 'toggle-theme avant change-theme', btns.findIndex(b => b.getAttribute('data-action') === 'toggle-theme') <
          btns.findIndex(b => b.getAttribute('data-action') === 'change-theme'));
    check('02', 'class-ref avant toggle-theme', btns.findIndex(b => b.getAttribute('data-action') === 'class-ref') <
          btns.findIndex(b => b.getAttribute('data-action') === 'toggle-theme'));
    /* double barre : hr entre change-theme et export-all, en plus de hr import/password */
    const seq = Array.from(menu.children).map(el => el.tagName === 'HR' ? 'hr' :
      (el.getAttribute && el.getAttribute('data-action')) || '');
    const iCt = seq.indexOf('change-theme');
    check('02', 'double barre hr apres change-theme', seq.indexOf('hr', iCt + 1) > iCt &&
          seq.indexOf('hr', iCt + 1) < seq.indexOf('export-all'));
  }
}

/* 03 — dice tray */
{
  const d = new JSDOM(fs.readFileSync(dir + '03-dice-tray-plein-ecran.html', 'utf8')).window.document;
  check('03', '4 coquilles dt-module (2 desktops + 2 telephones)', d.querySelectorAll('.dt-module').length === 4);
  check('03', '4 croix dt-close', d.querySelectorAll('.dt-close').length === 4);
  const pickers = d.querySelectorAll('.dt-picker--desktop');
  check('03', 'picker desktop = 14 des', pickers.length === 2 && pickers[0].querySelectorAll('.dt-pick').length === 14);
  check('03', 'picker mobile = 7 des', d.querySelectorAll('.mq-phone .dt-picker')[0].querySelectorAll('.dt-pick').length === 7);
  check('03', '4 badges sur la partie', d.querySelectorAll('.bdg').length === 4);
  check('03', 'tapis vide dans la 1re vue', d.querySelectorAll('.dt-tray')[0].querySelectorAll('.dt-die').length === 0);
  check('03', '3 des dans la vue « partie »', d.querySelectorAll('.dt-tray')[1].querySelectorAll('.dt-die').length === 3);
  check('03', 'modale d aide presente', d.querySelectorAll('.dt-modal').length === 1);
  /* icone D20 sur les 3 boutons Lancer (emoji 🎲 retire) */
  const lanc = Array.from(d.querySelectorAll('.dt-act.primary'));
  check('03', '3 boutons Lancer', lanc.length === 3);
  check('03', 'icone D20 (svg) sur chaque Lancer', lanc.every(b => b.querySelector('svg')));
  check('03', 'emoji retire des boutons Lancer', lanc.every(b => !b.textContent.includes('🎲')));
  check('03', '3 boutons muets (source)', d.querySelectorAll('.dt-soundbtn').length === 3);
  check('03', 'encarts numerotes 1 sans doublon', (() => {
    const n = Array.from(d.querySelectorAll('.mq-note')).map(x => {
      const m = x.querySelector('.mq-num'); return m ? m.textContent : null;
    }).filter(Boolean);
    return new Set(n).size === n.length && n.includes('1') && n.includes('9');
  })());
}

/* 04 — bouton topbar reference complete */
{
  const d = new JSDOM(fs.readFileSync(dir + '04-topbar-bouton-ref.html', 'utf8')).window.document;
  check('04', '2 boutons ref-full-toggle (candidats A + B)', d.querySelectorAll('.ref-full-toggle').length === 2);
  check('04', 'icone svg dans chaque ref-full-toggle', d.querySelectorAll('.ref-full-toggle svg').length === 2);
  const btns = Array.from(d.querySelectorAll('.topbar button'));
  check('04', 'ref-full avant ref-toggle (candidat A)',
    btns.findIndex(b => b.classList.contains('ref-full-toggle')) <
    btns.findIndex(b => b.classList.contains('ref-toggle')));
  check('04', 'apercu .ref-full-toggle documente', d.querySelector('style').textContent.includes('.ref-full-toggle'));
}

/* 05 — entree menu reference */
{
  const d = new JSDOM(fs.readFileSync(dir + '05-menu-reference.html', 'utf8')).window.document;
  check('05', 'entree full-ref x2 (desktop + mobile)', d.querySelectorAll('[data-action="full-ref"]').length === 2);
  for (const menu of d.querySelectorAll('.user-menu')) {
    const btns = Array.from(menu.querySelectorAll('button'));
    check('05', 'full-ref avant class-ref (R2 propose)', btns.findIndex(b => b.getAttribute('data-action') === 'full-ref') <
          btns.findIndex(b => b.getAttribute('data-action') === 'class-ref'));
    /* double barre entre Classes et Mode Sombre : hr apres class-ref */
    const seq = Array.from(menu.children).map(el => el.tagName === 'HR' ? 'hr' :
      (el.getAttribute && el.getAttribute('data-action')) || '');
    const iCr = seq.indexOf('class-ref');
    check('05', 'double barre hr apres class-ref', seq.indexOf('hr', iCr + 1) > iCr &&
          seq.indexOf('hr', iCr + 1) < seq.indexOf('toggle-theme'));
  }
}

/* 06 — visionneuse reference complete */
{
  const d = new JSDOM(fs.readFileSync(dir + '06-viewer-reference.html', 'utf8')).window.document;
  check('06', 'chrome help-overlay + help-viewer + help-header', d.querySelectorAll('.help-overlay,.help-viewer,.help-header').length === 3);
  check('06', 'titre Référence complète', (d.querySelector('.help-title') || {}).textContent === 'Référence complète');
  check('06', 'sommaire : 5 sections + 8 entrees data-goto',
    d.querySelectorAll('.help-toc-sec').length === 5 && d.querySelectorAll('.help-toc [data-goto]').length === 8);
  check('06', '2 pages d exemple .page dans .spell-viewer',
    d.querySelectorAll('.spell-viewer .page').length === 2);
}

/* Sommaire */
{
  const d = new JSDOM(fs.readFileSync(dir + 'index.html', 'utf8')).window.document;
  const links = Array.from(d.querySelectorAll('a[href]')).map(a => a.getAttribute('href'));
  for (const href of ['01-topbar-bouton-des.html', '02-menu-utilisateur.html', '03-dice-tray-plein-ecran.html', '04-topbar-bouton-ref.html', '05-menu-reference.html', '06-viewer-reference.html']) {
    check('index', 'lien ' + href, links.includes(href) && fs.existsSync(dir + href));
  }
}

let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log((r.ok ? 'ok  ' : 'FAIL') + '  ' + r.file + '  ' + r.name);
}
console.log(fail === 0 ? '\nToutes les maquettes sont coherentes (' + results.length + ' controles).' : '\n' + fail + ' controle(s) en echec.');
process.exit(fail === 0 ? 0 : 1);
