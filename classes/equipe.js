window.DCCModules = window.DCCModules || {};

window.DCCModules.equipe = {
  render(container, characters, onSavePV, initialNotes, onSaveNotes) {
    const CLASS_LABELS = {
      clerc: 'Clerc', elfe: 'Elfe', guerrier: 'Guerrier',
      halfelin: 'Halfelin', mage: 'Mage', nain: 'Nain', voleur: 'Voleur'
    };

    function createTurnCounter() {
      const counter = document.createElement('div');
      counter.className = 'turn-counter';
      counter.textContent = '0';

      function updateFill(turn) {
        var pct = turn === 0 ? 0 : (turn % 5 === 0 ? 100 : (turn % 5) * 20);
        counter.style.setProperty('--fill', pct + '%');
      }

      function reset() {
        counter.textContent = '0';
        updateFill(0);
      }

      function increment() {
        var n = parseInt(counter.textContent || '0') + 1;
        counter.textContent = n;
        updateFill(n);
      }

      counter.addEventListener('click', function (e) {
        e.preventDefault();
        increment();
      });

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

    function createEnemyRow() {
      const tr = document.createElement('tr');

      const fields = [
        { tag: 'input', type: 'text', placeholder: 'Nom' },
        { tag: 'input', type: 'number', placeholder: '' },
        { tag: 'input', type: 'number', placeholder: '' },
        { tag: 'input', type: 'text', placeholder: '' },
        { tag: 'input', type: 'number', placeholder: '' },
      ];

      fields.forEach(function (f) {
        const td = document.createElement('td');
        const input = document.createElement(f.tag);
        input.type = f.type;
        input.placeholder = f.placeholder;
        td.appendChild(input);
        tr.appendChild(td);
      });

      const tdCounter = document.createElement('td');
      tdCounter.appendChild(createTurnCounter());
      tr.appendChild(tdCounter);

      return tr;
    }

    function render() {
      container.innerHTML = '';

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

          // Nom
          const tdName = document.createElement('td');
          tdName.className = 'char-name';
          tdName.textContent = charData.name || 'Sans nom';
          tdName.style.cursor = 'pointer';
          tdName.addEventListener('click', function () {
            window.switchTab(charData.class);
            setTimeout(function () {
              window.openSheet(charData.class, charData);
            }, 100);
          });
          tr.appendChild(tdName);

          // Classe
          const tdClass = document.createElement('td');
          tdClass.className = 'char-class';
          const classContent = document.createElement('div');
          classContent.className = 'char-class-content';
          const img = document.createElement('img');
          img.className = 'team-portrait';
          img.alt = '';
          if (window.getPortraitSrc) {
            var portraitResult = window.getPortraitSrc(data.portrait_source || 'dcc', charData.class, data.portrait_index);
            img.src = portraitResult.src;
          }
          if (img.src) classContent.appendChild(img);
          classContent.appendChild(document.createTextNode(CLASS_LABELS[charData.class] || charData.class));
          tdClass.appendChild(classContent);
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
          inputPV.addEventListener('change', function () {
            if (onSavePV) {
              onSavePV(charData.id, inputPV.value);
            }
          });
          tdPV.appendChild(inputPV);
          tr.appendChild(tdPV);

          // Init combat (not saved)
          const tdInitCombat = document.createElement('td');
          const inputInit = document.createElement('input');
          inputInit.type = 'number';
          inputInit.placeholder = '';
          tdInitCombat.appendChild(inputInit);
          tr.appendChild(tdInitCombat);

          // Compteur de tour
          const tdCounter = document.createElement('td');
          tdCounter.appendChild(createTurnCounter());
          tr.appendChild(tdCounter);

          tbody.appendChild(tr);
        });

        tableChars.appendChild(tbody);
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
      tableEnemies.className = 'team-table';

      const theadE = document.createElement('thead');
      theadE.innerHTML = '<tr>' +
        '<th style="text-align:left">Ennemi</th>' +
        '<th>Init.</th>' +
        '<th>AC</th>' +
        '<th>ATT</th>' +
        '<th>PV</th>' +
        '<th>Tour</th>' +
        '</tr>';
      tableEnemies.appendChild(theadE);

      const tbodyE = document.createElement('tbody');

      // 3 lignes vides par défaut
      for (let i = 0; i < 3; i++) {
        tbodyE.appendChild(createEnemyRow());
      }

      tableEnemies.appendChild(tbodyE);
      container.appendChild(tableEnemies);

      // Event listeners boutons
      btnAdd.addEventListener('click', function () {
        tbodyE.appendChild(createEnemyRow());
      });

      btnRemove.addEventListener('click', function () {
        if (tbodyE.lastElementChild) {
          tbodyE.removeChild(tbodyE.lastElementChild);
        }
      });

      btnRaz.addEventListener('click', function () {
        tbodyE.innerHTML = '';
        for (let i = 0; i < 3; i++) {
          tbodyE.appendChild(createEnemyRow());
        }
      });

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

    render();
  }
};
