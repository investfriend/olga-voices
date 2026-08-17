// assets/market.js v4 — live MOEX ISS + Lightweight Charts
// Источник данных: iss.moex.com (задержка ≥15 мин)
// График: Lightweight Charts (Apache 2.0, локальная копия assets/lwcharts.js)
// Fallback при недоступности MOEX: demo-данные из market-data.js

(function () {
  'use strict';

  var D  = window.MARKET_DATA;   // demo-данные (fallback)
  var MA = window.MOEXAdapter;   // MOEX ISS adapter

  var _EXT_IC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M224,104a8,8,0,0,1-16,0V79.32l-82.34,82.34a8,8,0,0,1-11.32-11.32L196.68,68H172a8,8,0,0,1,0-16h44a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>';

  // ── Состояние ─────────────────────────────────────────────────────────────
  var S = {
    tab:        'ru',
    period:     '1m',
    selected:   'IMOEX',
    indexGroup: 'main',
    leaderTab:  'gain',
    tvInited:   {},
    // Live-данные
    ld: {
      indexMap:   null,   // { SECID: { value, pct, change, updateTime } }
      leaders:    null,   // { gain:[...5], loss:[...5] }
      fetchTs:    null,   // Date.now() последнего успешного получения индексов
      updateTime: null,   // MOEX UPDATETIME поля ("2026-08-07 18:40:00")
      staleMin:   null,
      error:      null,
      indStatus:  'idle', // idle|loading|ok|error|stale
      ldrStatus:  'idle',
      chrStatus:  'idle',
      lwChart:    null,   // LW Charts instance
      lwSeries:   null,
    },
  };

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
    // "2026-08-07 18:40:00" → "18:40"
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
      // CURRENTVALUE === null → индекс не торгуется сейчас
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

    var byAsc = items.slice().sort(function (a, b) { return a.pct - b.pct; });
    var byDesc = items.slice().sort(function (a, b) { return b.pct - a.pct; });

    return {
      gain: byDesc.filter(function (r) { return r.pct > 0; }).slice(0, 5),
      loss: byAsc.filter(function (r) { return r.pct < 0; }).slice(0, 5),
    };
  }

  // Конвертировать время начала свечи ISS (московское) в значение для LW Charts
  // Дневные свечи: date-string "YYYY-MM-DD"
  // Внутридневные (10мин, 1ч): Unix timestamp UTC (секунды)
  function _issBeginToLwTime(begin, isIntraday) {
    if (!begin) return null;
    if (!isIntraday) {
      // "2026-08-07 00:00:00" → "2026-08-07"
      return begin.substring(0, 10);
    }
    // Московское время UTC+3: "2026-08-07 10:30:00" → UTC unix sec
    var s = begin.replace(' ', 'T') + '+03:00';
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
    // Убедиться в сортировке по времени (ISS обычно отдаёт по возрастанию)
    result.sort(function (a, b) {
      if (typeof a.time === 'number') return a.time - b.time;
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });
    return result;
  }

  // ── Слияние live + demo ────────────────────────────────────────────────────
  // Используем demo-список как шаблон (имена, единицы), live заменяет числа

  function _mergedOverview(demoList) {
    var map = S.ld.indexMap;
    if (!map) return demoList;
    return demoList.map(function (item) {
      var live = map[item.ticker];
      if (!live) return item;
      return {
        ticker: item.ticker,
        name:   item.name,
        value:  live.value,
        change: live.change !== null && live.change !== undefined ? live.change : item.change,
        pct:    live.pct,
        unit:   item.unit,
        time:   _timeHM(live.updateTime) || item.time,
        live:   true,
      };
    });
  }

  function _mergedIndicesGroup(demoGroup) {
    var map = S.ld.indexMap;
    if (!map) return demoGroup;
    return demoGroup.map(function (item) {
      var live = map[item.ticker];
      if (!live) return item;
      return { ticker: item.ticker, name: item.name, value: live.value, change: live.change, pct: live.pct, live: true };
    });
  }

  function _mergedSectors(demoSectors) {
    var map = S.ld.indexMap;
    if (!map) return demoSectors;
    return demoSectors.map(function (item) {
      var live = map[item.ticker];
      if (!live) return item;
      return { ticker: item.ticker, name: item.name, value: live.value, change: live.change, pct: live.pct, weight: item.weight, live: true };
    });
  }

  // ── Статусная строка ──────────────────────────────────────────────────────

  function _renderStatus(page) {
    var el = page && page.querySelector('#mktDataStatus');
    if (!el) return;
    var st = S.ld.indStatus;
    var html = '';

    if (st === 'idle' || st === 'loading') {
      html = '<span class="mkt-status-loading"><span class="mkt-status-spin"></span>Запрашиваю данные MOEX ISS…</span>';
    } else if (st === 'ok') {
      var upd  = S.ld.updateTime ? _timeHM(S.ld.updateTime) : '—';
      var got  = S.ld.fetchTs ? _nowHM() : '—';
      html = '<span class="mkt-status-ok">МосБиржа · данные ≥15 мин · котировки: ' + upd + ' · обновлено: ' + got + '</span>';
    } else if (st === 'stale') {
      var ago = S.ld.staleMin !== null ? (S.ld.staleMin + ' мин назад') : 'давно';
      html = '<span class="mkt-status-stale">⚠ Устаревшие данные · последнее обновление ' + ago + '</span>';
    } else if (st === 'error') {
      html = '<span class="mkt-status-error">⚠ Нет связи с MOEX ISS · показаны демо-данные</span>'
           + ' <button class="mkt-status-retry" id="mktStatusRetry">↺ Повторить</button>';
    }
    el.innerHTML = html;
  }

  function _updateDemoBadges(page) {
    // Скрываем ДЕМО-бейдж у секций с успешными живыми данными
    var indOk = (S.ld.indStatus === 'ok' || S.ld.indStatus === 'stale');
    // Лидеры: скрывать ДЕМО только если есть реальные данные (рынок открыт)
    var ldrHasData = S.ld.leaders && (S.ld.leaders.gain.length > 0 || S.ld.leaders.loss.length > 0);
    var ldrOk = (S.ld.ldrStatus === 'ok' || S.ld.ldrStatus === 'stale') && ldrHasData;
    ['indices', 'sectors', 'overview', 'bonds'].forEach(function (key) {
      var b = page.querySelector('[data-demo="' + key + '"]');
      if (b) b.style.display = indOk ? 'none' : '';
    });
    var lb = page.querySelector('[data-demo="leaders"]');
    if (lb) lb.style.display = ldrOk ? 'none' : '';
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

    // Уничтожить предыдущий граф
    if (S.ld.lwChart) { try { S.ld.lwChart.remove(); } catch(e) {} S.ld.lwChart = null; S.ld.lwSeries = null; }

    // Fallback: SVG если нет LW Charts
    if (!LW) { _renderFallbackSvg(container, candles); return; }

    if (!candles || !candles.length) {
      _setChartError(page, 'Нет данных за выбранный период'); return;
    }

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
        borderColor:    'rgba(255,255,255,0.08)',
        timeVisible:    isIntraday,
        secondsVisible: false,
        rightOffset:    2,
        fixLeftEdge:    true,
        fixRightEdge:   true,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)', scaleMargins: { top: 0.1, bottom: 0.1 } },
      handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
      handleScale:  { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
    });

    var series = chart.addAreaSeries({
      lineColor:             lineColor,
      topColor:              topColor,
      bottomColor:           bottomColor,
      lineWidth:             1.5,
      priceLineVisible:      false,
      lastValueVisible:      true,
      crosshairMarkerVisible: true,
    });

    series.setData(candles.map(function (c) { return { time: c.time, value: c.close }; }));
    chart.timeScale().fitContent();

    S.ld.lwChart  = chart;
    S.ld.lwSeries = series;

    // Адаптивный ресайз
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (S.ld.lwChart) {
          var w = container.offsetWidth;
          if (w > 0) S.ld.lwChart.applyOptions({ width: w });
        }
      });
      ro.observe(container);
    }
  }

  // SVG fallback (упрощённый линейный график из данных candles)
  function _renderFallbackSvg(container, candles) {
    if (!candles || !candles.length) { container.innerHTML = '<div class="mkt-chart-empty">Нет данных</div>'; return; }
    var pts = candles.map(function (c) { return c.close; });
    var W = 320, H = 110, PY = 10;
    var min = pts[0], max = pts[0];
    for (var k = 1; k < pts.length; k++) { if (pts[k] < min) min = pts[k]; if (pts[k] > max) max = pts[k]; }
    var range = (max - min) || 1;
    var n = pts.length;
    var xs = [], ys = [];
    for (var i = 0; i < n; i++) {
      xs.push((i / (n - 1)) * W);
      ys.push(H - PY - ((pts[i] - min) / range) * (H - PY * 2));
    }
    var polyPts = xs.map(function (x, j) { return x.toFixed(1) + ',' + ys[j].toFixed(1); }).join(' ');
    var isUp = pts[n-1] >= pts[0];
    var color = isUp ? 'var(--mkt-up)' : 'var(--mkt-down)';
    container.innerHTML = '<svg class="mkt-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<polyline points="' + polyPts + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'
      + '</svg>';
  }

  // Основная функция обновления: заголовок + запрос свечей
  function renderChart(page) {
    var ticker = S.selected;
    var list   = _mergedOverview(D.ru.overview);
    var data   = list.find(function (i) { return i.ticker === ticker; }) || list[0];
    var c      = cls(data.change);

    var el = page.querySelector('#mktChartTicker');
    if (el) el.textContent = data.name + ' · ' + ticker;
    el = page.querySelector('#mktChartVal');
    if (el) el.textContent = fNum(data.value, data.unit) + ' ' + data.unit;
    el = page.querySelector('#mktChartChg');
    if (el) el.innerHTML = '<span class="' + c + '">' + icon(data.change) + fChg(data.change, data.unit) + ' (' + fPct(data.pct) + ')</span>';

    page.querySelectorAll('.mkt-period-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktPeriod === S.period);
    });

    // Запросить свечи и отрисовать
    _fetchAndRenderChart(page, ticker, S.period);
  }

  function _fetchAndRenderChart(page, ticker, period) {
    if (!MA || !MA.isEnabled()) {
      // LW Charts с demo-данными (статический массив)
      var demoCandles = (D.charts && D.charts[ticker]) ? D.charts[ticker].map(function (v, i) {
        return { time: '2026-' + String(Math.floor(i / 4) + 1).padStart(2,'0') + '-' + String((i % 28) + 1).padStart(2,'0'), close: v, value: v };
      }) : null;
      _renderLwChart(page, demoCandles, period);
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

    page.querySelectorAll('.mkt-group-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktGroup === S.indexGroup);
    });
  }

  // ── Отрасли: столбики ──────────────────────────────────────────────────────
  function renderSectors(page) {
    var wrap = page.querySelector('#mktSectorBars');
    if (!wrap || S.tab !== 'ru') return;
    var raw  = D.ru.indices.sector;
    var list = _mergedSectors(raw).slice().sort(function (a, b) { return b.pct - a.pct; });
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

  // ── Тепловая карта (оверлей) ───────────────────────────────────────────────
  function renderHeatmap() {
    var overlay = document.getElementById('mktHeatmapOverlay');
    if (!overlay) return;
    var grid = overlay.querySelector('.mkt-heatmap-grid');
    var raw  = D.ru.indices.sector;
    var list = _mergedSectors(raw);
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
      ? S.ld.leaders[S.leaderTab]
      : null;
    // Fallback на demo, если рынок закрыт (пустой список) или данных нет
    var list = (liveList && liveList.length) ? liveList : D.ru.leaders[S.leaderTab];
    var html = '';
    list.forEach(function (l) {
      var c = cls(l.change !== undefined ? l.change : l.pct);
      html += '<div class="mkt-leader-row">'
        + '<div class="mkt-leader-ticker">' + l.ticker + '</div>'
        + '<div class="mkt-leader-name">' + l.name + '</div>'
        + '<div class="mkt-leader-price">' + fNum(l.price) + ' ₽</div>'
        + '<div class="mkt-leader-chg ' + c + '">' + icon(l.pct) + fPct(l.pct) + '</div>'
        + '</div>';
    });
    wrap.innerHTML = html;
    page.querySelectorAll('.mkt-leader-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktLeader === S.leaderTab);
    });
  }

  // ── Облигации ───────────────────────────────────────────────────────────────
  function renderBonds(page) {
    var wrap = page.querySelector('#mktBonds');
    if (!wrap || S.tab !== 'ru') return;
    var map = S.ld.indexMap;
    var govLive  = map && map['RGBI'];
    var corpLive = map && map['RUCBTRNS'];
    var demoB    = D.ru.bonds;
    var gov  = govLive  ? { name: demoB.gov.name,  value: govLive.value,  change: govLive.change,  pct: govLive.pct  } : demoB.gov;
    var corp = corpLive ? { name: demoB.corp.name, value: corpLive.value, change: corpLive.change, pct: corpLive.pct } : demoB.corp;
    var govC  = cls(gov.change);
    var corpC = cls(corp.change);
    wrap.innerHTML = ''
      + '<div class="mkt-bond-cards">'
      + '<div class="mkt-bond-card">'
      + '<div class="mkt-bond-card-label">' + gov.name + '</div>'
      + '<div class="mkt-bond-card-val">' + fNum(gov.value) + '</div>'
      + '<div class="mkt-bond-card-chg ' + govC + '">' + icon(gov.change) + fChg(gov.change) + ' (' + fPct(gov.pct) + ')</div>'
      + '</div>'
      + '<div class="mkt-bond-card">'
      + '<div class="mkt-bond-card-label">' + corp.name + '</div>'
      + '<div class="mkt-bond-card-val">' + fNum(corp.value) + '</div>'
      + '<div class="mkt-bond-card-chg ' + corpC + '">' + icon(corp.change) + fChg(corp.change) + ' (' + fPct(corp.pct) + ')</div>'
      + '</div>'
      + '</div>'
      + '<div class="mkt-bond-note">' + demoB.note + '</div>';
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

  // ── TradingView (США) — без изменений от v3 ───────────────────────────────
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

  function tvInjectEmbed(container, scriptSrc, config, onErr) {
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    var inner = container.querySelector('.tradingview-widget-container__widget');
    var s = document.createElement('script');
    s.type = 'text/javascript'; s.async = true;
    s.appendChild(document.createTextNode(JSON.stringify(config)));
    var timer = setTimeout(function () { if (!inner.querySelector('iframe')) { if (onErr) onErr(); } }, 12000);
    s.onload  = function () { setTimeout(function () { clearTimeout(timer); if (!inner.querySelector('iframe')) { if (onErr) onErr(); } }, 3000); };
    s.onerror = function () { clearTimeout(timer); if (onErr) onErr(); };
    s.src = scriptSrc;
    container.appendChild(s);
  }
  function tvShowError(el) { if (el) el.style.display = ''; }

  function initUSSection(page) {
    if (S.tvInited.us) return;
    S.tvInited.us = true;
    var chartLoading = page.querySelector('#tvChartLoading');
    var chartError   = page.querySelector('#tvChartError');
    tvLoadScript(function (ok) {
      if (chartLoading) chartLoading.style.display = 'none';
      if (!ok || !window.TradingView) { tvShowError(chartError); return; }
      try {
        new window.TradingView.widget({
          symbol: 'SP:SPX', interval: 'D', timezone: 'America/New_York',
          theme: 'dark', style: '1', locale: 'ru', toolbar_bg: '#181D1B',
          enable_publishing: false, hide_side_toolbar: true, allow_symbol_change: true,
          withdateranges: true, save_image: false, calendar: false,
          autosize: true, height: 380, container_id: 'tvChartInner',
        });
      } catch (e) { tvShowError(chartError); }
    });
    var ovContainer = page.querySelector('#tvOverviewContainer');
    var ovLoading   = page.querySelector('#tvOverviewLoading');
    var ovError     = page.querySelector('#tvOverviewError');
    if (ovContainer) {
      if (ovLoading) setTimeout(function () { ovLoading.style.display = 'none'; }, 500);
      tvInjectEmbed(ovContainer,
        'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js',
        { colorTheme: 'dark', dateRange: '12M', showChart: true, locale: 'ru',
          largeChartUrl: '', isTransparent: true, showSymbolLogo: true, showFloatingTooltip: false,
          width: '100%', height: 400, plotLineColorBull: '#27C98A', plotLineColorBear: '#E05858',
          tabs: [
            { title: 'Индексы', symbols: [{ s: 'SP:SPX', d: 'S&P 500' }, { s: 'NASDAQ:NDX', d: 'Nasdaq 100' }, { s: 'DJ:DJI', d: 'Dow Jones' }, { s: 'CBOE:VIX', d: 'VIX' }] },
            { title: 'Товары',  symbols: [{ s: 'OANDA:XAUUSD', d: 'Золото' }, { s: 'TVC:UKOIL', d: 'Brent' }, { s: 'TVC:USOIL', d: 'WTI' }] },
          ] },
        function () { if (ovLoading) ovLoading.style.display = 'none'; tvShowError(ovError); }
      );
    }
    var hmContainer = page.querySelector('#tvHeatmapContainer');
    var hmLoading   = page.querySelector('#tvHeatmapLoading');
    var hmError     = page.querySelector('#tvHeatmapError');
    if (hmContainer) {
      if (hmLoading) setTimeout(function () { hmLoading.style.display = 'none'; }, 500);
      tvInjectEmbed(hmContainer,
        'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
        { exchanges: [], dataSource: 'SPX500', grouping: 'sector',
          blockSize: 'market_cap_basic', blockColor: 'change',
          locale: 'ru', colorTheme: 'dark', hasTopBar: false,
          isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true,
          isMonoSize: false, width: '100%', height: 400 },
        function () { if (hmLoading) hmLoading.style.display = 'none'; tvShowError(hmError); }
      );
    }
  }

  // ── HTML блока США ────────────────────────────────────────────────────────
  function buildUSHTML() {
    var tvErrBody = '<div class="mkt-tv-error-ico">📡</div>'
      + '<div class="mkt-tv-error-msg">Виджет не загрузился</div>'
      + '<div class="mkt-tv-error-sub">Браузер ограничил внешний скрипт или нет соединения</div>'
      + '<div class="mkt-tv-btns">';
    return ''
      + '<div class="mkt-tv-delay-notice">⏱ Данные от TradingView · Cboe One с возможной задержкой 15–30 мин</div>'
      + '<div class="mkt-section-head" id="mkt-anchor-us-chart">Интерактивный график рынка США</div>'
      + '<div class="mkt-tv-delay-notice" style="margin-bottom:4px">По умолчанию — S&amp;P 500 (SP:SPX). Инструмент можно сменить внутри графика.</div>'
      + '<div class="mkt-tv-delay-notice" style="margin-bottom:8px">Период (1 мес, 3 мес…) — глубина истории. Интервал свечи настраивается внутри графика отдельно.</div>'
      + '<div class="mkt-tv-wrap">'
      + '<div class="mkt-tv-loading" id="tvChartLoading"><div class="mkt-tv-spinner"></div>Загрузка TradingView...</div>'
      + '<div class="mkt-tv-error" id="tvChartError" style="display:none">' + tvErrBody
      + '<button class="mkt-tv-retry-btn" data-tv-retry="chart">↺ Повторить</button>'
      + '<button class="mkt-tv-ext-btn" data-tv-open="https://www.tradingview.com/chart/?symbol=SP:SPX" aria-label="Открыть TradingView">Открыть TradingView&nbsp;' + _EXT_IC + '</button>'
      + '</div></div>'
      + '<div id="tvChartInner" style="height:380px;background:var(--bg-card);border-radius:8px"></div>'
      + '</div>'
      + '<div class="mkt-section-head">Обзор рынка (TradingView)</div>'
      + '<div class="mkt-tv-wrap">'
      + '<div class="mkt-tv-loading" id="tvOverviewLoading"><div class="mkt-tv-spinner"></div>Загрузка виджета...</div>'
      + '<div class="mkt-tv-error" id="tvOverviewError" style="display:none">' + tvErrBody
      + '<button class="mkt-tv-retry-btn" data-tv-retry="overview">↺ Повторить</button>'
      + '<button class="mkt-tv-ext-btn" data-tv-open="https://www.tradingview.com/markets/" aria-label="Открыть TradingView">Открыть TradingView&nbsp;' + _EXT_IC + '</button>'
      + '</div></div>'
      + '<div id="tvOverviewContainer" class="tradingview-widget-container" style="min-height:200px"></div>'
      + '</div>'
      + '<div class="mkt-section-head">Тепловая карта S&amp;P 500 (TradingView)</div>'
      + '<div class="mkt-tv-wrap">'
      + '<div class="mkt-tv-loading" id="tvHeatmapLoading"><div class="mkt-tv-spinner"></div>Загрузка виджета...</div>'
      + '<div class="mkt-tv-error" id="tvHeatmapError" style="display:none">' + tvErrBody
      + '<button class="mkt-tv-retry-btn" data-tv-retry="heatmap">↺ Повторить</button>'
      + '<button class="mkt-tv-ext-btn" data-tv-open="https://www.tradingview.com/heatmap/stock/" aria-label="Открыть TradingView">Открыть TradingView&nbsp;' + _EXT_IC + '</button>'
      + '</div></div>'
      + '<div id="tvHeatmapContainer" class="tradingview-widget-container" style="min-height:200px"></div>'
      + '</div>';
  }

  // ── Фетч всех российских данных ───────────────────────────────────────────
  function fetchRussianData(page) {
    if (!MA || !MA.isEnabled()) { _renderStatus(page); return; }

    S.ld.indStatus = 'loading';
    S.ld.ldrStatus = 'loading';
    _renderStatus(page);

    Promise.all([MA.getIndices(), MA.getLeaders()]).then(function (results) {
      var indRes = results[0];
      var ldrRes = results[1];

      // Индексы
      if (indRes.data) {
        S.ld.indexMap  = _parseIndicesResponse(indRes);
        S.ld.indStatus = indRes.stale ? 'stale' : 'ok';
        S.ld.staleMin  = indRes.staleMin || null;
        S.ld.fetchTs   = Date.now();
        if (S.ld.indexMap && S.ld.indexMap['IMOEX']) {
          S.ld.updateTime = S.ld.indexMap['IMOEX'].updateTime;
        }
      } else {
        S.ld.indStatus = 'error';
        S.ld.error = indRes.error;
      }

      // Лидеры
      if (ldrRes.data) {
        S.ld.leaders   = _parseLeadersResponse(ldrRes);
        S.ld.ldrStatus = ldrRes.stale ? 'stale' : 'ok';
      } else {
        S.ld.ldrStatus = 'error';
      }

      if (S.tab === 'ru') {
        renderOverview(page, null, 'mktOverviewTrack');
        renderIndices(page);
        renderSectors(page);
        renderLeaders(page);
        renderBonds(page);
        _renderStatus(page);
        _updateDemoBadges(page);
        // Обновить график с живыми данными
        renderChart(page);
      }
    }).catch(function (err) {
      S.ld.indStatus = 'error';
      S.ld.ldrStatus = 'error';
      S.ld.error = err.message;
      if (S.tab === 'ru') {
        _renderStatus(page);
        _updateDemoBadges(page);
      }
    });
  }

  // ── Построение HTML страницы ───────────────────────────────────────────────
  function buildHTML() {
    var DEMO = '<span class="mkt-demo-inline" data-demo="{KEY}">ДЕМО</span>';
    function badge(key) { return ' ' + DEMO.replace('{KEY}', key); }

    return ''
      // Статус-строка (динамическая)
      + '<div class="mkt-status-bar"><span id="mktDataStatus" class="mkt-status-loading">'
      + '<span class="mkt-status-spin"></span>Запрашиваю данные MOEX ISS…</span></div>'

      // Вкладки Россия / США
      + '<div class="mkt-header">'
      + '<div class="mkt-tabs">'
      + '<button class="mkt-tab-btn active" data-mkt-tab="ru">🇷🇺 Россия</button>'
      + '<button class="mkt-tab-btn" data-mkt-tab="us">🇺🇸 США</button>'
      + '</div>'
      + '<button class="mkt-refresh-btn" id="mktRefresh">'
      + '<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,48V96a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h30.69L182.06,72.4a80,80,0,1,0,4.09,114.67,8,8,0,1,1,11.41,11.2A96,96,0,1,1,192,54.67l9.4,9.4V48a8,8,0,0,1,16,0Z"/></svg>'
      + 'Обновить</button>'
      + '</div>'

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
      // Контейнер для Lightweight Charts
      + '<div class="mkt-lw-wrap">'
      + '<div class="mkt-tv-loading" id="mktChartLoading"><div class="mkt-tv-spinner"></div>Загрузка графика…</div>'
      + '<div class="mkt-chart-error" id="mktChartError" style="display:none">'
      + '<div class="mkt-chart-err-msg"></div>'
      + '<button class="mkt-chart-retry-btn" id="mktChartRetry">↺ Повторить</button>'
      + '</div>'
      + '<div id="mktLwChartContainer" style="height:160px;border-radius:8px;overflow:hidden"></div>'
      + '</div>'
      + '</div>'

      // ── Только Россия ───────────────────────────────────────────────────────
      + '<div class="mkt-ru-only">'

      + '<div class="mkt-section-head" id="mkt-anchor-indices">Индексы' + badge('indices') + '</div>'
      + '<div class="mkt-group-tabs">'
      + '<button class="mkt-group-btn active" data-mkt-group="main">Основные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="bond">Облигационные</button>'
      + '<button class="mkt-group-btn" data-mkt-group="sector">Отраслевые</button>'
      + '</div>'
      + '<div id="mktIndices"></div>'

      + '<div class="mkt-section-head" id="mkt-anchor-sectors">Отрасли — изменение за день' + badge('sectors') + '</div>'
      + '<div class="mkt-sector-bar-wrap" id="mktSectorBars"></div>'
      + '<button class="mkt-heatmap-btn" id="mktHeatmapBtn">'
      + '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40ZM96,168H64V136H96Zm0-48H64V88H96Zm48,48H112V136h32Zm0-48H112V88h32Zm48,48H160V136h32Zm0-48H160V88h32Z" opacity="0.2"/><path d="M200,32H56A24,24,0,0,0,32,56V200a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V56A24,24,0,0,0,200,32Zm8,168a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8Z"/></svg>'
      + 'Тепловая карта отраслей</button>'

      + '<div class="mkt-section-head" id="mkt-anchor-leaders">Лидеры дня — TQBR' + badge('leaders') + '</div>'
      + '<div class="mkt-leader-tabs">'
      + '<button class="mkt-leader-tab-btn active" data-mkt-leader="gain">▲ Растут</button>'
      + '<button class="mkt-leader-tab-btn" data-mkt-leader="loss">▼ Снижаются</button>'
      + '</div>'
      + '<div id="mktLeaders"></div>'

      + '<div class="mkt-section-head" id="mkt-anchor-bonds">Облигации' + badge('bonds') + '</div>'
      + '<div id="mktBonds"></div>'

      + '</div>' // end .mkt-ru-only

      // ── США (TradingView) ──────────────────────────────────────────────────
      + '<div class="mkt-us-only" style="display:none">'
      + '<div id="mktUSContent"></div>'
      + '</div>'

      // ── Аккордеон ──────────────────────────────────────────────────────────
      + '<div class="mkt-section-head" id="mkt-anchor-accordion" style="margin-top:24px">Как читать этот экран</div>'
      + '<div id="mktAccordion"></div>'
      + '<div style="height:20px"></div>';
  }

  // ── Переключение вкладок ────────────────────────────────────────────────────
  function switchTab(page, tab) {
    S.tab = tab;
    S.selected = tab === 'ru' ? 'IMOEX' : 'SP500';

    page.querySelectorAll('.mkt-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mktTab === tab);
    });
    page.querySelectorAll('.mkt-ru-only').forEach(function (el) { el.style.display = tab === 'ru' ? '' : 'none'; });
    page.querySelectorAll('.mkt-us-only').forEach(function (el) { el.style.display = tab === 'us' ? '' : 'none'; });

    if (tab === 'us') {
      var usContent = page.querySelector('#mktUSContent');
      if (usContent && !usContent._built) { usContent._built = true; usContent.innerHTML = buildUSHTML(); }
      initUSSection(page);
    } else {
      renderOverview(page, null, 'mktOverviewTrack');
      renderChart(page);
      renderIndices(page);
      renderSectors(page);
      renderLeaders(page);
      renderBonds(page);
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
        // Уничтожить старый LW Chart и запросить новые свечи
        if (S.ld.lwChart) { try { S.ld.lwChart.remove(); } catch(e) {} S.ld.lwChart = null; S.ld.lwSeries = null; }
        _fetchAndRenderChart(page, S.selected, S.period);
        return;
      }

      if (t.dataset.mktGroup)  { S.indexGroup = t.dataset.mktGroup; renderIndices(page); return; }
      if (t.dataset.mktLeader) { S.leaderTab = t.dataset.mktLeader; renderLeaders(page); return; }

      // Аккордеон
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

      // TV retry
      if (t.dataset.tvRetry) {
        if (t.dataset.tvRetry === 'chart') {
          var ce = page.querySelector('#tvChartError');
          var cl = page.querySelector('#tvChartLoading');
          if (ce) ce.style.display = 'none';
          if (cl) cl.style.display = '';
          S.tvInited.us = false;
          initUSSection(page);
        }
        return;
      }

      // TV открыть внешнюю ссылку
      if (t.dataset.tvOpen) {
        openExternal(t.dataset.tvOpen);
        return;
      }

      // Тепловая карта
      if (t.id === 'mktHeatmapBtn') { renderHeatmap(); return; }

      // Повтор при ошибке статус-строки
      if (t.id === 'mktStatusRetry') {
        S.ld.indStatus = 'idle';
        S.ld.ldrStatus = 'idle';
        MA.clearCache && MA.clearCache();
        fetchRussianData(page);
        return;
      }

      // Повтор при ошибке графика
      if (t.id === 'mktChartRetry') {
        _clearChartError(page);
        _fetchAndRenderChart(page, S.selected, S.period);
        return;
      }

      // Обновить
      if (t.id === 'mktRefresh') {
        MA.clearCache && MA.clearCache();
        if (S.ld.lwChart) { try { S.ld.lwChart.remove(); } catch(e) {} S.ld.lwChart = null; S.ld.lwSeries = null; }
        S.ld.indStatus = 'idle';
        S.ld.ldrStatus = 'idle';
        S.ld.indexMap  = null;
        S.ld.leaders   = null;
        if (S.tab === 'ru') {
          renderOverview(page, null, 'mktOverviewTrack');
          renderIndices(page);
          renderSectors(page);
          renderLeaders(page);
          renderBonds(page);
          fetchRussianData(page);
        }
        return;
      }
    });

    // Закрытие тепловой карты
    var overlay = document.getElementById('mktHeatmapOverlay');
    if (overlay) {
      overlay.querySelector('.mkt-heatmap-close').addEventListener('click', function () {
        overlay.classList.remove('open');
      });
    }
  }

  // ── Поиск: экспорт для faq.js ─────────────────────────────────────────────
  var SEARCH_ITEMS = [
    { id: 'mks1', label: 'Котировки и обзор рынка',        sub: 'Открыть раздел рынка',          anchor: '',                    kw: 'котировки рынок биржа обзор акции индекс' },
    { id: 'mks2', label: 'IMOEX — Индекс МосБиржи',        sub: 'Перейти к разделу индексов',    anchor: 'mkt-anchor-indices',  kw: 'imoex индекс мосбиржи' },
    { id: 'mks3', label: 'RTSI — Долларовый индекс РТС',   sub: 'Перейти к разделу индексов',    anchor: 'mkt-anchor-indices',  kw: 'rtsi ртс долларовый индекс' },
    { id: 'mks4', label: 'RGBI — Ценовой индекс ОФЗ',      sub: 'Перейти к разделу облигаций',   anchor: 'mkt-anchor-bonds',    kw: 'rgbi офз облигации государственные' },
    { id: 'mks5', label: 'Облигации — индексы',             sub: 'ОФЗ, корп. облигации',          anchor: 'mkt-anchor-bonds',    kw: 'облигации купон корп бонд bond' },
    { id: 'mks6', label: 'Отраслевые индексы',              sub: 'Нефтегаз, финансы, IT, металлы', anchor: 'mkt-anchor-sectors', kw: 'отрасль нефтегаз финансы металлы ит телеком энергетика' },
    { id: 'mks7', label: 'Лидеры дня — акции TQBR',        sub: 'Лучшие и худшие бумаги за день', anchor: 'mkt-anchor-leaders', kw: 'лидеры рост падение снижение акции сбербанк' },
    { id: 'mks8', label: 'RVI — Волатильность рынка РФ',   sub: 'Перейти к обзорным карточкам',  anchor: 'mkt-anchor-overview', kw: 'rvi волатильность vix тревога' },
    { id: 'mks9', label: 'S&P 500 — рынок США',             sub: 'График TradingView',            anchor: 'mkt-anchor-us-chart', kw: 'sp500 сша америка nasdaq dow jones ndx djia' },
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

    // Немедленно отрисовать demo-данные (пользователь видит что-то сразу)
    renderOverview(page, null, 'mktOverviewTrack');
    renderIndices(page);
    renderSectors(page);
    renderLeaders(page);
    renderBonds(page);
    renderAccordion(page);

    // Chart: запустить загрузку (LW Charts или SVG)
    renderChart(page);

    bindEvents(page);

    // Асинхронно загрузить живые данные MOEX ISS
    fetchRussianData(page);
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
