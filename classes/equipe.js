window.DCCModules = window.DCCModules || {};

window.DCCModules.equipe = {
  render(container, characters, onSavePV, initialNotes, onSaveNotes, marchingOrder, onSaveMarching,
    initialState, onSaveTeamState) {
    const CLASS_LABELS = {
      clerc: 'Clerc', elfe: 'Elfe', guerrier: 'Guerrier',
      halfelin: 'Halfelin', mage: 'Mage', nain: 'Nain', voleur: 'Voleur',
      lvl0: 'Niv.0'
    };
    let expandedCharacterId = null;
    let expandedStatsId = null;

    /* --- État combat (Init. combat, tours, ennemis) -----------------------
       Persistance via team-state.js (optionnel, comme dead-overlay.js) :
       sans ce fichier ou sans callback, pas de sauvegarde (comportement
       historique — chargeurs partiels, tests isolés).

       L'état est RELU dans le DOM au moment de la sauvegarde : aucun
       bookkeeping d'index, donc un ajout/suppression de ligne, une RAZ ou une
       resync ne peuvent pas désynchroniser ce qui part en base. */
    const teamStateEnabled = !!(window.DCCTeamState &&
      typeof window.DCCTeamState.sanitize === 'function' &&
      typeof onSaveTeamState === 'function');
    const teamStateInitial = window.DCCTeamState
      ? window.DCCTeamState.normalize(initialState, characters)
      : null;
    let teamStateTimer = null;
    let enemyBody = null;

    function snapshotTeamState() {
      const raw = { init_combat: {}, tours: {}, ennemis: [] };
      container.querySelectorAll('tr[data-char-id]').forEach(function (tr) {
        const id = tr.getAttribute('data-char-id');
        const input = tr.querySelector('.init-combat-input');
        if (input && String(input.value).trim() !== '') raw.init_combat[id] = String(input.value).trim();
        const counter = tr.querySelector('.turn-counter');
        if (counter && typeof counter.getTurn === 'function') {
          const turn = counter.getTurn();
          if (turn > 0) raw.tours[id] = turn;
        }
      });
      if (enemyBody) {
        enemyBody.querySelectorAll('tr').forEach(function (tr) {
          raw.ennemis.push({
            nom: cellValue(tr, 0),
            ac: cellValue(tr, 1),
            att: cellValue(tr, 2),
            pv: cellValue(tr, 3),
            init: cellValue(tr, 4),
            tour: (function () {
              const c = tr.children[5] ? tr.children[5].querySelector('.turn-counter') : null;
              return c && typeof c.getTurn === 'function' ? c.getTurn() : 0;
            })(),
          });
        });
      }
      /* sanitize() filtre les lignes d'ennemis entièrement vides et borne tout */
      return window.DCCTeamState.sanitize(raw);
    }

    function cellValue(tr, index) {
      const td = tr.children[index];
      const input = td ? td.querySelector('input') : null;
      return input ? String(input.value).trim() : '';
    }

    /* Debounce identique aux notes d'équipe (600 ms) ; aucune écriture si
       l'état n'a pas changé → le serveur reçoit la même charge à chaque fois,
       pas de toast inutile en pleine combat (le callback central gère le toast
       et l'erreur). */
    function scheduleTeamStateSave() {
      if (!teamStateEnabled) return;
      clearTimeout(teamStateTimer);
      teamStateTimer = setTimeout(function () {
        const payload = snapshotTeamState();
        Promise.resolve(onSaveTeamState(payload)).catch(function () {
          if (window.showToast) window.showToast('Erreur sauvegarde état équipe', 'error');
        });
      }, 600);
    }

    /* --- Ordre de marche : état --- */
    const onSaveMarchingCb = typeof onSaveMarching === 'function' ? onSaveMarching : null;
    let marchingMap = initMarchingMap(marchingOrder);
    let marchGrid = null;
    let marchMeta = null;
    let pending = null;
    let drag = null;
    let ghost = null;

    const STAT_COLS = [
      { key: 'force', label: 'FOR' },
      { key: 'agilite', label: 'AGI', group: true },
      { key: 'endurance', label: 'END', group: true, chevron: true },
      { key: 'presence', label: 'PRE', group: true },
      { key: 'chance', label: 'CHA' },
      { key: 'intelligence', label: 'INT' },
    ];
    const JDS_COLS = [
      { key: 'js_reflexe', label: 'JdS REF' },
      { key: 'js_vigueur', label: 'JdS VIG' },
      { key: 'js_volonte', label: 'JdS VOL' },
    ];

    function createTurnCounter() {
      const counter = document.createElement('div');
      counter.className = 'turn-counter';
      counter.textContent = '0';

      function updateFill(turn) {
        var pct = turn === 0 ? 0 : (turn % 5 === 0 ? 100 : (turn % 5) * 20);
        counter.style.setProperty('--fill', pct + '%');
      }

      function getTurn() {
        var n = parseInt(counter.textContent || '0', 10);
        return isFinite(n) && n > 0 ? n : 0;
      }

      /* Restauration depuis la base : valeur + remplissage (aucune notification,
         ce n'est pas une action utilisateur) */
      function setTurn(turn) {
        var n = turn > 0 ? turn : 0;
        counter.textContent = String(n);
        updateFill(n);
      }

      /* Changement utilisateur (clic / clic droit / appui long) → notifier */
      function notifyTurnChange() {
        if (typeof counter.onTurnChange === 'function') counter.onTurnChange(getTurn());
      }

      function reset() {
        setTurn(0);
        notifyTurnChange();
      }

      function increment() {
        setTurn(getTurn() + 1);
        notifyTurnChange();
      }

      counter.addEventListener('click', function (e) {
        e.preventDefault();
        increment();
      });

      counter.resetTurn = reset;
      counter.setTurn = setTurn;
      counter.getTurn = getTurn;

      counter.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        reset();
      });

      let longPressTimer = null;
      counter.addEventListener('touchstart', function (e) {
        longPressTimer = setTimeout(function () {
          reset();
          longPressTimer = null;
        }, 500);
      }, { passive: true });

      counter.addEventListener('touchend', function (e) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }, { passive: true });

      counter.addEventListener('touchmove', function () {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }, { passive: true });

      return counter;
    }

    function statCellHtml(label, value) {
      const raw = (value == null ? '' : String(value)).trim();
      const has = raw !== '';
      const shown = has ? raw : '-';
      return '<div class="team-stat-cell">' +
        '<span class="team-stat-label">' + label + '</span>' +
        '<span class="team-stat-value' + (has ? '' : ' empty') + '">' + shown + '</span>' +
      '</div>';
    }

    function parsedDataOf(charData) {
      const d = {};
      try { Object.assign(d, JSON.parse(charData.data || '{}')); } catch (e) {}
      return d;
    }

    /* ------------------------------------------------------------------
       Overlay "tete de mort" (PV courants <= 0) sur les portraits.
       Les helpers de dead-overlay.js sont optionnels : sans ce fichier,
       aucun wrap ni overlay (chargeurs partiels, tests isoles).
    ------------------------------------------------------------------ */
    function deadOverlay() {
      return window.DCCDeadOverlay || null;
    }

    function applyDead(portrait, pv) {
      const D = deadOverlay();
      if (D && portrait) D.apply(portrait, D.isDead(pv));
    }

    /* Pose/retire l'overlay sur les deux portraits d'un perso :
       case d'ordre de marche + colonne Classe (expedition). */
    function refreshDeadOverlay(id, pv) {
      const D = deadOverlay();
      if (!D) return;
      const dead = D.isDead(pv);
      const tr = container.querySelector('tr[data-char-id="' + id + '"]');
      if (tr) D.apply(tr.querySelector('.team-portrait'), dead);
      const slot = marchGrid ? marchGrid.querySelector('.marching-slot[data-id="' + id + '"]') : null;
      if (slot) D.apply(slot.querySelector('.marching-portrait'), dead);
    }

    /* Le modele suit la saisie : un re-render ulterieur (drag, resync) ne
       doit pas repartir d'une ancienne valeur de PV. */
    function setModelPV(id, value) {
      characters.forEach(function (c) {
        if (String(c.id) !== String(id)) return;
        const d = parsedDataOf(c);
        d.points_de_vie = value;
        c.data = JSON.stringify(d);
      });
    }

    function buildDetailRow(charData, data) {
      const trD = document.createElement('tr');
      trD.className = 'team-detail';
      trD.id = 'team-detail-' + charData.id;
      const td = document.createElement('td');
      td.colSpan = 7;
      td.innerHTML =
        '<div class="team-detail-wrap"><div class="team-detail-inner">' +
          '<div class="team-detail-pad">' +
            '<div class="team-stat-line">' +
              statCellHtml('⚔ Att CàC', data.attaque_cac) +
              statCellHtml('⚔ Dég CàC', data.degats_cac) +
            '</div>' +
            '<div class="team-stat-line">' +
              statCellHtml('🏹 Att Dist.', data.att_distance) +
              statCellHtml('🏹 Dég Dist.', data.degats_distance) +
            '</div>' +
          '</div>' +
        '</div></div>';
      trD.appendChild(td);
      return trD;
    }

    function setExpandedUi(tdClass, open) {
      if (!tdClass) return;
      tdClass.setAttribute('aria-expanded', open ? 'true' : 'false');
      const chevron = tdClass.querySelector('.chevron');
      if (chevron) chevron.textContent = open ? '▲' : '▼';
    }

    function closeExpanded(immediate) {
      const openTd = container.querySelector('.char-class[aria-expanded="true"]');
      const openTr = container.querySelector('tr.team-detail');
      const wasOpen = expandedCharacterId != null;
      expandedCharacterId = null;
      if (openTd) setExpandedUi(openTd, false);
      if (openTr) {
        if (immediate) {
          openTr.remove();
        } else if (wasOpen) {
          openTr.classList.remove('open');
          setTimeout(function () {
            if (openTr.parentNode) openTr.remove();
          }, 250);
        }
      }
    }

    function toggleDetail(charData, data, tdClass, tr) {
      if (expandedCharacterId === charData.id) {
        closeExpanded(false);
        return;
      }
      closeExpanded(true);
      expandedCharacterId = charData.id;
      setExpandedUi(tdClass, true);
      const trD = buildDetailRow(charData, data);
      tr.parentNode.insertBefore(trD, tr.nextSibling);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          trD.classList.add('open');
        });
      });
    }

    function parseStatNum(raw) {
      if (raw == null) return null;
      const s = String(raw).trim();
      if (s === '') return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }

    function computeColExtremes(parsedRows, key) {
      let min = null;
      let max = null;
      let count = 0;
      parsedRows.forEach(function (row) {
        const n = row.nums[key];
        if (n == null) return;
        count += 1;
        if (min === null || n < min) min = n;
        if (max === null || n > max) max = n;
      });
      if (count < 2 || min === null || max === null || min === max) {
        return { min: null, max: null };
      }
      return { min: min, max: max };
    }

    function statDisplay(raw) {
      const s = raw == null ? '' : String(raw).trim();
      return s === '' ? '-' : s;
    }

    function buildStatsDetailRow(charData, data) {
      const trD = document.createElement('tr');
      trD.className = 'team-stats-detail';
      trD.id = 'stats-detail-' + charData.id;
      const td = document.createElement('td');
      td.colSpan = 7;
      let cells = '';
      JDS_COLS.forEach(function (col) {
        cells += statCellHtml(col.label, data[col.key]);
      });
      td.innerHTML =
        '<div class="team-detail-wrap"><div class="team-detail-inner">' +
          '<div class="team-detail-pad">' +
            '<div class="team-stat-line">' + cells + '</div>' +
          '</div>' +
        '</div></div>';
      trD.appendChild(td);
      return trD;
    }

    function setStatsExpandedUi(trRow, open) {
      if (!trRow) return;
      const cells = trRow.querySelectorAll('.stat-group[role="button"]');
      cells.forEach(function (td) {
        td.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      const chevron = trRow.querySelector('.stat-chevron-cell .chevron');
      if (chevron) chevron.textContent = open ? '▲' : '▼';
    }

    function closeStatsExpanded(immediate) {
      const openTr = container.querySelector('tr.team-stats-detail');
      const openRow = openTr && openTr.previousElementSibling &&
        openTr.previousElementSibling.classList.contains('stats-char-row')
        ? openTr.previousElementSibling : null;
      const wasOpen = expandedStatsId != null;
      expandedStatsId = null;
      if (openRow) setStatsExpandedUi(openRow, false);
      if (openTr) {
        if (immediate) {
          openTr.remove();
        } else if (wasOpen) {
          openTr.classList.remove('open');
          setTimeout(function () {
            if (openTr.parentNode) openTr.remove();
          }, 250);
        }
      }
    }

    function toggleStatsDetail(charData, data, tr) {
      if (expandedStatsId === charData.id) {
        closeStatsExpanded(false);
        return;
      }
      closeStatsExpanded(true);
      expandedStatsId = charData.id;
      setStatsExpandedUi(tr, true);
      const trD = buildStatsDetailRow(charData, data);
      tr.parentNode.insertBefore(trD, tr.nextSibling);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          trD.classList.add('open');
        });
      });
    }

    function buildStatsSection() {
      const fragment = document.createDocumentFragment();

      const section = document.createElement('div');
      section.className = 'section-bar';
      section.textContent = 'Statistiques';
      fragment.appendChild(section);

      const table = document.createElement('table');
      table.className = 'team-table team-table-stats';

      const thead = document.createElement('thead');
      let thHtml = '<tr><th style="text-align:left">Nom</th>';
      STAT_COLS.forEach(function (col) {
        const groupCls = col.group ? ' class="stat-group"' : '';
        thHtml += '<th' + groupCls + '>' + col.label + '</th>';
      });
      thHtml += '</tr>';
      thead.innerHTML = thHtml;
      table.appendChild(thead);

      const parsedRows = characters.map(function (charData) {
        const data = {};
        try { Object.assign(data, JSON.parse(charData.data || '{}')); } catch (e) {}
        const nums = {};
        STAT_COLS.forEach(function (col) {
          nums[col.key] = parseStatNum(data[col.key]);
        });
        return { charData: charData, data: data, nums: nums };
      });

      const extremes = {};
      STAT_COLS.forEach(function (col) {
        extremes[col.key] = computeColExtremes(parsedRows, col.key);
      });

      const tbody = document.createElement('tbody');
      parsedRows.forEach(function (row) {
        const charData = row.charData;
        const data = row.data;
        const tr = document.createElement('tr');
        tr.className = 'stats-char-row';
        tr.setAttribute('data-id', charData.id);
        tr._charData = charData;

        const tdName = document.createElement('td');
        tdName.className = 'char-name';
        tdName.textContent = charData.name || 'Sans nom';
        tdName.title = charData.name || 'Sans nom';
        tdName.style.cursor = 'pointer';
        tdName.addEventListener('click', function () {
          const cd = tr._charData || charData;
          window.switchTab(cd.class);
          setTimeout(function () {
            window.openSheet(cd.class, cd);
          }, 100);
        });
        tr.appendChild(tdName);

        let groupIndex = 0;
        const groupCells = STAT_COLS.filter(function (c) { return c.group; });

        STAT_COLS.forEach(function (col) {
          const td = document.createElement('td');
          const n = row.nums[col.key];
          const ex = extremes[col.key];
          if (n != null && ex.max != null && n === ex.max) td.classList.add('stat-max');
          if (n != null && ex.min != null && n === ex.min) td.classList.add('stat-min');

          if (col.group) {
            td.classList.add('stat-group');
            if (groupIndex === 0) td.classList.add('stat-group-start');
            if (groupIndex === groupCells.length - 1) td.classList.add('stat-group-end');
            groupIndex += 1;
            td.setAttribute('role', 'button');
            td.setAttribute('tabindex', '0');
            td.setAttribute('aria-expanded', expandedStatsId === charData.id ? 'true' : 'false');
            td.setAttribute('aria-controls', 'stats-detail-' + charData.id);

            const val = document.createElement('span');
            val.className = 'val';
            val.textContent = statDisplay(data[col.key]);
            td.appendChild(val);

            if (col.chevron) {
              td.classList.add('stat-chevron-cell');
              const chevron = document.createElement('span');
              chevron.className = 'chevron';
              chevron.setAttribute('aria-hidden', 'true');
              chevron.textContent = expandedStatsId === charData.id ? '▲' : '▼';
              td.appendChild(chevron);
            }

            td.addEventListener('click', function () {
              toggleStatsDetail(charData, data, tr);
            });
            td.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleStatsDetail(charData, data, tr);
              }
            });
          } else {
            td.textContent = statDisplay(data[col.key]);
          }
          tr.appendChild(td);
        });

        tbody.appendChild(tr);

        if (expandedStatsId === charData.id) {
          tbody.appendChild(buildStatsDetailRow(charData, data));
          const openTr = tbody.lastElementChild;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              openTr.classList.add('open');
            });
          });
        }
      });

      table.appendChild(tbody);
      fragment.appendChild(table);
      return fragment;
    }

    /* rowState = ligne sauvegardée ({nom, ac, att, pv, init, tour}) ou null */
    function createEnemyRow(rowState) {
      const tr = document.createElement('tr');

      const fields = [
        { key: 'nom', tag: 'input', type: 'text', placeholder: 'Nom', label: 'Nom de l\'ennemi' },
        { key: 'ac', tag: 'input', type: 'number', placeholder: '', label: 'Classe d\'armure (AC)' },
        { key: 'att', tag: 'input', type: 'text', placeholder: '', label: 'Attaque (ATT)' },
        { key: 'pv', tag: 'input', type: 'number', placeholder: '', label: 'Points de vie (PV)' },
        { key: 'init', tag: 'input', type: 'number', placeholder: '', label: 'Initiative' },
      ];

      fields.forEach(function (f) {
        const td = document.createElement('td');
        const input = document.createElement(f.tag);
        input.type = f.type;
        input.placeholder = f.placeholder;
        input.className = 'enemy-field enemy-' + f.key;
        input.setAttribute('aria-label', f.label);
        if (rowState && rowState[f.key] !== undefined && rowState[f.key] !== null) {
          input.value = rowState[f.key];
        }
        input.addEventListener('input', scheduleTeamStateSave);
        input.addEventListener('change', scheduleTeamStateSave);
        td.appendChild(input);
        tr.appendChild(td);
      });

      const tdCounter = document.createElement('td');
      const counter = createTurnCounter();
      counter.onTurnChange = scheduleTeamStateSave;
      if (rowState) counter.setTurn(rowState.tour || 0);
      tdCounter.appendChild(counter);
      tr.appendChild(tdCounter);

      return tr;
    }

    /* ------------------------------------------------------------------
       Ordre de marche — grille 3×3 + drag & drop unifié (Pointer Events)
       · souris  : déplacement dès que le curseur bouge (clic maintenu)
       · tactile : appui long ~400 ms AVANT d'activer le déplacement ;
                   le défilement reste possible tant que le timer n'a pas
                   expiré (touch-action: pan-y + annulation si l'utilisateur
                   bouge avant les 400 ms)
    ------------------------------------------------------------------ */

    const LONG_PRESS_MS = 400;
    const DRAG_SLOP = 8;
    const MOUSE_SLOP = 4;

    function initMarchingMap(raw) {
      if (window.DCCMarching) {
        return window.DCCMarching.normalize(raw, characters).order;
      }
      const map = {};
      characters.forEach(function (c, i) {
        if (i < 9) map[c.id] = i;
      });
      return map;
    }

    function charAtPos(pos) {
      for (let i = 0; i < characters.length; i++) {
        if (marchingMap[characters[i].id] === pos) return characters[i];
      }
      return null;
    }

    function renderMarchingGrid() {
      if (!marchGrid) return;
      marchGrid.innerHTML = '';
      for (let pos = 0; pos < 9; pos++) {
        const slot = document.createElement('div');
        slot.className = 'marching-slot';
        slot.dataset.pos = String(pos);
        const ch = charAtPos(pos);
        if (ch) {
          slot.classList.add('occupied');
          slot.dataset.id = String(ch.id);
          const data = parsedDataOf(ch);
          let portrait = null;
          if (window.getPortraitSrc) {
            try {
              const pr = window.getPortraitSrc(data.portrait_source || 'dcc', ch.class, data.portrait_index);
              if (pr && pr.src) {
                if (window.DCCPortraitGuard && window.DCCPortraitGuard.isMissing(pr.source)) {
                  /* Dossier absent : placeholder, aucune requete */
                  portrait = window.DCCPortraitGuard.placeholder('marching-portrait');
                } else {
                  portrait = document.createElement('img');
                  portrait.className = 'marching-portrait';
                  portrait.alt = '';
                  portrait.src = pr.src;
                }
              }
            } catch (e) { portrait = null; }
          }
          if (!portrait) {
            portrait = document.createElement('div');
            portrait.className = 'marching-portrait marching-portrait-fallback';
            portrait.textContent = (ch.name || '?').charAt(0).toUpperCase();
          }
          const nameEl = document.createElement('div');
          nameEl.className = 'marching-name';
          nameEl.textContent = ch.name || 'Sans nom';
          nameEl.title = ch.name || '';
          slot.appendChild(portrait);
          slot.appendChild(nameEl);
          applyDead(portrait, data.points_de_vie);
        }
        marchGrid.appendChild(slot);
      }
      if (marchMeta) {
        const n = characters.length;
        const shown = Math.min(n, 9);
        marchMeta.textContent = n + ' perso' + (n > 1 ? 's' : '') + ' en expédition · ' +
          shown + '/9 affiché' + (shown > 1 ? 's' : '') +
          (n > 9 ? ' · ' + (n - 9) + ' hors grille' : '');
      }
    }

    function buildMarchingSection() {
      const frag = document.createDocumentFragment();

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'section-bar collapse-toggle';
      toggle.id = 'marching-toggle';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-controls', 'marching-panel');
      const label = document.createElement('span');
      label.textContent = 'Ordre de marche';
      const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chev.setAttribute('class', 'chev');
      chev.setAttribute('viewBox', '0 0 16 16');
      chev.setAttribute('aria-hidden', 'true');
      chev.setAttribute('focusable', 'false');
      const chevPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      chevPath.setAttribute('d', 'M3 5.5 L8 10.5 L13 5.5');
      chevPath.setAttribute('fill', 'none');
      chevPath.setAttribute('stroke', 'currentColor');
      chevPath.setAttribute('stroke-width', '2.2');
      chevPath.setAttribute('stroke-linecap', 'round');
      chevPath.setAttribute('stroke-linejoin', 'round');
      chev.appendChild(chevPath);
      toggle.appendChild(label);
      toggle.appendChild(chev);

      const collapsible = document.createElement('div');
      collapsible.className = 'collapsible';
      collapsible.id = 'marching-panel';
      const inner = document.createElement('div');
      inner.className = 'collapsible-inner';
      const panel = document.createElement('div');
      panel.className = 'marching-panel';

      const arrow = document.createElement('div');
      arrow.className = 'marching-arrow';
      arrow.title = 'Direction du groupe';
      arrow.textContent = '⬆';

      const grid = document.createElement('div');
      grid.className = 'marching-grid';
      grid.setAttribute('aria-label', 'Grille d\'ordre de marche 3 par 3');

      const meta = document.createElement('div');
      meta.className = 'marching-meta';

      panel.appendChild(arrow);
      panel.appendChild(grid);
      panel.appendChild(meta);
      inner.appendChild(panel);
      collapsible.appendChild(inner);

      toggle.addEventListener('click', function () {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        collapsible.classList.toggle('collapsed', open);
        toggle.classList.toggle('collapsed', open);
      });

      grid.addEventListener('pointerdown', onMarchPointerDown);
      grid.addEventListener('pointermove', onMarchPointerMove, { passive: false });
      grid.addEventListener('pointerup', onMarchPointerUp);
      grid.addEventListener('pointercancel', onMarchPointerCancel);
      grid.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      frag.appendChild(toggle);
      frag.appendChild(collapsible);

      marchGrid = grid;
      marchMeta = meta;
      return frag;
    }

    function slotFromPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest('.marching-slot') : null;
    }

    function onMarchPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const slot = e.target && e.target.closest ? e.target.closest('.marching-slot') : null;
      if (!slot || !slot.dataset.id) return; /* cases vides : non déplaçables */
      e.preventDefault();
      try { slot.setPointerCapture(e.pointerId); } catch (err) {}

      pending = {
        id: slot.dataset.id,
        slot: slot,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        fromPos: parseInt(slot.dataset.pos, 10),
        timer: null,
        active: false
      };

      if (pending.pointerType !== 'mouse') {
        pending.timer = setTimeout(function () {
          if (pending && !pending.active) activateMarchDrag(pending.startX, pending.startY);
        }, LONG_PRESS_MS);
      }
    }

    function onMarchPointerMove(e) {
      if (!pending && !drag) return;
      if (pending && !pending.active) {
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (pending.pointerType === 'mouse') {
          if (dist > MOUSE_SLOP) activateMarchDrag(pending.startX, pending.startY);
          else return;
        } else {
          /* Tactile avant appui long : bouger = défilement → annuler le timer */
          if (dist > DRAG_SLOP) { clearMarchPending(); return; }
          return;
        }
      }
      if (drag) {
        moveMarchGhost(e.clientX, e.clientY);
        updateMarchTarget(e.clientX, e.clientY);
        if (e.cancelable) e.preventDefault();
      }
    }

    function activateMarchDrag(x, y) {
      if (!pending || pending.active) return;
      const p = pending;
      clearTimeout(p.timer);
      p.active = true;
      drag = p;

      const slot = p.slot;
      slot.classList.add('dragging-src');
      if (marchGrid) marchGrid.classList.add('marching-dragging');
      document.body.classList.add('marching-active');
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }

      /* Portrait flottant = carte soulevée, avec nom superposé */
      const ch = characters.filter(function (c) { return String(c.id) === p.id; })[0];
      ghost = document.createElement('div');
      ghost.className = 'marching-ghost';
      ghost.style.width = slot.offsetWidth + 'px';
      ghost.style.height = slot.offsetHeight + 'px';
      const portraitClone = slot.querySelector('.portrait-holder') ||
        slot.querySelector('.marching-portrait');
      if (portraitClone) ghost.appendChild(portraitClone.cloneNode(true));
      const overlay = document.createElement('div');
      overlay.className = 'marching-name-overlay';
      overlay.textContent = ch ? (ch.name || '') : '';
      ghost.appendChild(overlay);
      document.body.appendChild(ghost);

      moveMarchGhost(x, y);
      updateMarchTarget(x, y);
      document.addEventListener('touchmove', onMarchTouchMove, { passive: false });
    }

    function moveMarchGhost(x, y) {
      if (!ghost) return;
      const w = ghost.offsetWidth;
      const h = ghost.offsetHeight;
      /* centré sur le pointeur + légère remontée pour ne pas masquer la cible */
      const gx = x - w / 2;
      const gy = y - h / 2 - (pending && pending.pointerType !== 'mouse' ? 14 : 0);
      ghost.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0) scale(1.06)';
    }

    function updateMarchTarget(x, y) {
      if (!marchGrid) return;
      const prev = marchGrid.querySelector('.marching-slot.drop-target');
      if (prev) prev.classList.remove('drop-target');
      const slot = slotFromPoint(x, y);
      if (slot && drag && slot !== drag.slot) slot.classList.add('drop-target');
    }

    function onMarchPointerUp(e) {
      if (pending && !pending.active) { clearMarchPending(); return; } /* simple tap */
      if (!drag) return;

      const target = slotFromPoint(e.clientX, e.clientY);
      const fromPos = drag.fromPos;
      const id = drag.id;
      cleanupMarchDrag();

      if (!target) { renderMarchingGrid(); return; }          /* relâché hors grille */
      const toPos = parseInt(target.dataset.pos, 10);
      if (isNaN(toPos) || toPos === fromPos) { renderMarchingGrid(); return; } /* sans changement */

      const occupant = charAtPos(toPos);
      if (occupant && String(occupant.id) !== id) {
        /* Case occupée → échange instantané, sans confirmation */
        marchingMap[occupant.id] = fromPos;
        marchingMap[id] = toPos;
      } else {
        /* Case vide → simple déplacement */
        marchingMap[id] = toPos;
      }
      if (onSaveMarchingCb) onSaveMarchingCb(Object.assign({}, marchingMap));
      renderMarchingGrid();
    }

    function onMarchPointerCancel() {
      if (drag) { cleanupMarchDrag(); renderMarchingGrid(); }
      else clearMarchPending();
    }

    function clearMarchPending() {
      if (pending) {
        clearTimeout(pending.timer);
        if (!pending.active) {
          try { pending.slot.releasePointerCapture(pending.pointerId); } catch (e) {}
        }
      }
      pending = null;
    }

    function cleanupMarchDrag() {
      if (drag) {
        clearTimeout(drag.timer);
        try { drag.slot.releasePointerCapture(drag.pointerId); } catch (e) {}
        drag.slot.classList.remove('dragging-src');
      }
      if (marchGrid) {
        marchGrid.classList.remove('marching-dragging');
        const t = marchGrid.querySelector('.marching-slot.drop-target');
        if (t) t.classList.remove('drop-target');
      }
      document.body.classList.remove('marching-active');
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      drag = null;
      pending = null;
      document.removeEventListener('touchmove', onMarchTouchMove);
    }

    /* Bloque le défilement de la page UNIQUEMENT pendant un drag actif */
    function onMarchTouchMove(e) {
      if (drag && e.cancelable) e.preventDefault();
    }

    function render() {
      /* Un render précédent peut laisser un listener document (drag en cours) */
      const prevCleanup = window.DCCModules.equipe._cleanupMarchDrag;
      if (typeof prevCleanup === 'function') prevCleanup();
      window.DCCModules.equipe._cleanupMarchDrag = cleanupMarchDrag;
      container.innerHTML = '';
      marchGrid = null;
      marchMeta = null;
      enemyBody = null;

      // Section Ordre de marche (hors scope si 0 PJ)
      if (characters.length > 0) {
        container.appendChild(buildMarchingSection());
        renderMarchingGrid();
      }

      // Section personnages actifs
      const sectionChars = document.createElement('div');
      sectionChars.className = 'section-bar';
      sectionChars.textContent = 'Personnages en expédition';
      container.appendChild(sectionChars);

      if (characters.length === 0) {
        const empty = document.createElement('div');
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--muted)';
        empty.style.padding = '20px';
        empty.style.fontStyle = 'italic';
        empty.textContent = 'Aucun personnage en expédition.';
        container.appendChild(empty);
      } else {
        const tableChars = document.createElement('table');
        tableChars.className = 'team-table';

        const thead = document.createElement('thead');
        thead.innerHTML = '<tr>' +
          '<th style="text-align:left">Nom</th>' +
          '<th>Classe</th>' +
          '<th>Init.</th>' +
          '<th>AC</th>' +
          '<th>PV</th>' +
          '<th>Init. combat</th>' +
          '<th>Tour</th>' +
          '</tr>';
        tableChars.appendChild(thead);

        const tbody = document.createElement('tbody');

        characters.forEach(function (charData) {
          const data = {};
          try { Object.assign(data, JSON.parse(charData.data || '{}')); } catch (e) {}

          const tr = document.createElement('tr');
          tr.dataset.charId = charData.id;
          tr._charData = charData;

          // Nom
          const tdName = document.createElement('td');
          tdName.className = 'char-name';
          tdName.textContent = charData.name || 'Sans nom';
          tdName.title = charData.name || 'Sans nom';
          tdName.style.cursor = 'pointer';
          tdName.addEventListener('click', function () {
            const cd = tr._charData || charData;
            window.switchTab(cd.class);
            setTimeout(function () {
              window.openSheet(cd.class, cd);
            }, 100);
          });
          tr.appendChild(tdName);

          // Classe (clic = déplier détail combat)
          const tdClass = document.createElement('td');
          tdClass.className = 'char-class';
          tdClass.setAttribute('role', 'button');
          tdClass.setAttribute('tabindex', '0');
          const detailId = 'team-detail-' + charData.id;
          const isOpen = expandedCharacterId === charData.id;
          tdClass.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          tdClass.setAttribute('aria-controls', detailId);
          const classContent = document.createElement('div');
          classContent.className = 'char-class-content';
          const guard = window.DCCPortraitGuard;
          let portraitResult = null;
          if (window.getPortraitSrc) {
            portraitResult = window.getPortraitSrc(data.portrait_source || 'dcc', charData.class, data.portrait_index);
          }
          const missing = !!(portraitResult && guard && guard.isMissing && guard.isMissing(portraitResult.source));
          const img = missing
            ? guard.placeholder('team-portrait')
            : document.createElement('img');
          if (!missing) {
            img.className = 'team-portrait';
            img.alt = '';
            if (portraitResult) img.src = portraitResult.src;
          }
          if (missing || img.src) {
            classContent.appendChild(img);
            applyDead(img, data.points_de_vie);
          }
          const classLabels = document.createElement('span');
          classLabels.className = 'char-class-labels';
          const classLabel = document.createElement('span');
          classLabel.textContent = CLASS_LABELS[charData.class] || charData.class;
          const chevron = document.createElement('span');
          chevron.className = 'chevron';
          chevron.setAttribute('aria-hidden', 'true');
          chevron.textContent = isOpen ? '▲' : '▼';
          classLabels.appendChild(classLabel);
          classLabels.appendChild(chevron);
          classContent.appendChild(classLabels);
          tdClass.appendChild(classContent);
          tdClass.addEventListener('click', function () {
            const cd = tr._charData || charData;
            toggleDetail(cd, parsedDataOf(cd), tdClass, tr);
          });
          tdClass.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const cd = tr._charData || charData;
              toggleDetail(cd, parsedDataOf(cd), tdClass, tr);
            }
          });
          tr.appendChild(tdClass);

          // Initiative (from sheet data)
          const tdInit = document.createElement('td');
          tdInit.textContent = data.initiative || '+0';
          tr.appendChild(tdInit);

          // AC
          const tdAC = document.createElement('td');
          tdAC.textContent = data.classe_armure || '10';
          tr.appendChild(tdAC);

          // PV (editable, synced)
          const tdPV = document.createElement('td');
          const inputPV = document.createElement('input');
          inputPV.type = 'number';
          inputPV.value = data.points_de_vie || '';
          inputPV.setAttribute('aria-label', 'PV de ' + (charData.name || 'Sans nom'));
          const syncDeadFromInput = function () {
            setModelPV(charData.id, inputPV.value);
            refreshDeadOverlay(charData.id, inputPV.value);
          };
          inputPV.addEventListener('input', syncDeadFromInput);
          inputPV.addEventListener('change', function () {
            syncDeadFromInput();
            if (onSavePV) {
              onSavePV(charData.id, inputPV.value);
            }
          });
          tdPV.appendChild(inputPV);
          tr.appendChild(tdPV);

          // Init. combat (sauvegardé en base, pré-rempli depuis team-state)
          const tdInitCombat = document.createElement('td');
          const inputInit = document.createElement('input');
          inputInit.type = 'number';
          inputInit.placeholder = '';
          inputInit.className = 'init-combat-input';
          if (teamStateInitial && teamStateInitial.init_combat[String(charData.id)]) {
            inputInit.value = teamStateInitial.init_combat[String(charData.id)];
          }
          inputInit.setAttribute('aria-label', 'Init. combat de ' + (charData.name || 'Sans nom'));
          inputInit.addEventListener('input', scheduleTeamStateSave);
          inputInit.addEventListener('change', scheduleTeamStateSave);
          tdInitCombat.appendChild(inputInit);
          tr.appendChild(tdInitCombat);

          // Compteur de tour (sauvegardé en base)
          const tdCounter = document.createElement('td');
          const turnCounter = createTurnCounter();
          turnCounter.onTurnChange = scheduleTeamStateSave;
          if (teamStateInitial && teamStateInitial.tours[String(charData.id)]) {
            turnCounter.setTurn(teamStateInitial.tours[String(charData.id)]);
          }
          tdCounter.appendChild(turnCounter);
          tr.appendChild(tdCounter);

          tbody.appendChild(tr);

          if (isOpen) {
            tbody.appendChild(buildDetailRow(charData, data));
            const openTr = tbody.lastElementChild;
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                openTr.classList.add('open');
              });
            });
          }
        });

        tableChars.appendChild(tbody);

        // RAZ sous Init. combat + Tour (colspan 5 | 2)
        const tfoot = document.createElement('tfoot');
        const trFoot = document.createElement('tr');
        trFoot.className = 'stats-raz-row';
        const tdPad = document.createElement('td');
        tdPad.colSpan = 5;
        trFoot.appendChild(tdPad);
        const tdRaz = document.createElement('td');
        tdRaz.colSpan = 2;
        const btnRazInit = document.createElement('button');
        btnRazInit.type = 'button';
        btnRazInit.className = 'btn-sm btn-raz';
        btnRazInit.textContent = 'RAZ';
        btnRazInit.setAttribute('aria-label', 'RAZ Init. combat et tours');
        btnRazInit.addEventListener('click', async function () {
          let confirmed = false;
          if (typeof window.showModal === 'function') {
            confirmed = await window.showModal({
              title: 'Remise à zéro',
              message: 'Effacer les Init. combat et remettre les tours à zéro ?',
              type: 'confirm',
              okText: 'RAZ',
              danger: true,
            });
          } else {
            confirmed = window.confirm('Effacer les Init. combat et remettre les tours à zéro ?');
          }
          if (!confirmed) return;
          tableChars.querySelectorAll('.init-combat-input').forEach(function (input) {
            input.value = '';
          });
          tableChars.querySelectorAll('.turn-counter').forEach(function (counter) {
            if (typeof counter.resetTurn === 'function') counter.resetTurn();
          });
          scheduleTeamStateSave(); /* RAZ propagée en base */
        });
        tdRaz.appendChild(btnRazInit);
        trFoot.appendChild(tdRaz);
        tfoot.appendChild(trFoot);
        tableChars.appendChild(tfoot);

        container.appendChild(tableChars);
      }

      // Section ennemis
      const sectionEnnemis = document.createElement('div');
      sectionEnnemis.className = 'section-bar';
      sectionEnnemis.textContent = 'Ennemis';
      container.appendChild(sectionEnnemis);

      // Boutons
      const btnGroup = document.createElement('div');
      btnGroup.className = 'btn-group';

      const btnAdd = document.createElement('button');
      btnAdd.className = 'btn-sm btn-add';
      btnAdd.textContent = '+ Ajouter';

      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn-sm btn-remove';
      btnRemove.textContent = '- Supprimer';

      const btnRaz = document.createElement('button');
      btnRaz.className = 'btn-sm btn-raz';
      btnRaz.textContent = 'RAZ';

      btnGroup.appendChild(btnAdd);
      btnGroup.appendChild(btnRemove);
      btnGroup.appendChild(btnRaz);
      container.appendChild(btnGroup);

      // Table ennemis
      const tableEnemies = document.createElement('table');
      tableEnemies.className = 'team-table team-table-enemies';

      const theadE = document.createElement('thead');
      theadE.innerHTML = '<tr>' +
        '<th style="text-align:left">Ennemi</th>' +
        '<th>AC</th>' +
        '<th>ATT</th>' +
        '<th>PV</th>' +
        '<th>Init.</th>' +
        '<th>Tour</th>' +
        '</tr>';
      tableEnemies.appendChild(theadE);

      const tbodyE = document.createElement('tbody');
      enemyBody = tbodyE;

      /* Lignes sauvegardées (seules les renseignées sont persistées) ; au
         minimum 3 lignes pour pouvoir en déclarer d'autres. */
      const savedEnemies = teamStateInitial ? teamStateInitial.ennemis.slice() : [];
      const wantedRows = Math.max(3, savedEnemies.length);
      while (savedEnemies.length < wantedRows) savedEnemies.push(null);
      savedEnemies.forEach(function (row) {
        tbodyE.appendChild(createEnemyRow(row));
      });

      tableEnemies.appendChild(tbodyE);
      container.appendChild(tableEnemies);

      // Event listeners boutons
      btnAdd.addEventListener('click', function () {
        tbodyE.appendChild(createEnemyRow());
        scheduleTeamStateSave();
      });

      btnRemove.addEventListener('click', function () {
        if (tbodyE.lastElementChild) {
          tbodyE.removeChild(tbodyE.lastElementChild);
          scheduleTeamStateSave();
        }
      });

      btnRaz.addEventListener('click', async function () {
        let confirmed = false;
        if (typeof window.showModal === 'function') {
          confirmed = await window.showModal({
            title: 'Remise à zéro',
            message: 'Vider le tableau des ennemis et réinitialiser à 3 lignes vides ?',
            type: 'confirm',
            okText: 'RAZ',
            danger: true,
          });
        } else {
          confirmed = window.confirm('Vider le tableau des ennemis et réinitialiser à 3 lignes vides ?');
        }
        if (!confirmed) return;
        tbodyE.innerHTML = '';
        for (let i = 0; i < 3; i++) {
          tbodyE.appendChild(createEnemyRow());
        }
        scheduleTeamStateSave(); /* table vidé → ennemis effacés en base */
      });

      // Section Statistiques (hors scope si 0 PJ)
      if (characters.length > 0) {
        container.appendChild(buildStatsSection());
      }

      // Section Notes
      const sectionNotes = document.createElement('div');
      sectionNotes.className = 'section-bar';
      sectionNotes.textContent = 'Notes';
      container.appendChild(sectionNotes);

      const notesArea = document.createElement('textarea');
      notesArea.rows = 6;
      notesArea.placeholder = 'Notes d\'équipe...';
      notesArea.style.width = '100%';
      notesArea.style.padding = '8px 10px';
      notesArea.style.fontSize = '11px';
      notesArea.style.fontFamily = 'var(--font-body)';
      notesArea.style.color = 'var(--ink)';
      notesArea.style.background = 'var(--field-bg)';
      notesArea.style.border = '1px solid var(--input-border)';
      notesArea.style.borderRadius = 'var(--radius-sm)';
      notesArea.style.resize = 'vertical';
      notesArea.style.minHeight = '120px';
      notesArea.style.lineHeight = '1.6';
      notesArea.style.outline = 'none';
      notesArea.style.boxSizing = 'border-box';

      // Load notes from server (passed by central manager)
      notesArea.value = initialNotes || '';

      // Auto-save on input (debounce -> serveur)
      let notesTimer = null;
      notesArea.addEventListener('input', function () {
        clearTimeout(notesTimer);
        notesTimer = setTimeout(function () {
          if (!onSaveNotes) return;
          var value = notesArea.value;
          Promise.resolve(onSaveNotes(value)).then(function () {
            if (window.showToastSave) window.showToastSave();
          }).catch(function () {
            if (window.showToast) window.showToast('Erreur sauvegarde', 'error');
          });
        }, 600);
      });

      container.appendChild(notesArea);
    }

    /* Resynchronisation sur place (retour sur l'onglet Équipe) : met à jour les
       valeurs issues des personnages en base (nom, classe, portrait, initiative,
       AC, PV, détails dépliés, statistiques agrégées) SANS re-render → l'état
       combat affiché (Init. combat, compteurs de tour, tableau des ennemis,
       notes) est conservé : il est en base, la prochaine saisie le ré-écrira.
       Retourne false si la composition a changé (appelant → rechargement
       complet de la page). */
    window.DCCModules.equipe.resync = function (freshChars) {
      if (!Array.isArray(freshChars)) return true;

      function idsOf(list) {
        return list.map(function (c) { return String(c.id); }).sort().join(',');
      }
      if (idsOf(freshChars) !== idsOf(characters)) return false;

      freshChars.forEach(function (fresh) {
        const data = parsedDataOf(fresh);
        const tr = container.querySelector('tr[data-char-id="' + fresh.id + '"]');
        if (!tr) return;
        tr._charData = fresh;

        const tdName = tr.children[0];
        if (tdName) {
          tdName.textContent = fresh.name || 'Sans nom';
          tdName.title = fresh.name || 'Sans nom';
        }

        const tdClass = tr.children[1];
        if (tdClass) {
          const portraitNode = tdClass.querySelector('.team-portrait');
          /* Seul un <img> (portrait réel) peut changer de source ; le
             placeholder reste en place tant que le dossier est absent. */
          if (portraitNode && portraitNode.tagName === 'IMG' && window.getPortraitSrc) {
            try {
              const pr = window.getPortraitSrc(data.portrait_source || 'dcc', fresh.class, data.portrait_index);
              if (pr && pr.src) portraitNode.src = pr.src;
            } catch (e) { /* portrait inchangé */ }
          }
          const label = tdClass.querySelector('.char-class-labels span');
          if (label) label.textContent = CLASS_LABELS[fresh.class] || fresh.class;
        }

        if (tr.children[2]) tr.children[2].textContent = data.initiative || '+0';
        if (tr.children[3]) tr.children[3].textContent = data.classe_armure || '10';
        const tdPV = tr.children[4];
        const inputPV = tdPV ? tdPV.querySelector('input') : null;
        if (inputPV) inputPV.value = data.points_de_vie || '';
        refreshDeadOverlay(fresh.id, data.points_de_vie);

        if (expandedCharacterId === fresh.id) {
          const oldDetail = document.getElementById('team-detail-' + fresh.id);
          if (oldDetail) {
            const newDetail = buildDetailRow(fresh, data);
            newDetail.classList.add('open');
            oldDetail.replaceWith(newDetail);
          }
        }
      });

      characters = freshChars.slice();
      renderMarchingGrid(); /* noms/portraits fraîches, positions conservées */

      /* Statistiques agrégées : reconstruction (min/max recalculés sur les
         valeurs fraîches, détail déplié conservé via expandedStatsId) */
      const oldStatsTable = container.querySelector('table.team-table-stats');
      if (oldStatsTable) {
        const prev = oldStatsTable.previousElementSibling;
        const oldBar = (prev && prev.classList.contains('section-bar')) ? prev : null;
        container.insertBefore(buildStatsSection(), oldBar || oldStatsTable);
        oldStatsTable.remove();
        if (oldBar) oldBar.remove();
      }

      return true;
    };

    render();
  }
};
