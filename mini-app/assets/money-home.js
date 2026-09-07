/* assets/money-home.js v1 — Мои деньги: главный экран (Stage 6) */
(function () {
  'use strict';

  // ─── Local helpers ─────────────────────────────────────────────────────────
  function _thisMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  function _today() {
    var d = new Date();
    return d.getFullYear() + '-'
      + ('0' + (d.getMonth() + 1)).slice(-2) + '-'
      + ('0' + d.getDate()).slice(-2);
  }

  function _fmtRub(amountMinor) {
    var neg = amountMinor < 0;
    var abs = Math.abs(Math.round(amountMinor));
    var r = Math.floor(abs / 100);
    var s = r.toLocaleString('ru-RU') + ' ₽';
    return neg ? '−' + s : s;
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _currentPlan(s, month) {
    var plans = s.monthlyPlans || [];
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].month === month) return plans[i];
    }
    return null;
  }

  // ─── Balance (mirrors money-accounts.js calcBalance) ──────────────────────
  function _calcBalance(account) {
    var balance = account.initialBalanceMinor || 0;
    var txns = MONEY_STORE.getState().transactions;
    var id = account.id;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.accountId === id) {
        if (tx.type === 'income')                                   { balance += tx.amountMinor; }
        else if (tx.type === 'expense' || tx.type === 'investment') { balance -= tx.amountMinor; }
        else if (tx.type === 'transfer')                            { balance -= tx.amountMinor; }
      }
      if (tx.toAccountId === id && tx.type === 'transfer') { balance += tx.amountMinor; }
    }
    return balance;
  }

  // ─── Verify transfer contribution (mirrors money-goals.js) ────────────────
  function _verifyTransferContrib(c) {
    if (c.mode !== 'transfer') return true;
    if (!c.transferTransactionId) return false;
    var txns = MONEY_STORE.getState().transactions;
    var tx = null;
    for (var i = 0; i < txns.length; i++) {
      if (txns[i].id === c.transferTransactionId) { tx = txns[i]; break; }
    }
    if (!tx) return false;
    return tx.type === 'transfer'
      && tx.accountId === c.sourceAccountId
      && tx.toAccountId === c.destinationAccountId
      && tx.amountMinor === c.amountMinor
      && tx.localDate === c.localDate;
  }

  // ─── Goal contrib fact for a given month ──────────────────────────────────
  function _calcGoalContribFact(goalId, month) {
    var goals = MONEY_STORE.getState().goals || [];
    var goal = null;
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].id === goalId) { goal = goals[i]; break; }
    }
    if (!goal) return 0;
    var total = 0;
    var cs = goal.contributions || [];
    for (var j = 0; j < cs.length; j++) {
      var c = cs[j];
      if (!c.localDate || c.localDate.slice(0, 7) !== month) continue;
      if (_verifyTransferContrib(c)) total += c.amountMinor || 0;
    }
    return total;
  }

  // ─── Check if plan item is completed this month ───────────────────────────
  function _isItemCompleted(item, expectedType, month) {
    if (!item.completedTransactionId) return false;
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.id === item.completedTransactionId
          && tx.type === expectedType
          && tx.localDate && tx.localDate.slice(0, 7) === month) {
        return true;
      }
    }
    return false;
  }

  // ─── Sum transactions by type for a month ────────────────────────────────
  function _monthTotal(type, month) {
    var total = 0;
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.type === type && tx.localDate && tx.localDate.slice(0, 7) === month) {
        total += tx.amountMinor;
      }
    }
    return total;
  }

  function _findGoalName(goalId, goals) {
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].id === goalId) return goals[i].name || 'Цель';
    }
    return 'Цель';
  }

  // ─── Compute all formula components ───────────────────────────────────────
  function _computeComponents(s, plan, month) {
    // 1. Available account balances
    var acctBalance = 0;
    var acctDetails = [];
    var accounts = s.accounts || [];
    for (var i = 0; i < accounts.length; i++) {
      var a = accounts[i];
      if (a.archived || !a.includeInAvailable) continue;
      var bal = _calcBalance(a);
      acctBalance += bal;
      acctDetails.push({ name: a.name, balance: bal });
    }

    if (!plan) {
      return {
        available: acctBalance, hasPlan: false,
        acctBalance: acctBalance, acctDetails: acctDetails,
        pendingIncome: 0, pendingIncomeCount: 0,
        pendingExpenses: 0, pendingExpenseCount: 0,
        investRemaining: 0, goalRemaining: 0, goalDetails: []
      };
    }

    // 2. Pending planned incomes (not yet received)
    var pendingIncome = 0, pendingIncomeCount = 0;
    var incItems = plan.plannedIncomes || [];
    for (var j = 0; j < incItems.length; j++) {
      if (!_isItemCompleted(incItems[j], 'income', month)) {
        pendingIncome += incItems[j].amountMinor;
        pendingIncomeCount++;
      }
    }

    // 3. Pending mandatory expenses (not yet paid)
    var pendingExpenses = 0, pendingExpenseCount = 0;
    var expItems = plan.mandatoryExpenses || [];
    for (var k = 0; k < expItems.length; k++) {
      if (!_isItemCompleted(expItems[k], 'expense', month)) {
        pendingExpenses += expItems[k].amountMinor;
        pendingExpenseCount++;
      }
    }

    // 4. Remaining investment obligation (already invested not double-counted)
    var investRemaining = 0;
    if (plan.plannedInvestmentMinor > 0) {
      var actualInvested = _monthTotal('investment', month);
      investRemaining = Math.max(0, plan.plannedInvestmentMinor - actualInvested);
    }

    // 5. Remaining goal allocation obligations
    var goalRemaining = 0;
    var goalDetails = [];
    var goals = s.goals || [];
    var allocs = plan.goalAllocations || [];
    for (var g = 0; g < allocs.length; g++) {
      var alloc = allocs[g];
      var fact = _calcGoalContribFact(alloc.goalId, month);
      var rem = Math.max(0, alloc.amountMinor - fact);
      goalRemaining += rem;
      goalDetails.push({
        name: _findGoalName(alloc.goalId, goals),
        planned: alloc.amountMinor, fact: fact, rem: rem
      });
    }

    var available = acctBalance + pendingIncome - pendingExpenses - investRemaining - goalRemaining;

    return {
      available: available, hasPlan: true,
      acctBalance: acctBalance, acctDetails: acctDetails,
      pendingIncome: pendingIncome, pendingIncomeCount: pendingIncomeCount,
      pendingExpenses: pendingExpenses, pendingExpenseCount: pendingExpenseCount,
      investRemaining: investRemaining,
      goalRemaining: goalRemaining, goalDetails: goalDetails
    };
  }

  // ─── Date formatting for payment proximity ────────────────────────────────
  function _fmtPayDate(dateStr) {
    if (!dateStr) return '';
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var p = dateStr.split('-');
    if (p.length !== 3) return dateStr;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var diff = Math.round((d - today) / 86400000);
    if (diff < 0)  return 'Просрочен';
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Завтра';
    if (diff <= 7)  return 'Через ' + diff + ' дн.';
    var MN = ['янв','фев','мар','апр','мая','июн',
              'июл','авг','сен','окт','ноя','дек'];
    return +p[2] + ' ' + (MN[+p[1] - 1] || '');
  }

  // ─── Metrics row HTML ─────────────────────────────────────────────────────
  function _metricsHtml(income, expenses, invested) {
    return '<div class="mn-metrics">'
      + '<div class="mn-metric"><div class="mn-metric-label">Доходы</div>'
      + '<div class="mn-metric-value">' + (income > 0 ? _fmtRub(income) : '—') + '</div></div>'
      + '<div class="mn-metric"><div class="mn-metric-label">Расходы</div>'
      + '<div class="mn-metric-value">' + (expenses > 0 ? _fmtRub(expenses) : '—') + '</div></div>'
      + '<div class="mn-metric"><div class="mn-metric-label">Инвестировано</div>'
      + '<div class="mn-metric-value">' + (invested > 0 ? _fmtRub(invested) : '—') + '</div></div>'
      + '</div>';
  }

  // ─── Main card HTML builders ──────────────────────────────────────────────
  function _mainCardEmptyHtml() {
    return '<div class="mn-main-label">Доступно до конца месяца</div>'
      + '<div class="mn-main-value" style="color:var(--text-dim)">—</div>'
      + '<div class="mn-main-note">Добавьте счёт, чтобы начать отслеживать финансы</div>'
      + '<button class="mn-main-cta-btn" type="button" data-action="go-accounts">+ Добавить счёт</button>';
  }

  function _mainCardNoPlanHtml(comp, income, expenses, invested) {
    var isNeg = comp.acctBalance < 0;
    return '<div class="mn-main-label">Остаток по счетам</div>'
      + '<div class="mn-main-value' + (isNeg ? ' mn-main-value--neg' : '') + '">'
      + _fmtRub(comp.acctBalance) + '</div>'
      + '<div class="mn-main-note mn-main-note--warn">Без учёта будущих доходов и обязательных платежей</div>'
      + '<button class="mn-main-cta-btn" type="button" data-action="go-plan">Настроить план месяца</button>'
      + _metricsHtml(income, expenses, invested);
  }

  function _mainCardFullHtml(comp, income, expenses, invested) {
    var isDeficit = comp.available < 0;
    var label = isDeficit
      ? 'Дефицит до конца месяца'
      : 'Доступно до конца месяца';
    var valCls = isDeficit ? ' mn-main-value--neg' : ' mn-main-value--pos';
    var display = isDeficit ? _fmtRub(-comp.available) : _fmtRub(comp.available);
    return '<div class="mn-main-label">' + label + '</div>'
      + '<div class="mn-main-value' + valCls + '">' + display + '</div>'
      + _metricsHtml(income, expenses, invested)
      + '<button class="mn-breakdown-btn" type="button" data-action="breakdown">Как рассчитано</button>';
  }

  // ─── renderMainCard ────────────────────────────────────────────────────────
  function renderMainCard() {
    var el = document.getElementById('mn-main-card');
    if (!el) return;

    var s = MONEY_STORE.getState();
    var month = _thisMonth();
    var plan = _currentPlan(s, month);
    var income = _monthTotal('income', month);
    var expenses = _monthTotal('expense', month);
    var invested = _monthTotal('investment', month);
    var activeAccts = (s.accounts || []).filter(function (a) { return !a.archived; });

    if (activeAccts.length === 0) {
      el.innerHTML = _mainCardEmptyHtml();
    } else if (!plan) {
      var comp0 = _computeComponents(s, null, month);
      el.innerHTML = _mainCardNoPlanHtml(comp0, income, expenses, invested);
    } else {
      var comp = _computeComponents(s, plan, month);
      el.innerHTML = _mainCardFullHtml(comp, income, expenses, invested);
      var bkBtn = el.querySelector('[data-action="breakdown"]');
      if (bkBtn) bkBtn.addEventListener('click', function () { _openBreakdownSheet(comp); });
    }

    var goAcct = el.querySelector('[data-action="go-accounts"]');
    if (goAcct) goAcct.addEventListener('click', function () { if (window.setPage) setPage('money-accounts'); });
    var goPlan = el.querySelector('[data-action="go-plan"]');
    if (goPlan) goPlan.addEventListener('click', function () { if (window.setPage) setPage('money-plan'); });
  }

  // ─── Today section helpers ────────────────────────────────────────────────
  function _dayGuideHtml(s, plan, month) {
    var activeAccts = (s.accounts || []).filter(function (a) { return !a.archived; });
    if (activeAccts.length === 0) {
      return '<div class="mn-today-row"><span class="mn-today-label">Ориентир на день</span>'
        + '<span class="mn-today-val">—</span></div>';
    }
    var comp = _computeComponents(s, plan, month);
    if (comp.available < 0) {
      return '<div class="mn-today-row"><span class="mn-today-label">Ориентир на день</span>'
        + '<span class="mn-today-val mn-today-val--neg">Сначала нужно закрыть дефицит</span></div>';
    }
    var today = new Date();
    var lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    var daysLeft = Math.max(1, lastDay - today.getDate() + 1);
    var guide = Math.floor(comp.available / daysLeft);
    return '<div class="mn-today-row"><span class="mn-today-label">Ориентир на день</span>'
      + '<span class="mn-today-val">' + _fmtRub(guide) + '</span></div>';
  }

  function _nextPaymentHtml(plan, month) {
    if (!plan) {
      return '<div class="mn-today-row"><span class="mn-today-label">Ближайший платёж</span>'
        + '<span class="mn-today-val">—</span></div>';
    }
    var exps = plan.mandatoryExpenses || [];
    var unpaid = exps.filter(function (e) { return !_isItemCompleted(e, 'expense', month); });
    if (unpaid.length === 0) {
      return '<div class="mn-today-row"><span class="mn-today-label">Ближайший платёж</span>'
        + '<span class="mn-today-val">' + (exps.length > 0 ? 'Все оплачены ✓' : '—') + '</span></div>';
    }
    unpaid.sort(function (a, b) {
      var da = a.dueDate || '9999-99-99', db = b.dueDate || '9999-99-99';
      return da < db ? -1 : da > db ? 1 : 0;
    });
    var next = unpaid[0];
    var when = next.dueDate ? _fmtPayDate(next.dueDate) : '';
    var isOverdue = next.dueDate && next.dueDate < _today();
    return '<button class="mn-today-row mn-today-row--btn" type="button" data-action="go-plan">'
      + '<span class="mn-today-label">Ближайший платёж</span>'
      + '<span class="mn-today-val">'
      + '<span class="mn-today-pay-title">' + _esc(next.title) + '</span>'
      + ' <span class="mn-today-pay-amt">−' + _fmtRub(next.amountMinor) + '</span>'
      + (when ? ' <span class="mn-today-when' + (isOverdue ? ' mn-today-when--over' : '') + '">' + _esc(when) + '</span>' : '')
      + '</span></button>';
  }

  function _mainGoalHtml(s, month) {
    var goals = s.goals || [];
    var mainGoal = null;
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].isMain && goals[i].status === 'active') { mainGoal = goals[i]; break; }
    }
    if (!mainGoal) {
      return '<div class="mn-today-row"><span class="mn-today-label">Главная цель</span>'
        + '<button class="mn-today-val mn-today-val--link" type="button" data-action="go-goals">'
        + 'Выбрать →</button></div>';
    }
    var accumulated = mainGoal.initialAmountMinor || 0;
    var cs = mainGoal.contributions || [];
    for (var j = 0; j < cs.length; j++) {
      if (_verifyTransferContrib(cs[j])) accumulated += cs[j].amountMinor || 0;
    }
    var target = mainGoal.targetAmountMinor || 0;
    var pct = target > 0 ? Math.min(Math.round(accumulated / target * 100), 100) : 0;
    var remaining = Math.max(0, target - accumulated);
    return '<button class="mn-today-row mn-today-row--btn mn-today-goal-row" type="button"'
      + ' data-action="open-main-goal" data-goal-id="' + _esc(mainGoal.id) + '">'
      + '<span class="mn-today-goal-head">'
      + '<span class="mn-today-label">Главная цель</span>'
      + '<span class="mn-today-pay-title">' + _esc(mainGoal.name) + '</span>'
      + '</span>'
      + '<span class="mn-today-goal-prog">'
      + '<span class="mn-today-goal-bar"><span class="mn-today-goal-fill" style="width:' + pct + '%"></span></span>'
      + '<span class="mn-today-goal-nums">' + _fmtRub(accumulated) + ' / ' + _fmtRub(target)
      + ' <span class="mn-today-goal-pct">' + pct + '%</span>'
      + (remaining > 0 ? ' · Остало ' + _fmtRub(remaining) : '')
      + '</span></span></button>';
  }

  // ─── renderTodaySection ────────────────────────────────────────────────────
  function renderTodaySection() {
    var el = document.getElementById('mn-today-section');
    if (!el) return;
    var s = MONEY_STORE.getState();
    var month = _thisMonth();
    var plan = _currentPlan(s, month);
    el.innerHTML = _dayGuideHtml(s, plan, month)
      + _nextPaymentHtml(plan, month)
      + _mainGoalHtml(s, month);

    var payBtn = el.querySelector('[data-action="go-plan"]');
    if (payBtn) payBtn.addEventListener('click', function () { if (window.setPage) setPage('money-plan'); });

    var goalCard = el.querySelector('[data-action="open-main-goal"]');
    if (goalCard) {
      var gid = goalCard.dataset.goalId;
      goalCard.addEventListener('click', function () {
        if (window.MONEY_GOALS && gid) MONEY_GOALS.openDetail(gid);
      });
    }

    var goGoals = el.querySelector('[data-action="go-goals"]');
    if (goGoals) goGoals.addEventListener('click', function () { if (window.setPage) setPage('money-goals'); });
  }

  // ─── renderAddOpBtn ────────────────────────────────────────────────────────
  function renderAddOpBtn() {
    var wrap = document.getElementById('mn-add-op-wrap');
    if (!wrap || wrap.querySelector('.mn-add-op-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mn-add-op-btn';
    btn.textContent = '+ Добавить операцию';
    btn.addEventListener('click', function () {
      if (window.MONEY_OPS) MONEY_OPS.openAdd('expense');
      else if (window.setPage) setPage('money-ops');
    });
    wrap.appendChild(btn);
  }

  // ─── Breakdown sheet ───────────────────────────────────────────────────────
  var _bkSheetEl = null;

  function _openBreakdownSheet(comp) {
    var el = _ensureBkSheet();
    el.querySelector('#mn-bk-body').innerHTML = _bkBodyHtml(comp);
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
  }

  function _closeBkSheet() {
    if (_bkSheetEl) _bkSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function _bkBodyHtml(comp) {
    var html = '';

    html += '<div class="mn-bk-section">Остатки доступных счетов</div>';
    if (comp.acctDetails.length === 0) {
      html += '<div class="mn-bk-row"><span>Нет счетов в расчёте</span><span>—</span></div>';
    } else {
      for (var i = 0; i < comp.acctDetails.length; i++) {
        var ad = comp.acctDetails[i];
        html += '<div class="mn-bk-row"><span>' + _esc(ad.name) + '</span>'
          + '<span class="' + (ad.balance < 0 ? 'mn-bk-val--neg' : '') + '">' + _fmtRub(ad.balance) + '</span></div>';
      }
    }
    html += '<div class="mn-bk-subtotal"><span>Итого по счетам</span>'
      + '<span class="' + (comp.acctBalance < 0 ? 'mn-bk-val--neg' : '') + '">' + _fmtRub(comp.acctBalance) + '</span></div>';

    if (!comp.hasPlan) {
      html += '<div class="mn-bk-note">Настройте план месяца для полного расчёта</div>';
      html += _bkResultHtml(comp.available);
      return html;
    }

    html += '<div class="mn-bk-section">+ Ожидаемые доходы</div>';
    if (comp.pendingIncomeCount === 0) {
      html += '<div class="mn-bk-row"><span>Все доходы получены</span><span>0 ₽</span></div>';
    } else {
      html += '<div class="mn-bk-row"><span>' + comp.pendingIncomeCount + ' не получено</span>'
        + '<span class="mn-bk-val--pos">+' + _fmtRub(comp.pendingIncome) + '</span></div>';
    }

    html += '<div class="mn-bk-section">− Обязательные платежи</div>';
    if (comp.pendingExpenseCount === 0) {
      html += '<div class="mn-bk-row"><span>Все оплачены</span><span>0 ₽</span></div>';
    } else {
      html += '<div class="mn-bk-row"><span>' + comp.pendingExpenseCount + ' не оплачено</span>'
        + '<span class="mn-bk-val--neg">−' + _fmtRub(comp.pendingExpenses) + '</span></div>';
    }

    html += '<div class="mn-bk-section">− Осталось инвестировать</div>';
    html += '<div class="mn-bk-row"><span>Остаток по плану</span>'
      + '<span class="' + (comp.investRemaining > 0 ? 'mn-bk-val--neg' : '') + '">'
      + (comp.investRemaining > 0 ? '−' + _fmtRub(comp.investRemaining) : '0 ₽')
      + '</span></div>';

    if (comp.goalDetails.length > 0) {
      html += '<div class="mn-bk-section">− Остаток взносов на цели</div>';
      for (var g = 0; g < comp.goalDetails.length; g++) {
        var gd = comp.goalDetails[g];
        html += '<div class="mn-bk-row"><span>' + _esc(gd.name) + '</span>'
          + '<span class="' + (gd.rem > 0 ? 'mn-bk-val--neg' : '') + '">'
          + (gd.rem > 0 ? '−' + _fmtRub(gd.rem) : '0 ₽') + '</span></div>';
      }
    }

    html += _bkResultHtml(comp.available);
    return html;
  }

  function _bkResultHtml(available) {
    var isNeg = available < 0;
    var label = isNeg ? 'Дефицит' : 'Доступно до конца месяца';
    var display = isNeg ? '−' + _fmtRub(-available) : _fmtRub(available);
    return '<div class="mn-bk-result"><span>' + label + '</span>'
      + '<span class="mn-bk-result-val ' + (isNeg ? 'mn-bk-val--neg' : 'mn-bk-val--pos') + '">'
      + display + '</span></div>';
  }

  function _ensureBkSheet() {
    if (_bkSheetEl) return _bkSheetEl;
    var X = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';
    var el = document.createElement('div');
    el.id = 'mn-bk-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel mn-bk-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + X + '</button>'
      + '<h2 class="mn-sheet-h">Как рассчитано</h2>'
      + '<div id="mn-bk-body" class="mn-bk-body"></div>'
      + '</div>';
    document.body.appendChild(el);
    _bkSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeBkSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeBkSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeBkSheet(); });
    return el;
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────
  function refresh() {
    renderMainCard();
    renderTodaySection();
  }

  // ─── Observe money page activation ────────────────────────────────────────
  function _observePage() {
    var page = document.querySelector('[data-page="money"]');
    if (!page || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (page.classList.contains('active')) refresh();
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    refresh();
    renderAddOpBtn();
    MONEY_STORE.subscribe(function () {
      var page = document.querySelector('[data-page="money"]');
      if (page && page.classList.contains('active')) refresh();
    });
    _observePage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
