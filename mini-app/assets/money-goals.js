/* assets/money-goals.js v1 — Мои деньги: Цели */
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
    var rubS = String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return sign + rubS + (kop ? ',' + ('0' + kop).slice(-2) : '') + ' ₽';
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
    return parseInt(p[2], 10) + ' ' + (MONTHS_GEN[parseInt(p[1], 10) - 1] || '') + ' ' + p[0];
  }

  // ─── Module state ─────────────────────────────────────────────────────────
  var _goalSheetEl    = null;
  var _detailSheetEl  = null;
  var _contribSheetEl = null;
  var _clickBound     = false;
  var _currentDetailGoalId  = null;
  var _currentContribGoalId = null;
  var _currentContribEditId = null;
  var _collapsedCompleted   = false;
  var _collapsedArchived    = true;

  // ─── Data helpers ─────────────────────────────────────────────────────────
  function _getGoals() { return MONEY_STORE.getState().goals || []; }

  function _findGoal(id) {
    var goals = _getGoals();
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].id === id) return goals[i];
    }
    return null;
  }

  function _calcAccumulated(goal) {
    var total = goal.initialAmountMinor || 0;
    var cs = goal.contributions || [];
    for (var i = 0; i < cs.length; i++) total += cs[i].amountMinor || 0;
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

  function _findContrib(goal, id) {
    var cs = goal && goal.contributions ? goal.contributions : [];
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].id === id) return cs[i];
    }
    return null;
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

    var badges = '';
    if (goal.isMain && isActive)     badges += '<span class="gl-badge gl-badge--main">Главная</span>';
    if (goal.priority === 'high')    badges += '<span class="gl-badge gl-badge--high">Высокий</span>';
    if (goal.priority === 'medium')  badges += '<span class="gl-badge gl-badge--medium">Средний</span>';
    if (goal.status === 'completed') badges += '<span class="gl-badge gl-badge--done">Завершена</span>';
    if (goal.status === 'archived')  badges += '<span class="gl-badge gl-badge--archive">В архиве</span>';

    var cls = 'gl-card';
    if (goal.isMain && isActive)  cls += ' gl-card--main';
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
          html += '<div class="gl-card-meta-row">'
            + '<span class="gl-card-meta-lbl">Срок:</span>'
            + '<span class="gl-card-meta-val gl-card-meta-val--warn">Истёк (' + dlVal + ')</span>'
            + '</div>';
        } else {
          html += '<div class="gl-card-meta-row">'
            + '<span class="gl-card-meta-lbl">Срок:</span>'
            + '<span class="gl-card-meta-val">' + dlVal + '</span>'
            + '</div>';
        }
      }
      if (monthly) {
        html += '<div class="gl-card-meta-row">'
          + '<span class="gl-card-meta-lbl">Ориентир:</span>'
          + '<span class="gl-card-meta-val">' + fmtRub(monthly) + '/мес</span>'
          + '<span class="gl-card-meta-hint">&nbsp;(расчётный)</span>'
          + '</div>';
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
    html += '</div>';

    html += '</div>';
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
      html += '<div class="gl-sec">'
        + '<div class="gl-sec-hd">'
        + '<span class="gl-sec-ttl">Завершённые (' + completed.length + ')</span>'
        + '<button class="gl-collapse-btn" type="button" data-action="toggle-completed">'
        + (_collapsedCompleted ? 'Показать' : 'Скрыть') + '</button>'
        + '</div>';
      if (!_collapsedCompleted) {
        for (var j = 0; j < completed.length; j++) html += _goalCardHtml(completed[j]);
      }
      html += '</div>';
    }

    if (archived.length) {
      html += '<div class="gl-sec">'
        + '<div class="gl-sec-hd">'
        + '<span class="gl-sec-ttl">Архив (' + archived.length + ')</span>'
        + '<button class="gl-collapse-btn" type="button" data-action="toggle-archived">'
        + (_collapsedArchived ? 'Показать' : 'Скрыть') + '</button>'
        + '</div>';
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

  // ─── Main click delegation ────────────────────────────────────────────────
  function _onGoalClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    var id = btn.dataset.id;
    switch (action) {
      case 'add-goal':    openGoalSheet(null); break;
      case 'detail-goal': openDetailSheet(id); break;
      case 'contrib-goal': openContribSheet(id, null); break;
      case 'complete-goal': _doCompleteGoal(id); break;
      case 'restore-goal':  _doRestoreGoal(id);  break;
      case 'toggle-completed':
        _collapsedCompleted = !_collapsedCompleted; renderPage(); break;
      case 'toggle-archived':
        _collapsedArchived  = !_collapsedArchived;  renderPage(); break;
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
    var mainChk = el.querySelector('#gf-main');
    mainChk.checked = goal ? !!goal.isMain : false;
    var mainRow = el.querySelector('#gf-main-row');
    if (mainRow) mainRow.style.display = (!goal || goal.status === 'active') ? '' : 'none';
    var delBtn = el.querySelector('#gf-del-btn');
    if (delBtn) delBtn.style.display = goal ? '' : 'none';
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      var inp = el.querySelector('#gf-name');
      if (inp) inp.focus();
    }, 80);
  }

  function _closeGoalSheet() {
    if (_goalSheetEl) _goalSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function _ensureGoalSheet() {
    if (_goalSheetEl) return _goalSheetEl;
    var el = document.createElement('div');
    el.id = 'goal-form-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h" id="gf-h">Новая цель</h2>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="gf-name">Название</label>'
      + '<input class="mn-sheet-inp" id="gf-name" type="text" maxlength="80"'
      + ' placeholder="Квартира, отпуск, автомобиль…" autocomplete="off">'
      + '<span class="mn-sheet-err" id="gf-e-name"></span>'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="gf-target">Целевая сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="gf-target" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="gf-e-target"></span>'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="gf-initial">Уже накоплено, ₽</label>'
      + '<input class="mn-sheet-inp" id="gf-initial" type="text" inputmode="decimal"'
      + ' placeholder="0 — если начинаем с нуля" autocomplete="off">'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="gf-deadline">Срок (необязательно)</label>'
      + '<input class="mn-sheet-inp" id="gf-deadline" type="date">'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="gf-priority">Приоритет</label>'
      + '<select class="mn-sheet-sel" id="gf-priority">'
      + '<option value="">— не указан —</option>'
      + '<option value="high">Высокий</option>'
      + '<option value="medium">Средний</option>'
      + '<option value="low">Низкий</option>'
      + '</select>'
      + '</div>'
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
    el.querySelector('#gf-save-btn').addEventListener('click', function () { _doSaveGoal(el); });
    el.querySelector('#gf-del-btn').addEventListener('click', function () {
      var editId = el.dataset.editId;
      if (editId) { _closeGoalSheet(); _doDeleteGoal(editId); }
    });
    return el;
  }

  function _doSaveGoal(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    var name     = el.querySelector('#gf-name').value.trim();
    var target   = parseAmount(el.querySelector('#gf-target').value);
    var initRaw  = el.querySelector('#gf-initial').value.trim();
    var initial  = initRaw ? (parseAmount(initRaw) || 0) : 0;
    var deadline = el.querySelector('#gf-deadline').value || null;
    var priority = el.querySelector('#gf-priority').value || null;
    var isMain   = el.querySelector('#gf-main').checked;
    var editId   = el.dataset.editId || '';
    var ok = true;
    if (!name)        { el.querySelector('#gf-e-name').textContent = 'Введите название'; ok = false; }
    if (target === null) { el.querySelector('#gf-e-target').textContent = 'Введите сумму больше 0'; ok = false; }
    if (!ok) return;

    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      if (!s.goals) s.goals = [];
      if (isMain) {
        for (var i = 0; i < s.goals.length; i++) {
          if (s.goals[i].status === 'active' && s.goals[i].id !== editId) {
            s.goals[i].isMain = false;
          }
        }
      }
      if (editId) {
        for (var j = 0; j < s.goals.length; j++) {
          if (s.goals[j].id === editId) {
            s.goals[j].name = name;
            s.goals[j].targetAmountMinor  = target;
            s.goals[j].initialAmountMinor = initial;
            s.goals[j].deadline  = deadline;
            s.goals[j].priority  = priority;
            s.goals[j].isMain    = isMain;
            s.goals[j].updatedAt = now;
            break;
          }
        }
      } else {
        s.goals.push({
          id: MONEY_STORE.createId(), name: name,
          targetAmountMinor: target, initialAmountMinor: initial,
          deadline: deadline, priority: priority,
          isMain: isMain, linkedAccountId: null,
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
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
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
    var pct    = goal.targetAmountMinor > 0
      ? Math.round(accumulated / goal.targetAmountMinor * 100) : 0;
    var barPct = pct > 100 ? 100 : pct;
    var isActive = goal.status === 'active';
    var isOver   = goal.targetAmountMinor > 0 && accumulated >= goal.targetAmountMinor;
    var monthly  = _calcMonthlyTarget(goal);
    var expired  = _isDeadlineExpired(goal.deadline);

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
    html += '<div class="gl-detail-bar">'
      + '<div class="gl-detail-bar-fill" style="width:' + barPct + '%"></div></div>';

    if (goal.deadline) {
      var dlFmt = esc(_fmtDate(goal.deadline));
      html += '<div class="gl-card-meta-row" style="margin-bottom:4px">'
        + '<span class="gl-card-meta-lbl">Срок:&nbsp;</span>';
      if (expired && isActive) {
        html += '<span class="gl-card-meta-val gl-card-meta-val--warn">Истёк (' + dlFmt + ')</span>';
      } else {
        html += '<span class="gl-card-meta-val">' + dlFmt + '</span>';
      }
      html += '</div>';
    }
    if (monthly) {
      html += '<div class="gl-card-meta-row" style="margin-bottom:4px">'
        + '<span class="gl-card-meta-lbl">Ориентир:&nbsp;</span>'
        + '<span class="gl-card-meta-val">' + fmtRub(monthly) + '/мес</span>'
        + '<span class="gl-card-meta-hint">&nbsp;(расчётный)</span>'
        + '</div>';
    }

    html += '<div class="gl-contrib-hd">'
      + '<span class="gl-contrib-ttl">Взносы</span>';
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
        var meta = _fmtDate(c.localDate);
        if (c.note) meta += ' · ' + c.note;
        html += '<div class="gl-contrib-row">'
          + '<div class="gl-contrib-main">'
          + '<div class="gl-contrib-amt">+' + fmtRub(c.amountMinor) + '</div>'
          + '<div class="gl-contrib-meta">' + esc(meta) + '</div>'
          + '</div>'
          + '<div class="gl-contrib-acts">'
          + '<button class="gl-contrib-edit-btn" type="button"'
          + ' data-da="edit-contrib" data-cid="' + esc(c.id) + '" aria-label="Редактировать">'
          + '✎</button>'
          + '<button class="gl-contrib-del-btn" type="button"'
          + ' data-da="del-contrib" data-cid="' + esc(c.id) + '" aria-label="Удалить">'
          + '✕</button>'
          + '</div></div>';
      }
      html += '</div>';
    }

    html += '<div class="gl-detail-actions">';

    html += '<div class="gl-detail-row">'
      + '<button class="gl-detail-btn gl-detail-btn--edit" type="button" data-da="edit-goal">Редактировать</button>';
    if (isActive && isOver) {
      html += '<button class="gl-detail-btn gl-detail-btn--complete" type="button" data-da="complete-goal">Завершить</button>';
    }
    html += '</div>';

    var hasAction = isActive || goal.status === 'archived' || !contribs.length;
    if (hasAction) {
      html += '<div class="gl-detail-row">';
      if (isActive) {
        html += '<button class="gl-detail-btn gl-detail-btn--archive" type="button" data-da="archive-goal">Архивировать</button>';
      } else if (goal.status === 'archived') {
        html += '<button class="gl-detail-btn gl-detail-btn--restore" type="button" data-da="restore-goal">Восстановить</button>';
      }
      if (!contribs.length) {
        html += '<button class="gl-detail-btn gl-detail-btn--delete" type="button" data-da="delete-goal">Удалить</button>';
      }
      html += '</div>';
    }

    html += '</div>';

    panel.innerHTML = html;
    panel.querySelector('[data-det-close]').addEventListener('click', _closeDetailSheet);
  }

  function _onDetailClick(e) {
    var btn = e.target.closest('[data-da]');
    if (!btn) return;
    var action = btn.dataset.da;
    var goalId = _currentDetailGoalId;
    switch (action) {
      case 'add-contrib':    openContribSheet(goalId, null); break;
      case 'edit-contrib':   openContribSheet(goalId, btn.dataset.cid); break;
      case 'del-contrib':    _doDeleteContrib(goalId, btn.dataset.cid); break;
      case 'edit-goal':
        _closeDetailSheet();
        openGoalSheet(goalId);
        break;
      case 'complete-goal':  _doCompleteGoal(goalId); break;
      case 'archive-goal':   _doArchiveGoal(goalId); break;
      case 'restore-goal':   _doRestoreGoal(goalId); break;
      case 'delete-goal':    _doDeleteGoal(goalId); break;
    }
  }

  // ─── Contribution form sheet ──────────────────────────────────────────────
  function openContribSheet(goalId, contribId) {
    _currentContribGoalId = goalId;
    _currentContribEditId = contribId || null;
    var el = _ensureContribSheet();
    var goal   = _findGoal(goalId);
    var contrib = contribId ? _findContrib(goal, contribId) : null;
    el.querySelector('#cf-h').textContent = contrib ? 'Редактировать взнос' : 'Ручной взнос';
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    el.querySelector('#cf-amt').value  = contrib ? String(Math.round(contrib.amountMinor / 100)) : '';
    el.querySelector('#cf-date').value = contrib ? contrib.localDate : _localDate();
    el.querySelector('#cf-note').value = contrib ? (contrib.note || '') : '';
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      var inp = el.querySelector('#cf-amt');
      if (inp) inp.focus();
    }, 80);
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
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h" id="cf-h">Ручной взнос</h2>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="cf-amt">Сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="cf-amt" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="cf-e-amt"></span>'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="cf-date">Дата</label>'
      + '<input class="mn-sheet-inp" id="cf-date" type="date">'
      + '<span class="mn-sheet-err" id="cf-e-date"></span>'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="cf-note">Комментарий (необязательно)</label>'
      + '<input class="mn-sheet-inp" id="cf-note" type="text" maxlength="120" autocomplete="off">'
      + '</div>'
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
    return el;
  }

  function _doSaveContrib(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    var amt  = parseAmount(el.querySelector('#cf-amt').value);
    var date = el.querySelector('#cf-date').value;
    var note = el.querySelector('#cf-note').value.trim();
    var ok = true;
    if (amt === null) { el.querySelector('#cf-e-amt').textContent = 'Введите сумму больше 0'; ok = false; }
    if (!date)        { el.querySelector('#cf-e-date').textContent = 'Укажите дату'; ok = false; }
    if (!ok) return;

    var goalId    = _currentContribGoalId;
    var contribId = _currentContribEditId;
    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      var goals = s.goals || [];
      for (var i = 0; i < goals.length; i++) {
        if (goals[i].id !== goalId) continue;
        if (!goals[i].contributions) goals[i].contributions = [];
        if (contribId) {
          for (var j = 0; j < goals[i].contributions.length; j++) {
            if (goals[i].contributions[j].id === contribId) {
              goals[i].contributions[j].amountMinor = amt;
              goals[i].contributions[j].localDate   = date;
              goals[i].contributions[j].note        = note;
              goals[i].contributions[j].updatedAt   = now;
              break;
            }
          }
        } else {
          goals[i].contributions.push({
            id: MONEY_STORE.createId(), amountMinor: amt,
            localDate: date, mode: 'manual',
            sourceAccountId: null, destinationAccountId: null,
            transferTransactionId: null, note: note,
            createdAt: now, updatedAt: now
          });
        }
        goals[i].updatedAt = now;
        break;
      }
    });
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
    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id === id) {
          s.goals[i].status    = 'completed';
          s.goals[i].isMain    = false;
          s.goals[i].updatedAt = now;
          break;
        }
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
    if (_currentDetailGoalId === id) _closeDetailSheet();
  }

  function _doArchiveGoal(id) {
    if (!confirm('Архивировать цель?')) return;
    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id === id) {
          s.goals[i].status    = 'archived';
          s.goals[i].isMain    = false;
          s.goals[i].updatedAt = now;
          break;
        }
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
    if (_currentDetailGoalId === id) _closeDetailSheet();
  }

  function _doRestoreGoal(id) {
    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id === id) {
          s.goals[i].status    = 'active';
          s.goals[i].updatedAt = now;
          break;
        }
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
    if (!confirm('Удалить взнос?')) return;
    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < (s.goals || []).length; i++) {
        if (s.goals[i].id !== goalId) continue;
        s.goals[i].contributions = (s.goals[i].contributions || [])
          .filter(function (c) { return c.id !== contribId; });
        s.goals[i].updatedAt = now;
        break;
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
    document.addEventListener('DOMContentLoaded', function () {
      _observePage();
      if (_isPageActive()) renderPage();
    });
  } else {
    _observePage();
    if (_isPageActive()) renderPage();
  }

  window.MONEY_GOALS = { render: renderPage };

}());
