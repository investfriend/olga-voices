/* assets/money.js v4 — Мои деньги: Stage 1 (unified iv_money storage) */
(function () {
  'use strict';

  // ─── Storage — delegates to MONEY_STORE (money-store.js) ──────────────────
  function genId() { return MONEY_STORE.createId(); }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function fmtRub(amountMinor) {
    var r = Math.round(amountMinor / 100);
    return r.toLocaleString('ru-RU') + ' ₽';
  }

  function localDate(d) {
    var dt = d || new Date();
    return dt.getFullYear() + '-'
      + ('0' + (dt.getMonth() + 1)).slice(-2) + '-'
      + ('0' + dt.getDate()).slice(-2);
  }

  function thisMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  var _MONTHS_NOM = ['январь','февраль','март','апрель','май','июнь',
                     'июль','август','сентябрь','октябрь','ноябрь','декабрь'];

  function thisMonthName() {
    return _MONTHS_NOM[new Date().getMonth()];
  }

  function todayCount(quickExpenseId) {
    var t = localDate(), n = 0;
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.quickExpenseId === quickExpenseId && tx.localDate === t) n++;
    }
    return n;
  }

  function monthExpenses() {
    var m = thisMonth(), total = 0;
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.type === 'expense' && tx.localDate && tx.localDate.slice(0, 7) === m) {
        total += tx.amountMinor;
      }
    }
    return total;
  }

  function monthInvested() {
    var m = thisMonth(), total = 0;
    var txns = MONEY_STORE.getState().transactions;
    for (var i = 0; i < txns.length; i++) {
      var tx = txns[i];
      if (tx.type === 'investment' && tx.localDate && tx.localDate.slice(0, 7) === m) {
        total += tx.amountMinor;
      }
    }
    return total;
  }

  function currentPlan() {
    var m = thisMonth();
    var plans = MONEY_STORE.getState().monthlyPlans;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].month === m) return plans[i];
    }
    return null;
  }

  function activeTemplates() {
    return MONEY_STORE.getState().quickExpenses.filter(function (t) { return t.active !== false; });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function nraz(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'раз';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'раза';
    return 'раз';
  }

  // ─── Icons ─────────────────────────────────────────────────────────────────
  var _WIC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,72H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,64V192a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H56a8,8,0,0,1,0-16H216Zm0-32H56V88H216Zm-28-36a12,12,0,1,1-12-12A12,12,0,0,1,188,132Z"/></svg>';
  var _CIC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg>';

  // Phosphor ChartLine — used for investment operations in history
  var _INVEST_IC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,40,179.31V200H224A8,8,0,0,1,232,208Z"/></svg>';

  var CATS = ['Продукты','Кафе и рестораны','Транспорт','Бензин','ЖКХ','Здоровье','Покупки','Другое'];

  var _IPATHS = {
    'Продукты':
      'M222,56H166V40a10,10,0,0,0-10-10H100A10,10,0,0,0,90,40V56H34A14,14,0,0,0,20,70V200a14,14,0,0,0,14,14H222a14,14,0,0,0,14-14V70A14,14,0,0,0,222,56ZM102,42h52V56H102Zm122,158a2,2,0,0,1-2,2H34a2,2,0,0,1-2-2V70a2,2,0,0,1,2-2H222a2,2,0,0,1,2,2Z',
    'Кафе и рестораны':
      'M80,224a8,8,0,0,1-8-8V168H56a8,8,0,0,1-8-8V40a8,8,0,0,1,16,0V104h8V40a8,8,0,0,1,16,0V104h8V40a8,8,0,0,1,16,0v128a8,8,0,0,1-8,8H88v80A8,8,0,0,1,80,224Zm128-40V40a8,8,0,0,0-8-8,56.06,56.06,0,0,0-56,56v56a8,8,0,0,0,8,8h48v64a8,8,0,0,0,16,0Z',
    'Транспорт':
      'M240,112H229.2L210.45,65.6A16.07,16.07,0,0,0,195.7,56H60.3A16.07,16.07,0,0,0,45.55,65.6L26.8,112H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16V192h96v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V128h8a8,8,0,0,0,0-16ZM60.3,72H195.7l16,40H44.3ZM64,208H40V192H64Zm128,0V192h24v16Zm24-32H40V128H216ZM80,168a8,8,0,1,1-8-8A8,8,0,0,1,80,168Zm112,0a8,8,0,1,1-8-8A8,8,0,0,1,192,168Z',
    'Бензин':
      'M108,88h40a8,8,0,0,0,0-16H108a8,8,0,0,0,0,16ZM224,72l-25.37-25.37A8,8,0,0,0,187.31,58L208,78.63V96a16,16,0,0,0,16,16h8v88a8,8,0,0,1-16,0V168a24,24,0,0,0-24-24H184V64A24,24,0,0,0,160,40H96A24,24,0,0,0,72,64V224H48a8,8,0,0,0,0,16H208a8,8,0,0,0,0-16H184V160h8a8,8,0,0,1,8,8v32a24,24,0,0,0,48,0V96A16,16,0,0,0,224,72ZM88,64a8,8,0,0,1,8-8h64a8,8,0,0,1,8,8V160H88Z',
    'ЖКХ':
      'M218.83,103.77l-80-75.48a1.14,1.14,0,0,1-.11-.11,16,16,0,0,0-21.53,0l-.11.11L37.17,103.77A16,16,0,0,0,32,115.55V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V160h32v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V115.55A16,16,0,0,0,218.83,103.77ZM208,208H160V160a16,16,0,0,0-16-16H112a16,16,0,0,0-16,16v48H48V115.55l80-75.47,80,75.47Z',
    'Здоровье':
      'M178,28c-20.09,0-37.92,7.93-50,21.56C115.92,35.93,98.09,28,78,28A70.08,70.08,0,0,0,8,98c0,72.34,105.81,168.14,109.25,171.8a16,16,0,0,0,21.5,0C142.19,266.14,248,170.34,248,98A70.08,70.08,0,0,0,178,28Z',
    'Покупки':
      'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z',
    'Другое':
      'M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Z'
  };

  function catSvg(cat) {
    var p = _IPATHS[cat] || _IPATHS['Другое'];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + p + '"/></svg>';
  }

  // ─── Template button HTML ─────────────────────────────────────────────────
  function tmplHtml(t) {
    var cnt = todayCount(t.id);
    return '<button class="mn-tmpl-btn" type="button" data-tid="' + esc(t.id) + '"'
      + ' aria-label="Добавить расход ' + esc(t.name) + ', '
      + Math.round(t.amountMinor / 100).toLocaleString('ru-RU') + ' рублей">'
      + '<span class="mn-tmpl-ic">' + catSvg(t.category) + '</span>'
      + '<span class="mn-tmpl-name">' + esc(t.name) + '</span>'
      + '<span class="mn-tmpl-cta">+ Добавить ' + fmtRub(t.amountMinor) + '</span>'
      + (cnt > 0
        ? '<span class="mn-tmpl-today">Сегодня:&nbsp;' + cnt + '&nbsp;' + nraz(cnt) + '</span>'
        : '')
      + '</button>';
  }

  // ─── Entry card ────────────────────────────────────────────────────────────
  function renderMoneyCard() {
    var el = document.getElementById('hp-money');
    if (!el) return;
    el.innerHTML =
      '<button class="mn-home-card" type="button" aria-label="Перейти в раздел Мои деньги">'
      + '<span class="mn-home-ic" aria-hidden="true">' + _WIC + '</span>'
      + '<span class="mn-home-body">'
      + '<span class="mn-home-title">Мои деньги</span>'
      + '<span class="mn-home-desc">Доходы, расходы, цели и личный финансовый план</span>'
      + '</span>'
      + '<span class="mn-home-arr" aria-hidden="true">' + _CIC + '</span>'
      + '</button>';
    el.querySelector('.mn-home-card').onclick = function () {
      if (window.setPage) setPage('money');
    };
  }

  // ─── Investment block ──────────────────────────────────────────────────────
  function renderInvestBlock() {
    var wrap = document.getElementById('mn-invest-wrap');
    if (!wrap) return;
    var plan = currentPlan();
    var invested = monthInvested();
    var html = '<div class="mn-invest-block">'
      + '<div class="mn-invest-label">ИНВЕСТИРОВАНИЕ</div>';

    if (!plan) {
      html += '<div class="mn-invest-empty-h">Запланируйте инвестиции на&nbsp;этот&nbsp;месяц</div>'
        + '<p class="mn-invest-empty-p">Укажите сумму, которую планируете направить на формирование капитала</p>'
        + '<button class="mn-invest-plan-btn" type="button" id="mn-invest-open-plan">Запланировать сумму</button>';
    } else {
      var planAmt = plan.plannedInvestmentMinor;
      var remaining = Math.max(0, planAmt - invested);
      var pct = planAmt > 0 ? Math.min(Math.round(invested * 100 / planAmt), 100) : 0;
      html += '<div class="mn-invest-plan-row">'
        + '<span class="mn-invest-plan-lbl">План на ' + esc(thisMonthName()) + '</span>'
        + '<span class="mn-invest-plan-val">' + fmtRub(planAmt) + '</span>'
        + '</div>'
        + '<div class="mn-invest-progress-wrap">'
        + '<div class="mn-invest-progress-fill" style="width:' + pct + '%"></div>'
        + '</div>'
        + '<div class="mn-invest-stats">'
        + '<div class="mn-invest-stat">'
        + '<span class="mn-invest-stat-lbl">Инвестировано</span>'
        + '<span class="mn-invest-stat-val">' + (invested > 0 ? fmtRub(invested) : '—') + '</span>'
        + '</div>'
        + '<div class="mn-invest-stat mn-invest-stat--right">'
        + '<span class="mn-invest-stat-lbl">Осталось</span>'
        + '<span class="mn-invest-stat-val' + (remaining === 0 && invested > 0 ? ' mn-invest-stat-val--done' : '') + '">'
        + (remaining > 0 ? fmtRub(remaining) : (invested > 0 ? '0 ₽' : '—'))
        + '</span>'
        + '</div>'
        + '</div>'
        + '<button class="mn-invest-record-btn" type="button" id="mn-invest-open-record">Зафиксировать инвестирование</button>'
        + '<button class="mn-invest-change-btn" type="button" id="mn-invest-open-change">Изменить план</button>';
    }

    html += '</div>';
    wrap.innerHTML = html;

    var btnPlan = wrap.querySelector('#mn-invest-open-plan');
    if (btnPlan) btnPlan.addEventListener('click', openPlanSheet);
    var btnChange = wrap.querySelector('#mn-invest-open-change');
    if (btnChange) btnChange.addEventListener('click', openPlanSheet);
    var btnRecord = wrap.querySelector('#mn-invest-open-record');
    if (btnRecord) {
      btnRecord.addEventListener('click', function () {
        var p2 = currentPlan();
        var rem = p2 ? Math.max(0, p2.amountMinor - monthInvested()) : 0;
        openRecordSheet(rem);
      });
    }
  }

  // ─── Invest metric ─────────────────────────────────────────────────────────
  function updateInvestMetric() {
    var el = document.getElementById('mn-month-invest');
    if (!el) return;
    var total = monthInvested();
    el.textContent = total > 0 ? fmtRub(total) : '—';
  }

  // ─── Quick expenses block ──────────────────────────────────────────────────
  function renderQuickExpenses() {
    var wrap = document.getElementById('mn-quick-wrap');
    if (!wrap) return;
    var tmpls = activeTemplates();
    var shown = tmpls.slice(0, 6);
    var html = '<div class="mn-block-title">Быстрые расходы</div>';

    if (tmpls.length === 0) {
      html += '<div class="mn-quick-empty">'
        + '<p class="mn-quick-empty-text">Добавьте регулярные расходы,<br>чтобы записывать их одним нажатием</p>'
        + '<button class="mn-quick-add-btn" type="button" id="mn-add-first">Добавить быстрый расход</button>'
        + '</div>';
    } else {
      html += '<p class="mn-quick-hint">Нажмите на карточку, чтобы добавить расход</p>'
        + '<div class="mn-quick-grid">';
      for (var i = 0; i < shown.length; i++) html += tmplHtml(shown[i]);
      html += '</div>';
      html += '<button class="mn-quick-link" type="button" id="mn-add-more">+ Добавить расход</button>';
    }

    wrap.innerHTML = html;

    var btn1 = wrap.querySelector('#mn-add-first');
    if (btn1) btn1.addEventListener('click', openSheet);
    var btn2 = wrap.querySelector('#mn-add-more');
    if (btn2) btn2.addEventListener('click', openSheet);
    var grid = wrap.querySelector('.mn-quick-grid');
    if (grid) grid.addEventListener('click', onGridClick);
  }

  // ─── Month metrics ─────────────────────────────────────────────────────────
  function updateExpensesMetric() {
    var el = document.getElementById('mn-month-expenses');
    if (!el) return;
    var total = monthExpenses();
    el.textContent = total > 0 ? fmtRub(total) : '—';
  }

  // ─── Operations sub-page ──────────────────────────────────────────────────
  function renderOpsPage() {
    var wrap = document.getElementById('mn-ops-content');
    if (!wrap) return;
    var tmpls = activeTemplates();
    var ops = MONEY_STORE.getState().transactions.slice().reverse();
    var html = '';

    html += '<div class="mn-block-title">Быстрые расходы</div>';
    if (tmpls.length === 0) {
      html += '<div class="mn-quick-empty">'
        + '<p class="mn-quick-empty-text">Добавьте регулярные расходы,<br>чтобы записывать их одним нажатием</p>'
        + '<button class="mn-quick-add-btn" type="button" id="mn-ops-add">Добавить быстрый расход</button>'
        + '</div>';
    } else {
      html += '<p class="mn-quick-hint">Нажмите на карточку, чтобы добавить расход</p>'
        + '<div class="mn-quick-grid mn-ops-grid">';
      for (var i = 0; i < tmpls.length; i++) html += tmplHtml(tmpls[i]);
      html += '</div>';
      html += '<button class="mn-quick-link" type="button" id="mn-ops-add-more">+ Добавить расход</button>';
    }

    var total = monthExpenses();
    html += '<div class="mn-ops-month-row">'
      + '<span class="mn-ops-month-lbl">Расходы за месяц</span>'
      + '<span class="mn-ops-month-val">' + (total > 0 ? fmtRub(total) : '—') + '</span>'
      + '</div>';

    if (ops.length === 0) {
      html += '<p class="mn-ops-hint">Нажмите на расход выше — он появится здесь</p>';
    } else {
      var groups = groupByDate(ops);
      for (var g = 0; g < groups.length; g++) {
        var grp = groups[g];
        html += '<div class="mn-ops-date">' + esc(fmtGroupDate(grp.date)) + '</div>';
        html += '<div class="mn-ops-group">';
        for (var k = 0; k < grp.items.length; k++) {
          var op = grp.items[k];
          var isInvest = op.type === 'investment';
          html += '<div class="mn-ops-row' + (isInvest ? ' mn-ops-row--invest' : '') + '">'
            + '<span class="mn-ops-row-ic">'
            + (isInvest ? _INVEST_IC : catSvg(op.category))
            + '</span>'
            + '<span class="mn-ops-row-body">'
            + '<span class="mn-ops-row-t">' + esc(op.title) + '</span>'
            + (isInvest
              ? '<span class="mn-ops-row-c mn-ops-row-c--invest">Инвестиции</span>'
              : '<span class="mn-ops-row-c">' + esc(op.category) + '</span>')
            + '</span>'
            + '<span class="mn-ops-row-amt' + (isInvest ? ' mn-ops-row-amt--invest' : '') + '">'
            + (isInvest ? '' : '−') + fmtRub(op.amountMinor)
            + '</span>'
            + '</div>';
        }
        html += '</div>';
      }
    }

    wrap.innerHTML = html;

    var a1 = wrap.querySelector('#mn-ops-add');
    if (a1) a1.addEventListener('click', openSheet);
    var a2 = wrap.querySelector('#mn-ops-add-more');
    if (a2) a2.addEventListener('click', openSheet);
    var grid = wrap.querySelector('.mn-ops-grid');
    if (grid) grid.addEventListener('click', onGridClick);
  }

  function groupByDate(ops) {
    var groups = [], map = {};
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      var key = op.localDate || '?';
      if (!map[key]) { map[key] = []; groups.push({ date: key, items: map[key] }); }
      map[key].push(op);
    }
    return groups;
  }

  function fmtGroupDate(dateStr) {
    if (dateStr === localDate()) return 'Сегодня';
    if (dateStr === '?') return 'Неизвестная дата';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    var MONTHS = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря'];
    return parseInt(parts[2], 10) + ' ' + (MONTHS[parseInt(parts[1], 10) - 1] || '');
  }

  // ─── Add expense operation ─────────────────────────────────────────────────
  var _busy = false;

  function onGridClick(e) {
    var btn = e.target.closest('.mn-tmpl-btn');
    if (!btn) return;
    if (_busy) return;
    _busy = true;
    setTimeout(function () { _busy = false; }, 300);

    var tid = btn.dataset.tid;
    var tmpl = null;
    var qe = MONEY_STORE.getState().quickExpenses;
    for (var i = 0; i < qe.length; i++) {
      if (qe[i].id === tid) { tmpl = qe[i]; break; }
    }
    if (!tmpl) return;

    var now = new Date();
    var tx = {
      id: genId(),
      type: 'expense',
      quickExpenseId: tmpl.id,
      title: tmpl.name,
      category: tmpl.category,
      amountMinor: tmpl.amountMinor,
      localDate: localDate(now),
      accountId: null,
      toAccountId: null,
      note: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    MONEY_STORE.update(function (s) { s.transactions.push(tx); });
    MONEY_STORE.save();
    _lastOpId = tx.id;
    refresh();
    showToast(tmpl.name + ', ' + fmtRub(tmpl.amountMinor) + ' добавлено');
  }

  // ─── Add investment operation ──────────────────────────────────────────────
  function addInvestmentOp(amountMinor) {
    var now = new Date();
    var tx = {
      id: genId(),
      type: 'investment',
      title: 'Инвестирование',
      category: null,
      amountMinor: amountMinor,
      localDate: localDate(now),
      accountId: null,
      toAccountId: null,
      note: '',
      quickExpenseId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    MONEY_STORE.update(function (s) { s.transactions.push(tx); });
    MONEY_STORE.save();
    _lastOpId = tx.id;
    refresh();
    showToast('В инвестиции добавлено ' + fmtRub(amountMinor));
  }

  function refresh() {
    updateExpensesMetric();
    updateInvestMetric();
    renderInvestBlock();
    renderQuickExpenses();
    renderOpsPage();
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  var _toastEl = null;
  var _toastTimer = null;
  var _lastOpId = null;

  function ensureToast() {
    if (_toastEl) return _toastEl;
    var el = document.createElement('div');
    el.id = 'mn-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span id="mn-toast-msg"></span>'
      + '<button class="mn-toast-undo" type="button">Отменить</button>';
    el.querySelector('.mn-toast-undo').addEventListener('click', undoLast);
    document.body.appendChild(el);
    _toastEl = el;
    return el;
  }

  function showToast(msg) {
    var el = ensureToast();
    el.querySelector('#mn-toast-msg').textContent = msg;
    el.classList.add('mn-toast--show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    if (_toastEl) _toastEl.classList.remove('mn-toast--show');
  }

  function undoLast() {
    if (!_lastOpId) return;
    var oid = _lastOpId;
    MONEY_STORE.update(function (s) {
      var idx = -1;
      for (var i = 0; i < s.transactions.length; i++) {
        if (s.transactions[i].id === oid) { idx = i; break; }
      }
      if (idx !== -1) s.transactions.splice(idx, 1);
    });
    MONEY_STORE.save();
    _lastOpId = null;
    clearTimeout(_toastTimer);
    hideToast();
    refresh();
  }

  // ─── Expense template sheet ────────────────────────────────────────────────
  var _sheetEl = null;

  function openSheet() {
    var el = ensureSheet();
    el.querySelector('#mn-f-name').value = '';
    el.querySelector('#mn-f-cat').value = CATS[0];
    el.querySelector('#mn-f-custom').value = '';
    el.querySelector('#mn-f-custom-row').style.display = 'none';
    el.querySelector('#mn-f-amt').value = '';
    el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
    el.querySelector('#mn-sheet-save').disabled = true;
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { el.querySelector('#mn-f-name').focus(); }, 80);
  }

  function closeSheet() {
    if (!_sheetEl) return;
    _sheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function ensureSheet() {
    if (_sheetEl) return _sheetEl;

    var el = document.createElement('div');
    el.id = 'mn-add-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'mn-sheet-h');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>'
      + '</button>'
      + '<h2 class="mn-sheet-h" id="mn-sheet-h">Новый быстрый расход</h2>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="mn-f-name">Название</label>'
      + '<input class="mn-sheet-inp" id="mn-f-name" type="text" placeholder="Например: Кофе" maxlength="40" autocomplete="off">'
      + '<span class="mn-sheet-err" id="mn-e-name"></span>'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="mn-f-cat">Категория</label>'
      + '<select class="mn-sheet-sel" id="mn-f-cat">'
      + CATS.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('')
      + '</select>'
      + '</div>'
      + '<div class="mn-sheet-row" id="mn-f-custom-row" style="display:none">'
      + '<label class="mn-sheet-lbl" for="mn-f-custom">Своя категория</label>'
      + '<input class="mn-sheet-inp" id="mn-f-custom" type="text" placeholder="Название" maxlength="30" autocomplete="off">'
      + '<span class="mn-sheet-err" id="mn-e-custom"></span>'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="mn-f-amt">Обычная сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="mn-f-amt" type="number" inputmode="numeric" min="1" max="999999" step="1" placeholder="0">'
      + '<span class="mn-sheet-err" id="mn-e-amt"></span>'
      + '</div>'
      + '<button class="mn-sheet-save" type="button" id="mn-sheet-save" disabled>Сохранить</button>'
      + '</div>';

    document.body.appendChild(el);
    _sheetEl = el;

    var nameInp   = el.querySelector('#mn-f-name');
    var catSel    = el.querySelector('#mn-f-cat');
    var customRow = el.querySelector('#mn-f-custom-row');
    var customInp = el.querySelector('#mn-f-custom');
    var amtInp    = el.querySelector('#mn-f-amt');
    var saveBtn   = el.querySelector('#mn-sheet-save');

    el.querySelector('.mn-sheet-bd').addEventListener('click', closeSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', closeSheet);
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

    catSel.addEventListener('change', function () {
      customRow.style.display = catSel.value === 'Другое' ? '' : 'none';
      validate();
    });
    [nameInp, amtInp, customInp].forEach(function (inp) { inp.addEventListener('input', validate); });
    saveBtn.addEventListener('click', function () { if (doSave()) closeSheet(); });

    function validate() {
      var name = nameInp.value.trim();
      var amt  = parseInt(amtInp.value, 10);
      var cust = customInp.value.trim();
      var ok = name.length > 0 && !isNaN(amt) && amt >= 1;
      if (catSel.value === 'Другое') ok = ok && cust.length > 0;
      saveBtn.disabled = !ok;
    }

    function doSave() {
      el.querySelectorAll('.mn-sheet-err').forEach(function (e) { e.textContent = ''; });
      var name  = nameInp.value.trim();
      var cat   = catSel.value;
      var cust  = customInp.value.trim();
      var amt   = parseInt(amtInp.value, 10);
      var err = false;
      if (!name) { el.querySelector('#mn-e-name').textContent = 'Укажите название'; err = true; }
      if (cat === 'Другое' && !cust) { el.querySelector('#mn-e-custom').textContent = 'Укажите название'; err = true; }
      if (!amtInp.value || isNaN(amt) || amt < 1) { el.querySelector('#mn-e-amt').textContent = 'Введите сумму больше 0'; err = true; }
      if (err) return false;
      var now = new Date();
      MONEY_STORE.update(function (s) {
        s.quickExpenses.push({
          id: genId(),
          name: name,
          category: cat === 'Другое' ? cust : cat,
          amountMinor: amt * 100,
          accountId: null,
          active: true,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      });
      MONEY_STORE.save();
      renderQuickExpenses();
      renderOpsPage();
      return true;
    }

    return el;
  }

  // ─── Investment plan sheet ─────────────────────────────────────────────────
  var _planSheetEl = null;

  function openPlanSheet() {
    var el = ensurePlanSheet();
    var plan = currentPlan();
    var inp = el.querySelector('#mn-pi-amt');
    inp.value = plan ? Math.round(plan.amountMinor / 100) : '';
    el.querySelector('#mn-pi-err').textContent = '';
    var v = parseInt(inp.value, 10);
    el.querySelector('#mn-pi-save').disabled = isNaN(v) || v < 1;
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { inp.focus(); }, 80);
  }

  function closePlanSheet() {
    if (!_planSheetEl) return;
    _planSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function ensurePlanSheet() {
    if (_planSheetEl) return _planSheetEl;

    var el = document.createElement('div');
    el.id = 'mn-plan-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>'
      + '</button>'
      + '<h2 class="mn-sheet-h">План инвестирования</h2>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="mn-pi-amt">Сумма на месяц, ₽</label>'
      + '<input class="mn-sheet-inp" id="mn-pi-amt" type="number" inputmode="numeric" min="1" max="99999999" step="1" placeholder="0">'
      + '<span class="mn-sheet-err" id="mn-pi-err"></span>'
      + '</div>'
      + '<button class="mn-sheet-save" type="button" id="mn-pi-save" disabled>Сохранить</button>'
      + '<button class="mn-sheet-cancel" type="button" id="mn-pi-cancel">Отмена</button>'
      + '</div>';

    document.body.appendChild(el);
    _planSheetEl = el;

    var amtInp = el.querySelector('#mn-pi-amt');
    var saveBtn = el.querySelector('#mn-pi-save');

    el.querySelector('.mn-sheet-bd').addEventListener('click', closePlanSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', closePlanSheet);
    el.querySelector('#mn-pi-cancel').addEventListener('click', closePlanSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePlanSheet(); });

    amtInp.addEventListener('input', function () {
      var v = parseInt(amtInp.value, 10);
      saveBtn.disabled = isNaN(v) || v < 1;
      el.querySelector('#mn-pi-err').textContent = '';
    });

    saveBtn.addEventListener('click', function () {
      var v = parseInt(amtInp.value, 10);
      if (isNaN(v) || v < 1) {
        el.querySelector('#mn-pi-err').textContent = 'Введите сумму больше 0';
        return;
      }
      var month = thisMonth();
      MONEY_STORE.update(function (s) {
        var existing = null;
        for (var j = 0; j < s.monthlyPlans.length; j++) {
          if (s.monthlyPlans[j].month === month) { existing = s.monthlyPlans[j]; break; }
        }
        var ts = new Date().toISOString();
        if (existing) {
          existing.plannedInvestmentMinor = v * 100;
          existing.updatedAt = ts;
        } else {
          s.monthlyPlans.push({
            id: 'mp_' + month.replace('-', ''),
            month: month,
            plannedIncomes: [],
            mandatoryExpenses: [],
            plannedInvestmentMinor: v * 100,
            goalAllocations: [],
            createdAt: ts,
            updatedAt: ts
          });
        }
      });
      MONEY_STORE.save();
      closePlanSheet();
      refresh();
    });

    return el;
  }

  // ─── Investment record sheet ───────────────────────────────────────────────
  var _recordSheetEl = null;

  function openRecordSheet(prefillMinor) {
    var el = ensureRecordSheet();
    var inp = el.querySelector('#mn-ri-amt');
    inp.value = prefillMinor > 0 ? Math.round(prefillMinor / 100) : '';
    el.querySelector('#mn-ri-err').textContent = '';
    var v = parseInt(inp.value, 10);
    el.querySelector('#mn-ri-save').disabled = isNaN(v) || v < 1;
    el.querySelector('#mn-ri-date').textContent = fmtGroupDate(localDate());
    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { inp.focus(); }, 80);
  }

  function closeRecordSheet() {
    if (!_recordSheetEl) return;
    _recordSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
  }

  function ensureRecordSheet() {
    if (_recordSheetEl) return _recordSheetEl;

    var el = document.createElement('div');
    el.id = 'mn-record-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      + '<div class="mn-sheet-panel">'
      + '<button class="mn-sheet-x" type="button" aria-label="Закрыть">'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>'
      + '</button>'
      + '<h2 class="mn-sheet-h">Зафиксировать инвестирование</h2>'
      + '<div class="mn-sheet-row">'
      + '<label class="mn-sheet-lbl" for="mn-ri-amt">Сумма, ₽</label>'
      + '<input class="mn-sheet-inp" id="mn-ri-amt" type="number" inputmode="numeric" min="1" max="99999999" step="1" placeholder="0">'
      + '<span class="mn-sheet-err" id="mn-ri-err"></span>'
      + '</div>'
      + '<div class="mn-sheet-row">'
      + '<span class="mn-sheet-lbl">Дата</span>'
      + '<span class="mn-ri-date" id="mn-ri-date"></span>'
      + '</div>'
      + '<button class="mn-sheet-save" type="button" id="mn-ri-save" disabled>Сохранить</button>'
      + '</div>';

    document.body.appendChild(el);
    _recordSheetEl = el;

    var amtInp = el.querySelector('#mn-ri-amt');
    var saveBtn = el.querySelector('#mn-ri-save');

    el.querySelector('.mn-sheet-bd').addEventListener('click', closeRecordSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', closeRecordSheet);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeRecordSheet(); });

    amtInp.addEventListener('input', function () {
      var v = parseInt(amtInp.value, 10);
      saveBtn.disabled = isNaN(v) || v < 1;
      el.querySelector('#mn-ri-err').textContent = '';
    });

    saveBtn.addEventListener('click', function () {
      var v = parseInt(amtInp.value, 10);
      if (isNaN(v) || v < 1) {
        el.querySelector('#mn-ri-err').textContent = 'Введите сумму больше 0';
        return;
      }
      closeRecordSheet();
      addInvestmentOp(v * 100);
    });

    return el;
  }

  // ─── Re-render on page activation ─────────────────────────────────────────
  function observeMoneyPage() {
    var page = document.querySelector('[data-page="money"]');
    if (!page || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (page.classList.contains('active')) {
        updateExpensesMetric();
        updateInvestMetric();
        renderInvestBlock();
        renderQuickExpenses();
      }
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    var result = MONEY_STORE.load();
    renderMoneyCard();
    renderInvestBlock();
    renderQuickExpenses();
    updateExpensesMetric();
    updateInvestMetric();
    renderOpsPage();
    observeMoneyPage();
    if (result && !result.ok && result.error === 'storage_unavailable') {
      showToast('Хранилище недоступно — данные сохраняются только в памяти');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
