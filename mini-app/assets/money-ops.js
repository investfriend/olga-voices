/* assets/money-ops.js v1 — Мои деньги: Операции */
(function () {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────────────────
  var EXPENSE_CATS = ['Продукты','Кафе и рестораны','Транспорт','Бензин','ЖКХ','Здоровье','Покупки','Другое'];
  var INCOME_CATS  = ['Зарплата','Подработка','Проценты','Возврат','Подарок','Другое'];
  var TYPE_LABELS  = { income:'Доход', expense:'Расход', transfer:'Перевод', investment:'Инвестиции' };
  var MONTHS_NOM   = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var MONTHS_GEN   = ['января','февраля','марта','апреля','мая','июня',
                      'июля','августа','сентября','октября','ноября','декабря'];
  var CLOSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';
  var EDIT_SVG  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM192,108.68,147.31,64l24-24L216,84.68Z"/></svg>';
  var ARCH_SVG  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,48H32A16,16,0,0,0,16,64V88a16,16,0,0,0,8,13.83V200a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V101.83A16,16,0,0,0,240,88V64A16,16,0,0,0,224,48ZM32,64H224V88H32Zm176,136a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V104H208ZM96,152a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,152Z"/></svg>';
  var REST_SVG  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Zm-40,0a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z"/></svg>';
  var TRASH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>';

  // ─── Type icons (inline SVG, 256×256) ──────────────────────────────────────
  var IC = {
    income:     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z"/></svg>',
    expense:    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66A8,8,0,0,1,50.34,106.34l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"/></svg>',
    transfer:   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M24,128a8,8,0,0,1,8-8H196.69L165.66,88.69a8,8,0,0,1,11.32-11.32l48,48a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32-11.32L196.69,136H32A8,8,0,0,1,24,128Z"/></svg>',
    investment: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,40,179.31V200H224A8,8,0,0,1,232,208Z"/></svg>'
  };

  // ─── Utilities ─────────────────────────────────────────────────────────────
  function fmtRub(minor) {
    minor = Math.round(minor);
    var abs  = Math.abs(minor);
    var rub  = Math.floor(abs / 100);
    var kop  = abs % 100;
    var sign = minor < 0 ? '−' : '';
    var rubS = String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return sign + rubS + (kop ? ',' + ('0'+kop).slice(-2) : '') + ' ₽';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function parseAmount(s) {
    if (!s) return null;
    var v = parseFloat(String(s).trim().replace(/,/g,'.').replace(/\s/g,''));
    if (isNaN(v) || v <= 0) return null;
    return Math.round(v * 100);
  }

  function _localDate() {
    var d = new Date();
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  }

  function _thisMonth() {
    var d = new Date();
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
  }

  function _fmtMonth(yyyymm) {
    var p = yyyymm.split('-');
    return MONTHS_NOM[parseInt(p[1],10)-1] + ' ' + p[0];
  }

  function _fmtDate(dateStr) {
    var today = _localDate();
    if (!dateStr) return '?';
    if (dateStr === today) return 'Сегодня';
    var p = dateStr.split('-');
    if (p.length !== 3) return dateStr;
    return parseInt(p[2],10) + ' ' + (MONTHS_GEN[parseInt(p[1],10)-1] || '');
  }

  // ─── State ─────────────────────────────────────────────────────────────────
  var _currentMonth = _thisMonth();
  var _filter       = { type: 'all' };
  var _txSheetEl    = null;
  var _editingId    = null;
  var _acctPickerEl = null;
  var _pickerTpl    = null;
  var _tplMgrEl     = null;
  var _clickBound   = false;

  // ─── Data helpers ──────────────────────────────────────────────────────────
  function _getActiveAccts() {
    return MONEY_STORE.getState().accounts.filter(function(a){ return !a.archived; });
  }

  function _findAcct(id) {
    if (!id) return null;
    var accts = MONEY_STORE.getState().accounts;
    for (var i=0;i<accts.length;i++) if (accts[i].id===id) return accts[i];
    return null;
  }

  function _findTx(id) {
    var txns = MONEY_STORE.getState().transactions;
    for (var i=0;i<txns.length;i++) if (txns[i].id===id) return txns[i];
    return null;
  }

  function _calcSummary(txns) {
    var income=0, expense=0, investment=0;
    for (var i=0;i<txns.length;i++) {
      var tx=txns[i];
      if      (tx.type==='income')     income     += tx.amountMinor;
      else if (tx.type==='expense')    expense    += tx.amountMinor;
      else if (tx.type==='investment') investment += tx.amountMinor;
    }
    return { income:income, expense:expense, investment:investment };
  }

  function _getMonthTxns() {
    var all = MONEY_STORE.getState().transactions;
    return all.filter(function(tx){ return tx.localDate && tx.localDate.slice(0,7)===_currentMonth; });
  }

  function _applyFilter(txns) {
    if (_filter.type==='all') return txns;
    return txns.filter(function(tx){ return tx.type===_filter.type; });
  }

  function _groupByDate(txns) {
    var sorted = txns.slice().sort(function(a,b){
      if (a.localDate>b.localDate) return -1;
      if (a.localDate<b.localDate) return  1;
      if (a.createdAt>b.createdAt) return -1;
      if (a.createdAt<b.createdAt) return  1;
      return 0;
    });
    var groups=[], map={};
    for (var i=0;i<sorted.length;i++) {
      var key=sorted[i].localDate||'?';
      if (!map[key]) { map[key]=[]; groups.push({date:key, items:map[key]}); }
      map[key].push(sorted[i]);
    }
    return groups;
  }

  function _getCats(type) {
    var built = type==='income' ? INCOME_CATS : EXPENSE_CATS;
    var custom = (MONEY_STORE.getState().settings.categories||[]).filter(function(c){
      return c.type===type && c.active!==false;
    });
    return { built:built, custom:custom };
  }

  // ─── Render operations page ────────────────────────────────────────────────
  function renderOpsPage() {
    var wrap = document.getElementById('mn-ops-content');
    if (!wrap) return;

    var monthTxns    = _getMonthTxns();
    var filteredTxns = _applyFilter(monthTxns);
    var summary      = _calcSummary(monthTxns);

    var html = '';

    // Month nav
    html += '<div class="ops-month-nav">'
      + '<button class="ops-month-btn" type="button" data-action="prev-month">&#8249;</button>'
      + '<span class="ops-month-lbl">' + esc(_fmtMonth(_currentMonth)) + '</span>'
      + '<button class="ops-month-btn" type="button" data-action="next-month">&#8250;</button>'
      + '</div>';

    // Summary
    html += '<div class="ops-summary">'
      + '<div class="ops-sum-item"><span class="ops-sum-lbl">Доходы</span><span class="ops-sum-val ops-sum-val--inc">'+(summary.income?fmtRub(summary.income):'—')+'</span></div>'
      + '<div class="ops-sum-item"><span class="ops-sum-lbl">Расходы</span><span class="ops-sum-val ops-sum-val--exp">'+(summary.expense?fmtRub(summary.expense):'—')+'</span></div>'
      + '<div class="ops-sum-item"><span class="ops-sum-lbl">Инвест.</span><span class="ops-sum-val">'+(summary.investment?fmtRub(summary.investment):'—')+'</span></div>'
      + '</div>';

    // Filter chips
    var chips = [
      { key:'all',       label:'Все' },
      { key:'income',    label:'Доходы' },
      { key:'expense',   label:'Расходы' },
      { key:'transfer',  label:'Переводы' },
      { key:'investment',label:'Инвестиции' }
    ];
    html += '<div class="ops-filters">';
    for (var ci=0;ci<chips.length;ci++) {
      var c=chips[ci];
      html += '<button class="ops-chip'+(_filter.type===c.key?' ops-chip--active':'')
        +'" type="button" data-action="filter-type" data-type="'+c.key+'">'+esc(c.label)+'</button>';
    }
    html += '</div>';

    // Add button
    html += '<button class="ops-add-btn" type="button" data-action="add-tx">+ Добавить операцию</button>';

    // Transaction list
    if (filteredTxns.length===0) {
      html += '<div class="ops-empty">Нет операций за этот период</div>';
    } else {
      var groups = _groupByDate(filteredTxns);
      for (var gi=0;gi<groups.length;gi++) {
        var grp=groups[gi];
        html += '<div class="ops-date-lbl">'+esc(_fmtDate(grp.date))+'</div>';
        html += '<div class="ops-group">';
        for (var ti=0;ti<grp.items.length;ti++) html += _txRowHtml(grp.items[ti]);
        html += '</div>';
      }
    }

    wrap.innerHTML = html;

    if (!_clickBound) {
      _clickBound = true;
      wrap.addEventListener('click', _onWrapClick);
    }
  }

  function _txRowHtml(tx) {
    var acct   = _findAcct(tx.accountId);
    var toAcct = tx.toAccountId ? _findAcct(tx.toAccountId) : null;

    var title = tx.title || TYPE_LABELS[tx.type] || tx.type;

    var metaParts = [];
    if (tx.accountId) {
      metaParts.push(acct ? esc(acct.name) : 'Счёт удалён');
    }
    if (tx.category) metaParts.push(esc(tx.category));
    if (tx.type==='transfer' && toAcct) metaParts.push('→ '+esc(toAcct.name));

    var noAcctBadge = !tx.accountId
      ? '<span class="ops-no-acct-badge">Счёт не указан</span>' : '';

    var prefix = tx.type==='income' ? '+' : (tx.type==='expense'||tx.type==='investment' ? '−' : '');
    var amtCls = tx.type==='income' ? ' ops-row-amt--income' : '';

    return '<div class="ops-row" data-id="'+esc(tx.id)+'">'
      + '<div class="ops-row-ic ops-row-ic--'+tx.type+'">'+(IC[tx.type]||IC.expense)+'</div>'
      + '<div class="ops-row-body">'
      + '<span class="ops-row-title">'+esc(title)+noAcctBadge+'</span>'
      + (metaParts.length ? '<span class="ops-row-meta">'+metaParts.join(' · ')+'</span>' : '')
      + '</div>'
      + '<div class="ops-row-right">'
      + '<span class="ops-row-amt'+amtCls+'">'+prefix+fmtRub(tx.amountMinor)+'</span>'
      + '</div>'
      + '</div>';
  }

  // ─── Click delegation ─────────────────────────────────────────────────────
  function _onWrapClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) {
      // Tap on ops-row opens edit form
      var row = e.target.closest('.ops-row');
      if (row && row.dataset.id) openTxSheet(row.dataset.id);
      return;
    }
    var action = btn.dataset.action;
    if (action==='prev-month') {
      var p1=_currentMonth.split('-'), y1=parseInt(p1[0]),m1=parseInt(p1[1])-1;
      if (m1<1){m1=12;y1--;} _currentMonth=y1+'-'+('0'+m1).slice(-2); renderOpsPage();
    } else if (action==='next-month') {
      var p2=_currentMonth.split('-'), y2=parseInt(p2[0]),m2=parseInt(p2[1])+1;
      if (m2>12){m2=1;y2++;} _currentMonth=y2+'-'+('0'+m2).slice(-2); renderOpsPage();
    } else if (action==='filter-type') {
      _filter.type=btn.dataset.type; renderOpsPage();
    } else if (action==='add-tx') {
      openTxSheet(null, 'expense');
    }
  }

  // ─── Transaction sheet ─────────────────────────────────────────────────────
  function openTxSheet(id, prefillType) {
    _editingId = id || null;
    var el = _ensureTxSheet();

    var existingTx = id ? _findTx(id) : null;
    var type = existingTx ? existingTx.type : (prefillType||'expense');

    // Reset errors
    el.querySelectorAll('.mn-sheet-err').forEach(function(e){ e.textContent=''; });

    // Set title
    el.querySelector('#tx-sheet-h').textContent = existingTx ? 'Редактировать операцию' : 'Новая операция';

    // Type buttons
    _setActiveType(el, type);

    // Amount
    var amtInp = el.querySelector('#tx-f-amt');
    amtInp.value = existingTx ? (existingTx.amountMinor/100).toFixed(existingTx.amountMinor%100?2:0) : '';

    // Date
    el.querySelector('#tx-f-date').value = existingTx ? existingTx.localDate : _localDate();

    // Title
    el.querySelector('#tx-f-title').value = existingTx ? (existingTx.title||'') : '';

    // Note
    el.querySelector('#tx-f-note').value = existingTx ? (existingTx.note||'') : '';

    // Populate selects based on type
    _onTypeChange(el, type, existingTx);

    // Show/hide delete
    el.querySelector('#tx-del-btn').style.display = existingTx ? '' : 'none';

    el.classList.add('mn-sheet--open');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ amtInp.focus(); }, 80);
  }

  function _closeTxSheet() {
    if (_txSheetEl) _txSheetEl.classList.remove('mn-sheet--open');
    document.body.style.overflow = '';
    _editingId = null;
  }

  function _ensureTxSheet() {
    if (_txSheetEl) return _txSheetEl;

    var el = document.createElement('div');
    el.id = 'tx-sheet';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-labelledby','tx-sheet-h');

    el.innerHTML =
      '<div class="mn-sheet-bd"></div>'
      +'<div class="mn-sheet-panel">'
      +'<button class="mn-sheet-x" type="button" aria-label="Закрыть">'+CLOSE_SVG+'</button>'
      +'<h2 class="mn-sheet-h" id="tx-sheet-h">Новая операция</h2>'

      // Type bar
      +'<div class="tx-type-bar">'
      +'<button class="tx-type-btn tx-type-btn--active" type="button" data-type="expense">Расход</button>'
      +'<button class="tx-type-btn" type="button" data-type="income">Доход</button>'
      +'<button class="tx-type-btn" type="button" data-type="transfer">Перевод</button>'
      +'<button class="tx-type-btn" type="button" data-type="investment">Инвест.</button>'
      +'</div>'

      // Amount
      +'<div class="mn-sheet-row">'
      +'<label class="mn-sheet-lbl" for="tx-f-amt">Сумма, ₽</label>'
      +'<input class="mn-sheet-inp" id="tx-f-amt" type="text" inputmode="decimal" placeholder="0" autocomplete="off">'
      +'<span class="mn-sheet-err" id="tx-e-amt"></span>'
      +'</div>'

      // Date
      +'<div class="mn-sheet-row">'
      +'<label class="mn-sheet-lbl" for="tx-f-date">Дата</label>'
      +'<input class="mn-sheet-inp" id="tx-f-date" type="date">'
      +'<span class="mn-sheet-err" id="tx-e-date"></span>'
      +'</div>'

      // Title
      +'<div class="mn-sheet-row" id="tx-row-title">'
      +'<label class="mn-sheet-lbl" for="tx-f-title">Название</label>'
      +'<input class="mn-sheet-inp" id="tx-f-title" type="text" placeholder="Необязательно" maxlength="60" autocomplete="off">'
      +'</div>'

      // Category
      +'<div class="mn-sheet-row" id="tx-row-cat">'
      +'<label class="mn-sheet-lbl" for="tx-f-cat">Категория</label>'
      +'<select class="mn-sheet-sel" id="tx-f-cat"></select>'
      +'<span class="mn-sheet-err" id="tx-e-cat"></span>'
      +'</div>'
      +'<div class="mn-sheet-row" id="tx-row-cat-custom" style="display:none">'
      +'<label class="mn-sheet-lbl" for="tx-f-cat-custom">Название категории</label>'
      +'<input class="mn-sheet-inp" id="tx-f-cat-custom" type="text" maxlength="30" autocomplete="off" placeholder="Например: Спортзал">'
      +'</div>'

      // Account
      +'<div class="mn-sheet-row" id="tx-row-acct">'
      +'<label class="mn-sheet-lbl" for="tx-f-acct">Счёт</label>'
      +'<select class="mn-sheet-sel" id="tx-f-acct"></select>'
      +'<span class="mn-sheet-err" id="tx-e-acct"></span>'
      +'</div>'

      // To-account (transfer)
      +'<div class="mn-sheet-row" id="tx-row-to-acct" style="display:none">'
      +'<label class="mn-sheet-lbl" for="tx-f-to-acct">Счёт назначения</label>'
      +'<select class="mn-sheet-sel" id="tx-f-to-acct"></select>'
      +'<span class="mn-sheet-err" id="tx-e-to-acct"></span>'
      +'</div>'

      // Note
      +'<div class="mn-sheet-row">'
      +'<label class="mn-sheet-lbl" for="tx-f-note">Комментарий</label>'
      +'<input class="mn-sheet-inp" id="tx-f-note" type="text" placeholder="Необязательно" maxlength="100" autocomplete="off">'
      +'</div>'

      +'<button class="mn-sheet-save" type="button" id="tx-save-btn">Сохранить</button>'
      +'<button class="mn-sheet-save tx-del-btn" type="button" id="tx-del-btn" style="display:none">Удалить операцию</button>'
      +'<button class="mn-sheet-cancel" type="button" id="tx-cancel-btn">Отмена</button>'
      +'</div>';

    document.body.appendChild(el);
    _txSheetEl = el;

    el.querySelector('.mn-sheet-bd').addEventListener('click', _closeTxSheet);
    el.querySelector('.mn-sheet-x').addEventListener('click', _closeTxSheet);
    el.querySelector('#tx-cancel-btn').addEventListener('click', _closeTxSheet);
    el.addEventListener('keydown', function(ev){ if (ev.key==='Escape') _closeTxSheet(); });

    // Type buttons
    var typeBtns = el.querySelectorAll('.tx-type-btn');
    for (var i=0;i<typeBtns.length;i++) {
      typeBtns[i].addEventListener('click', (function(btn){
        return function(){ _setActiveType(el, btn.dataset.type); _onTypeChange(el, btn.dataset.type, null); };
      })(typeBtns[i]));
    }

    // Category select change
    el.querySelector('#tx-f-cat').addEventListener('change', function(){
      var catSel = el.querySelector('#tx-f-cat');
      var customRow = el.querySelector('#tx-row-cat-custom');
      customRow.style.display = catSel.value==='__custom__' ? '' : 'none';
      el.querySelector('#tx-e-cat').textContent = '';
    });

    el.querySelector('#tx-save-btn').addEventListener('click', function(){ _doSaveTx(el); });
    el.querySelector('#tx-del-btn').addEventListener('click', function(){
      if (_editingId) doDeleteTx(_editingId);
    });

    return el;
  }

  function _setActiveType(el, type) {
    var btns = el.querySelectorAll('.tx-type-btn');
    for (var i=0;i<btns.length;i++) {
      if (btns[i].dataset.type===type) btns[i].classList.add('tx-type-btn--active');
      else btns[i].classList.remove('tx-type-btn--active');
    }
  }

  function _onTypeChange(el, type, existingTx) {
    var hasCategory = type==='expense'||type==='income';
    var isTransfer  = type==='transfer';

    el.querySelector('#tx-row-cat').style.display       = hasCategory ? '' : 'none';
    el.querySelector('#tx-row-to-acct').style.display   = isTransfer  ? '' : 'none';
    el.querySelector('#tx-row-cat-custom').style.display = 'none';
    el.querySelector('#tx-e-cat').textContent = '';

    // Populate category select
    if (hasCategory) {
      var cats = _getCats(type);
      var catOpts = '';
      cats.built.forEach(function(c){
        catOpts += '<option value="'+esc(c)+'">'+esc(c)+'</option>';
      });
      if (cats.custom.length) {
        catOpts += '<optgroup label="Мои категории">';
        cats.custom.forEach(function(c){
          catOpts += '<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>';
        });
        catOpts += '</optgroup>';
      }
      catOpts += '<option value="__custom__">+ Добавить свою...</option>';
      var catSel = el.querySelector('#tx-f-cat');
      catSel.innerHTML = catOpts;
      if (existingTx && existingTx.category) {
        catSel.value = existingTx.category;
        if (!catSel.value) { catSel.value = '__custom__'; el.querySelector('#tx-f-cat-custom').value = existingTx.category||''; el.querySelector('#tx-row-cat-custom').style.display=''; }
      }
    }

    // Populate account selects
    var activeAccts = _getActiveAccts();
    var acctOpts = '';
    var isEditing = !!_editingId;
    var existingAcctId = existingTx ? existingTx.accountId : null;
    if (isEditing && !existingAcctId) acctOpts += '<option value="">— Счёт не указан —</option>';
    else if (!isEditing && activeAccts.length===0) acctOpts += '<option value="">— Нет активных счетов —</option>';
    activeAccts.forEach(function(a){
      acctOpts += '<option value="'+esc(a.id)+'"'+(a.id===existingAcctId?' selected':'')+'>'+ esc(a.name)+'</option>';
    });
    el.querySelector('#tx-f-acct').innerHTML = acctOpts;

    if (isTransfer) {
      var toAcctId = existingTx ? existingTx.toAccountId : null;
      var toOpts = '';
      if (!toAcctId) toOpts += '<option value="">— Выберите счёт —</option>';
      activeAccts.forEach(function(a){
        toOpts += '<option value="'+esc(a.id)+'"'+(a.id===toAcctId?' selected':'')+'>'+ esc(a.name)+'</option>';
      });
      el.querySelector('#tx-f-to-acct').innerHTML = toOpts;
    }
  }

  // ─── Save transaction ──────────────────────────────────────────────────────
  function _doSaveTx(el) {
    el.querySelectorAll('.mn-sheet-err').forEach(function(e){ e.textContent=''; });

    // Read type
    var type = 'expense';
    var typeBtns = el.querySelectorAll('.tx-type-btn');
    for (var i=0;i<typeBtns.length;i++) {
      if (typeBtns[i].classList.contains('tx-type-btn--active')) { type=typeBtns[i].dataset.type; break; }
    }

    var amtStr  = el.querySelector('#tx-f-amt').value.trim();
    var amt     = parseAmount(amtStr);
    var date    = el.querySelector('#tx-f-date').value;
    var title   = el.querySelector('#tx-f-title').value.trim();
    var note    = el.querySelector('#tx-f-note').value.trim();

    // Category
    var category = null;
    if (type==='expense'||type==='income') {
      var catSel  = el.querySelector('#tx-f-cat');
      if (catSel.value==='__custom__') {
        var customName = el.querySelector('#tx-f-cat-custom').value.trim();
        if (!customName) { el.querySelector('#tx-e-cat').textContent='Введите название категории'; return; }
        category = customName;
        _addCustomCat(customName, type);
      } else {
        category = catSel.value || null;
      }
    }

    // Accounts
    var acctSel  = el.querySelector('#tx-f-acct');
    var accountId = acctSel.value || null;
    var toAccountId = null;
    if (type==='transfer') {
      toAccountId = el.querySelector('#tx-f-to-acct').value || null;
    }

    // Validation
    var ok = true;
    if (amt===null) { el.querySelector('#tx-e-amt').textContent='Введите сумму больше 0'; ok=false; }
    if (!date)      { el.querySelector('#tx-e-date').textContent='Укажите дату'; ok=false; }

    var isEditing = !!_editingId;
    var existingTx = isEditing ? _findTx(_editingId) : null;

    if (!accountId && !isEditing && _getActiveAccts().length>0) {
      el.querySelector('#tx-e-acct').textContent='Выберите счёт'; ok=false;
    }
    if (type==='transfer') {
      if (!accountId)   { el.querySelector('#tx-e-acct').textContent='Выберите счёт'; ok=false; }
      if (!toAccountId) { el.querySelector('#tx-e-to-acct').textContent='Выберите счёт назначения'; ok=false; }
      if (accountId&&toAccountId&&accountId===toAccountId) {
        el.querySelector('#tx-e-to-acct').textContent='Выберите другой счёт'; ok=false;
      }
    }
    if (!ok) return;

    var snap = MONEY_STORE.exportData();
    var now  = new Date().toISOString();

    if (isEditing) {
      MONEY_STORE.update(function(s){
        for (var j=0;j<s.transactions.length;j++) {
          if (s.transactions[j].id===_editingId) {
            var tx=s.transactions[j];
            tx.type=type; tx.title=title; tx.amountMinor=amt;
            tx.localDate=date; tx.accountId=accountId; tx.toAccountId=toAccountId;
            tx.category=category; tx.note=note; tx.updatedAt=now;
            break;
          }
        }
      });
    } else {
      MONEY_STORE.update(function(s){
        s.transactions.push({
          id:MONEY_STORE.createId(), type:type, title:title, amountMinor:amt,
          localDate:date, accountId:accountId, toAccountId:toAccountId,
          category:category, note:note, quickExpenseId:null,
          createdAt:now, updatedAt:now
        });
      });
    }

    if (!MONEY_STORE.save()) {
      MONEY_STORE.importData(snap);
      el.querySelector('#tx-e-amt').textContent='Ошибка сохранения. Данные не изменены.';
      return;
    }

    _closeTxSheet();
  }

  // ─── Delete transaction ────────────────────────────────────────────────────
  function doDeleteTx(id) {
    if (!confirm('Удалить операцию? Это действие нельзя отменить.')) return;
    var snap = MONEY_STORE.exportData();
    MONEY_STORE.update(function(s){
      var idx=-1;
      for (var i=0;i<s.transactions.length;i++) if (s.transactions[i].id===id){idx=i;break;}
      if (idx!==-1) s.transactions.splice(idx,1);
    });
    if (!MONEY_STORE.save()) { MONEY_STORE.importData(snap); return; }
    _closeTxSheet();
  }

  // ─── Custom categories ─────────────────────────────────────────────────────
  function _addCustomCat(name, type) {
    var cats = MONEY_STORE.getState().settings.categories||[];
    for (var i=0;i<cats.length;i++) {
      if (cats[i].name===name&&cats[i].type===type) return; // already exists
    }
    MONEY_STORE.update(function(s){
      if (!s.settings.categories) s.settings.categories=[];
      var ts=new Date().toISOString();
      s.settings.categories.push({ id:MONEY_STORE.createId(), name:name, type:type, active:true, createdAt:ts, updatedAt:ts });
    });
    MONEY_STORE.save();
  }

  // ─── Public API: exposed so money.js income button can open the form ───────
  window.MONEY_OPS = {
    openAdd: function(prefillType) { openTxSheet(null, prefillType||'expense'); }
  };

  // ─── Reactivity ───────────────────────────────────────────────────────────
  function _isOpsActive() {
    var p = document.querySelector('[data-page="money-ops"]');
    return p && p.classList.contains('active');
  }

  function _observeOpsPage() {
    var page = document.querySelector('[data-page="money-ops"]');
    if (!page||!window.MutationObserver) return;
    new MutationObserver(function(){
      if (page.classList.contains('active')) renderOpsPage();
    }).observe(page, { attributes:true, attributeFilter:['class'] });
  }

  MONEY_STORE.subscribe(function(){
    if (_isOpsActive()) renderOpsPage();
  });

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', function(){
      _observeOpsPage();
      if (_isOpsActive()) renderOpsPage();
    });
  } else {
    _observeOpsPage();
    if (_isOpsActive()) renderOpsPage();
  }

}());
