/* assets/money-accounts.js v1 — Мои деньги: Счета */
/* Requires MONEY_STORE (money-store.js) to be loaded first */
(function () {
  'use strict';

  // ─── SVG helper ────────────────────────────────────────────────────────────
  var _SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">';
  function _svg(path) { return _SVG_OPEN + '<path d="' + path + '"/></svg>'; }

  var _P = {
    card:    'M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48ZM32,64H224v32H32Zm192,128H32V112H224v80ZM48,152a8,8,0,0,1,8-8H104a8,8,0,0,1,0,16H56A8,8,0,0,1,48,152Zm144,0a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h16A8,8,0,0,1,192,152Z',
    cash:    'M216,72H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,64V192a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H56a8,8,0,0,1,0-16H216Zm0-32H56V88H216Zm-28-36a12,12,0,1,1-12-12A12,12,0,0,1,188,132Z',
    savings: 'M224,196h-12V102.4l5.66,3.77a8,8,0,0,0,8.88-13.32l-96-64a8,8,0,0,0-8.88,0l-96,64a8,8,0,0,0,8.88,13.32L40,102.4V196H28a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM56,196V100.64L128,56l72,44.64V196ZM72,152V116a8,8,0,0,1,16,0v36a8,8,0,0,1-16,0Zm40,0V116a8,8,0,0,1,16,0v36a8,8,0,0,1-16,0Zm40,0V116a8,8,0,0,1,16,0v36a8,8,0,0,1-16,0Z',
    edit:    'M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152a15.86,15.86,0,0,0-4.69,11.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88,44.69,44.68ZM192,108,147.32,63.31l24-24L216,84Z',
    archive: 'M224,48H32A16,16,0,0,0,16,64V88a16,16,0,0,0,8,13.83V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V101.83A16,16,0,0,0,240,88V64A16,16,0,0,0,224,48ZM32,64H224V88H32Zm184,144H40V104H216V208Zm-56-96a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h32A8,8,0,0,1,160,112Z',
    restore: 'M224,128a96,96,0,1,1-96-96,8,8,0,0,1,0,16,80,80,0,1,0,74.12,50H176a8,8,0,0,1,0-16h56a8,8,0,0,1,8,8V120a8,8,0,0,1-16,0V69.23A95.43,95.43,0,0,1,224,128Z',
    trash:   'M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z',
    caret:   'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z'
  };

  var TYPE_LABELS = { card: 'Карта', cash: 'Наличные', savings: 'Накопительный счёт' };

  // ─── Business logic ────────────────────────────────────────────────────────

  function calcBalance(account) {
    var balance = account.initialBalanceMinor || 0;
    var txns = MONEY_STORE.getState().transactions;
    var id = account.id;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.accountId === id) {
        if (tx.type === 'income')                              { balance += tx.amountMinor; }
        else if (tx.type === 'expense' || tx.type === 'investment') { balance -= tx.amountMinor; }
        else if (tx.type === 'transfer')                       { balance -= tx.amountMinor; }
      }
      if (tx.toAccountId === id && tx.type === 'transfer') { balance += tx.amountMinor; }
    }
    return balance;
  }

  function hasTransactions(accountId) {
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      if (txns[i].accountId === accountId || txns[i].toAccountId === accountId) return true;
    }
    return false;
  }

  function findAccount(id) {
    var accounts = MONEY_STORE.getState().accounts;
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].id === id) return accounts[i];
    }
    return null;
  }

  // ─── Formatting ────────────────────────────────────────────────────────────

  function fmtRub(minor) {
    var neg = minor < 0;
    var abs = Math.abs(minor);
    var r = Math.floor(abs / 100);
    var k = abs % 100;
    var s = r.toLocaleString('ru-RU');
    if (k > 0) s += ',' + (k < 10 ? '0' + k : k);
    return (neg ? '−' : '') + s + ' ₽';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseAmount(s) {
    var cleaned = String(s).replace(/\s/g, '').replace(',', '.');
    var v = parseFloat(cleaned);
    if (isNaN(v)) return null;
    return Math.round(v * 100);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  var _archExpanded = false;
  var _clickBound = false;

  function renderPage() {
    var wrap = document.getElementById('ac-content');
    if (!wrap) return;

    var s = MONEY_STORE.getState();
    var active   = s.accounts.filter(function (a) { return !a.archived; });
    var archived = s.accounts.filter(function (a) { return  a.archived; });

    var totalAvailable = 0;
    var hasIncluded = false;
    active.forEach(function (a) {
      if (a.includeInAvailable) { totalAvailable += calcBalance(a); hasIncluded = true; }
    });

    var html = '';

    if (active.length === 0 && archived.length === 0) {
      html = _emptyHtml();
    } else {
      if (hasIncluded) {
        html += '<div class="ac-total-bar">'
          + '<span class="ac-total-label">Доступно</span>'
          + '<span class="ac-total-val' + (totalAvailable < 0 ? ' ac-neg' : '') + '">'
          + fmtRub(totalAvailable) + '</span>'
          + '</div>';
      }
      active.forEach(function (a) { html += _cardHtml(a); });
      html += '<button class="ac-add-btn" type="button" data-action="add-account">+ Добавить счёт</button>';

      if (archived.length > 0) {
        html += '<div class="ac-archive-section">'
          + '<button class="ac-archive-toggle'
          + (_archExpanded ? ' ac-archive-toggle--open' : '')
          + '" type="button" data-action="toggle-archive" aria-expanded="'
          + _archExpanded + '">'
          + '<span class="ac-archive-title">Архивные счета (' + archived.length + ')</span>'
          + _svg(_P.caret)
          + '</button>'
          + '<div class="ac-archive-list" id="ac-arch-list"'
          + (_archExpanded ? '' : ' style="display:none"') + '>';
        archived.forEach(function (a) { html += _cardHtml(a); });
        html += '</div></div>';
      }
    }

    wrap.innerHTML = html;

    // Attach delegation once — wrap element is stable across renders
    if (!_clickBound) {
      _clickBound = true;
      wrap.addEventListener('click', _onWrapClick);
    }
  }

  function _emptyHtml() {
    return '<div class="ac-empty">'
      + '<div class="ac-empty-ic">' + _svg(_P.card) + '</div>'
      + '<p class="ac-empty-text">Добавьте счета,<br>чтобы отслеживать баланс</p>'
      + '<button class="ac-add-first-btn" type="button" data-action="add-account">Добавить счёт</button>'
      + '</div>';
  }

  function _cardHtml(a) {
    var balance = calcBalance(a);
    var hasTx   = hasTransactions(a.id);
    var negCls  = balance < 0 ? ' ac-neg' : '';
    var icKey   = a.type === 'cash' ? 'cash' : a.type === 'savings' ? 'savings' : 'card';

    var html = '<div class="ac-card' + (a.archived ? ' ac-card--archived' : '') + '">'
      + '<div class="ac-card-ic">' + _svg(_P[icKey]) + '</div>'
      + '<div class="ac-card-body">'
      + '<div class="ac-card-row1">'
      + '<span class="ac-card-name">' + esc(a.name) + '</span>'
      + '<span class="ac-card-balance' + negCls + '">' + fmtRub(balance) + '</span>'
      + '</div>'
      + '<div class="ac-card-row2">'
      + '<span class="ac-card-type">' + esc(TYPE_LABELS[a.type] || a.type) + '</span>';

    if (!a.includeInAvailable && !a.archived) {
      html += '<span class="ac-card-badge ac-card-badge--excluded">Не учитывается</span>';
    }

    html += '</div></div>'    // ac-card-body
      + '<div class="ac-card-actions">'
      + '<button class="ac-action-btn ac-action-edit" type="button" data-id="'
      + esc(a.id) + '" aria-label="Редактировать">' + _svg(_P.edit) + '</button>';

    if (!a.archived) {
      if (hasTx) {
        html += '<button class="ac-action-btn ac-action-archive" type="button" data-id="'
          + esc(a.id) + '" aria-label="Архивировать">' + _svg(_P.archive) + '</button>';
      } else {
        html += '<button class="ac-action-btn ac-action-delete" type="button" data-id="'
          + esc(a.id) + '" aria-label="Удалить">' + _svg(_P.trash) + '</button>';
      }
    } else {
      html += '<button class="ac-action-btn ac-action-restore" type="button" data-id="'
        + esc(a.id) + '" aria-label="Восстановить">' + _svg(_P.restore) + '</button>';
      if (!hasTx) {
        html += '<button class="ac-action-btn ac-action-delete" type="button" data-id="'
          + esc(a.id) + '" aria-label="Удалить">' + _svg(_P.trash) + '</button>';
      }
    }

    html += '</div></div>'; // ac-card-actions, ac-card
    return html;
  }

  function _onWrapClick(e) {
    // Add account
    var addBtn = e.target.closest('[data-action="add-account"]');
    if (addBtn) { openSheet(null); return; }

    // Archive toggle
    var toggleBtn = e.target.closest('[data-action="toggle-archive"]');
    if (toggleBtn) { _toggleArchive(); return; }

    // Card actions (require data-id)
    var actionBtn = e.target.closest('button[data-id]');
    if (!actionBtn) return;
    var id = actionBtn.dataset.id;
    if (actionBtn.classList.contains('ac-action-edit'))    { openSheet(id); return; }
    if (actionBtn.classList.contains('ac-action-archive')) { doArchive(id, true); return; }
    if (actionBtn.classList.contains('ac-action-restore')) { doArchive(id, false); return; }
    if (actionBtn.classList.contains('ac-action-delete'))  { doDelete(id); return; }
  }

  // ─── Archive toggle (no full re-render) ───────────────────────────────────

  function _toggleArchive() {
    _archExpanded = !_archExpanded;
    var list = document.getElementById('ac-arch-list');
    var btn  = document.querySelector('[data-action="toggle-archive"]');
    if (list) list.style.display = _archExpanded ? '' : 'none';
    if (btn)  {
      btn.setAttribute('aria-expanded', String(_archExpanded));
      btn.classList.toggle('ac-archive-toggle--open', _archExpanded);
    }
  }

  // ─── Account actions ───────────────────────────────────────────────────────

  function doArchive(id, archive) {
    var snapshot = MONEY_STORE.exportData();
    MONEY_STORE.update(function (s) {
      var a = _findInState(s, id);
      if (a) { a.archived = archive; a.updatedAt = new Date().toISOString(); }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snapshot);
  }

  function doDelete(id) {
    if (hasTransactions(id)) return;
    if (!window.confirm('Удалить счёт? Это действие нельзя отменить.')) return;
    var snapshot = MONEY_STORE.exportData();
    MONEY_STORE.update(function (s) {
      s.accounts = s.accounts.filter(function (a) { return a.id !== id; });
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snapshot);
  }

  function _findInState(s, id) {
    for (var i = 0; i < s.accounts.length; i++) {
      if (s.accounts[i].id === id) return s.accounts[i];
    }
    return null;
  }

  // ─── Sheet (add / edit form) ───────────────────────────────────────────────

  var _sheetEl   = null;
  var _editingId = null;

  function openSheet(id) {
    _editingId = id || null;
    var el = _ensureSheet();
    var existing = _editingId ? findAccount(_editingId) : null;

    el.querySelector('#ac-f-name').value    = existing ? existing.name  : '';
    el.querySelector('#ac-f-type').value    = existing ? existing.type  : 'card';
    el.querySelector('#ac-f-include').checked = existing ? existing.includeInAvailable : true;

    var balVal = '';
    if (existing) {
      var minor = existing.initialBalanceMinor || 0;
      var neg = minor < 0;
      var abs = Math.abs(minor);
      var r = Math.floor(abs / 100);
      var k = abs % 100;
      balVal = (neg ? '-' : '') + r + (k > 0 ? ',' + (k < 10 ? '0' + k : k) : '');
    }
    el.querySelector('#ac-f-balance').value = balVal;

    el.querySelectorAll('.ac-sheet-err').forEach(function (e) { e.textContent = ''; });

    var hasEmpty = existing && !hasTransactions(existing.id);
    el.querySelector('#ac-f-del-row').style.display = hasEmpty ? '' : 'none';
    el.querySelector('#ac-sheet-h').textContent = existing ? 'Редактировать счёт' : 'Добавить счёт';

    _validateSheet(el);

    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { el.querySelector('#ac-f-name').focus(); }, 80);
  }

  function _closeSheet() {
    if (!_sheetEl) return;
    _sheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
    _editingId = null;
  }

  function _validateSheet(el) {
    var name   = el.querySelector('#ac-f-name').value.trim();
    var balStr = el.querySelector('#ac-f-balance').value.trim();
    var balOk  = balStr === '' || parseAmount(balStr) !== null;
    el.querySelector('#ac-sheet-save').disabled = !name || !balOk;
  }

  function _ensureSheet() {
    if (_sheetEl) return _sheetEl;

    var el = document.createElement('div');
    el.id = 'ac-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'ac-sheet-h');

    var closeX = '<button class="mn-sheet-x" type="button" aria-label="Закрыть">'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">'
      + '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>'
      + '</button>';

    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + closeX
      + '<h2 class="mn-sheet-h" id="ac-sheet-h">Добавить счёт</h2>'

      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="ac-f-name">Название</label>'
      + '<input class="mn-sheet-inp" id="ac-f-name" type="text" placeholder="Например: Дебетовая карта" maxlength="60" autocomplete="off">'
      + '<span class="ac-sheet-err mn-sheet-err" id="ac-e-name"></span>'
      + '</div>'

      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="ac-f-type">Тип</label>'
      + '<select class="mn-sheet-sel" id="ac-f-type">'
      + '<option value="card">Карта</option>'
      + '<option value="cash">Наличные</option>'
      + '<option value="savings">Накопительный счёт</option>'
      + '</select>'
      + '</div>'

      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="ac-f-balance">Начальный баланс, ₽ (можно отрицательный)</label>'
      + '<input class="mn-sheet-inp" id="ac-f-balance" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="ac-sheet-err mn-sheet-err" id="ac-e-balance"></span>'
      + '</div>'

      + '<div class="mn-sheet-row ac-toggle-row">'
      + '<label class="mn-sheet-lbl" for="ac-f-include">Учитывать в доступной сумме</label>'
      + '<label class="ac-toggle">'
      + '<input type="checkbox" id="ac-f-include" checked>'
      + '<span class="ac-toggle-track" aria-hidden="true"></span>'
      + '</label>'
      + '</div>'

      + '<button class="mn-sheet-save" type="button" id="ac-sheet-save" disabled>Сохранить</button>'

      + '<div id="ac-f-del-row" style="display:none">'
      + '<button class="mn-sheet-cancel ac-sheet-del-btn" type="button" id="ac-f-del">Удалить счёт</button>'
      + '</div>'

      + '<button class="mn-sheet-cancel" type="button" id="ac-sheet-cancel">Отмена</button>'
      + '</div>';

    document.body.appendChild(el);
    _sheetEl = el;

    var nameInp = el.querySelector('#ac-f-name');
    var balInp  = el.querySelector('#ac-f-balance');
    var saveBtn = el.querySelector('#ac-sheet-save');

    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeSheet);
    el.querySelector('#ac-sheet-cancel').addEventListener('click', _closeSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeSheet(); });

    el.querySelector('#ac-f-del').addEventListener('click', function () {
      if (!_editingId || hasTransactions(_editingId)) return;
      _closeSheet();
      doDelete(_editingId);
    });

    [nameInp, balInp].forEach(function (inp) {
      inp.addEventListener('input', function () { _validateSheet(el); });
    });

    saveBtn.addEventListener('click', function () { _doSave(el); });

    return el;
  }

  function _doSave(el) {
    el.querySelectorAll('.ac-sheet-err').forEach(function (e) { e.textContent = ''; });

    var name    = el.querySelector('#ac-f-name').value.trim();
    var type    = el.querySelector('#ac-f-type').value;
    var balStr  = el.querySelector('#ac-f-balance').value.trim();
    var include = el.querySelector('#ac-f-include').checked;

    var valid = true;
    if (!name) {
      el.querySelector('#ac-e-name').textContent = 'Укажите название';
      valid = false;
    }

    var balMinor = 0;
    if (balStr !== '') {
      balMinor = parseAmount(balStr);
      if (balMinor === null) {
        el.querySelector('#ac-e-balance').textContent = 'Введите число (например: 10000 или −500,50)';
        valid = false;
      }
    }

    if (!valid) return;

    var now      = new Date().toISOString();
    var snapshot = MONEY_STORE.exportData();

    MONEY_STORE.update(function (s) {
      if (_editingId) {
        var a = _findInState(s, _editingId);
        if (a) {
          a.name                 = name;
          a.type                 = type;
          a.initialBalanceMinor  = balMinor;
          a.includeInAvailable   = include;
          a.updatedAt            = now;
        }
      } else {
        s.accounts.push({
          id:                   MONEY_STORE.createId(),
          name:                 name,
          type:                 type,
          initialBalanceMinor:  balMinor,
          includeInAvailable:   include,
          archived:             false,
          createdAt:            now,
          updatedAt:            now
        });
      }
    });

    var saved = MONEY_STORE.save();
    if (!saved) {
      MONEY_STORE.importData(snapshot);
      el.querySelector('#ac-e-name').textContent =
        'Ошибка сохранения. Проверьте свободное место и попробуйте снова.';
      return;
    }

    _closeSheet();
  }

  // ─── Subscribe + observe ───────────────────────────────────────────────────

  function _isPageActive() {
    var page = document.querySelector('[data-page="money-accounts"]');
    return page && page.classList.contains('active');
  }

  function _observePage() {
    var page = document.querySelector('[data-page="money-accounts"]');
    if (!page || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (page.classList.contains('active')) renderPage();
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    MONEY_STORE.subscribe(function () {
      if (_isPageActive()) renderPage();
    });
    _observePage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
