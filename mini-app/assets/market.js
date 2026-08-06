// assets/market.js v3 — Раздел «Котировки и обзор рынка»
// Режим: demo. MOEX не подключён (MOEX_DISPLAY_RIGHTS_CONFIRMED = false).
// USA: TradingView виджеты с обработкой ошибок и error-state.

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
    tvInited:   {},       // { chart, overview, heatmap } — инициализированные виджеты
  };

  // ── Форматирование ───────────────────────────────────────────────────────
  function fNum(v, unit) {
    if (v === null || v === undefined) return '—';
    if (unit === '%') return v.toFixed(2) + '%';
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

  // Маленький бейдж «ДЕМО» для каждого блока данных
  function demoBadge() {
    return ' <span class="mkt-demo-inline">ДЕМО</span>';
  }

  // ── SVG-график ───────────────────────────────────────────────────────────
  function buildChart(ticker) {
    var raw = D.charts[ticker];
    if (!raw || !raw.length) return '<div class="mkt-chart-empty">Нет данных для демо-режима</div>';

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
  function renderOverview(page, list, trackId) {
    var id = trackId || 'mktOverviewTrack';
    var el = page.querySelector('#' + id);
    if (!el) return;
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
    el.innerHTML = html;
  }

  // ── Блок графика ─────────────────────────────────────────────────────────
  function renderChart(page) {
    var ticker = S.selected;
    var list = S.tab === 'ru' ? D.ru.overview : D.us.overview;
    var data = list.find(function(i){ return i.ticker === ticker; });
    if (!data) { data = D.ru.overview[0]; }

    var c = cls(data.change);
    var ic = icon(data.change);
    var chartTicker = page.querySelector('#mktChartTicker');
    var chartVal    = page.querySelector('#mktChartVal');
    var chartChg    = page.querySelector('#mktChartChg');
    var chartSvg    = page.querySelector('#mktChartSvg');
    if (chartTicker) chartTicker.textContent = data.name + ' · ' + ticker;
    if (chartVal)    chartVal.textContent    = fNum(data.value, data.unit) + ' ' + data.unit;
    if (chartChg)    chartChg.innerHTML      = '<span class="' + c + '">' + ic + fChg(data.change, data.unit) + ' (' + fPct(data.pct) + ')</span>';
    if (chartSvg) {
      var chartData = D.charts[ticker];
      chartSvg.innerHTML = chartData ? buildChart(ticker) : '<div class="mkt-chart-empty">Нет демо-данных</div>';
    }

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

    page.querySelectorAll('.mkt-group-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktGroup === S.indexGroup);
    });
  }

  // ── Отрасли: столбики ────────────────────────────────────────────────────
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

  // ── Тепловая карта (оверлей) ─────────────────────────────────────────────
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
      var intensity = Math.min(Math.abs(s.pct) / 1.5, 1);
      var bg;
      if (s.pct > 0)      bg = 'rgba(39,201,138,' + (0.25 + intensity * 0.55) + ')';
      else if (s.pct < 0) bg = 'rgba(224,88,88,'  + (0.25 + intensity * 0.55) + ')';
      else                 bg = 'rgba(100,110,108,0.4)';
      html += '<div class="mkt-heatmap-cell" style="width:' + w + 'px;height:' + h + 'px;background:' + bg + '">'
        + '<div class="mkt-heatmap-cell-ticker">' + s.ticker + '</div>'
        + '<div class="mkt-heatmap-cell-pct">' + (s.pct > 0 ? '+' : '') + s.pct.toFixed(2) + '%</div>'
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

  // ── Аккордеон «Как читать этот экран» ────────────────────────────────────
  function renderAccordion(page) {
    var wrap = page.querySelector('#mktAccordion');
    if (!wrap) return;
    var items = D.accordion || [];
    wrap.innerHTML = items.map(function(item, idx) {
      var cls2 = 'mkt-acc-item' + (item.warning ? ' mkt-acc-warning' : '');
      return '<div class="' + cls2 + '">'
        + '<button class="mkt-acc-header" data-mkt-acc="' + idx + '" aria-expanded="false">'
        + '<span class="mkt-acc-title">' + item.title + '</span>'
        + '<span class="mkt-acc-icon" aria-hidden="true">'
        + '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>'
        + '</span>'
        + '</button>'
        + '<div class="mkt-acc-body" hidden>' + item.body + '</div>'
        + '</div>';
    }).join('');
  }

  // ── TradingView: загрузка tv.js ───────────────────────────────────────────
  var _tvLoading = false;
  var _tvCbs = [];
  function tvLoadScript(cb) {
    if (window.TradingView && window.TradingView.widget) { cb(true); return; }
    _tvCbs.push(cb);
    if (_tvLoading) return;
    _tvLoading = true;

    var timer = setTimeout(function () {
      _tvCbs.forEach(function(c){ c(false); });
      _tvCbs = [];
    }, 10000);

    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    s.onload = function () {
      clearTimeout(timer);
      _tvCbs.forEach(function(c){ c(true); });
      _tvCbs = [];
    };
    s.onerror = function () {
      clearTimeout(timer);
      _tvCbs.forEach(function(c){ c(false); });
      _tvCbs = [];
    };
    document.head.appendChild(s);
  }

  // Inject TV embed widget (Market Overview, Heatmap — читают конфиг из textContent)
  function tvInjectEmbed(container, scriptSrc, config, onErr) {
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    var inner = container.querySelector('.tradingview-widget-container__widget');

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.appendChild(document.createTextNode(JSON.stringify(config)));

    var timer = setTimeout(function () {
      if (!inner.querySelector('iframe')) { if (onErr) onErr(); }
    }, 12000);

    s.onload = function () {
      setTimeout(function () {
        clearTimeout(timer);
        if (!inner.querySelector('iframe')) { if (onErr) onErr(); }
      }, 3000);
    };
    s.onerror = function () { clearTimeout(timer); if (onErr) onErr(); };

    s.src = scriptSrc; // src ставим ПОСЛЕ textContent (TV читает через document.currentScript.textContent)
    container.appendChild(s);
  }

  function tvShowError(errorEl) {
    if (errorEl) errorEl.style.display = '';
  }

  // ── Инициализация секции США (TradingView) ────────────────────────────────
  function initUSSection(page) {
    if (S.tvInited.us) return;
    S.tvInited.us = true;

    // Advanced Chart (tv.js)
    var chartLoading = page.querySelector('#tvChartLoading');
    var chartError   = page.querySelector('#tvChartError');

    tvLoadScript(function (ok) {
      if (chartLoading) chartLoading.style.display = 'none';
      if (!ok || !window.TradingView) { tvShowError(chartError); return; }
      try {
        new window.TradingView.widget({
          symbol:             'SP:SPX',
          interval:           'D',
          timezone:           'America/New_York',
          theme:              'dark',
          style:              '1',
          locale:             'ru',
          toolbar_bg:         '#181D1B',
          enable_publishing:  false,
          hide_side_toolbar:  true,
          allow_symbol_change: true,
          withdateranges:     true,
          save_image:         false,
          calendar:           false,
          autosize:           true,
          height:             380,
          container_id:       'tvChartInner',
        });
      } catch (e) { tvShowError(chartError); }
    });

    // Market Overview embed widget
    var ovContainer = page.querySelector('#tvOverviewContainer');
    var ovLoading   = page.querySelector('#tvOverviewLoading');
    var ovError     = page.querySelector('#tvOverviewError');
    if (ovContainer) {
      if (ovLoading) { setTimeout(function(){ ovLoading.style.display = 'none'; }, 500); }
      tvInjectEmbed(
        ovContainer,
        'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js',
        {
          colorTheme: 'dark', dateRange: '12M', showChart: true, locale: 'ru',
          largeChartUrl: '', isTransparent: true, showSymbolLogo: true,
          showFloatingTooltip: false, width: '100%', height: 400,
          plotLineColorBull: '#27C98A', plotLineColorBear: '#E05858',
          tabs: [
            { title: 'Индексы', symbols: [
                { s: 'SP:SPX',     d: 'S&P 500'   },
                { s: 'NASDAQ:NDX', d: 'Nasdaq 100' },
                { s: 'DJ:DJI',     d: 'Dow Jones'  },
                { s: 'CBOE:VIX',   d: 'VIX'        },
            ]},
            { title: 'Товары', symbols: [
                { s: 'OANDA:XAUUSD', d: 'Золото' },
                { s: 'TVC:UKOIL',    d: 'Brent'  },
                { s: 'TVC:USOIL',    d: 'WTI'    },
            ]},
          ],
        },
        function () { if (ovLoading) ovLoading.style.display = 'none'; tvShowError(ovError); }
      );
    }

    // Stock Heatmap embed widget
    var hmContainer = page.querySelector('#tvHeatmapContainer');
    var hmLoading   = page.querySelector('#tvHeatmapLoading');
    var hmError     = page.querySelector('#tvHeatmapError');
    if (hmContainer) {
      if (hmLoading) { setTimeout(function(){ hmLoading.style.display = 'none'; }, 500); }
      tvInjectEmbed(
        hmContainer,
        'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
        {
          exchanges: [], dataSource: 'SPX500', grouping: 'sector',
          blockSize: 'market_cap_basic', blockColor: 'change',
          locale: 'ru', colorTheme: 'dark', hasTopBar: false,
          isDataSetEnabled: false, isZoomEnabled: true,
          hasSymbolTooltip: true, isMonoSize: false,
          width: '100%', height: 400,
        },
        function () { if (hmLoading) hmLoading.style.display = 'none'; tvShowError(hmError); }
      );
    }
  }

  // ── HTML блока США ────────────────────────────────────────────────────────
  function buildUSHTML() {
    var tvErr = ''
      + '<div class="mkt-tv-error-ico">📡</div>'
      + '<div class="mkt-tv-error-msg">Виджет не загрузился</div>'
      + '<div class="mkt-tv-error-sub">Браузер ограничил внешний скрипт или нет соединения</div>'
      + '<div class="mkt-tv-btns">';

    return ''
      // Предупреждение о задержке TradingView
      + '<div class="mkt-tv-delay-notice">⏱ Данные от TradingView · Cboe One с возможной задержкой 15–30 мин</div>'

      // Advanced Chart
      + '<div class="mkt-section-head" id="mkt-anchor-us-chart">Интерактивный график рынка США</div>'
      + '<div class="mkt-tv-delay-notice" style="margin-bottom:4px">По умолчанию — S&amp;P 500 (SP:SPX). Инструмент можно сменить внутри графика.</div>'
      + '<div class="mkt-tv-delay-notice" style="margin-bottom:8px">Период (1 мес, 3 мес…) — глубина истории. Интервал свечи настраивается внутри графика отдельно.</div>'
      + '<div class="mkt-tv-wrap">'
      + '<div class="mkt-tv-loading" id="tvChartLoading"><div class="mkt-tv-spinner"></div>Загрузка TradingView...</div>'
      + '<div class="mkt-tv-error" id="tvChartError" style="display:none">'
      + tvErr
      + '<button class="mkt-tv-retry-btn" data-tv-retry="chart">↺ Повторить</button>'
      + '<button class="mkt-tv-ext-btn" data-tv-open="https://www.tradingview.com/chart/?symbol=SP:SPX">Открыть во внешнем окне ↗</button>'
      + '</div></div>'
      + '<div id="tvChartInner" style="height:380px;background:var(--bg-card);border-radius:8px"></div>'
      + '</div>'

      // Market Overview
      + '<div class="mkt-section-head">Обзор рынка (TradingView)</div>'
      + '<div class="mkt-tv-wrap">'
      + '<div class="mkt-tv-loading" id="tvOverviewLoading"><div class="mkt-tv-spinner"></div>Загрузка виджета...</div>'
      + '<div class="mkt-tv-error" id="tvOverviewError" style="display:none">'
      + tvErr
      + '<button class="mkt-tv-retry-btn" data-tv-retry="overview">↺ Повторить</button>'
      + '<button class="mkt-tv-ext-btn" data-tv-open="https://www.tradingview.com/markets/">TradingView.com ↗</button>'
      + '</div></div>'
      + '<div id="tvOverviewContainer" class="tradingview-widget-container" style="min-height:200px"></div>'
      + '</div>'

      // Stock Heatmap
      + '<div class="mkt-section-head">Тепловая карта S&amp;P 500 (TradingView)</div>'
      + '<div class="mkt-tv-wrap">'
      + '<div class="mkt-tv-loading" id="tvHeatmapLoading"><div class="mkt-tv-spinner"></div>Загрузка виджета...</div>'
      + '<div class="mkt-tv-error" id="tvHeatmapError" style="display:none">'
      + tvErr
      + '<button class="mkt-tv-retry-btn" data-tv-retry="heatmap">↺ Повторить</button>'
      + '<button class="mkt-tv-ext-btn" data-tv-open="https://www.tradingview.com/heatmap/stock/">TradingView.com ↗</button>'
      + '</div></div>'
      + '<div id="tvHeatmapContainer" class="tradingview-widget-container" style="min-height:200px"></div>'
      + '</div>';
  }

  // ── Построение HTML страницы ─────────────────────────────────────────────
  function buildHTML() {
    return ''
      // Демо-баннер
      + '<div class="mkt-demo-banner">'
      + '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M228,128a100,100,0,1,1-100-100A100,100,0,0,1,228,128Z" opacity="0.2"/><path d="M236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-108,72a8,8,0,0,0,0-16h-4V120a8,8,0,0,0-8-8H104a8,8,0,0,0,0,16h8v56h-4a8,8,0,0,0,0,16Zm0-144a12,12,0,1,0-12-12A12,12,0,0,0,128,56Z"/></svg>'
      + D.demoLabel + ' · MOEX не подключён · '
      + '<a href="https://iss.moex.com/" class="mkt-demo-src-link" target="_blank" rel="noopener">Источник: iss.moex.com</a>'
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

      // Быстрый обзор — общий для обеих вкладок
      + '<div class="mkt-overview-scroll" id="mkt-anchor-overview"><div class="mkt-overview-track" id="mktOverviewTrack"></div></div>'

      // График
      + '<div class="mkt-chart-wrap" id="mkt-anchor-chart">'
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
      + '<div class="mkt-block-demo-note">📊 Демо-график · источник не подключён</div>'
      + '</div>'

      // ── Только Россия ────────────────────────────────────────────────────
      + '<div class="mkt-ru-only">'

      // Индексы
      + '<div class="mkt-section-head" id="mkt-anchor-indices">Индексы' + demoBadge() + '</div>'
      + '<div class="mkt-group-tabs">'
      + '<button class="mkt-group-btn active" data-mkt-group="main">Основные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="bond">Облигационные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="sector">Отраслевые</button>'
      + '</div>'
      + '<div id="mktIndices"></div>'

      // Отрасли
      + '<div class="mkt-section-head" id="mkt-anchor-sectors">Отрасли — изменение за день' + demoBadge() + '</div>'
      + '<div class="mkt-sector-bar-wrap" id="mktSectorBars"></div>'
      + '<button class="mkt-heatmap-btn" id="mktHeatmapBtn">'
      + '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40ZM96,168H64V136H96Zm0-48H64V88H96Zm48,48H112V136h32Zm0-48H112V88h32Zm48,48H160V136h32Zm0-48H160V88h32Z" opacity="0.2"/><path d="M200,32H56A24,24,0,0,0,32,56V200a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V56A24,24,0,0,0,200,32Zm8,168a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8Z"/></svg>'
      + 'Тепловая карта отраслей'
      + '</button>'

      // Лидеры дня
      + '<div class="mkt-section-head" id="mkt-anchor-leaders">Лидеры дня — IMOEX' + demoBadge() + '</div>'
      + '<div class="mkt-leader-tabs">'
      + '<button class="mkt-leader-tab-btn active" data-mkt-leader="gain">▲ Растут</button>'
      + '<button class="mkt-leader-tab-btn" data-mkt-leader="loss">▼ Снижаются</button>'
      + '</div>'
      + '<div id="mktLeaders"></div>'

      // Облигации
      + '<div class="mkt-section-head" id="mkt-anchor-bonds">Облигации' + demoBadge() + '</div>'
      + '<div id="mktBonds"></div>'

      + '</div>' // end .mkt-ru-only

      // ── США (TradingView) ─────────────────────────────────────────────────
      + '<div class="mkt-us-only" style="display:none">'
      + '<div id="mktUSContent"></div>'
      + '</div>'

      // ── Аккордеон «Как читать этот экран» ────────────────────────────────
      + '<div class="mkt-section-head" id="mkt-anchor-accordion" style="margin-top:24px">Как читать этот экран</div>'
      + '<div id="mktAccordion"></div>'
      + '<div style="height:20px"></div>';
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

    if (tab === 'us') {
      // Строим HTML секции США один раз
      var usContent = page.querySelector('#mktUSContent');
      if (usContent && !usContent._built) {
        usContent._built = true;
        usContent.innerHTML = buildUSHTML();
      }
      renderChart(page);
      initUSSection(page);
    } else {
      renderOverview(page, D.ru.overview, 'mktOverviewTrack');
      renderChart(page);
      renderIndices(page);
      renderSectors(page);
      renderLeaders(page);
      renderBonds(page);
    }
  }

  // ── Привязка событий ─────────────────────────────────────────────────────
  function bindEvents(page) {
    page.addEventListener('click', function (e) {
      var t = e.target.closest('[data-mkt-tab],[data-mkt-sel],[data-mkt-period],[data-mkt-group],[data-mkt-leader],[data-mkt-acc],[data-tv-retry],[data-tv-open],[id]');
      if (!t) return;

      if (t.dataset.mktTab)    { switchTab(page, t.dataset.mktTab); return; }

      if (t.dataset.mktSel) {
        S.selected = t.dataset.mktSel;
        if (S.tab === 'ru') {
          renderOverview(page, D.ru.overview, 'mktOverviewTrack');
        } else {
          renderOverview(page, D.us.overview, 'mktUSOverviewTrack');
        }
        renderChart(page);
        renderIndices(page);
        return;
      }

      if (t.dataset.mktPeriod) { S.period = t.dataset.mktPeriod; renderChart(page); return; }
      if (t.dataset.mktGroup)  { S.indexGroup = t.dataset.mktGroup; renderIndices(page); return; }
      if (t.dataset.mktLeader) { S.leaderTab = t.dataset.mktLeader; renderLeaders(page); return; }

      // Аккордеон
      if (t.dataset.mktAcc !== undefined) {
        var item = t.parentElement;
        var body = item.querySelector('.mkt-acc-body');
        var isOpen = !body.hidden;
        // Закрываем все
        page.querySelectorAll('.mkt-acc-item').forEach(function (it) {
          var b = it.querySelector('.mkt-acc-body');
          var h = it.querySelector('.mkt-acc-header');
          if (b) b.hidden = true;
          if (h) {
            h.setAttribute('aria-expanded', 'false');
            h.classList.remove('is-open');
          }
        });
        if (!isOpen) {
          body.hidden = false;
          t.setAttribute('aria-expanded', 'true');
          t.classList.add('is-open');
        }
        return;
      }

      // TV: повтор загрузки
      if (t.dataset.tvRetry) {
        var key = t.dataset.tvRetry;
        if (key === 'chart') {
          var ce = page.querySelector('#tvChartError');
          var cl = page.querySelector('#tvChartLoading');
          if (ce) ce.style.display = 'none';
          if (cl) cl.style.display = '';
          S.tvInited.us = false;
          initUSSection(page);
        }
        return;
      }

      // TV: открыть во внешнем окне
      if (t.dataset.tvOpen) {
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg) { tg.openLink(t.dataset.tvOpen); } else { window.open(t.dataset.tvOpen, '_blank', 'noopener,noreferrer'); }
        return;
      }

      // Тепловая карта
      if (t.id === 'mktHeatmapBtn') { renderHeatmap(); return; }

      // Обновить (демо — перерисовка)
      if (t.id === 'mktRefresh') { switchTab(page, S.tab); return; }
    });

    // Закрытие оверлея тепловой карты
    var overlay = document.getElementById('mktHeatmapOverlay');
    if (overlay) {
      overlay.querySelector('.mkt-heatmap-close').addEventListener('click', function () {
        overlay.classList.remove('open');
      });
    }
  }

  // ── Поиск: экспорт для faq.js ────────────────────────────────────────────
  var SEARCH_ITEMS = [
    { id: 'mks1', label: 'Котировки и обзор рынка',        sub: 'Открыть раздел рынка',             anchor: '',                       kw: 'котировки рынок биржа обзор акции индекс' },
    { id: 'mks2', label: 'IMOEX — Индекс МосБиржи',        sub: 'Перейти к разделу индексов',        anchor: 'mkt-anchor-indices',     kw: 'imoex индекс мосбиржи' },
    { id: 'mks3', label: 'RTSI — Долларовый индекс РТС',   sub: 'Перейти к разделу индексов',        anchor: 'mkt-anchor-indices',     kw: 'rtsi ртс долларовый индекс' },
    { id: 'mks4', label: 'RGBI — Ценовой индекс ОФЗ',      sub: 'Перейти к разделу облигаций',       anchor: 'mkt-anchor-bonds',       kw: 'rgbi офз облигации государственные' },
    { id: 'mks5', label: 'Облигации — индексы',             sub: 'ОФЗ, корп. облигации',             anchor: 'mkt-anchor-bonds',       kw: 'облигации купон корп бонд bond' },
    { id: 'mks6', label: 'Отраслевые индексы',              sub: 'Нефтегаз, финансы, IT, металлы…', anchor: 'mkt-anchor-sectors',     kw: 'отрасль нефтегаз финансы металлы ит телеком энергетика' },
    { id: 'mks7', label: 'Лидеры дня — акции IMOEX',       sub: 'Лучшие и худшие бумаги за день',   anchor: 'mkt-anchor-leaders',     kw: 'лидеры рост падение снижение акции сбербанк' },
    { id: 'mks8', label: 'RVI — Волатильность рынка РФ',   sub: 'Перейти к обзорным карточкам',     anchor: 'mkt-anchor-overview',    kw: 'rvi волатильность vix тревога' },
    { id: 'mks9', label: 'S&P 500 — рынок США',             sub: 'График TradingView',               anchor: 'mkt-anchor-us-chart',    kw: 'sp500 сша америка nasdaq dow jones ndx djia' },
    { id: 'mksA', label: 'Как читать этот экран',           sub: 'Объяснение всех блоков раздела',   anchor: 'mkt-anchor-accordion',   kw: 'как читать объяснение инструкция справка' },
  ];

  var SVG_CHART_ICON = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M232,208H48V56a8,8,0,0,0-16,0V208H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM88,168a8,8,0,0,0,5.66-2.34L136,123.31l42.34,42.35a8,8,0,0,0,11.32,0l56-56a8,8,0,0,0-11.32-11.32L184,148.69l-42.34-42.35a8,8,0,0,0-11.32,0L88,148.69,53.66,114.34a8,8,0,0,0-11.32,11.32l40,40A8,8,0,0,0,88,168Z"/></svg>';
  var SVG_ARROW_RIGHT = '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></svg>';

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.marketSearchHtml = function (query) {
    if (!query || query.length < 2) return '';
    var q = query.toLowerCase().trim();
    var hits = SEARCH_ITEMS.filter(function (item) {
      return item.kw.indexOf(q) >= 0 || item.label.toLowerCase().indexOf(q) >= 0;
    });
    if (!hits.length) return '';

    return '<div class="faq-group mkt-search-group">'
      + '<div class="faq-group-title"><span class="faq-group-icon">' + SVG_CHART_ICON + '</span>Рынок</div>'
      + hits.map(function (item) {
          return '<div class="faq-card mkt-search-card" data-mkt-search-open="' + escHtml(item.anchor) + '" role="button" tabindex="0">'
            + '<div class="faq-card-header">'
            + '<div class="faq-card-left">'
            + '<span class="faq-card-label"><span class="faq-card-label-icon">' + SVG_CHART_ICON + '</span>Рынок</span>'
            + '<div class="faq-card-q">' + escHtml(item.label) + '</div>'
            + '<div class="faq-card-short">' + escHtml(item.sub) + '</div>'
            + '</div>'
            + '<div class="faq-card-toggle" aria-hidden="true">' + SVG_ARROW_RIGHT + '</div>'
            + '</div>'
            + '</div>';
        }).join('')
      + '</div>';
  };

  // Глобальный обработчик: клик по результату поиска из FAQ
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-mkt-search-open]');
    if (!t) return;
    var anchor = t.dataset.mktSearchOpen;
    if (window.setPage) {
      window.setPage('market');
      if (anchor) {
        setTimeout(function () {
          var el = document.getElementById(anchor);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }
  });

  // ── Инициализация ────────────────────────────────────────────────────────
  function initMarket() {
    var page = document.querySelector('[data-page="market"]');
    if (!page || page._mktInit) return;
    page._mktInit = true;

    page.querySelector('#mktContent').innerHTML = buildHTML();

    renderOverview(page, D.ru.overview, 'mktOverviewTrack');
    renderChart(page);
    renderIndices(page);
    renderSectors(page);
    renderLeaders(page);
    renderBonds(page);
    renderAccordion(page);

    bindEvents(page);
  }

  // Перехватываем setPage для инициализации при переходе
  var _origSetPage = window.setPage;
  if (typeof _origSetPage === 'function') {
    window.setPage = function (name, push) {
      _origSetPage(name, push);
      if (name === 'market') { setTimeout(initMarket, 0); }
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('[data-page="market"].active')) initMarket();
  });

}());
