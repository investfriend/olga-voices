// assets/market.js — Раздел «Котировки и обзор рынка»
// Режим: demo. Реальные данные MOEX не подключены.

(function () {
  'use strict';

  var D = window.MARKET_DATA;

  // ── Состояние ────────────────────────────────────────────────────────────
  var S = {
    tab:        'ru',
    period:     '1m',
    selected:   'IMOEX',
    indexGroup: 'main',
    leaderTab:  'gain',
  };

  // ── Форматирование ───────────────────────────────────────────────────────
  function fNum(v, unit) {
    if (unit === '%') return v.toFixed(2) + '%';
    if (v === null || v === undefined) return '—';
    if (v >= 10000) return v.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
    if (v >= 100)   return v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v.toFixed(2);
  }
  function fChg(v, unit) {
    if (v === null || v === undefined) return '';
    var s = v > 0 ? '+' : '';
    if (unit === '%') return s + v.toFixed(2) + '%';
    return s + fNum(v, unit);
  }
  function fPct(v) {
    if (v === null || v === undefined) return '';
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  }
  function cls(v) {
    return v > 0 ? 'mkt-up' : v < 0 ? 'mkt-down' : 'mkt-neutral';
  }
  var SVG_UP   = '<svg width="10" height="10" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,200H40a8,8,0,0,1,0-16H216a8,8,0,0,1,0,16Zm-37.65-93.65-42.34-42.35a8,8,0,0,0-11.32,0L82.35,106.35a8,8,0,0,0,11.32,11.32L120,91.31V160a8,8,0,0,0,16,0V91.31l26.34,26.36a8,8,0,0,0,11.32-11.32Z"/></svg>';
  var SVG_DOWN = '<svg width="10" height="10" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,56H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm-37.65,90.35a8,8,0,0,0-11.32,0L136,172.69V104a8,8,0,0,0-16,0v68.69l-26.34-26.34a8,8,0,0,0-11.32,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,178.35,146.35Z"/></svg>';
  function icon(v) { return v > 0 ? SVG_UP : v < 0 ? SVG_DOWN : ''; }

  // ── SVG-график ───────────────────────────────────────────────────────────
  function buildChart(ticker) {
    var raw = D.charts[ticker];
    if (!raw || !raw.length) return '<div class="mkt-chart-empty">Нет данных для демо-режима</div>';

    // Нарезаем по периоду
    var slices = { '1d': 8, '1w': 15, '1m': 30, '3m': 30, '1y': 30 };
    var n = slices[S.period] || 30;
    var pts = raw.slice(-n);
    n = pts.length;

    var W = 320, H = 110, PY = 10;
    var min = pts[0], max = pts[0];
    for (var k = 1; k < n; k++) { if (pts[k] < min) min = pts[k]; if (pts[k] > max) max = pts[k]; }
    var range = (max - min) || 1;

    var xs = [], ys = [];
    for (var i = 0; i < n; i++) {
      xs.push((i / (n - 1)) * W);
      ys.push(H - PY - ((pts[i] - min) / range) * (H - PY * 2));
    }

    var polyPts = '';
    for (var j = 0; j < n; j++) polyPts += xs[j].toFixed(1) + ',' + ys[j].toFixed(1) + ' ';

    // Путь области под линией
    var area = 'M ' + xs[0].toFixed(1) + ',' + H;
    for (var m = 0; m < n; m++) area += ' L ' + xs[m].toFixed(1) + ',' + ys[m].toFixed(1);
    area += ' L ' + xs[n-1].toFixed(1) + ',' + H + ' Z';

    var isUp = pts[n-1] >= pts[0];
    var color = isUp ? 'var(--mkt-up)' : 'var(--mkt-down)';
    var gid = 'mg-' + ticker.replace(/[^a-z0-9]/gi, '');

    return '<svg class="mkt-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.22"/>'
      + '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.02"/>'
      + '</linearGradient></defs>'
      + '<path d="' + area + '" fill="url(#' + gid + ')"/>'
      + '<polyline points="' + polyPts + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'
      + '</svg>';
  }

  // ── Карточки быстрого обзора ─────────────────────────────────────────────
  function renderOverview(page, list) {
    var html = '';
    list.forEach(function (item) {
      var sel = item.ticker === S.selected ? ' selected' : '';
      var c = cls(item.change);
      var ic = icon(item.change);
      html += '<div class="mkt-ticker-card' + sel + '" data-mkt-sel="' + item.ticker + '">'
        + '<div class="mkt-ticker-name">' + item.name + '</div>'
        + '<div class="mkt-ticker-sym">' + item.ticker + '</div>'
        + '<div class="mkt-ticker-val">' + fNum(item.value, item.unit) + ' <span style="font-size:10px;color:var(--text-muted)">' + item.unit + '</span></div>'
        + '<div class="mkt-ticker-chg ' + c + '">' + ic + fChg(item.change, item.unit) + ' <span style="opacity:.7">' + fPct(item.pct) + '</span></div>'
        + '<div class="mkt-ticker-time">' + item.time + '</div>'
        + '</div>';
    });
    page.querySelector('#mktOverviewTrack').innerHTML = html;
  }

  // ── Блок графика ─────────────────────────────────────────────────────────
  function renderChart(page) {
    var ticker = S.selected;
    var data = (S.tab === 'ru' ? D.ru.overview : D.us.overview).find(function(i){ return i.ticker === ticker; });
    if (!data) data = D.ru.overview[0];

    var c = cls(data.change);
    var ic = icon(data.change);
    page.querySelector('#mktChartTicker').textContent = data.name + ' · ' + ticker;
    page.querySelector('#mktChartVal').textContent = fNum(data.value, data.unit) + ' ' + data.unit;
    page.querySelector('#mktChartChg').innerHTML = '<span class="' + c + '">' + ic + fChg(data.change, data.unit) + ' (' + fPct(data.pct) + ')</span>';
    page.querySelector('#mktChartSvg').innerHTML = buildChart(ticker);

    // Отметить активный период
    page.querySelectorAll('.mkt-period-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktPeriod === S.period);
    });
  }

  // ── Индексы ──────────────────────────────────────────────────────────────
  function renderIndices(page) {
    var wrap = page.querySelector('#mktIndices');
    if (!wrap || S.tab !== 'ru') return;

    var list = D.ru.indices[S.indexGroup] || [];
    var html = '';
    list.forEach(function (idx) {
      var sel = idx.ticker === S.selected ? ' selected' : '';
      var c = cls(idx.change);
      html += '<div class="mkt-index-row' + sel + '" data-mkt-sel="' + idx.ticker + '">'
        + '<div class="mkt-index-name"><div class="mkt-index-ticker">' + idx.ticker + '</div><div class="mkt-index-label">' + idx.name + '</div></div>'
        + '<div class="mkt-index-val">' + fNum(idx.value) + '</div>'
        + '<div class="mkt-index-chg ' + c + '">' + icon(idx.change) + fPct(idx.pct) + '</div>'
        + '</div>';
    });
    wrap.innerHTML = html;

    // Отметить активную группу
    page.querySelectorAll('.mkt-group-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktGroup === S.indexGroup);
    });
  }

  // ── Отрасли: полосы ──────────────────────────────────────────────────────
  function renderSectors(page) {
    var wrap = page.querySelector('#mktSectorBars');
    if (!wrap || S.tab !== 'ru') return;
    var list = D.ru.indices.sector.slice().sort(function (a, b) { return b.pct - a.pct; });
    var maxAbs = Math.max.apply(null, list.map(function(s){ return Math.abs(s.pct); })) || 1;
    var html = '';
    list.forEach(function (s) {
      var c = cls(s.change);
      var w = (Math.abs(s.pct) / maxAbs * 100).toFixed(1);
      var fillColor = s.pct > 0 ? 'var(--mkt-up)' : 'var(--mkt-down)';
      html += '<div class="mkt-sector-row">'
        + '<div class="mkt-sector-label" title="' + s.name + '">' + s.name + '</div>'
        + '<div class="mkt-sector-bar-track"><div class="mkt-sector-bar-fill" style="width:' + w + '%;background:' + fillColor + '"></div></div>'
        + '<div class="mkt-sector-pct ' + c + '">' + icon(s.change) + fPct(s.pct) + '</div>'
        + '</div>';
    });
    wrap.innerHTML = html;
  }

  // ── Тепловая карта ───────────────────────────────────────────────────────
  function renderHeatmap() {
    var overlay = document.getElementById('mktHeatmapOverlay');
    if (!overlay) return;
    var grid = overlay.querySelector('.mkt-heatmap-grid');
    var list = D.ru.indices.sector;
    var total = list.reduce(function(a, s){ return a + s.weight; }, 0);
    var avail = window.innerWidth - 24;
    var html = '';
    list.forEach(function (s) {
      var w = Math.round((s.weight / total) * avail);
      var h = Math.max(54, w * 0.65);
      var pct = s.pct;
      var intensity = Math.min(Math.abs(pct) / 1.5, 1);
      var bg;
      if (pct > 0)      bg = 'rgba(39,201,138,' + (0.25 + intensity * 0.55) + ')';
      else if (pct < 0) bg = 'rgba(224,88,88,'  + (0.25 + intensity * 0.55) + ')';
      else               bg = 'rgba(100,110,108,0.4)';
      html += '<div class="mkt-heatmap-cell" style="width:' + w + 'px;height:' + h + 'px;background:' + bg + '">'
        + '<div class="mkt-heatmap-cell-ticker">' + s.ticker + '</div>'
        + '<div class="mkt-heatmap-cell-pct">' + (pct > 0 ? '+' : '') + pct.toFixed(2) + '%</div>'
        + '</div>';
    });
    grid.innerHTML = html;
    overlay.classList.add('open');
  }

  // ── Лидеры дня ───────────────────────────────────────────────────────────
  function renderLeaders(page) {
    var wrap = page.querySelector('#mktLeaders');
    if (!wrap || S.tab !== 'ru') return;
    var list = D.ru.leaders[S.leaderTab];
    var html = '';
    list.forEach(function (l) {
      var c = cls(l.change);
      html += '<div class="mkt-leader-row">'
        + '<div class="mkt-leader-ticker">' + l.ticker + '</div>'
        + '<div class="mkt-leader-name">' + l.name + '</div>'
        + '<div class="mkt-leader-price">' + fNum(l.price) + ' ₽</div>'
        + '<div class="mkt-leader-chg ' + c + '">' + icon(l.change) + fPct(l.pct) + '</div>'
        + '</div>';
    });
    wrap.innerHTML = html;

    page.querySelectorAll('.mkt-leader-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktLeader === S.leaderTab);
    });
  }

  // ── Облигации ─────────────────────────────────────────────────────────────
  function renderBonds(page) {
    var wrap = page.querySelector('#mktBonds');
    if (!wrap || S.tab !== 'ru') return;
    var b = D.ru.bonds;
    var govC  = cls(b.gov.change);
    var corpC = cls(b.corp.change);
    wrap.innerHTML = ''
      + '<div class="mkt-bond-cards">'
      + '<div class="mkt-bond-card">'
      + '<div class="mkt-bond-card-label">' + b.gov.name + '</div>'
      + '<div class="mkt-bond-card-val">' + fNum(b.gov.value) + '</div>'
      + '<div class="mkt-bond-card-chg ' + govC + '">' + icon(b.gov.change) + fChg(b.gov.change) + ' (' + fPct(b.gov.pct) + ')</div>'
      + '</div>'
      + '<div class="mkt-bond-card">'
      + '<div class="mkt-bond-card-label">' + b.corp.name + '</div>'
      + '<div class="mkt-bond-card-val">' + fNum(b.corp.value) + '</div>'
      + '<div class="mkt-bond-card-chg ' + corpC + '">' + icon(b.corp.change) + fChg(b.corp.change) + ' (' + fPct(b.corp.pct) + ')</div>'
      + '</div>'
      + '</div>'
      + '<div class="mkt-bond-note">' + b.note + '</div>';
  }

  // ── Переключение вкладок ─────────────────────────────────────────────────
  function switchTab(page, tab) {
    S.tab = tab;
    S.selected = tab === 'ru' ? 'IMOEX' : 'SP500';
    page.querySelectorAll('.mkt-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktTab === tab);
    });
    var ruSections = page.querySelectorAll('.mkt-ru-only');
    var usSections = page.querySelectorAll('.mkt-us-only');
    ruSections.forEach(function (el) { el.style.display = tab === 'ru' ? '' : 'none'; });
    usSections.forEach(function (el) { el.style.display = tab === 'us' ? '' : 'none'; });
    var overview = tab === 'ru' ? D.ru.overview : D.us.overview;
    renderOverview(page, overview);
    renderChart(page);
    renderIndices(page);
    renderSectors(page);
    renderLeaders(page);
    renderBonds(page);
  }

  // ── Построение HTML страницы ─────────────────────────────────────────────
  function buildHTML() {
    return ''
      // Демо-баннер
      + '<div class="mkt-demo-banner">'
      + '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M228,128a100,100,0,1,1-100-100A100,100,0,0,1,228,128Z" opacity="0.2"/><path d="M236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-108,72a8,8,0,0,0,0-16h-4V120a8,8,0,0,0-8-8H104a8,8,0,0,0,0,16h8v56h-4a8,8,0,0,0,0,16Zm0-144a12,12,0,1,0-12-12A12,12,0,0,0,128,56Z"/></svg>'
      + D.demoLabel + ' — реальные котировки MOEX не подключены'
      + '</div>'

      // Заголовок + вкладки
      + '<div class="mkt-header">'
      + '<div class="mkt-tabs">'
      + '<button class="mkt-tab-btn active" data-mkt-tab="ru">🇷🇺 Россия</button>'
      + '<button class="mkt-tab-btn" data-mkt-tab="us">🇺🇸 США</button>'
      + '</div>'
      + '<div class="mkt-meta">'
      + '<span>Данные на ' + D.dataDate + ', ' + D.dataTime + '</span>'
      + '<button class="mkt-refresh-btn" id="mktRefresh">'
      + '<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,48V96a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h30.69L182.06,72.4a80,80,0,1,0,4.09,114.67,8,8,0,1,1,11.41,11.2A96,96,0,1,1,192,54.67l9.4,9.4V48a8,8,0,0,1,16,0Z"/></svg>'
      + 'Обновить'
      + '</button>'
      + '</div>'
      + '</div>'

      // Быстрый обзор
      + '<div class="mkt-overview-scroll"><div class="mkt-overview-track" id="mktOverviewTrack"></div></div>'

      // График
      + '<div class="mkt-chart-wrap">'
      + '<div class="mkt-chart-headline">'
      + '<div class="mkt-chart-ticker" id="mktChartTicker"></div>'
      + '<div class="mkt-chart-val" id="mktChartVal"></div>'
      + '<div class="mkt-chart-chg" id="mktChartChg"></div>'
      + '</div>'
      + '<div class="mkt-periods">'
      + ['1d','1w','1m','3m','1y'].map(function(p){
          var lbl = {'1d':'1 день','1w':'1 нед','1m':'1 мес','3m':'3 мес','1y':'1 год'}[p];
          return '<button class="mkt-period-btn' + (p==='1m'?' active':'') + '" data-mkt-period="' + p + '">' + lbl + '</button>';
        }).join('')
      + '</div>'
      + '<div id="mktChartSvg"></div>'
      + '</div>'

      // ── Только Россия ────────────────────────────────────────────────────
      + '<div class="mkt-ru-only">'

      // Индексы
      + '<div class="mkt-section-head">Индексы</div>'
      + '<div class="mkt-group-tabs">'
      + '<button class="mkt-group-btn active" data-mkt-group="main">Основные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="bond">Облигационные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="sector">Отраслевые</button>'
      + '</div>'
      + '<div id="mktIndices"></div>'

      // Отрасли
      + '<div class="mkt-section-head">Отрасли — изменение за день</div>'
      + '<div class="mkt-sector-bar-wrap" id="mktSectorBars"></div>'
      + '<button class="mkt-heatmap-btn" id="mktHeatmapBtn">'
      + '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40ZM96,168H64V136H96Zm0-48H64V88H96Zm48,48H112V136h32Zm0-48H112V88h32Zm48,48H160V136h32Zm0-48H160V88h32Z" opacity="0.2"/><path d="M200,32H56A24,24,0,0,0,32,56V200a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V56A24,24,0,0,0,200,32Zm8,168a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8ZM104,88v32a8,8,0,0,1-16,0V88a8,8,0,0,1,16,0Zm0,64v16a8,8,0,0,1-16,0V152a8,8,0,0,1,16,0Zm48-64v32a8,8,0,0,1-16,0V88a8,8,0,0,1,16,0Zm0,64v16a8,8,0,0,1-16,0V152a8,8,0,0,1,16,0Zm48-64v32a8,8,0,0,1-16,0V88a8,8,0,0,1,16,0Zm0,64v16a8,8,0,0,1-16,0V152a8,8,0,0,1,16,0Z"/></svg>'
      + 'Открыть тепловую карту'
      + '</button>'

      // Лидеры дня
      + '<div class="mkt-section-head">Лидеры дня — IMOEX</div>'
      + '<div class="mkt-leader-tabs">'
      + '<button class="mkt-leader-tab-btn active" data-mkt-leader="gain">▲ Растут</button>'
      + '<button class="mkt-leader-tab-btn" data-mkt-leader="loss">▼ Снижаются</button>'
      + '</div>'
      + '<div id="mktLeaders"></div>'

      // Облигации
      + '<div class="mkt-section-head">Облигации</div>'
      + '<div id="mktBonds"></div>'

      + '</div>' // end .mkt-ru-only

      // ── США ──────────────────────────────────────────────────────────────
      + '<div class="mkt-us-only" style="display:none">'
      + '<div class="mkt-us-note">Данные по США — быстрый обзор выше. Детальный раздел по рынку США появится в следующей версии.</div>'
      + '</div>';
  }

  // ── Привязка событий ─────────────────────────────────────────────────────
  function bindEvents(page) {
    page.addEventListener('click', function (e) {
      var t = e.target.closest('[data-mkt-tab],[data-mkt-sel],[data-mkt-period],[data-mkt-group],[data-mkt-leader],[id]');
      if (!t) return;

      // Вкладки Россия/США
      if (t.dataset.mktTab) { switchTab(page, t.dataset.mktTab); return; }

      // Выбор тикера/индекса для графика
      if (t.dataset.mktSel) {
        S.selected = t.dataset.mktSel;
        renderOverview(page, S.tab === 'ru' ? D.ru.overview : D.us.overview);
        renderChart(page);
        renderIndices(page);
        return;
      }

      // Период графика
      if (t.dataset.mktPeriod) {
        S.period = t.dataset.mktPeriod;
        renderChart(page);
        return;
      }

      // Группа индексов
      if (t.dataset.mktGroup) {
        S.indexGroup = t.dataset.mktGroup;
        renderIndices(page);
        return;
      }

      // Вкладка лидеров
      if (t.dataset.mktLeader) {
        S.leaderTab = t.dataset.mktLeader;
        renderLeaders(page);
        return;
      }

      // Тепловая карта
      if (t.id === 'mktHeatmapBtn') { renderHeatmap(); return; }

      // Обновить (демо — просто перерисовываем)
      if (t.id === 'mktRefresh') { switchTab(page, S.tab); return; }
    });

    // Закрытие тепловой карты
    var overlay = document.getElementById('mktHeatmapOverlay');
    if (overlay) {
      overlay.querySelector('.mkt-heatmap-close').addEventListener('click', function () {
        overlay.classList.remove('open');
      });
    }
  }

  // ── Инициализация ────────────────────────────────────────────────────────
  function initMarket() {
    var page = document.querySelector('[data-page="market"]');
    if (!page || page._mktInit) return;
    page._mktInit = true;

    // Заполняем основную секцию
    page.querySelector('#mktContent').innerHTML = buildHTML();

    // Первичный рендер
    renderOverview(page, D.ru.overview);
    renderChart(page);
    renderIndices(page);
    renderSectors(page);
    renderLeaders(page);
    renderBonds(page);

    bindEvents(page);
  }

  // Запускаем при переходе на страницу market
  var _origSetPage = window.setPage;
  if (typeof _origSetPage === 'function') {
    window.setPage = function (name, push) {
      _origSetPage(name, push);
      if (name === 'market') { setTimeout(initMarket, 0); }
    };
  }

  // Также инициализируем если уже открыта
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('[data-page="market"].active')) initMarket();
  });

}());
