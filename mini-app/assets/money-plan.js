/* assets/money-plan.js v3 — Мои деньги: План месяца */
(function () {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────────────────
  var EXPENSE_CATS = ['Продукты','Кафе и рестораны','Транспорт','Бензин','ЖКХ','Здоровье','Покупки','Другое'];
  var MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня',
                    'июля','августа','сентября','октября','ноября','декабря'];
  var CLOSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">'
    + '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32'
    + 'L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';

  // ─── Utilities ─────────────────────────────────────────────────────────────
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
    return String(s)
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

  function _thisMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  function _fmtMonth(yyyymm) {
    var p = yyyymm.split('-');
    return MONTHS_NOM[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }

  function _fmtDate(dateStr) {
    if (!dateStr) return '?';
    var p = dateStr.split('-');
    if (p.length !== 3) return dateStr;
    return parseInt(p[2], 10) + ' ' + (MONTHS_GEN[parseInt(p[1], 10) - 1] || '');
  }

  function _prevMonth(yyyymm) {
    var p = yyyymm.split('-'), y = parseInt(p[0]), m = parseInt(p[1]) - 1;
    if (m < 1) { m = 12; y--; }
    return y + '-' + ('0' + m).slice(-2);
  }

  function _nextMonth(yyyymm) {
    var p = yyyymm.split('-'), y = parseInt(p[0]), m = parseInt(p[1]) + 1;
    if (m > 12) { m = 1; y++; }
    return y + '-' + ('0' + m).slice(-2);
  }

  function _firstDayOfMonth(yyyymm) {
    return yyyymm + '-01';
  }

  // Adjusts date day to fit target month (handles 28/29/30/31 edge cases)
  function _adjustDueDate(sourceDate, targetMonth) {
    if (!sourceDate) return _firstDayOfMonth(targetMonth);
    var parts = sourceDate.split('-');
    var day = parseInt(parts[2], 10);
    var tp = targetMonth.split('-');
    var ty = parseInt(tp[0], 10), tm = parseInt(tp[1], 10);
    var lastDay = new Date(ty, tm, 0).getDate(); // month+1, day=0 → last day of month
    return ty + '-' + ('0' + tm).slice(-2) + '-' + ('0' + Math.min(day, lastDay)).slice(-2);
  }

  // ─── State ─────────────────────────────────────────────────────────────────
  var _currentMonth = _thisMonth();
  var _incSheetEl        = null;
  var _expSheetEl        = null;
  var _invSheetEl        = null;
  var _goalAllocSheetEl  = null;
  var _clickBound        = false;
  var _busy              = false;

  // ─── Data helpers ──────────────────────────────────────────────────────────
  function _getPlan(month) {
    var plans = MONEY_STORE.getState().monthlyPlans;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].month === month) return plans[i];
    }
    return null;
  }

  function _findTx(id) {
    if (!id) return null;
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      if (txns[i].id === id) return txns[i];
    }
    return null;
  }

  // Completed only if linked tx exists, has correct type, AND belongs to the same month
  function _getItemStatus(item, expectedType, month) {
    if (item.completedTransactionId) {
      var tx = _findTx(item.completedTransactionId);
      if (tx && tx.type === expectedType && tx.localDate && tx.localDate.slice(0, 7) === month) {
        return 'completed';
      }
    }
    if (item.dueDate && item.dueDate < _localDate()) return 'overdue';
    return 'expected';
  }

  function _getActiveAccts() {
    return MONEY_STORE.getState().accounts.filter(function (a) { return !a.archived; });
  }

  function _findAcctName(id) {
    if (!id) return null;
    var accts = MONEY_STORE.getState().accounts;
    for (var i = 0; i < accts.length; i++) {
      if (accts[i].id === id) return accts[i].name;
    }
    return null;
  }

  function _findIncomeItem(plan, id) {
    if (!plan) return null;
    var items = plan.plannedIncomes || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function _findExpenseItem(plan, id) {
    if (!plan) return null;
    var items = plan.mandatoryExpenses || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function _calcPlanned(plan) {
    var income = 0, expense = 0, invest = 0, goalSum = 0;
    if (plan) {
      (plan.plannedIncomes || []).forEach(function (x) { income += x.amountMinor; });
      (plan.mandatoryExpenses || []).forEach(function (x) { expense += x.amountMinor; });
      invest = plan.plannedInvestmentMinor || 0;
      (plan.goalAllocations || []).forEach(function (x) { goalSum += x.amountMinor; });
    }
    return { income: income, expense: expense, invest: invest, goalSum: goalSum };
  }

  function _findGoalById(id) {
    var goals = MONEY_STORE.getState().goals || [];
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].id === id) return goals[i];
    }
    return null;
  }

  function _verifyTransferContribInPlan(c) {
    if (!c) return false;
    if (c.mode !== 'transfer') return true; // manual always confirmed
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.id === c.transferTransactionId
          && tx.type === 'transfer'
          && tx.accountId   === c.sourceAccountId
          && tx.toAccountId === c.destinationAccountId
          && tx.amountMinor === c.amountMinor
          && tx.localDate   === c.localDate) {
        return true;
      }
    }
    return false;
  }

  // Sum confirmed goal contributions (manual + verified transfer) for a goal in a month
  function _calcGoalContribFact(goalId, month) {
    var goal = _findGoalById(goalId);
    if (!goal) return 0;
    var total = 0;
    var cs = goal.contributions || [];
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c.localDate || c.localDate.slice(0, 7) !== month) continue;
      if (_verifyTransferContribInPlan(c)) total += c.amountMinor || 0;
    }
    return total;
  }

  function _getActualInvested(month) {
    var txns = MONEY_STORE.getState().transactions;
    var total = 0;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.type === 'investment' && tx.localDate && tx.localDate.slice(0, 7) === month) {
        total += tx.amountMinor;
      }
    }
    return total;
  }

  function _calcFact(plan, month) {
    // Total actual income/expense from all transactions this month
    var totalIncome = 0, totalExpense = 0;
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (!tx.localDate || tx.localDate.slice(0, 7) !== month) continue;
      if (tx.type === 'income')  totalIncome  += tx.amountMinor;
      if (tx.type === 'expense') totalExpense += tx.amountMinor;
      // transfer and investment are excluded
    }
    // Linked plan items: sum the ACTUAL transaction amounts (not planned)
    var receivedIncome = 0, paidExpense = 0;
    var overdueItems = [];
    if (plan) {
      (plan.plannedIncomes || []).forEach(function (x) {
        if (_getItemStatus(x, 'income', month) === 'completed') {
          var linked = _findTx(x.completedTransactionId);
          receivedIncome += linked ? linked.amountMinor : 0;
        }
      });
      (plan.mandatoryExpenses || []).forEach(function (x) {
        var st = _getItemStatus(x, 'expense', month);
        if (st === 'completed') {
          var linked = _findTx(x.completedTransactionId);
          paidExpense += linked ? linked.amountMinor : 0;
        }
        if (st === 'overdue') overdueItems.push(x);
      });
    }
    return { totalIncome: totalIncome, totalExpense: totalExpense,
             receivedIncome: receivedIncome, paidExpense: paidExpense,
             overdueItems: overdueItems };
  }

  function _getNextUnpaidExpense(plan) {
    if (!plan) return null;
    var unpaid = (plan.mandatoryExpenses || []).filter(function (x) {
      return _getItemStatus(x, 'expense', _currentMonth) !== 'completed';
    });
    if (!unpaid.length) return null;
    unpaid.sort(function (a, b) {
      var da = a.dueDate || '9999', db = b.dueDate || '9999';
      return da > db ? 1 : da < db ? -1 : 0;
    });
    return unpaid[0];
  }

  function _getRecurringFromPrev(month) {
    var prev = _prevMonth(month);
    var prevPlan = _getPlan(prev);
    if (!prevPlan) return { incomes: [], expenses: [] };
    return {
      incomes:  (prevPlan.plannedIncomes  || []).filter(function (x) { return x.recurring; }),
      expenses: (prevPlan.mandatoryExpenses || []).filter(function (x) { return x.recurring; })
    };
  }

  // Creates or finds plan in mutable state — call inside MONEY_STORE.update()
  function _ensurePlanInState(s, month) {
    for (var i = 0; i < s.monthlyPlans.length; i++) {
      if (s.monthlyPlans[i].month === month) return s.monthlyPlans[i];
    }
    var ts = new Date().toISOString();
    var p = {
      id: 'mp_' + month.replace('-', ''), month: month,
      plannedIncomes: [], mandatoryExpenses: [],
      plannedInvestmentMinor: 0, goalAllocations: [],
      createdAt: ts, updatedAt: ts
    };
    s.monthlyPlans.push(p);
    return p;
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  function renderPlanPage() {
    var wrap = document.getElementById('mn-plan-content');
    if (!wrap) return;

    var plan    = _getPlan(_currentMonth);
    var planned = _calcPlanned(plan);
    var fact    = _calcFact(plan, _currentMonth);
    var invested = _getActualInvested(_currentMonth);
    var balance  = planned.income - planned.expense - planned.invest - planned.goalSum;
    var remaining = Math.max(0, planned.invest - invested);
    var nextPayment = _getNextUnpaidExpense(plan);
    var recurr = _getRecurringFromPrev(_currentMonth);
    var hasPlanItems = plan && (
      (plan.plannedIncomes || []).length > 0 ||
      (plan.mandatoryExpenses || []).length > 0 ||
      (plan.plannedInvestmentMinor || 0) > 0
    );
    var showTransfer = !hasPlanItems && (recurr.incomes.length > 0 || recurr.expenses.length > 0);

    var html = '';

    // ── Month nav
    html += '<div class="plan-month-nav">'
      + '<button class="plan-month-btn" type="button" data-action="prev-month">&#8249;</button>'
      + '<span class="plan-month-lbl">' + esc(_fmtMonth(_currentMonth)) + '</span>'
      + '<button class="plan-month-btn" type="button" data-action="next-month">&#8250;</button>'
      + '</div>';

    // ── Transfer recurring banner
    if (showTransfer) {
      html += '<div class="plan-transfer-banner">'
        + '<span class="plan-transfer-txt">Регулярные записи из ' + esc(_fmtMonth(_prevMonth(_currentMonth))) + '</span>'
        + '<button class="plan-transfer-btn" type="button" data-action="transfer-recurring">Перенести</button>'
        + '</div>';
    }

    // ── Summary card
    html += '<div class="plan-sum-card">'
      + '<div class="plan-sum-row">'
      + '<span class="plan-sum-lbl">Плановый остаток</span>'
      + '<span class="plan-sum-val' + (balance >= 0 ? ' plan-sum-val--pos' : ' plan-sum-val--neg') + '">'
      + fmtRub(balance) + '</span>'
      + '</div>'
      + '<div class="plan-sum-details">'
      + '<span class="plan-sum-det"><span class="plan-sum-det-lbl">Доходы</span>'
      + '<span class="plan-sum-det-val plan-sum-det-val--inc">' + fmtRub(planned.income) + '</span></span>'
      + '<span class="plan-sum-det"><span class="plan-sum-det-lbl">Расходы</span>'
      + '<span class="plan-sum-det-val plan-sum-det-val--exp">' + fmtRub(planned.expense) + '</span></span>'
      + '<span class="plan-sum-det"><span class="plan-sum-det-lbl">Инвест.</span>'
      + '<span class="plan-sum-det-val">' + fmtRub(planned.invest) + '</span></span>'
      + (planned.goalSum > 0
          ? '<span class="plan-sum-det"><span class="plan-sum-det-lbl">На цели</span>'
            + '<span class="plan-sum-det-val plan-sum-det-val--exp">' + fmtRub(planned.goalSum) + '</span></span>'
          : '')
      + '</div></div>';

    // ── Planned incomes
    html += '<div class="plan-section">'
      + '<div class="plan-section-hd">'
      + '<span class="plan-section-ttl">Плановые доходы</span>'
      + '<button class="plan-add-btn" type="button" data-action="add-income">+ Добавить</button>'
      + '</div>';
    if (!plan || !(plan.plannedIncomes || []).length) {
      html += '<p class="plan-empty">Нет плановых доходов</p>';
    } else {
      plan.plannedIncomes.forEach(function (item) { html += _incRowHtml(item); });
    }
    html += '</div>';

    // ── Mandatory expenses
    html += '<div class="plan-section">'
      + '<div class="plan-section-hd">'
      + '<span class="plan-section-ttl">Обязательные расходы</span>'
      + '<button class="plan-add-btn" type="button" data-action="add-expense">+ Добавить</button>'
      + '</div>';
    if (!plan || !(plan.mandatoryExpenses || []).length) {
      html += '<p class="plan-empty">Нет обязательных расходов</p>';
    } else {
      plan.mandatoryExpenses.forEach(function (item) { html += _expRowHtml(item); });
    }
    html += '</div>';

    // ── Nearest unpaid payment
    if (nextPayment) {
      html += '<div class="plan-next-payment">'
        + '<span class="plan-next-lbl">Ближайший неоплаченный платёж</span>'
        + '<span class="plan-next-title">' + esc(nextPayment.title) + '</span>'
        + '<span class="plan-next-meta">' + esc(_fmtDate(nextPayment.dueDate)) + ' · ' + fmtRub(nextPayment.amountMinor) + '</span>'
        + '</div>';
    }

    // ── Investment section
    html += '<div class="plan-section">'
      + '<div class="plan-section-hd">'
      + '<span class="plan-section-ttl">Инвестирование</span>'
      + '<button class="plan-add-btn" type="button" data-action="edit-invest">Изменить план</button>'
      + '</div>'
      + '<div class="plan-invest-grid">'
      + '<div class="plan-invest-item"><span class="plan-invest-lbl">План</span>'
      + '<span class="plan-invest-val">' + (planned.invest ? fmtRub(planned.invest) : '—') + '</span></div>'
      + '<div class="plan-invest-item"><span class="plan-invest-lbl">Факт</span>'
      + '<span class="plan-invest-val plan-invest-val--fact">' + (invested ? fmtRub(invested) : '—') + '</span></div>'
      + '<div class="plan-invest-item"><span class="plan-invest-lbl">Осталось</span>'
      + '<span class="plan-invest-val' + (planned.invest > 0 && remaining === 0 && invested > 0 ? ' plan-invest-val--done' : '') + '">'
      + (planned.invest > 0 ? fmtRub(remaining) : '—') + '</span></div>'
      + '</div>'
      + '<button class="plan-record-invest-btn" type="button" data-action="record-invest">Записать инвестицию</button>'
      + '</div>';

    // ── Goal allocations section
    var allGoals = MONEY_STORE.getState().goals || [];
    var planGoalAllocs = plan ? (plan.goalAllocations || []) : [];
    html += '<div class="plan-section">'
      + '<div class="plan-section-hd">'
      + '<span class="plan-section-ttl">На цели</span>'
      + '<button class="plan-add-btn" type="button" data-action="add-goal-alloc">+ Добавить</button>'
      + '</div>';
    if (!planGoalAllocs.length) {
      html += '<p class="plan-empty">Нет плановых взносов на цели</p>';
    } else {
      for (var gi = 0; gi < planGoalAllocs.length; gi++) {
        html += _goalAllocRowHtml(planGoalAllocs[gi], allGoals, _currentMonth);
      }
    }
    html += '</div>';

    // ── Fact section
    var overdueSum = fact.overdueItems.reduce(function (s, x) { return s + x.amountMinor; }, 0);
    html += '<div class="plan-section plan-section--fact">'
      + '<div class="plan-section-hd"><span class="plan-section-ttl">Факт месяца</span></div>'
      + '<div class="plan-fact-row"><span class="plan-fact-lbl">Доходов получено</span>'
      + '<span class="plan-fact-val plan-fact-val--inc">' + fmtRub(fact.totalIncome) + '</span></div>'
      + (fact.receivedIncome > 0
          ? '<div class="plan-fact-row"><span class="plan-fact-lbl">&nbsp;&nbsp;в т.ч. плановых</span>'
            + '<span class="plan-fact-val plan-fact-val--inc">' + fmtRub(fact.receivedIncome) + '</span></div>'
          : '')
      + '<div class="plan-fact-row"><span class="plan-fact-lbl">Расходов оплачено</span>'
      + '<span class="plan-fact-val">' + fmtRub(fact.totalExpense) + '</span></div>'
      + (fact.paidExpense > 0
          ? '<div class="plan-fact-row"><span class="plan-fact-lbl">&nbsp;&nbsp;в т.ч. обязательных</span>'
            + '<span class="plan-fact-val">' + fmtRub(fact.paidExpense) + '</span></div>'
          : '')
      + '<div class="plan-fact-row"><span class="plan-fact-lbl">Инвестировано</span>'
      + '<span class="plan-fact-val">' + fmtRub(invested) + '</span></div>';
    if (planGoalAllocs.length) {
      var goalFactTotal = 0;
      planGoalAllocs.forEach(function (ga) { goalFactTotal += _calcGoalContribFact(ga.goalId, _currentMonth); });
      html += '<div class="plan-fact-row"><span class="plan-fact-lbl">На цели внесено</span>'
        + '<span class="plan-fact-val">' + fmtRub(goalFactTotal) + '</span></div>';
    }
    if (fact.overdueItems.length > 0) {
      html += '<div class="plan-fact-row plan-fact-row--warn">'
        + '<span class="plan-fact-lbl">Просроченных платежей</span>'
        + '<span class="plan-fact-val plan-fact-val--warn">'
        + fact.overdueItems.length + ' на ' + fmtRub(overdueSum) + '</span></div>';
    }
    if (planned.invest > 0) {
      html += '<div class="plan-fact-row"><span class="plan-fact-lbl">До плана инвестиций</span>'
        + '<span class="plan-fact-val">' + fmtRub(remaining) + '</span></div>';
    }
    html += '</div>';
    wrap.innerHTML = html;

    if (!_clickBound) {
      _clickBound = true;
      wrap.addEventListener('click', _onPlanClick);
    }
  }

  // ─── Row renderers ─────────────────────────────────────────────────────────
  function _incRowHtml(item) {
    var st = _getItemStatus(item, 'income', _currentMonth);
    var stLabel = st === 'completed' ? 'Получен' : st === 'overdue' ? 'Просрочен' : 'Ожидается';
    var acctName = _findAcctName(item.accountId);
    var metaParts = [_fmtDate(item.dueDate)];
    if (acctName) metaParts.push(acctName);
    if (item.recurring) metaParts.push('🔁');
    return '<div class="plan-item-row">'
      + '<div class="plan-item-main">'
      + '<span class="plan-item-title">' + esc(item.title) + '</span>'
      + '<span class="plan-item-amt">+' + fmtRub(item.amountMinor) + '</span>'
      + '</div>'
      + '<div class="plan-item-sub">'
      + '<span class="plan-item-meta">' + esc(metaParts.join(' · ')) + '</span>'
      + '<div class="plan-item-actions">'
      + '<span class="plan-item-status plan-item-status--' + st + '">' + stLabel + '</span>'
      + (st !== 'completed'
        ? '<button class="plan-item-do-btn" type="button" data-action="mark-income-done" data-id="' + esc(item.id) + '">Получить</button>'
        : '')
      + '<button class="plan-item-edit-btn" type="button" data-action="edit-income" data-id="' + esc(item.id) + '" aria-label="Редактировать">✎</button>'
      + '</div></div></div>';
  }

  function _expRowHtml(item) {
    var st = _getItemStatus(item, 'expense', _currentMonth);
    var stLabel = st === 'completed' ? 'Оплачен' : st === 'overdue' ? 'Просрочен' : 'Ожидается';
    var acctName = _findAcctName(item.accountId);
    var metaParts = [_fmtDate(item.dueDate)];
    if (item.category) metaParts.push(item.category);
    if (acctName) metaParts.push(acctName);
    if (item.recurring) metaParts.push('🔁');
    return '<div class="plan-item-row">'
      + '<div class="plan-item-main">'
      + '<span class="plan-item-title">' + esc(item.title) + '</span>'
      + '<span class="plan-item-amt plan-item-amt--exp">−' + fmtRub(item.amountMinor) + '</span>'
      + '</div>'
      + '<div class="plan-item-sub">'
      + '<span class="plan-item-meta">' + esc(metaParts.join(' · ')) + '</span>'
      + '<div class="plan-item-actions">'
      + '<span class="plan-item-status plan-item-status--' + st + '">' + stLabel + '</span>'
      + (st !== 'completed'
        ? '<button class="plan-item-do-btn" type="button" data-action="mark-expense-done" data-id="' + esc(item.id) + '">Оплатить</button>'
        : '')
      + '<button class="plan-item-edit-btn" type="button" data-action="edit-expense" data-id="' + esc(item.id) + '" aria-label="Редактировать">✎</button>'
      + '</div></div></div>';
  }

  function _goalAllocRowHtml(alloc, allGoals, month) {
    var goal = null;
    for (var i = 0; i < allGoals.length; i++) {
      if (allGoals[i].id === alloc.goalId) { goal = allGoals[i]; break; }
    }
    var goalName = goal ? goal.name : '(Удалена)';
    var fact = _calcGoalContribFact(alloc.goalId, month);
    var planAmt = alloc.amountMinor;
    var remaining = planAmt - fact;
    var isOver = fact > planAmt;
    var isArchived = goal && (goal.status === 'archived' || goal.status === 'completed');

    var html = '<div class="plan-goal-alloc-row">'
      + '<div class="plan-goal-alloc-head">'
      + '<span class="plan-goal-alloc-name">' + esc(goalName)
      + (isArchived ? '&nbsp;<span class="plan-goal-alloc-badge plan-goal-alloc-badge--archive">'
          + (goal.status === 'archived' ? 'В архиве' : 'Завершена') + '</span>' : '')
      + '</span>'
      + '<span class="plan-goal-alloc-planned">' + fmtRub(planAmt) + '</span>'
      + '</div>'
      + '<div class="plan-goal-alloc-grid">'
      + '<div class="plan-goal-alloc-item"><span class="plan-goal-alloc-lbl">Факт</span>'
      + '<span class="plan-goal-alloc-val' + (isOver ? ' plan-goal-alloc-val--over' : '') + '">' + fmtRub(fact) + '</span></div>'
      + '<div class="plan-goal-alloc-item"><span class="plan-goal-alloc-lbl">' + (isOver ? 'Перевыпол.' : 'Осталось') + '</span>'
      + '<span class="plan-goal-alloc-val' + (isOver ? ' plan-goal-alloc-val--over' : '') + '">'
      + (isOver ? '+' : '') + fmtRub(Math.abs(remaining)) + '</span></div>'
      + '</div>'
      + '<div class="plan-goal-alloc-actions">';
    if (goal && goal.status === 'active') {
      html += '<button class="plan-item-do-btn" type="button"'
        + ' data-action="contrib-goal-plan" data-goal-id="' + esc(alloc.goalId) + '" data-amt="' + alloc.amountMinor + '">Внести</button>'
        + '<button class="plan-item-edit-btn" type="button"'
        + ' data-action="open-goal-plan" data-goal-id="' + esc(alloc.goalId) + '" aria-label="Открыть цель">↗</button>';
    }
    html += '<button class="plan-item-edit-btn" type="button"'
      + ' data-action="edit-goal-alloc" data-id="' + esc(alloc.id) + '" aria-label="Редактировать">✎</button>'
      + '<button class="plan-item-edit-btn" type="button" style="color:#e05252"'
      + ' data-action="del-goal-alloc" data-id="' + esc(alloc.id) + '" aria-label="Удалить">✕</button>'
      + '</div></div>';
    return html;
  }

  // ─── Click delegation ──────────────────────────────────────────────────────
  function _onPlanClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    switch (action) {
      case 'prev-month':
        _currentMonth = _prevMonth(_currentMonth); renderPlanPage(); break;
      case 'next-month':
        _currentMonth = _nextMonth(_currentMonth); renderPlanPage(); break;
      case 'add-income':     openIncomeSheet(null);     break;
      case 'edit-income':    openIncomeSheet(btn.dataset.id);  break;
      case 'mark-income-done': _doMarkIncomeDone(btn.dataset.id);   break;
      case 'add-expense':    openExpenseSheet(null);    break;
      case 'edit-expense':   openExpenseSheet(btn.dataset.id); break;
      case 'mark-expense-done': _doMarkExpenseDone(btn.dataset.id); break;
      case 'edit-invest':    openInvestSheet(); break;
      case 'record-invest':
        if (window.MONEY_OPS) MONEY_OPS.openAdd('investment'); break;
      case 'transfer-recurring':
        if (!_busy) { _busy = true; _doTransferRecurring(); setTimeout(function () { _busy = false; }, 500); }
        break;
      case 'add-goal-alloc':  openGoalAllocSheet(null); break;
      case 'edit-goal-alloc': openGoalAllocSheet(btn.dataset.id); break;
      case 'del-goal-alloc':  _doDeleteGoalAlloc(btn.dataset.id); break;
      case 'contrib-goal-plan':
        if (window.MONEY_GOALS) {
          MONEY_GOALS.openContrib(btn.dataset.goalId, parseInt(btn.dataset.amt, 10) || 0);
        }
        break;
      case 'open-goal-plan':
        if (window.MONEY_GOALS) MONEY_GOALS.openDetail(btn.dataset.goalId);
        break;
    }
  }

  // ─── Account selector helper ──────────────────────────────────────────────
  function _populateAcct(sel, currentId) {
    if (!sel) return;
    var active = _getActiveAccts();
    var opts = '<option value="">— не указывать —</option>';
    // Include archived account if it's the current selection
    if (currentId) {
      var inActive = false;
      for (var i = 0; i < active.length; i++) { if (active[i].id === currentId) { inActive = true; break; } }
      if (!inActive) {
        var allAccts = MONEY_STORE.getState().accounts;
        for (var j = 0; j < allAccts.length; j++) {
          if (allAccts[j].id === currentId) {
            opts += '<option value="' + esc(allAccts[j].id) + '">' + esc(allAccts[j].name) + ' (архив)</option>';
            break;
          }
        }
      }
    }
    active.forEach(function (a) {
      opts += '<option value="' + esc(a.id) + '"' + (a.id === currentId ? ' selected' : '') + '>' + esc(a.name) + '</option>';
    });
    sel.innerHTML = opts;
    if (currentId) sel.value = currentId;
  }

  // ─── Income form ───────────────────────────────────────────────────────────
  function openIncomeSheet(id) {
    var el = _ensureIncSheet();
    var plan = _getPlan(_currentMonth);
    var item = id ? _findIncomeItem(plan, id) : null;
    el.dataset.editId = item ? item.id : '';
    el.querySelector('#pi-h').textContent = item ? 'Редактировать доход' : 'Плановый доход';
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    el.querySelector('#pi-f-title').value   = item ? item.title : '';
    el.querySelector('#pi-f-amt').value     = item ? (item.amountMinor / 100).toFixed(item.amountMinor % 100 ? 2 : 0) : '';
    el.querySelector('#pi-f-date').value    = item ? (item.dueDate || _firstDayOfMonth(_currentMonth)) : _firstDayOfMonth(_currentMonth);
    el.querySelector('#pi-f-recur').checked = item ? !!item.recurring : false;
    _populateAcct(el.querySelector('#pi-f-acct'), item ? item.accountId : null);
    el.querySelector('#pi-del-btn').style.display = item ? '' : 'none';
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { el.querySelector('#pi-f-title').focus(); }, 80);
  }

  function _closeIncSheet() {
    if (_incSheetEl) _incSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function _ensureIncSheet() {
    if (_incSheetEl) return _incSheetEl;
    var el = document.createElement('div');
    el.id = 'plan-inc-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h" id="pi-h">Плановый доход</h2>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pi-f-title">Название</label>'
      + '<input class="mn-sheet-inp" id="pi-f-title" type="text" maxlength="60" placeholder="Зарплата" autocomplete="off">'
      + '<span class="mn-sheet-err" id="pi-e-title"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pi-f-amt">Сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="pi-f-amt" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="pi-e-amt"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pi-f-date">Дата поступления</label>'
      + '<input class="mn-sheet-inp" id="pi-f-date" type="date">'
      + '<span class="mn-sheet-err" id="pi-e-date"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pi-f-acct">Счёт</label>'
      + '<select class="mn-sheet-sel" id="pi-f-acct"></select></div>'
      + '<label class="plan-recur-row"><input type="checkbox" id="pi-f-recur"> Повторяется ежемесячно</label>'
      + '<button class="mn-sheet-save" type="button" id="pi-save-btn">Сохранить</button>'
      + '<button class="mn-sheet-save plan-del-btn" type="button" id="pi-del-btn" style="display:none">Удалить доход</button>'
      + '<button class="mn-sheet-cancel" type="button" id="pi-cancel-btn">Отмена</button>'
      + '</div>';
    document.body.appendChild(el);
    _incSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeIncSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeIncSheet);
    el.querySelector('#pi-cancel-btn').addEventListener('click', _closeIncSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeIncSheet(); });
    el.querySelector('#pi-save-btn').addEventListener('click', function () { _doSaveIncome(el); });
    el.querySelector('#pi-del-btn').addEventListener('click', function () {
      var id = el.dataset.editId;
      if (id) { _closeIncSheet(); _doDeleteIncome(id); }
    });
    return el;
  }

  function _doSaveIncome(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    var title     = el.querySelector('#pi-f-title').value.trim();
    var amt       = parseAmount(el.querySelector('#pi-f-amt').value);
    var date      = el.querySelector('#pi-f-date').value;
    var acctId    = el.querySelector('#pi-f-acct').value || null;
    var recurring = el.querySelector('#pi-f-recur').checked;
    var ok = true;
    if (!title) { el.querySelector('#pi-e-title').textContent = 'Введите название'; ok = false; }
    if (amt === null) { el.querySelector('#pi-e-amt').textContent = 'Введите сумму больше 0'; ok = false; }
    if (!date) { el.querySelector('#pi-e-date').textContent = 'Укажите дату'; ok = false; }
    if (!ok) return;
    var editId = el.dataset.editId || '';
    var snap = MONEY_STORE.exportData();
    var now = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      var plan = _ensurePlanInState(s, _currentMonth);
      if (editId) {
        for (var i = 0; i < plan.plannedIncomes.length; i++) {
          if (plan.plannedIncomes[i].id === editId) {
            var x = plan.plannedIncomes[i];
            x.title = title; x.amountMinor = amt; x.dueDate = date;
            x.accountId = acctId; x.recurring = recurring; x.updatedAt = now;
            break;
          }
        }
      } else {
        plan.plannedIncomes.push({
          id: MONEY_STORE.createId(), title: title, amountMinor: amt, dueDate: date,
          accountId: acctId, recurring: recurring, completedTransactionId: null,
          createdAt: now, updatedAt: now
        });
      }
      plan.updatedAt = now;
    });
    if (!MONEY_STORE.save()) {
      MONEY_STORE.importData(snap);
      el.querySelector('#pi-e-amt').textContent = 'Ошибка сохранения';
      return;
    }
    _closeIncSheet();
  }

  function _doMarkIncomeDone(itemId) {
    var plan = _getPlan(_currentMonth);
    var item = _findIncomeItem(plan, itemId);
    if (!item) return;
    if (item.completedTransactionId && _findTx(item.completedTransactionId)) return;
    var snap = MONEY_STORE.exportData();
    var now = new Date(); var txId = MONEY_STORE.createId();
    MONEY_STORE.update(function (s) {
      s.transactions.push({
        id: txId, type: 'income', title: item.title, amountMinor: item.amountMinor,
        localDate: item.dueDate || _localDate(), accountId: item.accountId || null,
        toAccountId: null, category: null, note: '', quickExpenseId: null,
        createdAt: now.toISOString(), updatedAt: now.toISOString()
      });
      for (var i = 0; i < s.monthlyPlans.length; i++) {
        if (s.monthlyPlans[i].month !== _currentMonth) continue;
        for (var j = 0; j < s.monthlyPlans[i].plannedIncomes.length; j++) {
          if (s.monthlyPlans[i].plannedIncomes[j].id === itemId) {
            s.monthlyPlans[i].plannedIncomes[j].completedTransactionId = txId;
            s.monthlyPlans[i].plannedIncomes[j].updatedAt = now.toISOString();
          }
        }
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
  }

  function _doDeleteIncome(itemId) {
    if (!confirm('Удалить плановый доход?')) return;
    var snap = MONEY_STORE.exportData();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < s.monthlyPlans.length; i++) {
        if (s.monthlyPlans[i].month !== _currentMonth) continue;
        s.monthlyPlans[i].plannedIncomes = s.monthlyPlans[i].plannedIncomes.filter(function (x) { return x.id !== itemId; });
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
  }

  // ─── Expense form ──────────────────────────────────────────────────────────
  function openExpenseSheet(id) {
    var el = _ensureExpSheet();
    var plan = _getPlan(_currentMonth);
    var item = id ? _findExpenseItem(plan, id) : null;
    el.dataset.editId = item ? item.id : '';
    el.querySelector('#pe-h').textContent = item ? 'Редактировать расход' : 'Обязательный расход';
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    el.querySelector('#pe-f-title').value   = item ? item.title : '';
    el.querySelector('#pe-f-cat').value     = item ? (item.category || EXPENSE_CATS[0]) : EXPENSE_CATS[0];
    el.querySelector('#pe-f-amt').value     = item ? (item.amountMinor / 100).toFixed(item.amountMinor % 100 ? 2 : 0) : '';
    el.querySelector('#pe-f-date').value    = item ? (item.dueDate || _firstDayOfMonth(_currentMonth)) : _firstDayOfMonth(_currentMonth);
    el.querySelector('#pe-f-recur').checked = item ? !!item.recurring : false;
    _populateAcct(el.querySelector('#pe-f-acct'), item ? item.accountId : null);
    el.querySelector('#pe-del-btn').style.display = item ? '' : 'none';
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { el.querySelector('#pe-f-title').focus(); }, 80);
  }

  function _closeExpSheet() {
    if (_expSheetEl) _expSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function _ensureExpSheet() {
    if (_expSheetEl) return _expSheetEl;
    var catOpts = EXPENSE_CATS.map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    var el = document.createElement('div');
    el.id = 'plan-exp-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h" id="pe-h">Обязательный расход</h2>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pe-f-title">Название</label>'
      + '<input class="mn-sheet-inp" id="pe-f-title" type="text" maxlength="60" placeholder="Аренда" autocomplete="off">'
      + '<span class="mn-sheet-err" id="pe-e-title"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pe-f-cat">Категория</label>'
      + '<select class="mn-sheet-sel" id="pe-f-cat">' + catOpts + '</select></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pe-f-amt">Сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="pe-f-amt" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="pe-e-amt"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pe-f-date">Дата платежа</label>'
      + '<input class="mn-sheet-inp" id="pe-f-date" type="date">'
      + '<span class="mn-sheet-err" id="pe-e-date"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pe-f-acct">Счёт</label>'
      + '<select class="mn-sheet-sel" id="pe-f-acct"></select></div>'
      + '<label class="plan-recur-row"><input type="checkbox" id="pe-f-recur"> Повторяется ежемесячно</label>'
      + '<button class="mn-sheet-save" type="button" id="pe-save-btn">Сохранить</button>'
      + '<button class="mn-sheet-save plan-del-btn" type="button" id="pe-del-btn" style="display:none">Удалить расход</button>'
      + '<button class="mn-sheet-cancel" type="button" id="pe-cancel-btn">Отмена</button>'
      + '</div>';
    document.body.appendChild(el);
    _expSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeExpSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeExpSheet);
    el.querySelector('#pe-cancel-btn').addEventListener('click', _closeExpSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeExpSheet(); });
    el.querySelector('#pe-save-btn').addEventListener('click', function () { _doSaveExpense(el); });
    el.querySelector('#pe-del-btn').addEventListener('click', function () {
      var id = el.dataset.editId;
      if (id) { _closeExpSheet(); _doDeleteExpense(id); }
    });
    return el;
  }

  function _doSaveExpense(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    var title     = el.querySelector('#pe-f-title').value.trim();
    var cat       = el.querySelector('#pe-f-cat').value;
    var amt       = parseAmount(el.querySelector('#pe-f-amt').value);
    var date      = el.querySelector('#pe-f-date').value;
    var acctId    = el.querySelector('#pe-f-acct').value || null;
    var recurring = el.querySelector('#pe-f-recur').checked;
    var ok = true;
    if (!title) { el.querySelector('#pe-e-title').textContent = 'Введите название'; ok = false; }
    if (amt === null) { el.querySelector('#pe-e-amt').textContent = 'Введите сумму больше 0'; ok = false; }
    if (!date) { el.querySelector('#pe-e-date').textContent = 'Укажите дату'; ok = false; }
    if (!ok) return;
    var editId = el.dataset.editId || '';
    var snap = MONEY_STORE.exportData();
    var now = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      var plan = _ensurePlanInState(s, _currentMonth);
      if (editId) {
        for (var i = 0; i < plan.mandatoryExpenses.length; i++) {
          if (plan.mandatoryExpenses[i].id === editId) {
            var x = plan.mandatoryExpenses[i];
            x.title = title; x.category = cat; x.amountMinor = amt;
            x.dueDate = date; x.accountId = acctId; x.recurring = recurring;
            x.updatedAt = now; break;
          }
        }
      } else {
        plan.mandatoryExpenses.push({
          id: MONEY_STORE.createId(), title: title, category: cat, amountMinor: amt,
          dueDate: date, accountId: acctId, recurring: recurring, completedTransactionId: null,
          createdAt: now, updatedAt: now
        });
      }
      plan.updatedAt = now;
    });
    if (!MONEY_STORE.save()) {
      MONEY_STORE.importData(snap);
      el.querySelector('#pe-e-amt').textContent = 'Ошибка сохранения';
      return;
    }
    _closeExpSheet();
  }

  function _doMarkExpenseDone(itemId) {
    var plan = _getPlan(_currentMonth);
    var item = _findExpenseItem(plan, itemId);
    if (!item) return;
    if (item.completedTransactionId && _findTx(item.completedTransactionId)) return;
    var snap = MONEY_STORE.exportData();
    var now = new Date(); var txId = MONEY_STORE.createId();
    MONEY_STORE.update(function (s) {
      s.transactions.push({
        id: txId, type: 'expense', title: item.title, amountMinor: item.amountMinor,
        localDate: item.dueDate || _localDate(), accountId: item.accountId || null,
        toAccountId: null, category: item.category || null, note: '', quickExpenseId: null,
        createdAt: now.toISOString(), updatedAt: now.toISOString()
      });
      for (var i = 0; i < s.monthlyPlans.length; i++) {
        if (s.monthlyPlans[i].month !== _currentMonth) continue;
        for (var j = 0; j < s.monthlyPlans[i].mandatoryExpenses.length; j++) {
          if (s.monthlyPlans[i].mandatoryExpenses[j].id === itemId) {
            s.monthlyPlans[i].mandatoryExpenses[j].completedTransactionId = txId;
            s.monthlyPlans[i].mandatoryExpenses[j].updatedAt = now.toISOString();
          }
        }
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
  }

  function _doDeleteExpense(itemId) {
    if (!confirm('Удалить обязательный расход?')) return;
    var snap = MONEY_STORE.exportData();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < s.monthlyPlans.length; i++) {
        if (s.monthlyPlans[i].month !== _currentMonth) continue;
        s.monthlyPlans[i].mandatoryExpenses = s.monthlyPlans[i].mandatoryExpenses.filter(function (x) { return x.id !== itemId; });
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
  }

  // ─── Investment plan sheet ─────────────────────────────────────────────────
  function openInvestSheet() {
    var el = _ensureInvSheet();
    var plan = _getPlan(_currentMonth);
    var cur = plan ? (plan.plannedInvestmentMinor || 0) : 0;
    var inp = el.querySelector('#piv-f-amt');
    inp.value = cur ? Math.round(cur / 100) : '';
    el.querySelector('#piv-e-amt').textContent = '';
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { inp.focus(); }, 80);
  }

  function _closeInvSheet() {
    if (_invSheetEl) _invSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function _ensureInvSheet() {
    if (_invSheetEl) return _invSheetEl;
    var el = document.createElement('div');
    el.id = 'plan-inv-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h">Инвестиционный план</h2>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="piv-f-amt">Сумма на месяц, ₽</label>'
      + '<input class="mn-sheet-inp" id="piv-f-amt" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="piv-e-amt"></span></div>'
      + '<button class="mn-sheet-save" type="button" id="piv-save-btn">Сохранить</button>'
      + '<button class="mn-sheet-cancel" type="button" id="piv-cancel-btn">Отмена</button>'
      + '</div>';
    document.body.appendChild(el);
    _invSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeInvSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeInvSheet);
    el.querySelector('#piv-cancel-btn').addEventListener('click', _closeInvSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeInvSheet(); });
    el.querySelector('#piv-save-btn').addEventListener('click', function () {
      var v = parseAmount(el.querySelector('#piv-f-amt').value);
      if (v === null) { el.querySelector('#piv-e-amt').textContent = 'Введите сумму больше 0'; return; }
      var snap = MONEY_STORE.exportData();
      var now = new Date().toISOString();
      MONEY_STORE.update(function (s) {
        var plan = _ensurePlanInState(s, _currentMonth);
        plan.plannedInvestmentMinor = v;
        plan.updatedAt = now;
      });
      if (!MONEY_STORE.save()) { MONEY_STORE.importData(snap); return; }
      _closeInvSheet();
    });
    return el;
  }

  // ─── Transfer recurring ────────────────────────────────────────────────────
  function _doTransferRecurring() {
    var recurr = _getRecurringFromPrev(_currentMonth);
    if (!recurr.incomes.length && !recurr.expenses.length) return;
    var snap = MONEY_STORE.exportData();
    var now = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      var plan = _ensurePlanInState(s, _currentMonth);
      // Guard: if plan already has items, skip (prevents double transfer)
      if (plan.plannedIncomes.length > 0 || plan.mandatoryExpenses.length > 0) return;
      recurr.incomes.forEach(function (src) {
        plan.plannedIncomes.push({
          id: MONEY_STORE.createId(), title: src.title, amountMinor: src.amountMinor,
          dueDate: _adjustDueDate(src.dueDate, _currentMonth),
          accountId: src.accountId, recurring: true,
          completedTransactionId: null, createdAt: now, updatedAt: now
        });
      });
      recurr.expenses.forEach(function (src) {
        plan.mandatoryExpenses.push({
          id: MONEY_STORE.createId(), title: src.title, category: src.category,
          amountMinor: src.amountMinor, dueDate: _adjustDueDate(src.dueDate, _currentMonth),
          accountId: src.accountId, recurring: true,
          completedTransactionId: null, createdAt: now, updatedAt: now
        });
      });
      plan.updatedAt = now;
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
  }

  // ─── Goal allocation sheet ─────────────────────────────────────────────────
  function openGoalAllocSheet(allocId) {
    var el = _ensureGoalAllocSheet();
    var plan = _getPlan(_currentMonth);
    var alloc = null;
    if (allocId && plan) {
      var gas = plan.goalAllocations || [];
      for (var i = 0; i < gas.length; i++) { if (gas[i].id === allocId) { alloc = gas[i]; break; } }
    }
    el.dataset.editId = alloc ? alloc.id : '';
    el.querySelector('#pga-h').textContent = alloc ? 'Редактировать взнос на цель' : 'Плановый взнос на цель';
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });

    var goalSel = el.querySelector('#pga-f-goal');
    var goals = MONEY_STORE.getState().goals || [];
    var existingGoalIds = {};
    if (plan && !alloc) {
      (plan.goalAllocations || []).forEach(function (ga) { existingGoalIds[ga.goalId] = true; });
    }
    var opts = '<option value="">— выберите цель —</option>';
    // If editing and goal is no longer active, include it
    if (alloc && alloc.goalId) {
      var allocGoal = _findGoalById(alloc.goalId);
      if (allocGoal && allocGoal.status !== 'active') {
        opts += '<option value="' + esc(allocGoal.id) + '" selected>' + esc(allocGoal.name)
          + (allocGoal.status === 'archived' ? ' (В архиве)' : ' (Завершена)') + '</option>';
      }
    }
    for (var j = 0; j < goals.length; j++) {
      var g = goals[j];
      if (g.status !== 'active') continue;
      if (!alloc && existingGoalIds[g.id]) continue;
      opts += '<option value="' + esc(g.id) + '"' + (alloc && alloc.goalId === g.id ? ' selected' : '') + '>'
        + esc(g.name) + '</option>';
    }
    goalSel.innerHTML = opts;
    if (alloc) goalSel.value = alloc.goalId;
    goalSel.disabled = !!alloc;

    el.querySelector('#pga-f-amt').value = alloc ? String(Math.round(alloc.amountMinor / 100)) : '';
    el.querySelector('#pga-del-btn').style.display = alloc ? '' : 'none';
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { el.querySelector('#pga-f-amt').focus(); }, 80);
  }

  function _closeGoalAllocSheet() {
    if (_goalAllocSheetEl) _goalAllocSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function _ensureGoalAllocSheet() {
    if (_goalAllocSheetEl) return _goalAllocSheetEl;
    var el = document.createElement('div');
    el.id = 'plan-goal-alloc-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<h2 class="mn-sheet-h" id="pga-h">Плановый взнос на цель</h2>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pga-f-goal">Цель</label>'
      + '<select class="mn-sheet-sel" id="pga-f-goal"></select>'
      + '<span class="mn-sheet-err" id="pga-e-goal"></span></div>'
      + '<div class="mn-sheet-row"><label class="mn-sheet-lbl" for="pga-f-amt">Плановая сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="pga-f-amt" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      + '<span class="mn-sheet-err" id="pga-e-amt"></span></div>'
      + '<button class="mn-sheet-save" type="button" id="pga-save-btn">Сохранить</button>'
      + '<button class="mn-sheet-save plan-del-btn" type="button" id="pga-del-btn" style="display:none">Убрать из плана</button>'
      + '<button class="mn-sheet-cancel" type="button" id="pga-cancel-btn">Отмена</button>'
      + '</div>';
    document.body.appendChild(el);
    _goalAllocSheetEl = el;
    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeGoalAllocSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeGoalAllocSheet);
    el.querySelector('#pga-cancel-btn').addEventListener('click', _closeGoalAllocSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') _closeGoalAllocSheet(); });
    el.querySelector('#pga-save-btn').addEventListener('click', function () { _doSaveGoalAlloc(el); });
    el.querySelector('#pga-del-btn').addEventListener('click', function () {
      var id = el.dataset.editId;
      if (id) { _closeGoalAllocSheet(); _doDeleteGoalAlloc(id); }
    });
    return el;
  }

  function _doSaveGoalAlloc(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    var goalId = el.querySelector('#pga-f-goal').value;
    var amt = parseAmount(el.querySelector('#pga-f-amt').value);
    var editId = el.dataset.editId || '';
    var ok = true;
    if (!goalId) { el.querySelector('#pga-e-goal').textContent = 'Выберите цель'; ok = false; }
    if (amt === null) { el.querySelector('#pga-e-amt').textContent = 'Введите сумму больше 0'; ok = false; }
    if (!ok) return;
    var snap = MONEY_STORE.exportData();
    var now = new Date().toISOString();
    MONEY_STORE.update(function (s) {
      var plan = _ensurePlanInState(s, _currentMonth);
      if (!plan.goalAllocations) plan.goalAllocations = [];
      if (editId) {
        for (var i = 0; i < plan.goalAllocations.length; i++) {
          if (plan.goalAllocations[i].id === editId) {
            plan.goalAllocations[i].amountMinor = amt;
            plan.goalAllocations[i].updatedAt = now;
            break;
          }
        }
      } else {
        plan.goalAllocations.push({
          id: MONEY_STORE.createId(), goalId: goalId,
          amountMinor: amt, createdAt: now, updatedAt: now
        });
      }
      plan.updatedAt = now;
    });
    if (!MONEY_STORE.save()) {
      MONEY_STORE.importData(snap);
      el.querySelector('#pga-e-amt').textContent = 'Ошибка сохранения';
      return;
    }
    _closeGoalAllocSheet();
  }

  function _doDeleteGoalAlloc(allocId) {
    if (!confirm('Убрать цель из плана месяца?')) return;
    var snap = MONEY_STORE.exportData();
    MONEY_STORE.update(function (s) {
      for (var i = 0; i < s.monthlyPlans.length; i++) {
        if (s.monthlyPlans[i].month !== _currentMonth) continue;
        s.monthlyPlans[i].goalAllocations = (s.monthlyPlans[i].goalAllocations || [])
          .filter(function (ga) { return ga.id !== allocId; });
        break;
      }
    });
    if (!MONEY_STORE.save()) MONEY_STORE.importData(snap);
  }

  // ─── Reactivity ────────────────────────────────────────────────────────────
  function _isPlanActive() {
    var p = document.querySelector('[data-page="money-plan"]');
    return p && p.classList.contains('active');
  }

  function _observePlanPage() {
    var page = document.querySelector('[data-page="money-plan"]');
    if (!page || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (page.classList.contains('active')) renderPlanPage();
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  MONEY_STORE.subscribe(function () {
    if (_isPlanActive()) renderPlanPage();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      _observePlanPage();
      if (_isPlanActive()) renderPlanPage();
    });
  } else {
    _observePlanPage();
    if (_isPlanActive()) renderPlanPage();
  }

  window.MONEY_PLAN = { render: renderPlanPage };

}());
