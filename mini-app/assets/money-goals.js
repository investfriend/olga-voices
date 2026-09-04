/* assets/money-goals.js v2 — Мои деньги: Цели (Stage 5B) */
(function () {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────
  var MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня',
                    'июля','августа','сентября','октября','ноября','декабря'];
  var CLOSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">'
    + '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32'
    + 'L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32'
    + 'L139.31,128Z"/></svg>';

  // ─── Utilities ────────────────────────────────────────────────────────────
  function fmtRub(minor) {
    minor = Math.round(minor);
    var abs = Math.abs(minor);
    var rub = Math.floor(abs / 100);
    var kop = abs % 100;
    var sign = minor < 0 ? '−' : '';
    var rubS = String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return sign + rubS + (kop ? ',' + ('0' + kop).slice(-2) : '') + ' ₽';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseAmount(s) {
    if (!s) return null;
    var v = parseFloat(String(s).trim().replace(/,/g, '.').replace(/\s/g, ''));
    if (isNaN(v) || v <= 0) return null;
    return Math.round(v * 100);
  }

  function _localDate() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function _fmtDate(dateStr) {
    if (!dateStr) return '';
    var p = dateStr.split('-');
    if (p.length !== 3) return dateStr;
    return parseInt(p[2], 10) + ' ' + (MONTHS_GEN[parseInt(p[1], 10) - 1] || '') + ' ' + p[0];
  }

  // ─── Module state ─────────────────────────────────────────────────────────
  var _goalSheetEl    = null;
  var _detailSheetEl  = null;
  var _contribSheetEl = null;
  var _clickBound     = false;
  var _currentDetailGoalId  = null;
  var _currentContribGoalId = null;
  var _currentContribEditId = null;
  var _contribMode          = 'manual'; // 'manual' | 'transfer'
  var _collapsedCompleted   = false;
  var _collapsedArchived    = true;

  // ─── Store helpers ────────────────────────────────────────────────────────
  function _getGoals()   { return MONEY_STORE.getState().goals || []; }
  function _getAccounts(){ return MONEY_STORE.getState().accounts || []; }
  function _getTxns()    { return MONEY_STORE.getState().transactions || []; }

  function _findGoal(id) {
    var goals = _getGoals();
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].id === id) return goals[i];
    }
    return null;
  }

  function _findAcct(id) {
    if (!id) return null;
    var accts = _getAccounts();
    for (var i = 0; i < accts.length; i++) {
      if (accts[i].id === id) return accts[i];
    }
    return null;
  }

  function _findTxById(id) {
    if (!id) return null;
    var txns = _getTxns();
    for (var i = 0; i < txns.length; i++) {
      if (txns[i].id === id) return txns[i];
    }
    return null;
  }

  function _findContrib(goal, id) {
    var cs = goal && goal.contributions ? goal.contributions : [];
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].id === id) return cs[i];
    }
    return null;
  }

  // ─── Transfer verification ────────────────────────────────────────────────
  // Returns true for manual contribs (always ok) and for verified transfer contribs.
  function _verifyTransferContrib(c) {
    if (!c) return false;
    if (c.mode !== 'transfer') return true; // manual = always confirmed
    var tx = _findTxById(c.transferTransactionId);
    if (!tx) return false;
    return tx.type === 'transfer'
      && tx.accountId    === c.sourceAccountId
      && tx.toAccountId  === c.destinationAccountId
      && tx.amountMinor  === c.amountMinor
      && tx.localDate    === c.localDate;
  }

  // ─── Calculations ─────────────────────────────────────────────────────────
  function _calcAccumulated(goal) {
    // Unverified transfer contribs are excluded from the confirmed sum
    var total = goal.initialAmountMinor || 0;
    var cs = goal.contributions || [];
    for (var i = 0; i < cs.length; i++) {
      if (_verifyTransferContrib(cs[i])) total += cs[i].amountMinor || 0;
    }
    return total;
  }

  function _isDeadlineExpired(deadline) {
    if (!deadline) return false;
    return deadline.slice(0, 7) < _localDate().slice(0, 7);
  }

  function _calcMonthlyTarget(goal) {
    if (!goal.deadline || goal.status !== 'active') return null;
    if (_isDeadlineExpired(goal.deadline)) return null;
    var accumulated = _calcAccumulated(goal);
    var remaining = goal.targetAmountMinor - accumulated;
    if (remaining <= 0) return null;
    var tp = _localDate().split('-');
    var dp = goal.deadline.split('-');
    var months = (parseInt(dp[0], 10) - parseInt(tp[0], 10)) * 12
               + (parseInt(dp[1], 10) - parseInt(tp[1], 10)) + 1;
    if (months <= 0) return null;
    return Math.ceil(remaining / months / 100) * 100;
  }

  // ─── Account helpers ──────────────────────────────────────────────────────
  function _getActiveSavingsAccts() {
    return _getAccounts().filter(function (a) {
      return a.type === 'savings' && !a.archived;
    });
  }

  function _getActiveAccts() {
    return _getAccounts().filter(function (a) { return !a.archived; });
  }

  // Populate a <select> with savings accounts (active + archived current if set)
  function _populateSavingsAcct(sel, currentId) {
    if (!sel) return;
    var accts = _getAccounts();
    var html = '<option value="">— не привязывать —</option>';
    // If currentId is archived savings, include it first
    if (currentId) {
      for (var i = 0; i < accts.length; i++) {
        var a = accts[i];
        if (a.id === currentId && a.type === 'savings' && a.archived) {
          html += '<option value="' + esc(a.id) + '" selected>' + esc(a.name) + ' (В архиве)</option>';
          break;
        }
      }
    }
    // Active savings
    for (var j = 0; j < accts.length; j++) {
      var ac = accts[j];
      if (ac.type !== 'savings' || ac.archived) continue;
      html += '<option value="' + esc(ac.id) + '"' + (ac.id === currentId ? ' selected' : '') + '>'
        + esc(ac.name) + '</option>';
    }
    sel.innerHTML = html;
    if (currentId) sel.value = currentId;
  }

  // Populate source account select (all active accounts except the linked savings dest)
  function _populateSourceAccts(sel, linkedAccountId, currentSrcId) {
    if (!sel) return;
    var active = _getActiveAccts();
    var html = '<option value="">— выберите счёт —</option>';
    for (var i = 0; i < active.length; i++) {
      var a = active[i];
      if (a.id === linkedAccountId) continue; // exclude destination
      html += '<option value="' + esc(a.id) + '"' + (a.id === currentSrcId ? ' selected' : '') + '>'
        + esc(a.name) + '</option>';
    }
    sel.innerHTML = html;
    if (currentSrcId) sel.value = currentSrcId;
  }

  // ─── Page state ───────────────────────────────────────────────────────────
  function _isPageActive() {
    var p = document.querySelector('[data-page="money-goals"]');
    return p && p.classList.contains('active');
  }

  // ─── Goal card HTML ───────────────────────────────────────────────────────
  function _goalCardHtml(goal) {
    var accumulated = _calcAccumulated(goal);
    var pct    = goal.targetAmountMinor > 0
      ? Math.round(accumulated / goal.targetAmountMinor * 100) : 0;
    var barPct = pct > 100 ? 100 : pct;
    var isOver = goal.targetAmountMinor > 0 && accumulated >= goal.targetAmountMinor;
    var monthly = _calcMonthlyTarget(goal);
    var expired = _isDeadlineExpired(goal.deadline);
    var isActive = goal.status === 'active';

    var linkedAcct = _findAcct(goal.linkedAccountId);
    var acctArchived = linkedAcct && linkedAcct.archived;

    var badges = '';
    if (goal.isMain && isActive)     badges += '<span class="gl-badge gl-badge--main">Главная</span>';
    if (goal.priority === 'high')    badges += '<span class="gl-badge gl-badge--high">Высокий</span>';
    if (goal.priority === 'medium')  badges += '<span class="gl-badge gl-badge--medium">Средний</span>';
    if (goal.linkedAccountId)        badges += '<span class="gl-badge gl-badge--acct">' + esc(linkedAcct ? linkedAcct.name : '?') + (acctArchived ? ' ⚠' : '') + '</span>';
    if (goal.status === 'completed') badges += '<span class="gl-badge gl-badge--done">Завершена</span>';
    if (goal.status === 'archived')  badges += '<span class="gl-badge gl-badge--archive">В архиве</span>';

    var cls = 'gl-card';
    if (goal.isMain && isActive)     cls += ' gl-card--main';
    if (goal.status === 'completed') cls += ' gl-card--completed';
    if (goal.status === 'archived')  cls += ' gl-card--archived';

    var html = '<div class="' + cls + '">';
    html += '<div class="gl-card-head">'
      + '<span class="gl-card-name">' + esc(goal.name) + '</span>'
      + (badges ? '<span class="gl-card-badges">' + badges + '</span>' : '')
      + '</div>';

    if (isActive && isOver) {
      html += '<div class="gl-complete-banner">'
        + '<span class="gl-complete-banner-txt">Цель достигнута!</span>'
        + '<button class="gl-complete-banner-btn" type="button"'
        + ' data-action="complete-goal" data-id="' + esc(goal.id) + '">Завершить</button>'
        + '</div>';
    }

    html += '<div class="gl-bar"><div class="gl-bar-fill'
      + (isOver ? ' gl-bar-fill--over' : '') + '" style="width:' + barPct + '%"></div></div>';
    html += '<div class="gl-card-amounts">'
      + '<span class="gl-card-acc">' + fmtRub(accumulated) + '</span>'
      + '<span class="gl-card-sep">из</span>'
      + '<span class="gl-card-target">' + fmtRub(goal.targetAmountMinor) + '</span>'
      + '<span class="gl-card-pct">' + pct + '%</span>'
      + '</div>';

    if (goal.deadline || monthly) {
      html += '<div class="gl-card-meta">';
      if (goal.deadline) {
        var dlVal = esc(_fmtDate(goal.deadline));
        if (expired && isActive) {
          html += '<div class="gl-card-meta-row"><span class="gl-card-meta-lbl">Срок:</span>'
            + '<span class="gl-card-meta-val gl-card-meta-val--warn">Истёк (' + dlVal + ')</span></div>';
        } else {
          html += '<div class="gl-card-meta-row"><span class="gl-card-meta-lbl">Срок:</span>'
            + '<span class="gl-card-meta-val">' + dlVal + '</span></div>';
        }
      }
      if (monthly) {
        html += '<div class="gl-card-meta-row"><span class="gl-card-meta-lbl">Ориентир:</span>'
          + '<span class="gl-card-meta-val">' + fmtRub(monthly) + '/мес</span>'
          + '<span class="gl-card-meta-hint">&nbsp;(расчётный)</span></div>';
      }
      html += '</div>';
    }

    html += '<div class="gl-card-actions">';
    if (isActive) {
      html += '<button class="gl-btn gl-btn--primary" type="button"'
        + ' data-action="contrib-goal" data-id="' + esc(goal.id) + '">Пополнить</button>';
    }
    if (goal.status === 'archived') {
      html += '<button class="gl-btn gl-btn--restore" type="button"'
        + ' data-action="restore-goal" data-id="' + esc(goal.id) + '">Восстановить</button>';
    }
    html += '<button class="gl-btn gl-btn--ghost" type="button"'
      + ' data-action="detail-goal" data-id="' + esc(goal.id) + '">Подробнее</button>';
    html += '</div></div>';
    return html;
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  function renderPage() {
    var wrap = document.getElementById('mn-goals-content');
    if (!wrap) return;

    var goals     = _getGoals();
    var active    = goals.filter(function (g) { return g.status === 'active'; });
    var completed = goals.filter(function (g) { return g.status === 'completed'; });
    var archived  = goals.filter(function (g) { return g.status === 'archived'; });

    var PORD = { high: 0, medium: 1, low: 2 };
    active.sort(function (a, b) {
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      var pa = a.priority in PORD ? PORD[a.priority] : 3;
      var pb = b.priority in PORD ? PORD[b.priority] : 3;
      if (pa !== pb) return pa - pb;
      return (a.name || '').localeCompare(b.name || '');
    });

    var html = '<div class="gl-sec-hd">'
      + '<span class="gl-sec-ttl">Активные цели</span>'
      + '<button class="gl-add-btn" type="button" data-action="add-goal">+&nbsp;Новая цель</button>'
      + '</div>';

    if (!active.length) {
      html += '<div class="gl-empty">'
        + '<p class="gl-empty-txt">Нет активных целей</p>'
        + '<p class="gl-empty-sub">Нажмите «+&nbsp;Новая цель», чтобы добавить</p>'
        + '</div>';
    } else {
      for (var i = 0; i < active.length; i++) html += _goalCardHtml(active[i]);
    }

    if (completed.length) {
      html += '<div class="gl-sec"><div class="gl-sec-hd">'
        + '<span class="gl-sec-ttl">Завершённые (' + completed.length + ')</span>'
        + '<button class="gl-collapse-btn" type="button" data-action="toggle-completed">'
        + (_collapsedCompleted ? 'Показать' : 'Скрыть') + '</button></div>';
      if (!_collapsedCompleted) {
        for (var j = 0; j < completed.length; j++) html += _goalCardHtml(completed[j]);
      }
      html += '</div>';
    }

    if (archived.length) {
      html += '<div class="gl-sec"><div class="gl-sec-hd">'
        + '<span class="gl-sec-ttl">Архив (' + archived.length + ')</span>'
        + '<button class="gl-collapse-btn" type="button" data-action="toggle-archived">'
        + (_collapsedArchived ? 'Показать' : 'Скрыть') + '</button></div>';
      if (!_collapsedArchived) {
        for (var k = 0; k < archived.length; k++) html += _goalCardHtml(archived[k]);
      }
      html += '</div>';
    }

    wrap.innerHTML = html;
    if (!_clickBound) {
      _clickBound = true;
      wrap.addEventListener('click', _onGoalClick);
    }
  }

  // ─── Click delegation (main page) ─────────────────────────────────────────
  function _onGoalClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action, id = btn.dataset.id;
    switch (action) {
      case 'add-goal':    openGoalSheet(null); break;
      case 'detail-goal': openDetailSheet(id); break;
      case 'contrib-goal': openContribSheet(id, null, 0); break;
      case 'complete-goal': _doCompleteGoal(id); break;
      case 'restore-goal':  _doRestoreGoal(id);  break;
      case 'toggle-completed': _collapsedCompleted = !_collapsedCompleted; renderPage(); break;
      case 'toggle-archived':  _collapsedArchived  = !_collapsedArchived;  renderPage(); break;
    }
  }

  // ─── Goal form sheet ──────────────────────────────────────────────────────
  function openGoalSheet(id) {
    var el = _ensureGoalSheet();
    var goal = id ? _findGoal(id) : null;
    el.dataset.editId = goal ? goal.id : '';
    el.querySelector('#gf-h').textContent = goal ? 'Редактировать цель' : 'Новая цель';
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    el.querySelector('#gf-name').value     = goal ? goal.name : '';
    el.querySelector('#gf-target').value   = goal ? String(Math.round(goal.targetAmountMinor / 100)) : '';
    var initV = goal && goal.initialAmountMinor > 0 ? String(Math.round(goal.initialAmountMinor / 100)) : '';
    el.querySelector('#gf-initial').value  = initV;
    el.querySelector('#gf-deadline').value = goal ? (goal.deadline || '') : '';
    el.querySelector('#gf-priority').value = goal ? (goal.priority || '') : '';
    el.querySelector('#gf-main').checked   = goal ? !!goal.isMain : false;

    var mainRow = el.querySelector('#gf-main-row');
    if (mainRow) mainRow.style.display = (!goal || goal.status === 'active') ? '' : 'none';

    // Populate savings account select
    var savingsSel = el.querySelector('#gf-savings-acct');
    _populateSavingsAcct(savingsSel, goal ? goal.linkedAccountId : null);

    // Show savings note if an account is selected
    _updateSavingsNote(el);

    var delBtn = el.querySelector('#gf-del-btn');
    if (delBtn) delBtn.style.display = goal ? '' : 'none';
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var inp = el.querySelector('#gf-name'); if (inp) inp.focus(); }, 80);
  }

  function _updateSavingsNote(el) {
    var savingsSel = el.querySelector('#gf-savings-acct');
    var noteEl = el.querySelector('#gf-savings-note');
    if (!savingsSel || !noteEl) return;
    var selId = savingsSel.value;
    if (selId) {
      var acct = _findAcct(selId);
      if (acct && acct.archived) {
        noteEl.textContent = 'Счёт в архиве — новые переводы недоступны, взносы сохранены.';
        noteEl.style.display = '';
      } else if (acct) {
        noteEl.textContent = 'Зарезервированные деньги останутся в общем доступном остатке — настройки счёта не меняются.';
        noteEl.style.display = '';
      } else {
        noteEl.textContent = '';
        noteEl.style.display = 'none';
      }
    } else {
      noteEl.textContent = '';
      noteEl.style.display = 'none';
    }
  }

  function _closeGoalSheet() {
    if (_goalSheetEl) _goalSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function _ensureGoalSheet() {
    if (_goalSheetEl) return _goalSheetEl;
    var el = document.createElement('div');
    el.id = 'goal-form-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h" id="gf-h">Новая цель</h2>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="gf-name">Название</label>'
      + '<input class="mn-sheet-inp" id="gf-name" type="text" maxlength="80"'
      + ' placeholder="Квартира, отпуск, автомобиль…" autocomplete="off">'
      + '<span class="mn-sheet-err" id="gf-e-name"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="gf-target">Целевая сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="gf-target" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="gf-e-target"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="gf-initial">Уже накоплено, ₽</label>'
      + '<input class="mn-sheet-inp" id="gf-initial" type="text" inputmode="decimal"'
      + ' placeholder="0 — если начинаем с нуля" autocomplete="off"></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="gf-deadline">Срок (необязательно)</label>'
      + '<input class="mn-sheet-inp" id="gf-deadline" type="date"></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="gf-savings-acct">Накопительный счёт</label>'
      + '<select class="mn-sheet-sel" id="gf-savings-acct"></select>'
      + '<span class="gl-acct-note" id="gf-savings-note" style="display:none"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="gf-priority">Приоритет</label>'
      + '<select class="mn-sheet-sel" id="gf-priority">'
      + '<option value="">— не указан —</option>'
      + '<option value="high">Высокий</option>'
      + '<option value="medium">Средний</option>'
      + '<option value="low">Низкий</option>'
      + '</select></div>'
      + '<label class="plan-recur-row" id="gf-main-row" style="margin-bottom:14px;">'
      + '<input type="checkbox" id="gf-main"> Главная цель</label>'
      + '<button class="mn-sheet-save" type="button" id="gf-save-btn">Сохранить</button>'
      + '<button class="mn-sheet-save plan-del-btn" type="button" id="gf-del-btn" style="display:none">Удалить цель</button>'
      + '<button class="mn-sheet-cancel" type="button" id="gf-cancel-btn">Отмена</button>'
      + '</div>';
    document.body.appendChild(el);
    _goalSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeGoalSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeGoalSheet);
    el.querySelector('#gf-cancel-btn').addEventListener('click', _closeGoalSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeGoalSheet(); });
    el.querySelector('#gf-savings-acct').addEventListener('change', function () { _updateSavingsNote(el); });
    el.querySelector('#gf-save-btn').addEventListener('click', function () { _doSaveGoal(el); });
    el.querySelector('#gf-del-btn').addEventListener('click', function () {
      var editId = el.dataset.editId;
      if (editId) { _closeGoalSheet(); _doDeleteGoal(editId); }
    });
    return el;
  }

  function _doSaveGoal(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    var name      = el.querySelector('#gf-name').value.trim();
    var target    = parseAmount(el.querySelector('#gf-target').value);
    var initRaw   = el.querySelector('#gf-initial').value.trim();
    var initial   = initRaw ? (parseAmount(initRaw) || 0) : 0;
    var deadline  = el.querySelector('#gf-deadline').value || null;
    var linkedAcct = el.querySelector('#gf-savings-acct').value || null;
    var priority  = el.querySelector('#gf-priority').value || null;
    var isMain    = el.querySelector('#gf-main').checked;
    var editId    = el.dataset.editId || '';
    var ok = true;
    if (!name)       { el.querySelector('#gf-e-name').textContent = 'Введите название'; ok = false; }
    if (target === null) { el.querySelector('#gf-e-target').textContent = 'Введите сумму больше 0'; ok = false; }
    if (!ok) return;

    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      if (!s.goals) s.goals = [];
      if (isMain) {
        for (var i = 0; i < s.goals.length; i++) {
          if (s.goals[i].status === 'active' && s.goals[i].id !== editId) s.goals[i].isMain = false;
        }
      }
      if (editId) {
        for (var j = 0; j < s.goals.length; j++) {
          if (s.goals[j].id === editId) {
            s.goals[j].name = name;
            s.goals[j].targetAmountMinor  = target;
            s.goals[j].initialAmountMinor = initial;
            s.goals[j].deadline       = deadline;
            s.goals[j].linkedAccountId = linkedAcct;
            s.goals[j].priority       = priority;
            s.goals[j].isMain         = isMain;
            s.goals[j].updatedAt      = now;
            break;
          }
        }
      } else {
        s.goals.push({
          id: MONEY_STORE.createId(), name: name,
          targetAmountMinor: target, initialAmountMinor: initial,
          deadline: deadline, priority: priority,
          isMain: isMain, linkedAccountId: linkedAcct,
          status: 'active', contributions: [],
          createdAt: now, updatedAt: now
        });
      }
    });
    if (!MONEY_STORE.save()) {
      MONEY_STORE.importData(snap);
      el.querySelector('#gf-e-target').textContent = 'Ошибка сохранения';
      return;
    }
    _closeGoalSheet();
  }

  // ─── Detail sheet ─────────────────────────────────────────────────────────
  function openDetailSheet(goalId) {
    _currentDetailGoalId = goalId;
    var el = _ensureDetailSheet();
    _renderDetailContent(_findGoal(goalId));
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
  }

  function _closeDetailSheet() {
    if (_detailSheetEl) _detailSheetEl.classList.remove('mn-sheet--open');
    _currentDetailGoalId = null;
    document.body.style.overflow = '';
  }

  function _ensureDetailSheet() {
    if (_detailSheetEl) return _detailSheetEl;
    var el = document.createElement('div');
    el.id = 'goal-detail-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel gl-detail-panel" id="goal-detail-panel"></div>';
    document.body.appendChild(el);
    _detailSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeDetailSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeDetailSheet(); });
    el.addEventListener('click', _onDetailClick);
    return el;
  }

  function _renderDetailContent(goal) {
    var panel = document.getElementById('goal-detail-panel');
    if (!panel || !goal) return;

    var accumulated = _calcAccumulated(goal);
    var pct    = goal.targetAmountMinor > 0 ? Math.round(accumulated / goal.targetAmountMinor * 100) : 0;
    var barPct = pct > 100 ? 100 : pct;
    var isActive = goal.status === 'active';
    var isOver   = goal.targetAmountMinor > 0 && accumulated >= goal.targetAmountMinor;
    var monthly  = _calcMonthlyTarget(goal);
    var expired  = _isDeadlineExpired(goal.deadline);
    var linkedAcct  = _findAcct(goal.linkedAccountId);
    var acctArchived = linkedAcct && linkedAcct.archived;

    var contribs = (goal.contributions || []).slice().sort(function (a, b) {
      return (b.localDate || '').localeCompare(a.localDate || '');
    });

    var html = '<button class="mn-sheet-x" type="button" aria-label="Закрыть"'
      + ' data-det-close="1">' + CLOSE_SVG + '</button>';
    html += '<div class="gl-detail-head">'
      + '<span class="gl-detail-name">' + esc(goal.name) + '</span>'
      + (goal.isMain && isActive ? '<span class="gl-badge gl-badge--main">Главная</span>' : '')
      + '</div>';
    html += '<div class="gl-detail-amounts">'
      + '<span class="gl-detail-acc">' + fmtRub(accumulated) + '</span>'
      + '<span class="gl-detail-target"> из ' + fmtRub(goal.targetAmountMinor) + '</span>'
      + '</div>';
    html += '<div class="gl-detail-pct">' + pct + '%</div>';
    html += '<div class="gl-detail-bar"><div class="gl-detail-bar-fill" style="width:' + barPct + '%"></div></div>';

    if (linkedAcct) {
      html += '<div class="gl-card-meta-row" style="margin-bottom:4px">'
        + '<span class="gl-card-meta-lbl">Счёт:&nbsp;</span>'
        + '<span class="gl-card-meta-val">' + esc(linkedAcct.name) + (acctArchived ? ' <span class="gl-badge gl-badge--archive" style="font-size:9px">В архиве</span>' : '') + '</span>'
        + '</div>';
    }
    if (goal.deadline) {
      var dlFmt = esc(_fmtDate(goal.deadline));
      html += '<div class="gl-card-meta-row" style="margin-bottom:4px"><span class="gl-card-meta-lbl">Срок:&nbsp;</span>';
      if (expired && isActive) {
        html += '<span class="gl-card-meta-val gl-card-meta-val--warn">Истёк (' + dlFmt + ')</span>';
      } else {
        html += '<span class="gl-card-meta-val">' + dlFmt + '</span>';
      }
      html += '</div>';
    }
    if (monthly) {
      html += '<div class="gl-card-meta-row" style="margin-bottom:4px">'
        + '<span class="gl-card-meta-lbl">Ориентир:&nbsp;</span>'
        + '<span class="gl-card-meta-val">' + fmtRub(monthly) + '/мес</span>'
        + '<span class="gl-card-meta-hint">&nbsp;(расчётный)</span></div>';
    }

    html += '<div class="gl-contrib-hd"><span class="gl-contrib-ttl">Взносы</span>';
    if (isActive) {
      html += '<button class="gl-contrib-add-btn" type="button" data-da="add-contrib">+ Добавить</button>';
    }
    html += '</div>';

    if (!contribs.length) {
      html += '<p class="gl-contrib-empty">Взносов пока нет</p>';
    } else {
      html += '<div class="gl-contrib-list">';
      for (var i = 0; i < contribs.length; i++) {
        var c = contribs[i];
        var verified = _verifyTransferContrib(c);
        var metaParts = [_fmtDate(c.localDate)];
        if (c.note) metaParts.push(c.note);
        var typeBadge = '';
        if (c.mode === 'transfer') {
          typeBadge = verified
            ? '<span class="gl-contrib-transfer-badge">↗ Перевод</span>'
            : '<span class="gl-contrib-unverified">⚠ Требует проверки</span>';
        }
        html += '<div class="gl-contrib-row">'
          + '<div class="gl-contrib-main">'
          + '<div class="gl-contrib-amt">+' + fmtRub(c.amountMinor) + '&nbsp;' + typeBadge + '</div>'
          + '<div class="gl-contrib-meta">' + esc(metaParts.join(' · ')) + '</div>'
          + '</div>'
          + '<div class="gl-contrib-acts">'
          + '<button class="gl-contrib-edit-btn" type="button"'
          + ' data-da="edit-contrib" data-cid="' + esc(c.id) + '" aria-label="Редактировать">✎</button>'
          + '<button class="gl-contrib-del-btn" type="button"'
          + ' data-da="del-contrib" data-cid="' + esc(c.id) + '" aria-label="Удалить">✕</button>'
          + '</div></div>';
      }
      html += '</div>';
    }

    html += '<div class="gl-detail-actions"><div class="gl-detail-row">'
      + '<button class="gl-detail-btn gl-detail-btn--edit" type="button" data-da="edit-goal">Редактировать</button>';
    if (isActive && isOver) {
      html += '<button class="gl-detail-btn gl-detail-btn--complete" type="button" data-da="complete-goal">Завершить</button>';
    }
    html += '</div>';

    var row2 = '';
    if (isActive) {
      row2 += '<button class="gl-detail-btn gl-detail-btn--archive" type="button" data-da="archive-goal">Архивировать</button>';
    } else if (goal.status === 'archived') {
      row2 += '<button class="gl-detail-btn gl-detail-btn--restore" type="button" data-da="restore-goal">Восстановить</button>';
    }
    if (!contribs.length) {
      row2 += '<button class="gl-detail-btn gl-detail-btn--delete" type="button" data-da="delete-goal">Удалить</button>';
    }
    if (row2) html += '<div class="gl-detail-row">' + row2 + '</div>';
    html += '</div>';

    panel.innerHTML = html;
    panel.querySelector('[data-det-close]').addEventListener('click', _closeDetailSheet);
  }

  function _onDetailClick(e) {
    var btn = e.target.closest('[data-da]');
    if (!btn) return;
    var action = btn.dataset.da, goalId = _currentDetailGoalId;
    switch (action) {
      case 'add-contrib':  openContribSheet(goalId, null, 0); break;
      case 'edit-contrib': openContribSheet(goalId, btn.dataset.cid, 0); break;
      case 'del-contrib':  _doDeleteContrib(goalId, btn.dataset.cid); break;
      case 'edit-goal':
        _closeDetailSheet(); openGoalSheet(goalId); break;
      case 'complete-goal': _doCompleteGoal(goalId); break;
      case 'archive-goal':  _doArchiveGoal(goalId);  break;
      case 'restore-goal':  _doRestoreGoal(goalId);  break;
      case 'delete-goal':   _doDeleteGoal(goalId);   break;
    }
  }

  // ─── Contribution form sheet ──────────────────────────────────────────────
  function openContribSheet(goalId, contribId, prefillAmountMinor) {
    _currentContribGoalId = goalId;
    _currentContribEditId = contribId || null;
    var el = _ensureContribSheet();
    var goal   = _findGoal(goalId);
    var contrib = contribId ? _findContrib(goal, contribId) : null;
    var linkedAcct = goal && goal.linkedAccountId ? _findAcct(goal.linkedAccountId) : null;
    var canTransferNew = !contrib && linkedAcct && !linkedAcct.archived;

    // Determine mode
    if (contrib) {
      _contribMode = contrib.mode || 'manual';
    } else {
      _contribMode = 'manual';
    }

    el.querySelector('#cf-h').textContent = contrib ? 'Редактировать взнос' : 'Ручной взнос';
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });

    // Mode tabs: show only for NEW contributions when transfer is possible
    var modeRow = el.querySelector('#cf-mode-row');
    var modeManualBtn   = el.querySelector('[data-cf-mode="manual"]');
    var modeTransferBtn = el.querySelector('[data-cf-mode="transfer"]');
    if (!contrib && (linkedAcct || canTransferNew)) {
      modeRow.style.display = '';
      modeTransferBtn.disabled = !canTransferNew;
      modeTransferBtn.title = canTransferNew ? '' : (linkedAcct && linkedAcct.archived ? 'Счёт в архиве' : 'Нет накопительного счёта');
    } else {
      modeRow.style.display = 'none'; // hide tabs when editing
    }
    _applyContribMode(el, _contribMode, goal, contrib);

    // Amount, date, note
    var prefillAmt = (!contrib && prefillAmountMinor > 0) ? String(Math.round(prefillAmountMinor / 100)) : '';
    el.querySelector('#cf-amt').value  = contrib ? String(Math.round(contrib.amountMinor / 100)) : prefillAmt;
    el.querySelector('#cf-date').value = contrib ? contrib.localDate : _localDate();
    el.querySelector('#cf-note').value = contrib ? (contrib.note || '') : '';

    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var inp = el.querySelector('#cf-amt'); if (inp) inp.focus(); }, 80);
  }

  function _applyContribMode(el, mode, goal, contrib) {
    var modeManualBtn   = el.querySelector('[data-cf-mode="manual"]');
    var modeTransferBtn = el.querySelector('[data-cf-mode="transfer"]');
    var transferSec = el.querySelector('#cf-transfer-section');
    if (modeManualBtn) modeManualBtn.classList.toggle('gl-mode-tab--active', mode === 'manual');
    if (modeTransferBtn) modeTransferBtn.classList.toggle('gl-mode-tab--active', mode === 'transfer');
    if (transferSec) transferSec.style.display = mode === 'transfer' ? '' : 'none';

    if (mode === 'transfer' && goal) {
      var linkedId = contrib ? contrib.destinationAccountId : (goal.linkedAccountId || '');
      var srcId    = contrib ? contrib.sourceAccountId : '';
      var sourceSel = el.querySelector('#cf-source');
      _populateSourceAccts(sourceSel, linkedId, srcId);
      var destInfo = el.querySelector('#cf-dest-info');
      if (destInfo) {
        var destAcct = _findAcct(linkedId);
        destInfo.textContent = destAcct ? destAcct.name : '—';
      }
    }
  }

  function _closeContribSheet() {
    if (_contribSheetEl) _contribSheetEl.classList.remove('mn-sheet--open');
    var detailOpen = _detailSheetEl && _detailSheetEl.classList.contains('mn-sheet--open');
    if (!detailOpen) document.body.style.overflow = '';
  }

  function _ensureContribSheet() {
    if (_contribSheetEl) return _contribSheetEl;
    var el = document.createElement('div');
    el.id = 'goal-contrib-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h" id="cf-h">Ручной взнос</h2>'
      + '<div class="mn-sheet-row" id="cf-mode-row" style="display:none">'
      + '<label class="mn-sheet-lbl">Тип взноса</label>'
      + '<div class="gl-mode-tabs">'
      + '<button type="button" class="gl-mode-tab gl-mode-tab--active" data-cf-mode="manual">Ручной взнос</button>'
      + '<button type="button" class="gl-mode-tab" data-cf-mode="transfer">Перевод ↗</button>'
      + '</div></div>'
      + '<div id="cf-transfer-section" style="display:none">'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="cf-source">Исходный счёт</label>'
      + '<select class="mn-sheet-sel" id="cf-source"></select>'
      + '<span class="mn-sheet-err" id="cf-e-source"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl">Счёт назначения</label>'
      + '<div class="gl-dest-info" id="cf-dest-info">—</div></div>'
      + '</div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="cf-amt">Сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="cf-amt" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="cf-e-amt"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="cf-date">Дата</label>'
      + '<input class="mn-sheet-inp" id="cf-date" type="date">'
      + '<span class="mn-sheet-err" id="cf-e-date"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="cf-note">Комментарий (необязательно)</label>'
      + '<input class="mn-sheet-inp" id="cf-note" type="text" maxlength="120" autocomplete="off"></div>'
      + '<button class="mn-sheet-save" type="button" id="cf-save-btn">Сохранить</button>'
      + '<button class="mn-sheet-cancel" type="button" id="cf-cancel-btn">Отмена</button>'
      + '</div>';
    document.body.appendChild(el);
    _contribSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeContribSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeContribSheet);
    el.querySelector('#cf-cancel-btn').addEventListener('click', _closeContribSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeContribSheet(); });
    el.querySelector('#cf-save-btn').addEventListener('click', function () { _doSaveContrib(el); });
    // Mode tab buttons
    el.querySelectorAll('[data-cf-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _contribMode = btn.dataset.cfMode;
        var goal = _findGoal(_currentContribGoalId);
        _applyContribMode(el, _contribMode, goal, null);
      });
    });
    return el;
  }

  function _doSaveContrib(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    var amt  = parseAmount(el.querySelector('#cf-amt').value);
    var date = el.querySelector('#cf-date').value;
    var note = el.querySelector('#cf-note').value.trim();
    var goalId    = _currentContribGoalId;
    var contribId = _currentContribEditId;
    var goal = _findGoal(goalId);
    var contrib = contribId ? _findContrib(goal, contribId) : null;
    var mode = contrib ? (contrib.mode || 'manual') : _contribMode;

    var ok = true;
    if (amt === null) { el.querySelector('#cf-e-amt').textContent = 'Введите сумму больше 0'; ok = false; }
    if (!date)        { el.querySelector('#cf-e-date').textContent = 'Укажите дату'; ok = false; }

    var sourceId = null;
    var linkedAccountId = null;
    if (mode === 'transfer') {
      sourceId = el.querySelector('#cf-source').value;
      linkedAccountId = contrib ? contrib.destinationAccountId : (goal && goal.linkedAccountId);
      if (!sourceId) { el.querySelector('#cf-e-source').textContent = 'Выберите исходный счёт'; ok = false; }
      if (sourceId === linkedAccountId) { el.querySelector('#cf-e-source').textContent = 'Источник и назначение должны различаться'; ok = false; }
      if (!linkedAccountId) { el.querySelector('#cf-e-source').textContent = 'Не задан счёт назначения'; ok = false; }
    }
    if (!ok) return;

    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();

    if (mode === 'transfer') {
      if (contribId && contrib && contrib.transferTransactionId) {
        // Edit existing transfer contrib: update both objects atomically
        MONEY_STORE.update(function (s) {
          for (var i = 0; i < (s.goals || []).length; i++) {
            if (s.goals[i].id !== goalId) continue;
            for (var j = 0; j < s.goals[i].contributions.length; j++) {
              if (s.goals[i].contributions[j].id !== contribId) continue;
              s.goals[i].contributions[j].amountMinor      = amt;
              s.goals[i].contributions[j].localDate         = date;
              s.goals[i].contributions[j].note              = note;
              s.goals[i].contributions[j].sourceAccountId  = sourceId;
              s.goals[i].contributions[j].updatedAt         = now;
              break;
            }
            s.goals[i].updatedAt = now;
            break;
          }
          for (var k = 0; k < (s.transactions || []).length; k++) {
            if (s.transactions[k].id !== contrib.transferTransactionId) continue;
            s.transactions[k].amountMinor = amt;
            s.transactions[k].localDate   = date;
            s.transactions[k].accountId   = sourceId;
            s.transactions[k].note        = note;
            s.transactions[k].updatedAt   = now;
            break;
          }
        });
      } else {
        // New transfer contrib: create tx + contrib atomically
        var txId  = MONEY_STORE.createId();
        var cId   = MONEY_STORE.createId();
        MONEY_STORE.update(function (s) {
          s.transactions.push({
            id: txId, type: 'transfer',
            title: (goal ? goal.name : 'Взнос на цель') + ' — перевод',
            amountMinor: amt, localDate: date,
            accountId: sourceId, toAccountId: linkedAccountId,
            category: null, note: note, quickExpenseId: null,
            createdAt: now, updatedAt: now
          });
          for (var i = 0; i < (s.goals || []).length; i++) {
            if (s.goals[i].id !== goalId) continue;
            if (!s.goals[i].contributions) s.goals[i].contributions = [];
            s.goals[i].contributions.push({
              id: cId, amountMinor: amt, localDate: date, mode: 'transfer',
              sourceAccountId: sourceId, destinationAccountId: linkedAccountId,
              transferTransactionId: txId, note: note, createdAt: now, updatedAt: now
            });
            s.goals[i].updatedAt = now;
            break;
          }
        });
      }
    } else {
      // Manual mode
      MONEY_STORE.update(function (s) {
        for (var i = 0; i < (s.goals || []).length; i++) {
          if (s.goals[i].id !== goalId) continue;
          if (!s.goals[i].contributions) s.goals[i].contributions = [];
          if (contribId) {
            for (var j = 0; j < s.goals[i].contributions.length; j++) {
              if (s.goals[i].contributions[j].id !== contribId) continue;
              s.goals[i].contributions[j].amountMinor = amt;
              s.goals[i].contributions[j].localDate   = date;
              s.goals[i].contributions[j].note        = note;
              s.goals[i].contributions[j].updatedAt   = now;
              break;
            }
          } else {
            s.goals[i].contributions.push({
              id: MONEY_STORE.createId(), amountMinor: amt, localDate: date,
              mode: 'manual', sourceAccountId: null, destinationAccountId: null,
              transferTransactionId: null, note: note, createdAt: now, updatedAt: now
            });
          }
          s.goals[i].updatedAt = now;
          break;
        }
      });
    }

    if (!MONEY_STORE.save()) {
      MONEY_STORE.importData(snap);
      el.querySelector('#cf-e-amt').textContent = 'Ошибка сохранения';
      return;
    }
    _closeContribSheet();
    if (_currentDetailGoalId && _detailSheetEl && _detailSheetEl.classList.contains('mn-sheet--open')) {
      _renderDetailContent(_findGoal(_currentDetailGoalId));
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  function _doCompleteGoal(id) {
    if (!confirm('Завершить цель?')) return;
    var snap = MONEY_STORE.exportData(); var now = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id === id) { s.goals[i].status = 'completed'; s.goals[i].isMain = false; s.goals[i].updatedAt = now; break; }
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
    if (_currentDetailGoalId === id) _closeDetailSheet();
  }

  function _doArchiveGoal(id) {
    if (!confirm('Архивировать цель?')) return;
    var snap = MONEY_STORE.exportData(); var now = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id === id) { s.goals[i].status = 'archived'; s.goals[i].isMain = false; s.goals[i].updatedAt = now; break; }
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
    if (_currentDetailGoalId === id) _closeDetailSheet();
  }

  function _doRestoreGoal(id) {
    var snap = MONEY_STORE.exportData(); var now = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id === id) { s.goals[i].status = 'active'; s.goals[i].updatedAt = now; break; }
      }
    });
    if (!MONEY_STORE.save()) { MONEY_STORE.importData(snap); return; }
    if (_currentDetailGoalId === id && _detailSheetEl && _detailSheetEl.classList.contains('mn-sheet--open')) {
      _renderDetailContent(_findGoal(id));
    }
  }

  function _doDeleteGoal(id) {
    var goal = _findGoal(id);
    if (!goal) return;
    if (goal.contributions && goal.contributions.length > 0) {
      alert('Нельзя удалить цель с взносами.\nСначала завершите или архивируйте её.');
      return;
    }
    if (!confirm('Удалить цель?')) return;
    var snap = MONEY_STORE.exportData();
    MONEY_STORE.update(function (s) {
      s.goals = (s.goals || []).filter(function (g) { return g.id !== id; });
    });
    if (!MONEY_STORE.save()) { MONEY_STORE.importData(snap); return; }
    if (_currentDetailGoalId === id) _closeDetailSheet();
  }

  function _doDeleteContrib(goalId, contribId) {
    var goal   = _findGoal(goalId);
    var contrib = _findContrib(goal, contribId);
    if (!contrib) return;
    var isTransfer = contrib.mode === 'transfer' && contrib.transferTransactionId;
    var confirmMsg = isTransfer ? 'Удалить взнос и связанный перевод?' : 'Удалить взнос?';
    if (!confirm(confirmMsg)) return;
    var snap = MONEY_STORE.exportData(); var now = new Date().toISOString();
    var txIdToDelete = isTransfer ? contrib.transferTransactionId : null;
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id !== goalId) continue;
        s.goals[i].contributions = (s.goals[i].contributions || []).filter(function (c) { return c.id !== contribId; });
        s.goals[i].updatedAt = now;
        break;
      }
      if (txIdToDelete) {
        s.transactions = (s.transactions || []).filter(function (tx) { return tx.id !== txIdToDelete; });
      }
    });
    if (!MONEY_STORE.save()) { MONEY_STORE.importData(snap); return; }
    if (_currentDetailGoalId === goalId && _detailSheetEl && _detailSheetEl.classList.contains('mn-sheet--open')) {
      _renderDetailContent(_findGoal(goalId));
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function _observePage() {
    var page = document.querySelector('[data-page="money-goals"]');
    if (!page || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (page.classList.contains('active')) renderPage();
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  MONEY_STORE.subscribe(function () {
    if (_isPageActive()) renderPage();
    if (_currentDetailGoalId && _detailSheetEl && _detailSheetEl.classList.contains('mn-sheet--open')) {
      _renderDetailContent(_findGoal(_currentDetailGoalId));
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { _observePage(); if (_isPageActive()) renderPage(); });
  } else {
    _observePage();
    if (_isPageActive()) renderPage();
  }

  window.MONEY_GOALS = {
    render: renderPage,
    openDetail: openDetailSheet,
    openContrib: function (goalId, prefillAmountMinor) {
      openContribSheet(goalId, null, prefillAmountMinor || 0);
    }
  };

}());
