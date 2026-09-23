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
  let activeTab = localStorage.getItem('dcc-active-tab') || CLASSES[0];
  let activeSheets = {};
  let loadedModules = {};
  let saveTimers = {};
  let heartbeatTimer = null;
  let toastContainer = null;
  let toastSaveTimer = null;
  let spinnerTimer = null;

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

  function hideSpinner() {
    clearTimeout(spinnerTimer);
    var spinner = $('#loading-spinner');
    if (spinner) spinner.classList.add('hidden');
  }

  function showModal(opts) {
    return new Promise(function (resolve) {
      var overlay = $('#modal-overlay');
      var titleEl = $('#modal-title');
      var msgEl = $('#modal-message');
      var actionsEl = $('#modal-actions');

      titleEl.textContent = opts.title || '';
      msgEl.textContent = opts.message || '';
      actionsEl.innerHTML = '';

      function close(result) {
        overlay.classList.add('hidden');
        resolve(result);
      }

      if (opts.type === 'confirm') {
        var cancelBtn = el('button', {
          className: 'modal-btn-cancel',
          textContent: 'Annuler',
          onClick: function () { close(false); },
        });
        actionsEl.appendChild(cancelBtn);

        var okBtn = el('button', {
          className: opts.danger ? 'modal-btn-danger' : 'modal-btn-ok',
          textContent: opts.okText || 'OK',
          onClick: function () { close(true); },
        });
        actionsEl.appendChild(okBtn);
      } else {
        var okBtn = el('button', {
          className: 'modal-btn-ok',
          textContent: 'OK',
          onClick: function () { close(true); },
        });
        actionsEl.appendChild(okBtn);
      }

      overlay.classList.remove('hidden');

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(false);
      });

      document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', handler);
          close(false);
        }
      });
    });
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
      throw err;
    }
  }

  /* =========================================================================
     6. Auth
     ======================================================================== */

  async function checkAuth() {
    try {
      var res = await api('auth.php', { method: 'GET', data: { action: 'check' } });
      currentUser = res.logged_in ? { pseudo: res.pseudo, id: res.id } : null;
    } catch (e) {
      currentUser = null;
    }
    renderAuthUI();
  }

  function renderAuthUI() {
    var guestEl = $('#auth-guest');
    var loggedEl = $('#auth-logged');
    var avatar = $('#auth-avatar');
    var welcome = $('#user-welcome');

    if (!guestEl || !loggedEl) return;

    if (currentUser) {
      guestEl.style.display = 'none';
      loggedEl.style.display = 'flex';
      if (avatar) avatar.textContent = currentUser.pseudo.charAt(0).toUpperCase();
      if (welcome) welcome.textContent = 'Bienvenue ' + currentUser.pseudo;
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

  /* --- Team Notes (serveur) --- */

  async function getTeamNotes() {
    var res = await api('auth.php', { method: 'GET', data: { action: 'get_team_notes' } });
    return typeof res.notes === 'string' ? res.notes : '';
  }

  async function saveTeamNotes(notes) {
    await api('auth.php', { method: 'POST', body: { action: 'save_team_notes', notes: notes || '' } });
  }

  async function loadTeamNotesWithMigration() {
    var notes = await getTeamNotes();

    var legacyKeys = [];
    if (currentUser && currentUser.id !== undefined && currentUser.id !== null) {
      legacyKeys.push('dcc-equipe-notes-' + currentUser.id);
    }
    legacyKeys.push('dcc-equipe-notes-undefined');

    var hasLocal = false;
    var legacyValue = '';
    legacyKeys.forEach(function (key) {
      var val = localStorage.getItem(key);
      if (val !== null && val !== '' && !hasLocal) {
        hasLocal = true;
        legacyValue = val;
      }
    });

    if (!hasLocal) return notes;

    if (notes.trim() === '') {
      try {
        await saveTeamNotes(legacyValue);
        notes = legacyValue;
      } catch (e) {
        return notes; /* echec : on conserve les notes locales telles quelles */
      }
    }

    if (notes.trim() !== '') {
      legacyKeys.forEach(function (key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
      });
    }

    return notes;
  }

  /* --- User Menu Actions --- */

  async function exportAllCharacters() {
    try {
      var res = await api('characters.php', { method: 'GET', data: { action: 'list' } });
      var characters = res.characters || [];
      if (characters.length === 0) {
        await showModal({ title: 'Aucun personnage', message: 'Vous n\'avez aucun personnage a exporter.', type: 'alert' });
        return;
      }

      var fullCharacters = [];
      for (var i = 0; i < characters.length; i++) {
        var c = characters[i];
        var detail = await api('characters.php', { method: 'GET', data: { action: 'get', id: c.id } });
        if (detail.character) {
          fullCharacters.push({
            name: detail.character.name,
            class: detail.character.class,
            is_active: detail.character.is_active,
            data: JSON.parse(detail.character.data || '{}'),
          });
        }
      }

      var exportObj = {
        version: 1,
        exported_at: new Date().toISOString(),
        team_notes: '',
        characters: fullCharacters,
      };

      try {
        exportObj.team_notes = await getTeamNotes();
      } catch (e) { /* export des personnages maintenu meme si les notes echouent */ }

      var json = JSON.stringify(exportObj, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);

      var a = document.createElement('a');
      a.href = url;
      a.download = 'dcc-persos-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);

      showToast('Export reussi (' + fullCharacters.length + ' persos)', 'success');
    } catch (err) {
      await showModal({ title: 'Erreur', message: 'Erreur lors de l\'export : ' + err.message, type: 'alert' });
    }
  }

  async function importAllCharacters() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async function (e) {
      var file = e.target.files[0];
      if (!file) return;

      try {
        var text = await file.text();
        var obj = JSON.parse(text);

        if (!obj.characters || !Array.isArray(obj.characters) || obj.characters.length === 0) {
          await showModal({ title: 'Format invalide', message: 'Le fichier JSON ne contient aucun personnage valide.', type: 'alert' });
          return;
        }

        var valid = obj.characters.every(function (c) { return c.class; });
        if (!valid) {
          await showModal({ title: 'Format invalide', message: 'Un ou plusieurs personnages n\'ont pas de classe.', type: 'alert' });
          return;
        }

        var confirmed = await showModal({
          title: 'Importer ' + obj.characters.length + ' personnage(s) ?',
          message: 'Cela remplacera tous vos personnages actuels. Cette action est irreversible.',
          type: 'confirm',
          danger: true,
        });

        if (!confirmed) return;

        var existing = await api('characters.php', { method: 'GET', data: { action: 'list' } });
        for (var i = 0; i < (existing.characters || []).length; i++) {
          await api('characters.php', { method: 'POST', body: { action: 'delete', id: existing.characters[i].id } });
        }

        for (var j = 0; j < obj.characters.length; j++) {
          var c = obj.characters[j];
          var res = await api('characters.php', {
            method: 'POST',
            body: { action: 'create', class: c.class, name: c.name || 'Importe' },
          });
          if (res.character) {
            await saveCharacter(res.character.id, c.data || {}, c.name);
          }
        }

        if (Object.prototype.hasOwnProperty.call(obj, 'team_notes')) {
          try {
            await saveTeamNotes(typeof obj.team_notes === 'string' ? obj.team_notes : '');
          } catch (e) {
            showToast('Erreur sauvegarde des notes', 'error');
          }
        }

        showToast('Import reussi (' + obj.characters.length + ' persos)', 'success');
        await switchTab(activeTab);
      } catch (err) {
        await showModal({ title: 'Erreur', message: 'Erreur lors de l\'import : ' + err.message, type: 'alert' });
      }
    });

    input.click();
  }

  function showChangePasswordModal() {
    var inputStyle = 'padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:13px;background:var(--card-bg);color:var(--ink)';
    var labelStyle = 'font-family:var(--font-heading);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted)';

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box">'
      + '<div class="modal-title">Changer le mot de passe</div>'
      + '<div id="cp-error" style="display:none;padding:8px 12px;margin-bottom:4px;border-radius:var(--radius-sm);font-family:var(--font-body);font-size:12px;background:rgba(226,59,46,0.1);color:var(--tab-active);border:1px solid var(--tab-active)"></div>'
      + '<div style="display:flex;flex-direction:column;gap:14px;margin-top:12px">'
      + '<div><label style="' + labelStyle + '">Mot de passe actuel</label>'
      + '<input type="password" id="cp-old" autocomplete="current-password" style="' + inputStyle + ';width:100%;margin-top:4px"></div>'
      + '<div><label style="' + labelStyle + '">Nouveau mot de passe</label>'
      + '<input type="password" id="cp-new" autocomplete="new-password" style="' + inputStyle + ';width:100%;margin-top:4px"></div>'
      + '<div><label style="' + labelStyle + '">Confirmer le nouveau mot de passe</label>'
      + '<input type="password" id="cp-confirm" autocomplete="new-password" style="' + inputStyle + ';width:100%;margin-top:4px"></div>'
      + '</div>'
      + '<div class="modal-actions" style="margin-top:16px">'
      + '<button class="modal-btn modal-btn-cancel">Annuler</button>'
      + '<button class="modal-btn modal-btn-ok">Valider</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    var errorEl = overlay.querySelector('#cp-error');

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }

    function clearError() {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    overlay.querySelector('.modal-btn-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', clearError);
    });

    overlay.querySelector('.modal-btn-ok').addEventListener('click', async function () {
      var oldPwd = overlay.querySelector('#cp-old').value;
      var newPwd = overlay.querySelector('#cp-new').value;
      var confirmPwd = overlay.querySelector('#cp-confirm').value;

      clearError();

      if (!oldPwd || !newPwd || !confirmPwd) {
        showError('Veuillez remplir les 3 champs.');
        return;
      }

      if (newPwd.length < 6) {
        showError('Le nouveau mot de passe doit faire au moins 6 caracteres.');
        return;
      }

      if (newPwd !== confirmPwd) {
        showError('Les deux nouveaux mots de passe ne correspondent pas.');
        return;
      }

      if (newPwd === oldPwd) {
        showError('Le nouveau mot de passe doit etre different de l\'ancien.');
        return;
      }

      try {
        var res = await api('auth.php', {
          method: 'POST',
          body: { action: 'change_password', old_password: oldPwd, new_password: newPwd },
        });
        if (res.ok) {
          overlay.remove();
          showToast('Mot de passe change', 'success');
        } else {
          showError(res.error || 'Mot de passe actuel incorrect.');
        }
      } catch (err) {
        showError(err.message);
      }
    });

    overlay.querySelector('#cp-old').focus();
  }

  async function showDeleteAccountModal() {
    var confirmed = await showModal({
      title: 'Supprimer le compte ?',
      message: 'Toutes vos donnees seront perdues. Cette action est irreversible.',
      type: 'confirm',
      danger: true,
    });

    if (!confirmed) return;

    try {
      var res = await api('auth.php', { method: 'POST', body: { action: 'delete_account' } });
      if (res.ok) {
        currentUser = null;
        window.location.href = 'login.php';
      } else {
        await showModal({ title: 'Erreur', message: res.error || 'Erreur lors de la suppression du compte.', type: 'alert' });
      }
    } catch (err) {
      await showModal({ title: 'Erreur', message: err.message, type: 'alert' });
    }
  }

  /* =========================================================================
     7. Tab Switching
     ======================================================================== */

  async function switchTab(cls) {
    closePortraitPicker();
    activeTab = cls;
    localStorage.setItem('dcc-active-tab', cls);

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
      await loadEquipe(panel);
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

    await loadClassCharacters(cls);
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

      var notes = '';
      try {
        notes = await loadTeamNotesWithMigration();
      } catch (e) { /* notes indisponibles : on affiche la tableau quand meme */ }

      if (window.DCCModules && window.DCCModules.equipe) {
        window.DCCModules.equipe.render(panel, allChars, syncPVFromEquipe, notes, saveTeamNotes);
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

    if (parsed.dieu) metaParts.push(parsed.dieu);

    var card = el('div', { className: 'char-card' + (isActive ? '' : ' inactive') });

    var cardTop = el('div', { className: 'char-card-top' });

    var nameText = charData.name || 'Sans nom';
    if (parsed.niveau) nameText += ' — Niv.' + parsed.niveau;
    var name = el('div', { className: 'char-card-name', textContent: nameText });

    var nameRow = el('div', { className: 'char-card-name-row' });
    if (window.getPortraitSrc) {
      var portraitResult = window.getPortraitSrc(parsed.portrait_source || 'dcc', cls, parsed.portrait_index);
      if (portraitResult.src) {
        nameRow.appendChild(el('img', { className: 'char-card-portrait', src: portraitResult.src, alt: '' }));
      }
    }
    nameRow.appendChild(name);
    cardTop.appendChild(nameRow);

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
      textContent: isActive ? 'EN EXPÉDITION' : "A L'AUBERGE",
    });
    toggleText.style.color = isActive ? 'var(--green)' : 'var(--red)';
    toggleWrapper.appendChild(toggleText);

    toggleInput.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    toggleInput.addEventListener('change', function (e) {
      e.stopPropagation();
      var checked = e.target.checked;
      toggleText.textContent = checked ? 'EN EXPÉDITION' : "A L'AUBERGE";
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
        showToastSave();
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
    var confirmed = await showModal({
      title: 'Suppression',
      message: 'Supprimer "' + (charData.name || 'Sans nom') + '" ?',
      type: 'confirm',
      okText: 'Supprimer',
      danger: true,
    });
    if (!confirmed) return;

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

      showToastSave();

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

  function initPortraits(cls, charId, container) {
    var area = container.querySelector('.portrait-area');
    if (!area) return;

    var img = area.querySelector('[data-portrait-img]');
    var hiddenSource = area.querySelector('input[data-key$="-portrait_source"]');
    var hiddenIndex = area.querySelector('input[data-key$="-portrait_index"]');
    if (!img || !hiddenSource || !hiddenIndex) return;

    if (!window.getPortraitSrc) {
      setTimeout(function () { initPortraits(cls, charId, container); }, 100);
      return;
    }

    var source = hiddenSource.value || 'dcc';
    var index = parseInt(hiddenIndex.value, 10) || 0;

    function applyPortrait() {
      var result = window.getPortraitSrc(source, cls, index);
      img.src = result.src;
      source = result.source;
      index = result.index;
      hiddenSource.value = source;
      hiddenIndex.value = index;
    }

    applyPortrait();

    img.addEventListener('click', function () {
      showPortraitPicker(cls, source, index).then(function (result) {
        if (!result) return;
        source = result.source;
        index = result.index;
        hiddenSource.value = source;
        hiddenIndex.value = index;
        applyPortrait();
        scheduleSave(cls, charId);
      });
    });
  }

  function showPortraitPicker(cls, currentSource, currentIndex) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'portrait-picker-overlay';

      var picker = document.createElement('div');
      picker.className = 'portrait-picker';

      var header = document.createElement('div');
      header.className = 'portrait-picker-header';

      var headerTitle = document.createElement('span');
      headerTitle.className = 'portrait-picker-header-title';
      headerTitle.textContent = 'Choisir un portrait';

      var headerClose = document.createElement('button');
      headerClose.className = 'portrait-picker-header-close';
      headerClose.innerHTML = '&times;';
      headerClose.addEventListener('click', function () { close(null); });

      header.appendChild(headerTitle);
      header.appendChild(headerClose);
      picker.appendChild(header);

      var body = document.createElement('div');
      body.className = 'portrait-picker-body';

      var scrollTarget = null;

      window.PortraitSources.forEach(function (ps) {
        var entry = ps[cls];
        if (!entry) return;
        var images = Array.isArray(entry) ? entry : [entry];
        if (images.length === 0) return;

        var section = document.createElement('div');
        section.className = 'portrait-picker-section';

        var sectionTitle = document.createElement('div');
        sectionTitle.className = 'portrait-picker-section-title';
        sectionTitle.textContent = ps.meta.label;
        section.appendChild(sectionTitle);

        var grid = document.createElement('div');
        grid.className = 'portrait-picker-grid';

        images.forEach(function (src, i) {
          var imgEl = document.createElement('img');
          imgEl.className = 'portrait-picker-img';
          imgEl.src = src;
          imgEl.alt = '';
          if (ps.meta.key === currentSource && i === currentIndex) {
            imgEl.classList.add('active');
            scrollTarget = imgEl;
          }
          imgEl.addEventListener('click', function () {
            close({ source: ps.meta.key, index: i });
          });
          grid.appendChild(imgEl);
        });

        section.appendChild(grid);
        body.appendChild(section);
      });

      picker.appendChild(body);

      var footer = document.createElement('div');
      footer.className = 'portrait-picker-footer';

      var footerBtn = document.createElement('button');
      footerBtn.className = 'portrait-picker-footer-btn';
      footerBtn.textContent = 'Fermer';
      footerBtn.addEventListener('click', function () { close(null); });

      footer.appendChild(footerBtn);
      picker.appendChild(footer);

      overlay.appendChild(picker);
      document.body.appendChild(overlay);

      if (scrollTarget) {
        setTimeout(function () {
          body.scrollTop = scrollTarget.offsetTop - (body.clientHeight / 2) + (scrollTarget.clientHeight / 2);
        }, 0);
      }

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(null);
      });

      function onKeyDown(e) {
        if (e.key === 'Escape') close(null);
      }
      document.addEventListener('keydown', onKeyDown);

      function close(result) {
        document.removeEventListener('keydown', onKeyDown);
        overlay.remove();
        resolve(result);
      }
    });
  }

  function closePortraitPicker() {
    var overlay = document.querySelector('.portrait-picker-overlay');
    if (overlay) overlay.remove();
  }

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
    initPortraits(cls, charData.id, sheetBody);
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
      textContent: isActive ? 'EN EXPÉDITION' : "A L'AUBERGE",
    });

    input.addEventListener('change', function (e) {
      var checked = e.target.checked;
      label.textContent = checked ? 'EN EXPÉDITION' : "A L'AUBERGE";
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
          await showModal({ title: 'Erreur', message: 'Fichier JSON invalide : classe manquante', type: 'alert' });
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
          showToastSave();
        }
      } catch (err) {
        await showModal({ title: 'Erreur', message: 'Erreur lors de l\'import : ' + err.message, type: 'alert' });
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

    var avatarBtn = $('#auth-avatar');
    var userMenu = $('#user-menu');

    if (avatarBtn && userMenu) {
      avatarBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var ouvert = !userMenu.hidden;
        userMenu.hidden = ouvert;
        avatarBtn.setAttribute('aria-expanded', String(!ouvert));
      });

      userMenu.addEventListener('click', function (e) {
        e.stopPropagation();
      });

      document.addEventListener('click', function () {
        userMenu.hidden = true;
        avatarBtn.setAttribute('aria-expanded', 'false');
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          userMenu.hidden = true;
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });

      userMenu.querySelectorAll('button[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          userMenu.hidden = true;
          avatarBtn.setAttribute('aria-expanded', 'false');
          var action = btn.getAttribute('data-action');
          if (action === 'logout') logout();
          else if (action === 'export-all') exportAllCharacters();
          else if (action === 'import-all') importAllCharacters();
          else if (action === 'change-password') showChangePasswordModal();
          else if (action === 'delete-account') showDeleteAccountModal();
        });
      });
    }

    checkAuth().then(async function () {
      spinnerTimer = setTimeout(function () {
        var spinner = $('#loading-spinner');
        if (spinner) spinner.classList.remove('hidden');
      }, 500);

      await switchTab(activeTab);
      hideSpinner();
      showToast('Données restaurées', 'success');
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
  window.showToast = showToast;
  window.showToastSave = showToastSave;
  window.openSheet = openSheet;
  window.bindAutoSave = bindAutoSave;
  window.scheduleSave = scheduleSave;
  window.showModal = showModal;

})();
