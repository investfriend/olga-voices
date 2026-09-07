/* assets/money-analytics.js v1 — Мои деньги: Аналитика (Stage 7) */
(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  var _period = '1'; // '1' | '3' | '6' | '12'

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function _thisMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  function _fmtRub(amountMinor) {
    var neg = amountMinor < 0;
    var abs = Math.abs(Math.round(amountMinor));
    var r = Math.floor(abs / 100);
    return (neg ? '−' : '') + r.toLocaleString('ru-RU') + ' ₽';
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var _MON_S = ['янв','фев','мар','апр','май','июн',
                'июл','авг','сен','окт','ноя','дек'];
  var _MON_G = ['января','февраля','марта','апреля','мая','июня',
                'июля','августа','сентября','октября','ноября','декабря'];

  function _fmtDate(d) {
    if (!d) return '';
    var p = d.split('-');
    if (p.length !== 3) return d;
    return (+p[2]) + ' ' + (_MON_G[+p[1] - 1] || '');
  }

  function _monthLabel(ym) {
    var p = ym.split('-');
    return _MON_S[+p[1] - 1] || ym;
  }

  // Oldest → newest array of YYYY-MM for the chosen period
  function _getMonths(period) {
    var arr = [], now = new Date(), n = parseInt(period, 10) || 1;
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2));
    }
    return arr;
  }

  // ─── Data ──────────────────────────────────────────────────────────────────

  function _txnsForMonths(months) {
    var set = {};
    months.forEach(function (m) { set[m] = true; });
    return (MONEY_STORE.getState().transactions || []).filter(function (tx) {
      return tx.localDate && set[tx.localDate.slice(0, 7)];
    });
  }

  function _computeTotals(txns) {
    var income = 0, expenses = 0, invested = 0;
    txns.forEach(function (tx) {
      if (tx.type === 'income')     income   += tx.amountMinor;
      if (tx.type === 'expense')    expenses += tx.amountMinor;
      if (tx.type === 'investment') invested += tx.amountMinor;
      // transfer: excluded per spec
    });
    return { income: income, expenses: expenses, invested: invested,
             netFlow: income - expenses - invested };
  }

  var _CAT_COLORS = [
    '#27c98a','#5277e0','#e09652','#9452e0',
    '#52c9c9','#e05252','#c9a827','#c95282'
  ];

  function _computeCategories(txns) {
    var map = {}, total = 0;
    txns.forEach(function (tx) {
      if (tx.type !== 'expense') return;
      var c = tx.category || 'Без категории';
      map[c] = (map[c] || 0) + tx.amountMinor;
      total += tx.amountMinor;
    });
    var arr = Object.keys(map).map(function (c) { return { cat: c, amount: map[c] }; });
    arr.sort(function (a, b) { return b.amount - a.amount; });
    arr.forEach(function (item, i) {
      item.pct  = total > 0 ? Math.round(item.amount * 100 / total) : 0;
      item.color = _CAT_COLORS[i % _CAT_COLORS.length];
    });
    return { categories: arr, total: total };
  }

  function _computeMonthlyData(months) {
    var txns = MONEY_STORE.getState().transactions || [];
    return months.map(function (month) {
      var inc = 0, exp = 0, inv = 0;
      txns.forEach(function (tx) {
        if (!tx.localDate || tx.localDate.slice(0, 7) !== month) return;
        if (tx.type === 'income')     inc += tx.amountMinor;
        if (tx.type === 'expense')    exp += tx.amountMinor;
        if (tx.type === 'investment') inv += tx.amountMinor;
      });
      return { month: month, income: inc, expenses: exp, invested: inv };
    });
  }

  function _topExpenses(txns) {
    var exps = txns.filter(function (tx) { return tx.type === 'expense'; });
    exps.sort(function (a, b) { return b.amountMinor - a.amountMinor; });
    return exps.slice(0, 5);
  }

  // Plan/fact — current month only, mirrors money-plan.js logic
  function _computePlanFact(month) {
    var s = MONEY_STORE.getState();
    var plan = null;
    (s.monthlyPlans || []).forEach(function (p) { if (p.month === month) plan = p; });
    if (!plan) return null;

    var txns = s.transactions || [];
    function findTx(id) {
      if (!id) return null;
      for (var i = 0; i < txns.length; i++) if (txns[i].id === id) return txns[i];
      return null;
    }

    // Income: planned = sum of items; fact = all income txns (matches money-plan.js totalIncome)
    var plannedIncome = 0;
    (plan.plannedIncomes || []).forEach(function (x) { plannedIncome += x.amountMinor; });
    var factIncome = 0;
    txns.forEach(function (tx) {
      if (tx.type === 'income' && tx.localDate && tx.localDate.slice(0, 7) === month)
        factIncome += tx.amountMinor;
    });

    // Mandatory expenses: planned = sum of items; fact = linked completed txns (paidExpense)
    var plannedExpenses = 0;
    (plan.mandatoryExpenses || []).forEach(function (x) { plannedExpenses += x.amountMinor; });
    var factExpenses = 0;
    (plan.mandatoryExpenses || []).forEach(function (item) {
      if (!item.completedTransactionId) return;
      var tx = findTx(item.completedTransactionId);
      if (tx && tx.type === 'expense' && tx.localDate && tx.localDate.slice(0, 7) === month)
        factExpenses += tx.amountMinor;
    });

    // Investment: planned vs all investment txns
    var plannedInvest = plan.plannedInvestmentMinor || 0;
    var factInvest = 0;
    txns.forEach(function (tx) {
      if (tx.type === 'investment' && tx.localDate && tx.localDate.slice(0, 7) === month)
        factInvest += tx.amountMinor;
    });

    // Goal contributions: planned vs verified contributions
    var goals = s.goals || [];
    function findGoal(id) {
      for (var i = 0; i < goals.length; i++) if (goals[i].id === id) return goals[i];
      return null;
    }
    function verifyContrib(c) {
      if (!c || c.mode !== 'transfer') return true; // manual always valid
      for (var i = 0; i < txns.length; i++) {
        var tx = txns[i];
        if (tx.id === c.transferTransactionId && tx.type === 'transfer'
            && tx.accountId === c.sourceAccountId && tx.toAccountId === c.destinationAccountId
            && tx.amountMinor === c.amountMinor && tx.localDate === c.localDate) return true;
      }
      return false;
    }
    var plannedGoals = 0;
    (plan.goalAllocations || []).forEach(function (a) { plannedGoals += a.amountMinor; });
    var factGoals = 0;
    (plan.goalAllocations || []).forEach(function (alloc) {
      var g = findGoal(alloc.goalId);
      if (!g) return;
      (g.contributions || []).forEach(function (c) {
        if (c.localDate && c.localDate.slice(0, 7) === month && verifyContrib(c))
          factGoals += c.amountMinor || 0;
      });
    });

    return {
      income:   { planned: plannedIncome,   fact: factIncome },
      expenses: { planned: plannedExpenses, fact: factExpenses },
      invest:   { planned: plannedInvest,   fact: factInvest },
      goals:    { planned: plannedGoals,    fact: factGoals }
    };
  }

  // ─── HTML builders ─────────────────────────────────────────────────────────

  function _periodSwitcherHtml() {
    return '<div class="an-period-sw">'
      + [['1','1 мес'],['3','3 мес'],['6','6 мес'],['12','12 мес']].map(function (p) {
          return '<button class="an-period-btn' + (_period === p[0] ? ' an-period-btn--on' : '')
            + '" type="button" data-period="' + p[0] + '">' + p[1] + '</button>';
        }).join('')
      + '</div>';
  }

  function _totalsHtml(totals, hasAny) {
    if (!hasAny) {
      return '<div class="an-card an-empty">'
        + '<p class="an-empty-txt">За этот период нет ни одной операции</p>'
        + '<button class="an-empty-cta" type="button" data-action="add-op">+ Добавить операцию</button>'
        + '</div>';
    }
    var neg = totals.netFlow < 0;
    var pos = totals.netFlow > 0;
    var netStr = neg ? '−' + _fmtRub(-totals.netFlow) : _fmtRub(totals.netFlow);
    var netCls = neg ? ' an-nf--neg' : (pos ? ' an-nf--pos' : '');
    return '<div class="an-card">'
      + '<div class="an-card-ttl">Итоги периода</div>'
      + '<div class="an-totals">'
      + _tcHtml('Доходы', totals.income, 'inc')
      + _tcHtml('Расходы', totals.expenses, 'exp')
      + _tcHtml('Инвестировано', totals.invested, 'inv')
      + '</div>'
      + '<div class="an-nf' + netCls + '">'
      + '<span class="an-nf-lbl">Чистый денежный поток</span>'
      + '<span class="an-nf-val">' + netStr + '</span>'
      + '</div>'
      + '</div>';
  }

  function _tcHtml(label, value, type) {
    return '<div class="an-tc an-tc--' + type + (value === 0 ? ' an-tc--zero' : '') + '">'
      + '<div class="an-tc-lbl">' + label + '</div>'
      + '<div class="an-tc-val">' + _fmtRub(value) + '</div>'
      + '</div>';
  }

  function _categoriesHtml(cats) {
    if (cats.categories.length === 0) {
      return '<div class="an-card">'
        + '<div class="an-card-ttl">Расходы по категориям</div>'
        + '<p class="an-empty-inner">Расходов за период нет</p>'
        + '</div>';
    }
    var rows = cats.categories.map(function (item) {
      var barW = cats.total > 0 ? (item.amount / cats.total * 100) : 0;
      return '<div class="an-cat-row">'
        + '<div class="an-cat-head">'
        + '<span class="an-cat-dot" style="background:' + item.color + '"></span>'
        + '<span class="an-cat-name">' + _esc(item.cat) + '</span>'
        + '<span class="an-cat-pct">' + item.pct + '%</span>'
        + '</div>'
        + '<div class="an-cat-track">'
        + '<div class="an-cat-fill" style="width:' + barW.toFixed(1) + '%;background:' + item.color + '"></div>'
        + '</div>'
        + '<div class="an-cat-amt">' + _fmtRub(item.amount) + '</div>'
        + '</div>';
    }).join('');
    return '<div class="an-card"><div class="an-card-ttl">Расходы по категориям</div>'
      + rows + '</div>';
  }

  var _CHART_H = 120; // px height of bars area

  function _barPx(value, maxVal) {
    if (value === 0 || maxVal === 0) return 0;
    return Math.max(2, Math.round(value / maxVal * _CHART_H));
  }

  function _monthlyChartHtml(data) {
    var maxVal = 0;
    data.forEach(function (m) {
      if (m.income   > maxVal) maxVal = m.income;
      if (m.expenses > maxVal) maxVal = m.expenses;
      if (m.invested > maxVal) maxVal = m.invested;
    });
    if (maxVal === 0) maxVal = 1;

    var cols = data.map(function (m) {
      var hI = _barPx(m.income,   maxVal);
      var hE = _barPx(m.expenses, maxVal);
      var hV = _barPx(m.invested, maxVal);
      return '<div class="an-col">'
        + '<div class="an-bars">'
        + '<div class="an-bar an-bar--inc" style="height:' + hI + 'px" aria-label="Доходы ' + _fmtRub(m.income) + '"></div>'
        + '<div class="an-bar an-bar--exp" style="height:' + hE + 'px" aria-label="Расходы ' + _fmtRub(m.expenses) + '"></div>'
        + '<div class="an-bar an-bar--inv" style="height:' + hV + 'px" aria-label="Инвестиции ' + _fmtRub(m.invested) + '"></div>'
        + '</div>'
        + '<div class="an-col-lbl">' + _monthLabel(m.month) + '</div>'
        + '</div>';
    }).join('');

    var legend = '<div class="an-legend">'
      + '<span class="an-leg"><span class="an-leg-dot" style="background:#27c98a"></span>Доходы</span>'
      + '<span class="an-leg"><span class="an-leg-dot" style="background:#e05252"></span>Расходы</span>'
      + '<span class="an-leg"><span class="an-leg-dot" style="background:#e09652"></span>Инвестиции</span>'
      + '</div>';

    return '<div class="an-card">'
      + '<div class="an-card-ttl">Динамика по месяцам</div>'
      + '<div class="an-chart-wrap">' + cols + '</div>'
      + legend + '</div>';
  }

  function _pfRowHtml(label, planned, fact) {
    var diff = fact - planned;
    var diffStr = '';
    var diffCls = '';
    if (diff > 0)      { diffStr = '+' + _fmtRub(diff); diffCls = 'an-pf-diff--pos'; }
    else if (diff < 0) { diffStr = '−' + _fmtRub(-diff); diffCls = 'an-pf-diff--neg'; }
    var pct = planned > 0 ? Math.min(Math.round(fact * 100 / planned), 100) : (fact > 0 ? 100 : 0);
    return '<div class="an-pf-row">'
      + '<div class="an-pf-head">'
      + '<span class="an-pf-lbl">' + _esc(label) + '</span>'
      + '<span class="an-pf-nums">'
      + '<span class="an-pf-fact">' + _fmtRub(fact) + '</span>'
      + ' <span class="an-pf-sep">из</span> '
      + '<span class="an-pf-plan">' + _fmtRub(planned) + '</span>'
      + (diffStr ? ' <span class="an-pf-diff ' + diffCls + '">' + diffStr + '</span>' : '')
      + '</span>'
      + '</div>'
      + '<div class="an-pf-track"><div class="an-pf-fill" style="width:' + pct + '%"></div></div>'
      + '</div>';
  }

  function _planFactHtml(pf) {
    if (!pf) {
      return '<div class="an-card">'
        + '<div class="an-card-ttl">План и факт</div>'
        + '<p class="an-empty-inner">Нет плана на текущий месяц. <button class="an-link-btn" data-action="go-plan">Настроить →</button></p>'
        + '</div>';
    }
    var html = '<div class="an-card"><div class="an-card-ttl">План и факт (текущий месяц)</div>';
    var hasRows = false;
    if (pf.income.planned > 0 || pf.income.fact > 0) {
      html += _pfRowHtml('Доходы', pf.income.planned, pf.income.fact);
      hasRows = true;
    }
    if (pf.expenses.planned > 0 || pf.expenses.fact > 0) {
      html += _pfRowHtml('Обязательные расходы', pf.expenses.planned, pf.expenses.fact);
      hasRows = true;
    }
    if (pf.invest.planned > 0 || pf.invest.fact > 0) {
      html += _pfRowHtml('Инвестиции', pf.invest.planned, pf.invest.fact);
      hasRows = true;
    }
    if (pf.goals.planned > 0 || pf.goals.fact > 0) {
      html += _pfRowHtml('Взносы на цели', pf.goals.planned, pf.goals.fact);
      hasRows = true;
    }
    if (!hasRows) {
      html += '<p class="an-empty-inner">В плане нет запланированных показателей. '
        + '<button class="an-link-btn" data-action="go-plan">Настроить →</button></p>';
    }
    return html + '</div>';
  }

  function _topExpensesHtml(exps) {
    if (exps.length === 0) {
      return '<div class="an-card">'
        + '<div class="an-card-ttl">Крупнейшие расходы</div>'
        + '<p class="an-empty-inner">Расходов за период нет</p>'
        + '</div>';
    }
    var accts = MONEY_STORE.getState().accounts || [];
    function findAcct(id) {
      for (var i = 0; i < accts.length; i++) if (accts[i].id === id) return accts[i];
      return null;
    }
    var rows = exps.map(function (tx) {
      var acct = tx.accountId ? findAcct(tx.accountId) : null;
      var acctHtml = acct
        ? _esc(acct.name) + (acct.archived ? ' <span class="an-badge-arch">архив</span>' : '')
        : '<span class="an-acct-none">Счёт не указан</span>';
      return '<div class="an-exp-row" data-tx-id="' + _esc(tx.id) + '" role="button" tabindex="0">'
        + '<div class="an-exp-body">'
        + '<span class="an-exp-title">' + _esc(tx.title || 'Без названия') + '</span>'
        + '<span class="an-exp-sub">' + _esc(tx.category || 'Без категории') + ' · ' + _fmtDate(tx.localDate) + ' · ' + acctHtml + '</span>'
        + '</div>'
        + '<div class="an-exp-amt">−' + _fmtRub(tx.amountMinor) + '</div>'
        + '</div>';
    }).join('');
    return '<div class="an-card"><div class="an-card-ttl">Крупнейшие расходы</div>'
      + rows + '</div>';
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  function renderPage() {
    var el = document.getElementById('mn-analytics-content');
    if (!el) return;

    var months  = _getMonths(_period);
    var txns    = _txnsForMonths(months);
    var totals  = _computeTotals(txns);
    var cats    = _computeCategories(txns);
    var topExps = _topExpenses(txns);
    var monthly = _period !== '1' ? _computeMonthlyData(months) : null;
    var pf      = _period === '1' ? _computePlanFact(_thisMonth()) : null;

    var html = _periodSwitcherHtml()
      + _totalsHtml(totals, txns.length > 0)
      + _categoriesHtml(cats)
      + (monthly ? _monthlyChartHtml(monthly) : '')
      + (_period === '1' ? _planFactHtml(pf) : '')
      + _topExpensesHtml(topExps);

    el.innerHTML = html;

    // Period switcher
    el.querySelectorAll('[data-period]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _period = btn.dataset.period;
        renderPage();
      });
    });

    // Empty state CTA
    var addOpBtn = el.querySelector('[data-action="add-op"]');
    if (addOpBtn) addOpBtn.addEventListener('click', function () {
      if (window.MONEY_OPS) MONEY_OPS.openAdd('expense');
    });

    // Go to plan button
    var planBtn = el.querySelector('[data-action="go-plan"]');
    if (planBtn) planBtn.addEventListener('click', function () {
      if (window.setPage) setPage('money-plan');
    });

    // Top expenses: edit on click
    el.querySelectorAll('[data-tx-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        if (window.MONEY_OPS) MONEY_OPS.openEdit(row.dataset.txId);
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (window.MONEY_OPS) MONEY_OPS.openEdit(row.dataset.txId);
        }
      });
    });
  }

  // ─── Reactivity ────────────────────────────────────────────────────────────

  function _isActive() {
    var p = document.querySelector('[data-page="money-analytics"]');
    return p && p.classList.contains('active');
  }

  function _observe() {
    var page = document.querySelector('[data-page="money-analytics"]');
    if (!page || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (page.classList.contains('active')) renderPage();
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    MONEY_STORE.subscribe(function () {
      if (_isActive()) renderPage();
    });
    _observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
