/**
 * DCC Character Sheet - Central Manager
 *
 * Orchestrates tabs, auth, navigation, character CRUD, auto-save,
 * and dynamic class module loading for the DCC character sheet SPA.
 */

(function () {
  'use strict';

  /* =========================================================================
     1. Configuration
     ======================================================================== */

  const CLASSES = ['clerc', 'elfe', 'guerrier', 'halfelin', 'mage', 'nain', 'voleur'];

  const CLASS_LABELS = {
    clerc: 'Clerc',
    elfe: 'Elfe',
    guerrier: 'Guerrier',
    halfelin: 'Halfelin',
    mage: 'Mage',
    nain: 'Nain',
    voleur: 'Voleur',
  };

  const AUTO_SAVE_DELAY = 400;
  const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

  /* =========================================================================
     2. State
     ======================================================================== */

  let currentUser = null;
  let activeTab = CLASSES[0];
  let activeSheets = {};
  let loadedModules = {};
  let saveTimers = {};
  let heartbeatTimer = null;
  let toastContainer = null;
  let toastSaveTimer = null;

  /* =========================================================================
     3. Toast Notifications
     ======================================================================== */

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(message, type) {
    var container = getToastContainer();
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'save');
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 1500);
  }

  function showToastSave() {
    clearTimeout(toastSaveTimer);
    toastSaveTimer = setTimeout(function () {
      showToast('&#128190;', 'save');
    }, 600);
  }

  /* =========================================================================
     4. DOM Helpers
     ======================================================================== */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else if (k === 'innerHTML') node.innerHTML = attrs[k];
        else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  /* =========================================================================
     4. Theme Toggle
     ======================================================================== */

  function initTheme() {
    var saved = localStorage.getItem('dcc-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dcc-theme', next);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    var btn = $('.theme-toggle');
    if (!btn) return;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '\u2600' : '\u263E';
  }

  /* =========================================================================
     5. API Layer
     ======================================================================== */

  async function api(endpoint, params) {
    try {
      var url = 'api/' + endpoint;
      var options = { credentials: 'same-origin' };

      if (params && params.method === 'GET') {
        var qs = Object.keys(params.data || {})
          .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params.data[k]); })
          .join('&');
        if (qs) url += '?' + qs;
      } else if (params && params.body) {
        options.method = 'POST';
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(params.body);
      }

      var res = await fetch(url, options);
      var json = await res.json();

      if (!res.ok || json.ok === false) {
        throw new Error(json.error || 'Erreur serveur');
      }

      return json;
    } catch (err) {
      console.error('[API]', endpoint, err);
      throw err;
    }
  }

  /* =========================================================================
     6. Auth
     ======================================================================== */

  async function checkAuth() {
    try {
      var res = await api('auth.php', { method: 'GET', data: { action: 'check' } });
      currentUser = res.logged_in ? { pseudo: res.pseudo } : null;
    } catch (e) {
      currentUser = null;
    }
    renderAuthUI();
  }

  function renderAuthUI() {
    var guestEl = $('#auth-guest');
    var loggedEl = $('#auth-logged');

    if (!guestEl || !loggedEl) return;

    if (currentUser) {
      guestEl.style.display = 'none';
      loggedEl.style.display = 'flex';
      var avatar = $('.auth-avatar', loggedEl);
      var pseudo = $('.auth-pseudo', loggedEl);
      if (avatar) avatar.textContent = currentUser.pseudo.charAt(0).toUpperCase();
      if (pseudo) pseudo.textContent = currentUser.pseudo;
    } else {
      guestEl.style.display = 'flex';
      loggedEl.style.display = 'none';
    }
  }

  async function logout() {
    try {
      await api('auth.php', { method: 'POST', body: { action: 'logout' } });
    } catch (e) { /* ignore */ }
    currentUser = null;
    window.location.href = 'login.php';
  }

  /* =========================================================================
     7. Tab Switching
     ======================================================================== */

  function switchTab(cls) {
    activeTab = cls;

    $$('.tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-class') === cls);
    });

    $$('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-class') === cls);
    });

    if (cls === 'equipe') {
      var panel = $('[data-class="equipe"].tab-panel');
      if (!panel) {
        panel = el('div', { className: 'tab-panel active', 'data-class': 'equipe' });
        $('#main-content').appendChild(panel);
      }
      loadEquipe(panel);
      return;
    }

    if (!CLASSES.includes(cls)) return;

    var panel = $('[data-class="' + cls + '"].tab-panel');
    if (!panel) {
      panel = el('div', { className: 'tab-panel active', 'data-class': cls });
      var viewList = el('div', { className: 'view-list active' });
      var viewSheet = el('div', { className: 'view-sheet' });
      panel.appendChild(viewList);
      panel.appendChild(viewSheet);
      $('#main-content').appendChild(panel);
    }

    loadClassCharacters(cls);
  }

  /* =========================================================================
     8. Character List Loading & Rendering
     ======================================================================== */

  async function loadClassCharacters(cls, autoOpen) {
    if (autoOpen === undefined) autoOpen = true;
    var panel = $('[data-class="' + cls + '"].tab-panel');
    if (!panel) return;

    if (!currentUser) {
      renderEmptyState(panel, cls, 'Connectez-vous pour gérer vos personnages.');
      return;
    }

    try {
      var res = await api('characters.php', {
        method: 'GET',
        data: { action: 'list', class: cls },
      });

      var chars = res.characters || [];
      var active = chars.filter(function (c) { return c.is_active === 1; });
      var inactive = chars.filter(function (c) { return c.is_active === 0; });

      if (active.length === 0 && inactive.length === 0) {
        renderEmptyState(panel, cls);
      } else if (autoOpen && active.length === 1 && active.length + inactive.length > 0) {
        openSheet(cls, active[0]);
      } else {
        renderCharList(panel, cls, active, inactive);
      }
    } catch (err) {
      renderEmptyState(panel, cls, 'Erreur de chargement.');
    }
  }

  /* =========================================================================
     8b. Equipe Tab
     ======================================================================== */

  async function loadEquipe(panel) {
    if (!currentUser) {
      panel.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px">Connectez-vous pour voir l\'équipe.</div>';
      return;
    }

    try {
      var allChars = [];
      for (var i = 0; i < CLASSES.length; i++) {
        var res = await api('characters.php', {
          method: 'GET',
          data: { action: 'list', class: CLASSES[i], is_active: 1 },
        });
        if (res.characters) {
          allChars = allChars.concat(res.characters);
        }
      }

      if (window.DCCModules && window.DCCModules.equipe) {
        window.DCCModules.equipe.render(panel, allChars, syncPVFromEquipe, currentUser.id);
      }
    } catch (err) {
      panel.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px">Erreur de chargement.</div>';
    }
  }

  async function syncPVFromEquipe(charId, newPV) {
    try {
      var res = await api('characters.php', {
        method: 'GET',
        data: { action: 'get', id: charId },
      });
      if (!res.character) return;

      var data = {};
      try { data = JSON.parse(res.character.data || '{}'); } catch (e) {}
      data.points_de_vie = newPV;

      await api('characters.php', {
        method: 'POST',
        body: { action: 'save', id: charId, data: data },
      });

      showToastSave();
    } catch (err) {
      console.error('Erreur sync PV:', err);
    }
  }

  function renderEmptyState(panel, cls, message) {
    var viewList = $('.view-list', panel);
    var viewSheet = $('.view-sheet', panel);

    if (viewSheet) viewSheet.classList.remove('active');
    if (viewList) viewList.classList.add('active');

    var listContent = viewList || panel;
    listContent.innerHTML = '';

    var header = el('div', { className: 'section-header' }, [
      el('h2', { className: 'section-title', textContent: CLASS_LABELS[cls] }),
    ]);
    listContent.appendChild(header);

    var empty = el('div', { className: 'empty-state' }, [
      el('div', { className: 'empty-state-icon', textContent: '\u2694' }),
      el('h3', {
        className: 'empty-state-title',
        textContent: message || ('Aucun ' + CLASS_LABELS[cls].toLowerCase() + ' dans l\'equipe'),
      }),
      el('p', {
        className: 'empty-state-text',
        textContent: message ? '' : 'Cliquez ci-dessous pour en creer un.',
      }),
    ]);

    if (!message) {
      empty.appendChild(createNewButton(cls));
    }

    listContent.appendChild(empty);
  }

  function createNewButton(cls) {
    var btnGroup = el('div', { className: 'btn-group' }, [
      el('button', {
        className: 'btn-new',
        textContent: '+ Nouveau',
        onClick: function () { createCharacter(cls); },
      }),
      el('button', {
        className: 'btn-import',
        textContent: 'Import',
        title: 'Importer un JSON',
        onClick: function () { importCharacter(cls); },
      }),
    ]);
    return btnGroup;
  }

  function renderCharList(panel, cls, active, inactive) {
    var viewList = $('.view-list', panel);
    var viewSheet = $('.view-sheet', panel);

    if (viewSheet) viewSheet.classList.remove('active');
    if (viewList) viewList.classList.add('active');

    var listContent = viewList || panel;
    listContent.innerHTML = '';

    var header = el('div', { className: 'section-header' }, [
      el('h2', { className: 'section-title', textContent: CLASS_LABELS[cls] }),
      createNewButton(cls),
    ]);
    listContent.appendChild(header);

    var grid = el('div', { className: 'char-grid' });

    var sorted = active.concat(inactive).sort(function (a, b) {
      if (a.is_active !== b.is_active) return b.is_active - a.is_active;
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    });

    sorted.forEach(function (c) {
      grid.appendChild(createCharCard(cls, c));
    });

    listContent.appendChild(grid);
  }

  function createCharCard(cls, charData) {
    var isActive = charData.is_active === 1;
    var metaParts = [];
    var parsed = {};
    try { parsed = JSON.parse(charData.data || '{}'); } catch (e) {}

    if (parsed.niveau) metaParts.push('Niv.' + parsed.niveau);
    if (parsed.dieu) metaParts.push(parsed.dieu);

    var card = el('div', { className: 'char-card' + (isActive ? '' : ' inactive') });

    var cardTop = el('div', { className: 'char-card-top' });

    var name = el('div', { className: 'char-card-name', textContent: charData.name || 'Sans nom' });
    cardTop.appendChild(name);

    var toggleWrapper = el('div', { className: 'toggle-inn' });
    toggleWrapper.addEventListener('click', function (e) { e.stopPropagation(); });
    var toggleLabel = el('label', { className: 'switch' });
    var toggleInput = el('input', { type: 'checkbox' });
    toggleInput.checked = isActive;
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(el('span', { className: 'switch-slider' }));
    toggleWrapper.appendChild(toggleLabel);
    var toggleText = el('span', {
      className: 'toggle-inn-label',
      textContent: isActive ? 'EN EXPEDITION' : "A L'AUBERGE",
    });
    toggleText.style.color = isActive ? 'var(--green)' : 'var(--red)';
    toggleWrapper.appendChild(toggleText);

    toggleInput.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    toggleInput.addEventListener('change', function (e) {
      e.stopPropagation();
      var checked = e.target.checked;
      toggleText.textContent = checked ? 'EN EXPEDITION' : "A L'AUBERGE";
      toggleText.style.color = checked ? 'var(--green)' : 'var(--red)';
      setCharacterActive(charData.id, checked);
    });

    cardTop.appendChild(toggleWrapper);
    card.appendChild(cardTop);

    if (metaParts.length) {
      card.appendChild(el('div', { className: 'char-card-meta', textContent: metaParts.join(' - ') }));
    }

    var actions = el('div', { className: 'char-card-actions' });

    var openBtn = el('button', {
      className: 'btn-open',
      title: 'Ouvrir',
      onClick: function (e) { e.stopPropagation(); openSheet(cls, charData); },
    });
    openBtn.innerHTML = '&#9998;';

    var delBtn = el('button', {
      className: 'btn-delete',
      textContent: '\u2716',
      title: 'Supprimer',
      onClick: function (e) {
        e.stopPropagation();
        deleteCharacter(cls, charData);
      },
    });

    var btns = el('div', { className: 'char-card-btns' });
    btns.appendChild(openBtn);
    btns.appendChild(delBtn);

    actions.appendChild(btns);

    card.appendChild(actions);

    card.addEventListener('click', function () {
      openSheet(cls, charData);
    });

    return card;
  }

  /* =========================================================================
     9. Character CRUD
     ======================================================================== */

  async function createCharacter(cls) {
    if (!currentUser) return;

    try {
      var res = await api('characters.php', {
        method: 'POST',
        body: { action: 'create', class: cls, name: 'Sans nom' },
      });

      if (res.character) {
        openSheet(cls, res.character);
      }
    } catch (err) {
      console.error('Erreur création personnage:', err);
    }
  }

  async function saveCharacter(charId, data, name) {
    if (!currentUser || !charId) return { ok: false };

    try {
      var body = { action: 'save', id: charId };
      if (data !== undefined) body.data = data;
      if (name !== undefined) body.name = name;

      await api('characters.php', { method: 'POST', body: body });
      return { ok: true };
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      return { ok: false };
    }
  }

  async function deleteCharacter(cls, charData) {
    if (!currentUser) return;
    if (!confirm('Supprimer "' + (charData.name || 'Sans nom') + '" ?')) return;

    try {
      await api('characters.php', {
        method: 'POST',
        body: { action: 'delete', id: charData.id },
      });

      loadClassCharacters(cls, false);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  }

  async function setCharacterActive(charId, isActive) {
    if (!currentUser) return;

    try {
      await api('characters.php', {
        method: 'POST',
        body: { action: 'set_active', id: charId, is_active: isActive ? 1 : 0 },
      });

      if (!activeSheets[activeTab]) {
        loadClassCharacters(activeTab, false);
      }
    } catch (err) {
      console.error('Erreur activation:', err);
    }
  }

  /* =========================================================================
     10. Sheet View
     ======================================================================== */

  async function openSheet(cls, charData) {
    var panel = $('[data-class="' + cls + '"].tab-panel');
    if (!panel) return;

    var viewList = $('.view-list', panel);
    var viewSheet = $('.view-sheet', panel);

    if (viewList) viewList.classList.remove('active');
    if (viewSheet) {
      viewSheet.innerHTML = '';
      viewSheet.classList.add('active');
    }

    activeSheets[cls] = charData;

    viewSheet.appendChild(createSheetHeader(cls, charData));

    var sheetBody = el('div', { className: 'sheet-body' });
    viewSheet.appendChild(sheetBody);

    await loadClassModule(cls, sheetBody, charData);
    bindAutoSave(cls, charData.id);
  }

  function createSheetHeader(cls, charData) {
    var isActive = charData.is_active === 1;

    var header = el('div', { className: 'sheet-header' });

    var left = el('div', { className: 'sheet-header-left' }, [
      el('button', {
        className: 'btn-back',
        innerHTML: '&#9664;',
        onClick: function () { showList(cls); },
      }),
      el('span', {
        className: 'sheet-title',
        textContent: charData.name || 'Sans nom',
      }),
    ]);

    var exportBtn = el('button', {
      className: 'btn-export',
      textContent: 'Export',
      title: 'Exporter en JSON',
      onClick: function () { exportCharacter(charData); },
    });

    var toggleWrapper = el('div', { className: 'toggle-inn' });
    var toggle = el('label', { className: 'switch' });
    var input = el('input', { type: 'checkbox' });
    input.checked = isActive;
    var slider = el('span', { className: 'switch-slider' });
    var label = el('span', {
      className: 'toggle-inn-label',
      id: cls + '-sheet-status',
      textContent: isActive ? 'EN EXPEDITION' : "A L'AUBERGE",
    });

    input.addEventListener('change', function (e) {
      var checked = e.target.checked;
      label.textContent = checked ? 'EN EXPEDITION' : "A L'AUBERGE";
      label.style.color = checked ? 'var(--green)' : 'var(--red)';

      setCharacterActive(charData.id, checked);
    });

    toggle.appendChild(input);
    toggle.appendChild(slider);
    toggleWrapper.appendChild(toggle);
    toggleWrapper.appendChild(label);

    header.appendChild(left);
    header.appendChild(exportBtn);
    header.appendChild(toggleWrapper);

    return header;
  }

  function showList(cls) {
    var panel = $('[data-class="' + cls + '"].tab-panel');
    if (!panel) return;

    var viewList = $('.view-list', panel);
    var viewSheet = $('.view-sheet', panel);

    if (viewSheet) viewSheet.classList.remove('active');
    if (viewList) viewList.classList.add('active');

    activeSheets[cls] = null;
    cancelPendingSaves(cls);

    loadClassCharacters(cls, false);
  }

  /* =========================================================================
     11. Class Module Loading
     ======================================================================== */

  async function loadClassModule(cls, container, charData) {
    if (loadedModules[cls]) {
      try {
        loadedModules[cls].render(container, charData.id, JSON.parse(charData.data || '{}'));
        return;
      } catch (e) {
        console.error('Erreur rendu module ' + cls + ':', e);
      }
    }

    try {
      var module = await importClassModule(cls);
      loadedModules[cls] = module;
      module.render(container, charData.id, JSON.parse(charData.data || '{}'));
    } catch (err) {
      console.error('Erreur chargement module ' + cls + ':', err);
      renderFallbackSheet(container, cls, charData);
    }
  }

  var blocCommunLoaded = false;

  async function ensureBlocCommun() {
    if (blocCommunLoaded) return;
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'classes/bloc_commun.js';
      script.onload = function () { blocCommunLoaded = true; resolve(); };
      script.onerror = function () { reject(new Error('Impossible de charger classes/bloc_commun.js')); };
      document.head.appendChild(script);
    });
  }

  async function importClassModule(cls) {
    await ensureBlocCommun();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'classes/' + cls + '.js';
      script.onload = function () {
        var mod = window.DCCModules && window.DCCModules[cls];
        if (mod && typeof mod.render === 'function') {
          resolve(mod);
        } else {
          reject(new Error('Module ' + cls + ' non trouvé ou invalide'));
        }
      };
      script.onerror = function () {
        reject(new Error('Impossible de charger classes/' + cls + '.js'));
      };
      document.head.appendChild(script);
    });
  }

  function renderFallbackSheet(container, cls, charData) {
    var parsed = {};
    try { parsed = JSON.parse(charData.data || '{}'); } catch (e) {}

    var prefix = cls + '-' + charData.id + '-';

    var page = el('div', { className: 'sheet-page active' });

    var title = el('div', { className: 'page-title' },
      [CLASS_LABELS[cls] + ' - Fiche de personnage']
    );
    page.appendChild(title);

    var fields = [
      ['Nom', 'nom'], ['Titre', 'titre'], ['Metier', 'metier'],
      ['Alignement', 'alignement'], ['Niveau', 'niveau'], ['PX', 'px'],
      ['CA', 'ca'], ['PV', 'pv'], ['PV Max', 'pv-max'],
      ['Force', 'force'], ['Agilite', 'agilite'], ['Endurance', 'endurance'],
      ['Presence', 'presence'], ['Chance', 'chance'], ['Intelligence', 'intelligence'],
    ];

    fields.forEach(function (f) {
      var row = el('div', { className: 'sheet-row cols-2' }, [
        el('div', { className: 'field' }, [
          el('div', { className: 'field-label', textContent: f[0] }),
          createDataInput(prefix + f[1], parsed[f[1]] || ''),
        ]),
      ]);
      page.appendChild(row);
    });

    container.appendChild(page);
  }

  /* =========================================================================
     12. Auto-Save with Debouncing
     ======================================================================== */

  function bindAutoSave(cls, charId) {
    var panel = $('[data-class="' + cls + '"].tab-panel');
    if (!panel) return;

    var viewSheet = $('.view-sheet', panel);
    if (!viewSheet) return;

    var inputs = $$('input[data-key], textarea[data-key], select[data-key]', viewSheet);

    inputs.forEach(function (input) {
      var handler = function () {
        scheduleSave(cls, charId);
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
    });
  }

  function scheduleSave(cls, charId) {
    if (saveTimers[cls]) {
      clearTimeout(saveTimers[cls]);
    }

    saveTimers[cls] = setTimeout(function () {
      flushSave(cls, charId);
    }, AUTO_SAVE_DELAY);
  }

  async function flushSave(cls, charId) {
    var panel = $('[data-class="' + cls + '"].tab-panel');
    if (!panel) return;

    var viewSheet = $('.view-sheet', panel);
    if (!viewSheet) return;

    var data = collectSheetData(cls, charId, viewSheet);

    var name = data.nom || undefined;
    var result = await saveCharacter(charId, data, name);
    if (result && result.ok) {
      showToastSave();
    } else {
      showToast('Erreur sauvegarde', 'error');
    }
  }

  function collectSheetData(cls, charId, container) {
    var data = {};
    var prefix = cls + '-' + charId + '-';

    var inputs = $$('input[data-key], textarea[data-key], select[data-key]', container);

    inputs.forEach(function (input) {
      var key = input.getAttribute('data-key');
      if (key && key.startsWith(prefix)) {
        var field = key.slice(prefix.length);
        data[field] = input.value;
      }
    });

    return data;
  }

  function cancelPendingSaves(cls) {
    if (saveTimers[cls]) {
      clearTimeout(saveTimers[cls]);
      delete saveTimers[cls];
    }
  }

  /* =========================================================================
     13. Input Helper for Dynamic Sheets
     ======================================================================== */

  function createDataInput(key, value) {
    var input = el('input', { type: 'text', 'data-key': key });
    if (value) input.value = value;
    return input;
  }

  /* =========================================================================
     13b. Import / Export
     ======================================================================== */

  function exportCharacter(charData) {
    var parsed = {};
    try { parsed = JSON.parse(charData.data || '{}'); } catch (e) {}

    var exportObj = {
      version: 1,
      class: charData.class,
      name: charData.name,
      is_active: charData.is_active,
      data: parsed,
    };

    var json = JSON.stringify(exportObj, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = (charData.name || 'personnage').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCharacter(cls) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async function (e) {
      var file = e.target.files[0];
      if (!file) return;

      try {
        var text = await file.text();
        var obj = JSON.parse(text);

        if (!obj.class) {
          alert('Fichier JSON invalide : classe manquante');
          return;
        }

        var res = await api('characters.php', {
          method: 'POST',
          body: {
            action: 'create',
            class: obj.class,
            name: obj.name || 'Importe',
          },
        });

        if (res.character) {
          await saveCharacter(res.character.id, obj.data, obj.name);
          openSheet(cls, { ...res.character, data: JSON.stringify(obj.data) });
        }
      } catch (err) {
        alert('Erreur lors de l\'import : ' + err.message);
      }
    });

    input.click();
  }

  /* =========================================================================
     14. Session Heartbeat
     ======================================================================== */

  function startHeartbeat() {
    heartbeatTimer = setInterval(async function () {
      if (!currentUser) return;
      try {
        await api('auth.php', { method: 'GET', data: { action: 'check' } });
      } catch (e) { /* ignore */ }
    }, HEARTBEAT_INTERVAL);
  }

  /* =========================================================================
     15. Initialization
     ======================================================================== */

  function init() {
    initTheme();

    var themeBtn = $('.theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cls = btn.getAttribute('data-class');
        if (cls) switchTab(cls);
      });
    });

    var btnEquipeMobile = $('#btn-equipe-mobile');
    if (btnEquipeMobile) {
      btnEquipeMobile.addEventListener('click', function () {
        switchTab('equipe');
      });
    }

    var logoutBtn = $('.auth-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    checkAuth().then(function () {
      switchTab(activeTab);
      startHeartbeat();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose globals needed by HTML onclick attributes */
  window.toggleTheme = toggleTheme;
  window.switchTab = switchTab;
  window.showList = showList;

})();
