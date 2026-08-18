// assets/market.js v8 — live MOEX ISS + Lightweight Charts (no demo fallback)
// Источник данных: iss.moex.com (задержка ≥15 мин)
// График: Lightweight Charts (Apache 2.0, локальная копия assets/lwcharts.js)

(function () {
  'use strict';

  var D  = window.MARKET_DATA;   // конфиг имён и текстов (котировки не используются)
  var MA = window.MOEXAdapter;   // MOEX ISS adapter

  var _EXT_IC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M224,104a8,8,0,0,1-16,0V79.32l-82.34,82.34a8,8,0,0,1-11.32-11.32L196.68,68H172a8,8,0,0,1,0-16h44a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>';

  // ── Состояние ─────────────────────────────────────────────────────────────
  var S = {
    tab:        'ru',
    period:     '1m',
    selected:   'IMOEX',
    indexGroup: 'main',
    leaderTab:  'gain',
    fetchSeq:   0,
    tvInited:   {},
    usSymbol:   'NASDAQ:AAPL',
    ld: {
      indexMap:   null,
      leaders:    null,
      fetchTs:    null,
      updateTime: null,
      cacheTs:    null,   // timestamp записи в localStorage (для stale-баннера)
      staleMin:   null,
      error:      null,
      indStatus:  'idle',
      ldrStatus:  'idle',
      chrStatus:  'idle',
      lwChart:    null,
      lwSeries:   null,
    },
  };

  // ── LocalStorage кэш ──────────────────────────────────────────────────────
  var _LS_KEY = 'mkt_indices_v1';

  function _fmtCacheDate(ts) {
    var d = new Date(ts);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mn = String(d.getMinutes()).padStart(2, '0');
    return dd + '.' + mm + '.' + d.getFullYear() + ', ' + hh + ':' + mn;
  }

  function _saveToLS(indexMap, quoteTs, fetchTs) {
    try {
      localStorage.setItem(_LS_KEY, JSON.stringify({
        schema: 1, source: 'moex',
        fetchTs: fetchTs, quoteTs: quoteTs || null,
        data: indexMap,
      }));
    } catch(e) {}
  }

  function _loadFromLS() {
    try {
      var raw = localStorage.getItem(_LS_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || obj.schema !== 1 || obj.source !== 'moex' || !obj.data) return null;
      return obj;
    } catch(e) { return null; }
  }

  // ── Форматирование ─────────────────────────────────────────────────────────
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
  function cls(v) { return v > 0 ? 'mkt-up' : v < 0 ? 'mkt-down' : 'mkt-neutral'; }

  var SVG_UP   = '<svg width="10" height="10" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,200H40a8,8,0,0,1,0-16H216a8,8,0,0,1,0,16Zm-37.65-93.65-42.34-42.35a8,8,0,0,0-11.32,0L82.35,106.35a8,8,0,0,0,11.32,11.32L120,91.31V160a8,8,0,0,0,16,0V91.31l26.34,26.36a8,8,0,0,0,11.32-11.32Z"/></svg>';
  var SVG_DOWN = '<svg width="10" height="10" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,56H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm-37.65,90.35a8,8,0,0,0-11.32,0L136,172.69V104a8,8,0,0,0-16,0v68.69l-26.34-26.34a8,8,0,0,0-11.32,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,178.35,146.35Z"/></svg>';
  function icon(v) { return v > 0 ? SVG_UP : v < 0 ? SVG_DOWN : ''; }

  function _timeHM(str) {
    if (!str || str.length < 16) return str || '';
    return str.substring(11, 16);
  }
  function _nowHM() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // ── Парсинг ответов ISS ────────────────────────────────────────────────────

  function _parseIndicesResponse(res) {
    if (!res || !res.data) return null;
    var rows = MA.parseIss(res.data, 'marketdata');
    var map  = {};
    rows.forEach(function (r) {
      if (r.CURRENTVALUE === null || r.CURRENTVALUE === undefined) return;
      map[r.SECID] = {
        value:      r.CURRENTVALUE,
        pct:        r.LASTCHANGEPRC,
        change:     r.LASTCHANGE,
        updateTime: r.UPDATETIME || null,
        systime:    r.SYSTIME || null,
      };
    });
    return Object.keys(map).length ? map : null;
  }

  function _parseLeadersResponse(res) {
    if (!res || !res.data) return null;
    var secs  = MA.parseIss(res.data, 'securities');
    var mdata = MA.parseIss(res.data, 'marketdata');
    var nameMap = {};
    secs.forEach(function (r) { nameMap[r.SECID] = r.SHORTNAME; });
    var items = mdata
      .filter(function (r) { return r.LAST && r.LASTTOPREVPRICE !== null && r.LASTTOPREVPRICE !== undefined; })
      .map(function (r) {
        return { ticker: r.SECID, name: nameMap[r.SECID] || r.SECID, price: r.LAST, pct: r.LASTTOPREVPRICE, change: 0 };
      });
    var byAsc  = items.slice().sort(function (a, b) { return a.pct - b.pct; });
    var byDesc = items.slice().sort(function (a, b) { return b.pct - a.pct; });
    return {
      gain: byDesc.filter(function (r) { return r.pct > 0; }).slice(0, 5),
      loss: byAsc.filter(function (r) { return r.pct < 0; }).slice(0, 5),
    };
  }

  function _issBeginToLwTime(begin, isIntraday) {
    if (!begin) return null;
    if (!isIntraday) return begin.substring(0, 10);
    var s  = begin.replace(' ', 'T') + '+03:00';
    var ms = new Date(s).getTime();
    if (isNaN(ms)) return null;
    return Math.floor(ms / 1000);
  }

  function _parseCandlesResponse(res, period) {
    if (!res || !res.data) return null;
    var rows = MA.parseIss(res.data, 'candles');
    if (!rows.length) return [];
    var isIntraday = (period === '1d' || period === '1w');
    var result = [];
    rows.forEach(function (r) {
      if (r.close === null || r.close === undefined || !r.begin) return;
      var t = _issBeginToLwTime(r.begin, isIntraday);
      if (t === null) return;
      result.push({ time: t, open: r.open, high: r.high, low: r.low, close: r.close, value: r.close });
    });
    result.sort(function (a, b) {
      if (typeof a.time === 'number') return a.time - b.time;
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });
    return result;
  }

  // ── Слияние: только реальные данные MOEX (демо-значения не используются) ──

  function _mergedOverview(cfgList) {
    var map = S.ld.indexMap;
    if (!map) return [];
    return cfgList.filter(function (item) { return !!map[item.ticker]; }).map(function (item) {
      var live = map[item.ticker];
      return {
        ticker: item.ticker,
        name:   item.name,
        value:  live.value,
        change: live.change !== null && live.change !== undefined ? live.change : 0,
        pct:    live.pct,
        unit:   item.unit,
        time:   _timeHM(live.updateTime) || '',
        live:   true,
      };
    });
  }

  function _mergedIndicesGroup(cfgGroup) {
    var map = S.ld.indexMap;
    if (!map) return [];
    return cfgGroup.filter(function (item) { return !!map[item.ticker]; }).map(function (item) {
      var live = map[item.ticker];
      return { ticker: item.ticker, name: item.name, value: live.value, change: live.change, pct: live.pct, live: true };
    });
  }

  function _mergedSectors(cfgSectors) {
    var map = S.ld.indexMap;
    if (!map) return [];
    return cfgSectors.filter(function (item) { return !!map[item.ticker]; }).map(function (item) {
      var live = map[item.ticker];
      return { ticker: item.ticker, name: item.name, value: live.value, change: live.change, pct: live.pct, weight: item.weight, live: true };
    });
  }

  // ── Статусная строка (внутри mktRuPanel) ──────────────────────────────────

  function _renderStatus(page) {
    var el = page && page.querySelector('#mktDataStatus');
    if (!el) return;
    var st = S.ld.indStatus;
    var html = '';
    if (st === 'idle' || st === 'loading') {
      html = '<span class="mkt-status-loading"><span class="mkt-status-spin"></span>Загружаем данные…</span>';
    } else if (st === 'ok') {
      var upd = S.ld.updateTime ? _timeHM(S.ld.updateTime) : '—';
      var got = S.ld.fetchTs ? _nowHM() : '—';
      html = '<span class="mkt-status-ok">МосБиржа · данные ≥15 мин · котировки: ' + upd + ' · обновлено: ' + got + '</span>';
    } else if (st === 'stale') {
      var cacheStr = S.ld.cacheTs ? _fmtCacheDate(S.ld.cacheTs) : '';
      var msg = cacheStr
        ? 'Последние сохраненные данные МосБиржи на ' + cacheStr + '. Данные могут быть устаревшими'
        : 'Данные могут быть устаревшими';
      html = '<span class="mkt-status-stale">⚠ ' + msg + '</span>'
           + ' <button class="mkt-status-retry" id="mktStatusRetry">↺ Обновить</button>';
    } else if (st === 'error') {
      html = '<span class="mkt-status-error">Не удалось получить данные МосБиржи</span>'
           + ' <button class="mkt-status-retry" id="mktStatusRetry">↺ Повторить</button>';
    }
    el.innerHTML = html;
  }

  // ── Карточки быстрого обзора ───────────────────────────────────────────────
  function renderOverview(page, _list, trackId) {
    var id = trackId || 'mktOverviewTrack';
    var el = page && page.querySelector('#' + id);
    if (!el) return;
    var list = _mergedOverview(D.ru.overview);
    var html = '';
    list.forEach(function (item) {
      var sel = item.ticker === S.selected ? ' selected' : '';
      var c   = cls(item.change);
      html += '<div class="mkt-ticker-card' + sel + '" data-mkt-sel="' + item.ticker + '">'
        + '<div class="mkt-ticker-name">' + item.name + '</div>'
        + '<div class="mkt-ticker-sym">' + item.ticker + '</div>'
        + '<div class="mkt-ticker-val">' + fNum(item.value, item.unit) + ' <span style="font-size:10px;color:var(--text-muted)">' + item.unit + '</span></div>'
        + '<div class="mkt-ticker-chg ' + c + '">' + icon(item.change) + fChg(item.change, item.unit) + ' <span style="opacity:.7">' + fPct(item.pct) + '</span></div>'
        + '<div class="mkt-ticker-time">' + item.time + '</div>'
        + '</div>';
    });
    el.innerHTML = html;
  }

  // ── График (Lightweight Charts / SVG fallback) ────────────────────────────

  function _getLwCharts() { return window.LightweightCharts || null; }

  function _setChartLoading(page, show) {
    var el = page.querySelector('#mktChartLoading');
    if (el) el.style.display = show ? '' : 'none';
  }
  function _setChartError(page, msg) {
    var el = page.querySelector('#mktChartError');
    if (!el) return;
    el.style.display = '';
    var m = el.querySelector('.mkt-chart-err-msg');
    if (m) m.textContent = msg || 'Нет данных';
  }
  function _clearChartError(page) {
    var el = page.querySelector('#mktChartError');
    if (el) el.style.display = 'none';
  }

  function _renderLwChart(page, candles, period) {
    var LW = _getLwCharts();
    var container = page.querySelector('#mktLwChartContainer');
    if (!container) return;
    _clearChartError(page);
    if (S.ld.lwChart) { try { S.ld.lwChart.remove(); } catch(e) {} S.ld.lwChart = null; S.ld.lwSeries = null; }
    if (!LW) { _renderFallbackSvg(container, candles); return; }
    if (!candles || !candles.length) { _setChartError(page, 'Нет данных за выбранный период'); return; }

    var isIntraday = (period === '1d' || period === '1w');
    var first = candles[0], last = candles[candles.length - 1];
    var isUp  = last.close >= first.close;
    var lineColor   = isUp ? '#27C98A' : '#E05858';
    var topColor    = isUp ? 'rgba(39,201,138,0.22)' : 'rgba(224,88,88,0.22)';
    var bottomColor = 'rgba(0,0,0,0)';

    var chart = LW.createChart(container, {
      width:  container.offsetWidth || 320,
      height: 160,
      layout:  { background: { type: 'solid', color: 'transparent' }, textColor: '#A6AFAA', fontSize: 10 },
      grid:    { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)', timeVisible: isIntraday, secondsVisible: false,
        rightOffset: 2, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)', scaleMargins: { top: 0.1, bottom: 0.1 } },
      handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
      handleScale:  { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
    });

    var series = chart.addAreaSeries({
      lineColor: lineColor, topColor: topColor, bottomColor: bottomColor,
      lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
    });
    series.setData(candles.map(function (c) { return { time: c.time, value: c.close }; }));
    chart.timeScale().fitContent();
    S.ld.lwChart = chart; S.ld.lwSeries = series;

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (S.ld.lwChart) { var w = container.offsetWidth; if (w > 0) S.ld.lwChart.applyOptions({ width: w }); }
      });
      ro.observe(container);
    }
  }

  function _renderFallbackSvg(container, candles) {
    if (!candles || !candles.length) { container.innerHTML = '<div class="mkt-chart-empty">Нет данных</div>'; return; }
    var pts = candles.map(function (c) { return c.close; });
    var W = 320, H = 110, PY = 10;
    var min = pts[0], max = pts[0];
    for (var k = 1; k < pts.length; k++) { if (pts[k] < min) min = pts[k]; if (pts[k] > max) max = pts[k]; }
    var range = (max - min) || 1;
    var n = pts.length, xs = [], ys = [];
    for (var i = 0; i < n; i++) {
      xs.push((i / (n - 1)) * W);
      ys.push(H - PY - ((pts[i] - min) / range) * (H - PY * 2));
    }
    var polyPts = xs.map(function (x, j) { return x.toFixed(1) + ',' + ys[j].toFixed(1); }).join(' ');
    var color = pts[n-1] >= pts[0] ? 'var(--mkt-up)' : 'var(--mkt-down)';
    container.innerHTML = '<svg class="mkt-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<polyline points="' + polyPts + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'
      + '</svg>';
  }

  function renderChart(page) {
    var ticker = S.selected;
    var list   = _mergedOverview(D.ru.overview);
    var data   = list.find(function (i) { return i.ticker === ticker; }) || list[0];

    var el = page.querySelector('#mktChartTicker');
    if (el) el.textContent = data ? (data.name + ' · ' + ticker) : ticker;
    el = page.querySelector('#mktChartVal');
    if (el) el.textContent = data ? (fNum(data.value, data.unit) + ' ' + (data.unit || '')) : '—';
    el = page.querySelector('#mktChartChg');
    if (el) el.innerHTML = data
      ? '<span class="' + cls(data.change) + '">' + icon(data.change) + fChg(data.change, data.unit) + ' (' + fPct(data.pct) + ')</span>'
      : '';

    page.querySelectorAll('.mkt-period-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktPeriod === S.period);
    });
    _fetchAndRenderChart(page, ticker, S.period);
  }

  function _fetchAndRenderChart(page, ticker, period) {
    if (!MA || !MA.isEnabled()) {
      _setChartLoading(page, false);
      _setChartError(page, 'Источник данных недоступен');
      return;
    }
    S.ld.chrStatus = 'loading';
    _setChartLoading(page, true);
    MA.getCandles(ticker, period).then(function (res) {
      _setChartLoading(page, false);
      var candles = _parseCandlesResponse(res, period);
      if (!candles || !candles.length) {
        S.ld.chrStatus = 'error';
        _setChartError(page, 'Нет данных за период · попробуйте другой диапазон');
        return;
      }
      S.ld.chrStatus = res.stale ? 'stale' : 'ok';
      _renderLwChart(page, candles, period);
    }).catch(function (err) {
      _setChartLoading(page, false);
      S.ld.chrStatus = 'error';
      _setChartError(page, 'Ошибка загрузки свечей: ' + err.message);
    });
  }

  // ── Индексы ────────────────────────────────────────────────────────────────
  function renderIndices(page) {
    var wrap = page.querySelector('#mktIndices');
    if (!wrap || S.tab !== 'ru') return;
    var raw  = D.ru.indices[S.indexGroup] || [];
    var list = _mergedIndicesGroup(raw);
    if (!list.length) {
      wrap.innerHTML = '<div class="mkt-no-data">Нет данных</div>';
    } else {
      var html = '';
      list.forEach(function (idx) {
        var sel = idx.ticker === S.selected ? ' selected' : '';
        var c   = cls(idx.change);
        html += '<div class="mkt-index-row' + sel + '" data-mkt-sel="' + idx.ticker + '">'
          + '<div class="mkt-index-name"><div class="mkt-index-ticker">' + idx.ticker + '</div><div class="mkt-index-label">' + idx.name + '</div></div>'
          + '<div class="mkt-index-val">' + fNum(idx.value) + '</div>'
          + '<div class="mkt-index-chg ' + c + '">' + icon(idx.change) + fPct(idx.pct) + '</div>'
          + '</div>';
      });
      wrap.innerHTML = html;
    }
    page.querySelectorAll('.mkt-group-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktGroup === S.indexGroup);
    });
  }

  // ── Отрасли ────────────────────────────────────────────────────────────────
  function renderSectors(page) {
    var wrap = page.querySelector('#mktSectorBars');
    if (!wrap || S.tab !== 'ru') return;
    var raw  = D.ru.indices.sector;
    var list = _mergedSectors(raw);
    if (!list.length) { wrap.innerHTML = '<div class="mkt-no-data">Нет данных</div>'; return; }
    list = list.slice().sort(function (a, b) { return b.pct - a.pct; });
    var maxAbs = Math.max.apply(null, list.map(function (s) { return Math.abs(s.pct); })) || 1;
    var html = '';
    list.forEach(function (s) {
      var c   = cls(s.change);
      var w   = (Math.abs(s.pct) / maxAbs * 100).toFixed(1);
      var clr = s.pct > 0 ? 'var(--mkt-up)' : 'var(--mkt-down)';
      html += '<div class="mkt-sector-row">'
        + '<div class="mkt-sector-label" title="' + s.name + '">' + s.name + '</div>'
        + '<div class="mkt-sector-bar-track"><div class="mkt-sector-bar-fill" style="width:' + w + '%;background:' + clr + '"></div></div>'
        + '<div class="mkt-sector-pct ' + c + '">' + icon(s.change) + fPct(s.pct) + '</div>'
        + '</div>';
    });
    wrap.innerHTML = html;
  }

  // ── Тепловая карта ─────────────────────────────────────────────────────────
  function renderHeatmap() {
    var overlay = document.getElementById('mktHeatmapOverlay');
    if (!overlay) return;
    var grid = overlay.querySelector('.mkt-heatmap-grid');
    var list = _mergedSectors(D.ru.indices.sector);
    if (!list.length) { overlay.classList.add('open'); grid.innerHTML = '<div class="mkt-no-data" style="padding:20px">Нет данных</div>'; return; }
    var total = list.reduce(function (a, s) { return a + s.weight; }, 0);
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

  // ── Лидеры дня ─────────────────────────────────────────────────────────────
  function renderLeaders(page) {
    var wrap = page.querySelector('#mktLeaders');
    if (!wrap || S.tab !== 'ru') return;
    var liveList = (S.ld.leaders && (S.ld.ldrStatus === 'ok' || S.ld.ldrStatus === 'stale'))
      ? S.ld.leaders[S.leaderTab] : null;
    if (!liveList || !liveList.length) {
      var msg = S.ld.ldrStatus === 'loading' ? 'Загружаем…' : 'Нет данных · рынок может быть закрыт';
      wrap.innerHTML = '<div class="mkt-no-data">' + msg + '</div>';
    } else {
      var html = '';
      liveList.forEach(function (l) {
        var c = cls(l.pct);
        html += '<div class="mkt-leader-row">'
          + '<div class="mkt-leader-ticker">' + l.ticker + '</div>'
          + '<div class="mkt-leader-name">' + l.name + '</div>'
          + '<div class="mkt-leader-price">' + fNum(l.price) + ' ₽</div>'
          + '<div class="mkt-leader-chg ' + c + '">' + icon(l.pct) + fPct(l.pct) + '</div>'
          + '</div>';
      });
      wrap.innerHTML = html;
    }
    page.querySelectorAll('.mkt-leader-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktLeader === S.leaderTab);
    });
  }

  // ── Облигации ───────────────────────────────────────────────────────────────
  function renderBonds(page) {
    var wrap = page.querySelector('#mktBonds');
    if (!wrap || S.tab !== 'ru') return;
    var map      = S.ld.indexMap;
    var govLive  = map && map['RGBI'];
    var corpLive = map && map['RUCBTRNS'];
    if (!govLive && !corpLive) {
      wrap.innerHTML = '<div class="mkt-no-data">Нет данных</div>';
      return;
    }
    var demoB = D.ru.bonds;  // только имена и сноска
    var html = '<div class="mkt-bond-cards">';
    if (govLive) {
      html += '<div class="mkt-bond-card">'
        + '<div class="mkt-bond-card-label">' + demoB.gov.name + '</div>'
        + '<div class="mkt-bond-card-val">' + fNum(govLive.value) + '</div>'
        + '<div class="mkt-bond-card-chg ' + cls(govLive.change) + '">' + icon(govLive.change) + fChg(govLive.change) + ' (' + fPct(govLive.pct) + ')</div>'
        + '</div>';
    }
    if (corpLive) {
      html += '<div class="mkt-bond-card">'
        + '<div class="mkt-bond-card-label">' + demoB.corp.name + '</div>'
        + '<div class="mkt-bond-card-val">' + fNum(corpLive.value) + '</div>'
        + '<div class="mkt-bond-card-chg ' + cls(corpLive.change) + '">' + icon(corpLive.change) + fChg(corpLive.change) + ' (' + fPct(corpLive.pct) + ')</div>'
        + '</div>';
    }
    html += '</div><div class="mkt-bond-note">' + demoB.note + '</div>';
    wrap.innerHTML = html;
  }

  // ── Аккордеон ──────────────────────────────────────────────────────────────
  function renderAccordion(page) {
    var wrap = page.querySelector('#mktAccordion');
    if (!wrap) return;
    var items = D.accordion || [];
    wrap.innerHTML = items.map(function (item, idx) {
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

  // ── TradingView (США) ─────────────────────────────────────────────────────
  var _tvLoading = false;
  var _tvCbs = [];
  function tvLoadScript(cb) {
    if (window.TradingView && window.TradingView.widget) { cb(true); return; }
    _tvCbs.push(cb);
    if (_tvLoading) return;
    _tvLoading = true;
    var timer = setTimeout(function () { _tvCbs.forEach(function (c) { c(false); }); _tvCbs = []; }, 10000);
    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    s.onload  = function () { clearTimeout(timer); _tvCbs.forEach(function (c) { c(true); });  _tvCbs = []; };
    s.onerror = function () { clearTimeout(timer); _tvCbs.forEach(function (c) { c(false); }); _tvCbs = []; };
    document.head.appendChild(s);
  }

  function tvInjectEmbed(container, scriptSrc, config, onErr, onSuccess) {
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    var inner = container.querySelector('.tradingview-widget-container__widget');
    var s = document.createElement('script');
    s.type = 'text/javascript'; s.async = true;
    s.appendChild(document.createTextNode(JSON.stringify(config)));
    var done = false, timeoutId, pollId;
    function _cleanup() { clearTimeout(timeoutId); clearInterval(pollId); }
    function _succeed() { if (done) return; done = true; _cleanup(); if (onSuccess) onSuccess(); }
    function _fail()    { if (done) return; done = true; _cleanup(); if (onErr) onErr(); }
    timeoutId = setTimeout(function () { inner.querySelector('iframe') ? _succeed() : _fail(); }, 8000);
    pollId = setInterval(function () { if (inner.querySelector('iframe')) _succeed(); }, 600);
    s.onerror = _fail;
    s.src = scriptSrc;
    container.appendChild(s);
  }

  // ── Инструменты рынка США ────────────────────────────────────────────────
  var _US_SYMS = [
    { sym: 'NASDAQ:AAPL', name: 'Apple',     label: 'Apple · AAPL',         head: 'Акции Apple · NASDAQ:AAPL',               tv: 'https://www.tradingview.com/symbols/NASDAQ-AAPL/'  },
    { sym: 'NASDAQ:MSFT', name: 'Microsoft', label: 'Microsoft · MSFT',     head: 'Акции Microsoft · NASDAQ:MSFT',           tv: 'https://www.tradingview.com/symbols/NASDAQ-MSFT/'  },
    { sym: 'NASDAQ:NVDA', name: 'NVIDIA',    label: 'NVIDIA · NVDA',        head: 'Акции NVIDIA · NASDAQ:NVDA',              tv: 'https://www.tradingview.com/symbols/NASDAQ-NVDA/'  },
    { sym: 'NASDAQ:AMZN', name: 'Amazon',    label: 'Amazon · AMZN',        head: 'Акции Amazon · NASDAQ:AMZN',              tv: 'https://www.tradingview.com/symbols/NASDAQ-AMZN/'  },
    { sym: 'NASDAQ:GOOGL',name: 'Alphabet',  label: 'Alphabet · GOOGL',     head: 'Акции Alphabet · NASDAQ:GOOGL',           tv: 'https://www.tradingview.com/symbols/NASDAQ-GOOGL/' },
    { sym: 'NASDAQ:META', name: 'Meta',      label: 'Meta · META',          head: 'Акции Meta · NASDAQ:META',                tv: 'https://www.tradingview.com/symbols/NASDAQ-META/'  },
    { sym: 'NASDAQ:TSLA', name: 'Tesla',     label: 'Tesla · TSLA',         head: 'Акции Tesla · NASDAQ:TSLA',               tv: 'https://www.tradingview.com/symbols/NASDAQ-TSLA/'  },
    { sym: 'AMEX:SPY',    name: 'SPY',       label: 'SPY · ETF S&P 500',    head: 'SPY · ETF на S&P 500 · AMEX:SPY',         tv: 'https://www.tradingview.com/symbols/AMEX-SPY/'     },
    { sym: 'NASDAQ:QQQ',  name: 'QQQ',       label: 'QQQ · ETF Nasdaq-100', head: 'QQQ · ETF на Nasdaq-100 · NASDAQ:QQQ',    tv: 'https://www.tradingview.com/symbols/NASDAQ-QQQ/'   },
  ];
  function _usCfg(sym) {
    for (var i = 0; i < _US_SYMS.length; i++) { if (_US_SYMS[i].sym === sym) return _US_SYMS[i]; }
    return _US_SYMS[0];
  }
  function _updateChartTexts(page, sym) {
    var cfg = _usCfg(sym);
    var sh = page.querySelector('#mkt-anchor-us-chart');
    if (sh) sh.textContent = cfg.head;
    var cl = page.querySelector('#tvChartLoading');
    if (cl) cl.innerHTML = '<div class="mkt-tv-spinner"></div>Загружаем график ' + cfg.name + '…';
    var em = page.querySelector('#tvChartErrorMsg');
    if (em) em.textContent = 'График ' + cfg.name + ' не загрузился';
    page.querySelectorAll('.tvChartExtUrl').forEach(function (b) { b.dataset.tvOpen = cfg.tv; });
  }

  var _tvChartSeq    = 0;
  var _tvChartPollId = null;
  var _tvChartTimId  = null;

  function _tvChartStop() {
    if (_tvChartPollId !== null) { clearInterval(_tvChartPollId); _tvChartPollId = null; }
    if (_tvChartTimId  !== null) { clearTimeout(_tvChartTimId);  _tvChartTimId  = null; }
  }

  function initTVChart(page, sym) {
    sym = sym || S.usSymbol || 'NASDAQ:AAPL';
    var seq = ++_tvChartSeq;
    _tvChartStop();

    var ci = page.querySelector('#tvChartInner');
    var cl = page.querySelector('#tvChartLoading');
    var ce = page.querySelector('#tvChartError');
    var ca = page.querySelector('#tvChartAfter');

    _updateChartTexts(page, sym);
    if (ci) { ci.innerHTML = ''; ci.style.display = 'none'; }
    if (cl) cl.style.display = '';
    if (ce) ce.style.display = 'none';
    if (ca) ca.style.display = 'none';

    tvLoadScript(function (ok) {
      if (seq !== _tvChartSeq) return;
      if (!ok || !window.TradingView) {
        if (cl) cl.style.display = 'none'; if (ce) ce.style.display = ''; return;
      }
      try {
        new window.TradingView.widget({
          symbol: sym, interval: 'D', timezone: 'exchange',
          theme: 'dark', style: '1', locale: 'ru', toolbar_bg: '#181D1B',
          enable_publishing: false, hide_side_toolbar: true, allow_symbol_change: false,
          withdateranges: true, save_image: false, calendar: false,
          autosize: true, height: 380, container_id: 'tvChartInner',
        });
        function _ok() {
          if (seq !== _tvChartSeq) return;
          _tvChartStop();
          if (cl) cl.style.display = 'none'; if (ci) ci.style.display = ''; if (ca) ca.style.display = '';
        }
        function _fail() {
          if (seq !== _tvChartSeq) return;
          _tvChartStop();
          if (cl) cl.style.display = 'none'; if (ce) ce.style.display = '';
        }
        _tvChartPollId = setInterval(function () { if (ci && ci.querySelector('iframe')) _ok(); }, 600);
        _tvChartTimId  = setTimeout(function ()  { ci && ci.querySelector('iframe') ? _ok() : _fail(); }, 12000);
      } catch (e) {
        if (seq !== _tvChartSeq) return;
        if (cl) cl.style.display = 'none'; if (ce) ce.style.display = '';
      }
    });
  }

  function initTVOverview(page) {
    var oc = page.querySelector('#tvOverviewContainer');
    var ol = page.querySelector('#tvOverviewLoading');
    var oe = page.querySelector('#tvOverviewError');
    var oa = page.querySelector('#tvOverviewAfter');
    if (!oc) return;
    if (ol) ol.style.display = ''; if (oe) oe.style.display = 'none'; oc.style.display = 'none'; if (oa) oa.style.display = 'none';
    tvInjectEmbed(oc,
      'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js',
      { colorTheme: 'dark', dateRange: '12M', showChart: true, locale: 'ru',
        largeChartUrl: '', isTransparent: true, showSymbolLogo: true, showFloatingTooltip: false,
        width: '100%', height: 400, plotLineColorBull: '#27C98A', plotLineColorBear: '#E05858',
        tabs: [
          { title: 'Индексы', symbols: [{ s: 'SP:SPX', d: 'S&P 500' }, { s: 'NASDAQ:NDX', d: 'Nasdaq 100' }, { s: 'DJ:DJI', d: 'Dow Jones' }, { s: 'CBOE:VIX', d: 'VIX' }] },
          { title: 'Товары',  symbols: [{ s: 'OANDA:XAUUSD', d: 'Золото' }, { s: 'TVC:UKOIL', d: 'Brent' }, { s: 'TVC:USOIL', d: 'WTI' }] },
        ] },
      function () { if (ol) ol.style.display = 'none'; if (oe) oe.style.display = ''; },
      function () { if (ol) ol.style.display = 'none'; oc.style.display = ''; if (oa) oa.style.display = ''; }
    );
  }

  function initTVHeatmap(page) {
    var hc = page.querySelector('#tvHeatmapContainer');
    var hl = page.querySelector('#tvHeatmapLoading');
    var he = page.querySelector('#tvHeatmapError');
    var ha = page.querySelector('#tvHeatmapAfter');
    if (!hc) return;
    if (hl) hl.style.display = ''; if (he) he.style.display = 'none'; hc.style.display = 'none'; if (ha) ha.style.display = 'none';
    tvInjectEmbed(hc,
      'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
      { exchanges: [], dataSource: 'SPX500', grouping: 'sector',
        blockSize: 'market_cap_basic', blockColor: 'change',
        locale: 'ru', colorTheme: 'dark', hasTopBar: false,
        isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true,
        isMonoSize: false, width: '100%', height: 400 },
      function () { if (hl) hl.style.display = 'none'; if (he) he.style.display = ''; },
      function () { if (hl) hl.style.display = 'none'; hc.style.display = ''; if (ha) ha.style.display = ''; }
    );
  }

  function initUSSection(page) {
    initTVChart(page, S.usSymbol);
    if (!S.tvInited.us) {
      S.tvInited.us = true;
      initTVOverview(page); initTVHeatmap(page);
      var sel = page.querySelector('#tvSymbolSelect');
      if (sel) {
        sel.addEventListener('change', function () {
          S.usSymbol = this.value;
          initTVChart(page, S.usSymbol);
        });
      }
    } else {
      var sel2 = page.querySelector('#tvSymbolSelect');
      if (sel2) sel2.value = S.usSymbol;
    }
  }

  // ── HTML блока США ────────────────────────────────────────────────────────
  function buildUSHTML() {
    function tvLoading(id, text) {
      return '<div class="mkt-tv-loading" id="' + id + '" role="status" aria-live="polite"><div class="mkt-tv-spinner"></div>' + text + '</div>';
    }
    function tvError(id, msgId, retryKey, openUrl) {
      return '<div class="mkt-tv-error" id="' + id + '" style="display:none" role="status">'
        + '<div class="mkt-tv-error-ico">📡</div>'
        + '<div class="mkt-tv-error-msg" id="' + msgId + '"></div>'
        + '<div class="mkt-tv-error-sub">Telegram ограничил внешний скрипт или нет соединения</div>'
        + '<div class="mkt-tv-btns">'
        + '<button class="mkt-tv-retry-btn" data-tv-retry="' + retryKey + '">↺ Повторить</button>'
        + '<button class="mkt-tv-ext-btn tvChartExtUrl" data-tv-open="' + openUrl + '" aria-label="Открыть TradingView">Открыть TradingView&nbsp;' + _EXT_IC + '</button>'
        + '</div></div>';
    }
    function tvAfter(id, openUrl) {
      return '<div class="mkt-tv-after" id="' + id + '" style="display:none">'
        + '<button class="mkt-tv-ext-btn tvChartExtUrl" data-tv-open="' + openUrl + '" aria-label="Открыть TradingView">Открыть TradingView&nbsp;' + _EXT_IC + '</button>'
        + '</div>';
    }
    var initSym = S.usSymbol || 'NASDAQ:AAPL';
    var initCfg = _usCfg(initSym);
    return ''
      + '<div class="mkt-section-head" id="mkt-anchor-us-chart">' + initCfg.head + '</div>'
      + '<div class="mkt-us-select-wrap">'
      + '<label class="mkt-us-select-label" for="tvSymbolSelect">Выберите инструмент</label>'
      + '<select class="mkt-us-select" id="tvSymbolSelect" aria-label="Выберите инструмент">'
      + _US_SYMS.map(function (c) {
          return '<option value="' + c.sym + '"' + (c.sym === initSym ? ' selected' : '') + '>' + c.label + '</option>';
        }).join('')
      + '</select>'
      + '</div>'
      + '<div class="mkt-tv-delay-notice">Котировки TradingView могут отображаться с задержкой</div>'
      + '<div class="mkt-tv-delay-notice" style="margin-bottom:8px">Время на графике указано по Нью-Йорку</div>'
      + '<div class="mkt-tv-wrap">'
      + tvLoading('tvChartLoading', 'Загружаем график ' + initCfg.name + '…')
      + tvError('tvChartError', 'tvChartErrorMsg', 'chart', initCfg.tv)
      + '<div id="tvChartInner" style="height:380px;border-radius:8px;display:none"></div>'
      + tvAfter('tvChartAfter', initCfg.tv)
      + '</div>'
      + '<div class="mkt-section-head">Обзор рынка (TradingView)</div>'
      + '<div class="mkt-tv-wrap">'
      + tvLoading('tvOverviewLoading', 'Загружаем обзор рынка…')
      + tvError('tvOverviewError', 'Виджет не загрузился внутри Telegram', 'overview', 'https://www.tradingview.com/markets/')
      + '<div id="tvOverviewContainer" class="tradingview-widget-container" style="display:none;min-height:200px"></div>'
      + tvAfter('tvOverviewAfter', 'https://www.tradingview.com/markets/')
      + '</div>'
      + '<div class="mkt-section-head">Тепловая карта S&amp;P 500 (TradingView)</div>'
      + '<div class="mkt-tv-wrap">'
      + tvLoading('tvHeatmapLoading', 'Загружаем тепловую карту…')
      + tvError('tvHeatmapError', 'Виджет не загрузился внутри Telegram', 'heatmap', 'https://www.tradingview.com/heatmap/stock/')
      + '<div id="tvHeatmapContainer" class="tradingview-widget-container" style="display:none;min-height:200px"></div>'
      + tvAfter('tvHeatmapAfter', 'https://www.tradingview.com/heatmap/stock/')
      + '</div>';
  }

  // ── Загрузка российских данных ────────────────────────────────────────────

  function _renderAllRuSections(page) {
    _renderStatus(page);
    renderOverview(page, null, 'mktOverviewTrack');
    renderIndices(page);
    renderSectors(page);
    renderLeaders(page);
    renderBonds(page);
    renderChart(page);
  }

  function fetchRussianData(page) {
    if (!MA || !MA.isEnabled()) {
      S.ld.indStatus = 'error'; S.ld.ldrStatus = 'error';
      S.ld.error = 'MOEX adapter отключён';
      _renderStatus(page);
      return;
    }

    var seq = ++S.fetchSeq;
    S.ld.indStatus = 'loading'; S.ld.ldrStatus = 'loading';
    _renderStatus(page);

    Promise.all([MA.getIndices(), MA.getLeaders()]).then(function (results) {
      if (S.fetchSeq !== seq) return;
      var indRes = results[0];
      var ldrRes = results[1];

      if (indRes.data) {
        S.ld.indexMap  = _parseIndicesResponse(indRes);
        S.ld.indStatus = indRes.stale ? 'stale' : 'ok';
        S.ld.staleMin  = indRes.staleMin || null;
        S.ld.fetchTs   = Date.now();
        S.ld.cacheTs   = indRes.stale ? (indRes.ts || null) : null;
        if (S.ld.indexMap && S.ld.indexMap['IMOEX']) {
          S.ld.updateTime = S.ld.indexMap['IMOEX'].updateTime;
        }
        // Сохраняем только данные, реально полученные от MOEX (не stale)
        if (!indRes.stale && S.ld.indexMap) {
          _saveToLS(S.ld.indexMap, S.ld.updateTime, S.ld.fetchTs);
        }
      } else {
        // Адаптер без данных → пробуем localStorage
        var cached = _loadFromLS();
        if (cached) {
          S.ld.indexMap  = cached.data;
          S.ld.indStatus = 'stale';
          S.ld.cacheTs   = cached.fetchTs;
          S.ld.updateTime = cached.quoteTs || null;
        } else {
          S.ld.indexMap  = null;
          S.ld.indStatus = 'error';
          S.ld.error = indRes.error;
        }
      }

      if (ldrRes.data) {
        S.ld.leaders   = _parseLeadersResponse(ldrRes);
        S.ld.ldrStatus = ldrRes.stale ? 'stale' : 'ok';
      } else {
        S.ld.ldrStatus = 'error';
      }

      if (S.tab === 'ru') _renderAllRuSections(page);
    }).catch(function (err) {
      if (S.fetchSeq !== seq) return;
      var cached = _loadFromLS();
      if (cached) {
        S.ld.indexMap  = cached.data;
        S.ld.indStatus = 'stale';
        S.ld.cacheTs   = cached.fetchTs;
        S.ld.updateTime = cached.quoteTs || null;
      } else {
        S.ld.indStatus = 'error';
        S.ld.error = err.message;
      }
      S.ld.ldrStatus = 'error';
      if (S.tab === 'ru') _renderAllRuSections(page);
    });
  }

  // ── Построение HTML страницы ───────────────────────────────────────────────
  function buildHTML() {
    return ''
      // Шапка с вкладками — вне панелей
      + '<div class="mkt-header" id="mktHeader">'
      + '<div class="mkt-tabs" role="tablist">'
      + '<button class="mkt-tab-btn active" role="tab" id="tab-mkt-ru" aria-selected="true" aria-controls="mktRuPanel" data-mkt-tab="ru">🇷🇺 Россия</button>'
      + '<button class="mkt-tab-btn" role="tab" id="tab-mkt-us" aria-selected="false" aria-controls="mktUsPanel" data-mkt-tab="us">🇺🇸 США</button>'
      + '</div>'
      + '<button class="mkt-refresh-btn" id="mktRefresh" aria-label="Обновить данные">'
      + '<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,48V96a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h30.69L182.06,72.4a80,80,0,1,0,4.09,114.67,8,8,0,1,1,11.41,11.2A96,96,0,1,1,192,54.67l9.4,9.4V48a8,8,0,0,1,16,0Z"/></svg>'
      + 'Обновить</button>'
      + '</div>'
      + '<div id="mktPageTitle" class="mkt-page-title">Рынок России</div>'

      // ── Панель России ──────────────────────────────────────────────────────
      + '<div id="mktRuPanel" role="tabpanel" aria-labelledby="tab-mkt-ru">'

      // Статус-строка
      + '<div class="mkt-status-bar"><span id="mktDataStatus" class="mkt-status-loading">'
      + '<span class="mkt-status-spin"></span>Загружаем данные…</span></div>'

      // Быстрый обзор
      + '<div class="mkt-overview-scroll" id="mkt-anchor-overview"><div class="mkt-overview-track" id="mktOverviewTrack"></div></div>'

      // График
      + '<div class="mkt-chart-wrap" id="mkt-anchor-chart">'
      + '<div class="mkt-chart-headline">'
      + '<div class="mkt-chart-ticker" id="mktChartTicker"></div>'
      + '<div class="mkt-chart-val" id="mktChartVal"></div>'
      + '<div class="mkt-chart-chg" id="mktChartChg"></div>'
      + '</div>'
      + '<div class="mkt-periods">'
      + [['1d','1Д'],['1w','1Н'],['1m','1М'],['3m','3М'],['6m','6М'],['1y','1Г']].map(function (p) {
          return '<button class="mkt-period-btn' + (p[0]==='1m'?' active':'') + '" data-mkt-period="' + p[0] + '">' + p[1] + '</button>';
        }).join('')
      + '</div>'
      + '<div class="mkt-lw-wrap">'
      + '<div class="mkt-tv-loading" id="mktChartLoading"><div class="mkt-tv-spinner"></div>Загрузка графика…</div>'
      + '<div class="mkt-chart-error" id="mktChartError" style="display:none">'
      + '<div class="mkt-chart-err-msg"></div>'
      + '<button class="mkt-chart-retry-btn" id="mktChartRetry">↺ Повторить</button>'
      + '</div>'
      + '<div id="mktLwChartContainer" style="height:160px;border-radius:8px;overflow:hidden"></div>'
      + '</div>'
      + '</div>'

      // Индексы
      + '<div class="mkt-section-head" id="mkt-anchor-indices">Индексы</div>'
      + '<div class="mkt-group-tabs">'
      + '<button class="mkt-group-btn active" data-mkt-group="main">Основные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="bond">Облигационные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="sector">Отраслевые</button>'
      + '</div>'
      + '<div id="mktIndices"></div>'

      // Отрасли
      + '<div class="mkt-section-head" id="mkt-anchor-sectors">Отрасли — изменение за день</div>'
      + '<div class="mkt-sector-bar-wrap" id="mktSectorBars"></div>'
      + '<button class="mkt-heatmap-btn" id="mktHeatmapBtn">'
      + '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40ZM96,168H64V136H96Zm0-48H64V88H96Zm48,48H112V136h32Zm0-48H112V88h32Zm48,48H160V136h32Zm0-48H160V88h32Z" opacity="0.2"/><path d="M200,32H56A24,24,0,0,0,32,56V200a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V56A24,24,0,0,0,200,32Zm8,168a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8Z"/></svg>'
      + 'Тепловая карта отраслей</button>'

      // Лидеры
      + '<div class="mkt-section-head" id="mkt-anchor-leaders">Лидеры дня — TQBR</div>'
      + '<div class="mkt-leader-tabs">'
      + '<button class="mkt-leader-tab-btn active" data-mkt-leader="gain">▲ Растут</button>'
      + '<button class="mkt-leader-tab-btn" data-mkt-leader="loss">▼ Снижаются</button>'
      + '</div>'
      + '<div id="mktLeaders"></div>'

      // Облигации
      + '<div class="mkt-section-head" id="mkt-anchor-bonds">Облигации</div>'
      + '<div id="mktBonds"></div>'

      // Аккордеон
      + '<div class="mkt-section-head" id="mkt-anchor-accordion" style="margin-top:24px">Как читать этот экран</div>'
      + '<div id="mktAccordion"></div>'
      + '<div style="height:20px"></div>'
      + '</div>'  // end #mktRuPanel

      // ── Панель США ─────────────────────────────────────────────────────────
      + '<div id="mktUsPanel" role="tabpanel" aria-labelledby="tab-mkt-us" hidden>'
      + '<div id="mktUSContent"></div>'
      + '</div>';
  }

  // ── Переключение вкладок ────────────────────────────────────────────────────
  function switchTab(page, tab) {
    if (S.tab === tab) return;
    S.tab = tab;
    S.selected = tab === 'ru' ? 'IMOEX' : 'SP500';

    page.querySelectorAll('.mkt-tab-btn').forEach(function (b) {
      var isActive = b.dataset.mktTab === tab;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    var titleEl = page.querySelector('#mktPageTitle');
    if (titleEl) titleEl.textContent = tab === 'ru' ? 'Рынок России' : 'Рынок США';

    var hdr = page.querySelector('#mktHeader');
    if (hdr) hdr.classList.toggle('mkt-header--us', tab === 'us');

    var ruPanel = page.querySelector('#mktRuPanel');
    var usPanel = page.querySelector('#mktUsPanel');
    if (ruPanel) ruPanel.hidden = (tab !== 'ru');
    if (usPanel) usPanel.hidden = (tab !== 'us');

    if (tab === 'us') {
      var usContent = page.querySelector('#mktUSContent');
      if (usContent && !usContent._built) { usContent._built = true; usContent.innerHTML = buildUSHTML(); }
      initUSSection(page);
    } else {
      _tvChartSeq++; _tvChartStop();
      if (S.ld.indexMap) {
        renderOverview(page, null, 'mktOverviewTrack');
        renderIndices(page);
        renderSectors(page);
        renderLeaders(page);
        renderBonds(page);
      }
      renderChart(page);
      if (S.ld.indStatus === 'idle' || S.ld.indStatus === 'error') {
        MA && MA.clearCache && MA.clearCache();
        fetchRussianData(page);
      } else {
        _renderStatus(page);
      }
    }
  }

  // ── События ─────────────────────────────────────────────────────────────────
  function bindEvents(page) {
    page.addEventListener('click', function (e) {
      var t = e.target.closest('[data-mkt-tab],[data-mkt-sel],[data-mkt-period],[data-mkt-group],[data-mkt-leader],[data-mkt-acc],[data-tv-retry],[data-tv-open],[id]');
      if (!t) return;

      if (t.dataset.mktTab)    { switchTab(page, t.dataset.mktTab); return; }

      if (t.dataset.mktSel) {
        S.selected = t.dataset.mktSel;
        renderOverview(page, null, 'mktOverviewTrack');
        renderChart(page);
        renderIndices(page);
        return;
      }

      if (t.dataset.mktPeriod) {
        S.period = t.dataset.mktPeriod;
        page.querySelectorAll('.mkt-period-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.mktPeriod === S.period);
        });
        if (S.ld.lwChart) { try { S.ld.lwChart.remove(); } catch(e) {} S.ld.lwChart = null; S.ld.lwSeries = null; }
        _fetchAndRenderChart(page, S.selected, S.period);
        return;
      }

      if (t.dataset.mktGroup)  { S.indexGroup = t.dataset.mktGroup; renderIndices(page); return; }
      if (t.dataset.mktLeader) { S.leaderTab = t.dataset.mktLeader; renderLeaders(page); return; }

      if (t.dataset.mktAcc !== undefined) {
        var item = t.parentElement;
        var body = item.querySelector('.mkt-acc-body');
        var isOpen = !body.hidden;
        page.querySelectorAll('.mkt-acc-item').forEach(function (it) {
          var b = it.querySelector('.mkt-acc-body');
          var h = it.querySelector('.mkt-acc-header');
          if (b) b.hidden = true;
          if (h) { h.setAttribute('aria-expanded', 'false'); h.classList.remove('is-open'); }
        });
        if (!isOpen) { body.hidden = false; t.setAttribute('aria-expanded', 'true'); t.classList.add('is-open'); }
        return;
      }

      if (t.dataset.tvRetry) {
        var retryKey = t.dataset.tvRetry;
        if (retryKey === 'chart')    { initTVChart(page, S.usSymbol); }
        if (retryKey === 'overview') { initTVOverview(page); }
        if (retryKey === 'heatmap')  { initTVHeatmap(page); }
        return;
      }

      if (t.dataset.tvOpen) { openExternal(t.dataset.tvOpen); return; }

      if (t.id === 'mktHeatmapBtn') { renderHeatmap(); return; }

      if (t.id === 'mktStatusRetry') {
        S.ld.indStatus = 'idle'; S.ld.ldrStatus = 'idle';
        MA && MA.clearCache && MA.clearCache();
        fetchRussianData(page);
        return;
      }

      if (t.id === 'mktChartRetry') {
        _clearChartError(page);
        _fetchAndRenderChart(page, S.selected, S.period);
        return;
      }

      if (t.id === 'mktRefresh') {
        MA && MA.clearCache && MA.clearCache();
        if (S.ld.lwChart) { try { S.ld.lwChart.remove(); } catch(e) {} S.ld.lwChart = null; S.ld.lwSeries = null; }
        S.ld.indStatus = 'idle'; S.ld.ldrStatus = 'idle';
        if (S.tab === 'ru') fetchRussianData(page);
        return;
      }
    });

    var overlay = document.getElementById('mktHeatmapOverlay');
    if (overlay) {
      overlay.querySelector('.mkt-heatmap-close').addEventListener('click', function () {
        overlay.classList.remove('open');
      });
    }
  }

  // ── Поиск: экспорт для faq.js ─────────────────────────────────────────────
  var SEARCH_ITEMS = [
    { id: 'mks1', label: 'Котировки и обзор рынка',        sub: 'Открыть раздел рынка',           anchor: '',                     kw: 'котировки рынок биржа обзор акции индекс' },
    { id: 'mks2', label: 'IMOEX — Индекс МосБиржи',        sub: 'Перейти к разделу индексов',     anchor: 'mkt-anchor-indices',   kw: 'imoex индекс мосбиржи' },
    { id: 'mks3', label: 'RTSI — Долларовый индекс РТС',   sub: 'Перейти к разделу индексов',     anchor: 'mkt-anchor-indices',   kw: 'rtsi ртс долларовый индекс' },
    { id: 'mks4', label: 'RGBI — Ценовой индекс ОФЗ',      sub: 'Перейти к разделу облигаций',    anchor: 'mkt-anchor-bonds',     kw: 'rgbi офз облигации государственные' },
    { id: 'mks5', label: 'Облигации — индексы',             sub: 'ОФЗ, корп. облигации',           anchor: 'mkt-anchor-bonds',     kw: 'облигации купон корп бонд bond' },
    { id: 'mks6', label: 'Отраслевые индексы',              sub: 'Нефтегаз, финансы, IT, металлы', anchor: 'mkt-anchor-sectors',   kw: 'отрасль нефтегаз финансы металлы ит телеком энергетика' },
    { id: 'mks7', label: 'Лидеры дня — акции TQBR',        sub: 'Лучшие и худшие бумаги за день', anchor: 'mkt-anchor-leaders',   kw: 'лидеры рост падение снижение акции сбербанк' },
    { id: 'mks8', label: 'RVI — Волатильность рынка РФ',   sub: 'Перейти к обзорным карточкам',   anchor: 'mkt-anchor-overview',  kw: 'rvi волатильность vix тревога' },
    { id: 'mks9', label: 'Apple (AAPL) — рынок США',          sub: 'График TradingView',             anchor: 'mkt-anchor-us-chart',  kw: 'apple aapl nasdaq сша америка dow jones ndx djia' },
    { id: 'mksA', label: 'Как читать этот экран',           sub: 'Объяснение всех блоков раздела', anchor: 'mkt-anchor-accordion', kw: 'как читать объяснение инструкция справка' },
  ];

  var SVG_CHART_ICON  = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M232,208H48V56a8,8,0,0,0-16,0V208H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM88,168a8,8,0,0,0,5.66-2.34L136,123.31l42.34,42.35a8,8,0,0,0,11.32,0l56-56a8,8,0,0,0-11.32-11.32L184,148.69l-42.34-42.35a8,8,0,0,0-11.32,0L88,148.69,53.66,114.34a8,8,0,0,0-11.32,11.32l40,40A8,8,0,0,0,88,168Z"/></svg>';
  var SVG_ARROW_RIGHT = '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></svg>';
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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
            + '<div class="faq-card-header"><div class="faq-card-left">'
            + '<span class="faq-card-label"><span class="faq-card-label-icon">' + SVG_CHART_ICON + '</span>Рынок</span>'
            + '<div class="faq-card-q">' + escHtml(item.label) + '</div>'
            + '<div class="faq-card-short">' + escHtml(item.sub) + '</div>'
            + '</div><div class="faq-card-toggle" aria-hidden="true">' + SVG_ARROW_RIGHT + '</div></div></div>';
        }).join('')
      + '</div>';
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-mkt-search-open]');
    if (!t) return;
    var anchor = t.dataset.mktSearchOpen;
    if (window.setPage) {
      window.setPage('market');
      if (anchor) setTimeout(function () {
        var el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  });

  // ── Инициализация ──────────────────────────────────────────────────────────
  function initMarket() {
    var page = document.querySelector('[data-page="market"]');
    if (!page || page._mktInit) return;
    page._mktInit = true;

    page.querySelector('#mktContent').innerHTML = buildHTML();

    renderAccordion(page);  // статичный контент
    bindEvents(page);
    fetchRussianData(page); // сразу запускаем загрузку MOEX
  }

  var _origSetPage = window.setPage;
  if (typeof _origSetPage === 'function') {
    window.setPage = function (name, push) {
      _origSetPage(name, push);
      if (name === 'market') setTimeout(initMarket, 0);
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('[data-page="market"].active')) initMarket();
  });

}());
