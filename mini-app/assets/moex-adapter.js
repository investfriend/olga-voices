// assets/moex-adapter.js v4 — ISS MOEX data adapter
// Авторизация на подключение: Юрий, 2026-08-07
// Для production-деплоя: получить письменное подтверждение от itsales@moex.com
// Данные задержаны ≥15 мин согласно условиям ISS бесплатного доступа

(function () {
  'use strict';

  // ── Права ────────────────────────────────────────────────────────────────
  // Переключено в true по явному указанию Юрия (2026-08-07).
  // До production-деплоя получить письменное согласие MOEX на отображение данных.
  var RIGHTS_CONFIRMED = true;

  // ── Настройки кэша (все TTL в одном месте — не менять внутри компонентов) ─
  var CACHE_TTL = {
    indices: 15 * 60 * 1000,   // 15 мин — соответствует задержке ISS
    candles:  5 * 60 * 1000,   // 5 мин (свечи)
    leaders: 15 * 60 * 1000,   // 15 мин (лидеры дня)
  };

  var TIMEOUT_MS  = 10000;
  var MAX_RETRIES = 1;

  var _cache    = {};  // url-key → { data, ts }
  var _stale    = {};  // url-key → last successful { data, ts }
  var _inflight = Object.create(null);  // url-key → pending Promise (dedup concurrent calls)

  function _now() { return Date.now(); }
  function _isFresh(key, ttl) { return !!(_cache[key] && (_now() - _cache[key].ts) < ttl); }

  function _pad(n)     { return String(n).padStart(2, '0'); }
  function _dateStr(d) { return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate()); }
  function _daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }

  // Парсинг формата ISS: { section: { columns:[…], data:[[…]] } } → [{field:value}]
  function _parseIss(json, section) {
    var s = json && json[section];
    if (!s || !s.columns || !s.data) return [];
    var cols = s.columns;
    return s.data.map(function (row) {
      var obj = {};
      cols.forEach(function (c, i) { obj[c] = row[i]; });
      return obj;
    });
  }

  function _fetchWithTimeout(url) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var controller = typeof AbortController === 'function'
        ? new AbortController()
        : null;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (controller) controller.abort();
        reject(new Error('Тайм-аут ' + TIMEOUT_MS + ' мс'));
      }, TIMEOUT_MS);
      fetch(url, controller ? { signal: controller.signal } : undefined)
        .then(function (r) {
          clearTimeout(timer);
          if (settled) return;
          settled = true;
          resolve(r);
        })
        .catch(function (err) {
          clearTimeout(timer);
          if (settled) return;
          settled = true;
          reject(err);
        });
    });
  }

  // Сетевой цикл с повторной попыткой; вызывает сам себя рекурсивно, не _get(),
  // чтобы не конкурировать с _inflight-дедупликацией.
  function _requestWithRetry(key, url, retriesLeft) {
    return _fetchWithTimeout(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.statusText);
        return r.json();
      })
      .then(function (data) {
        var ts = _now();
        _cache[key] = { data: data, ts: ts };
        _stale[key] = { data: data, ts: ts };
        return { data: data, stale: false, fromCache: false, ts: ts };
      })
      .catch(function (err) {
        if (retriesLeft > 0) return _requestWithRetry(key, url, retriesLeft - 1);
        if (_stale[key]) {
          return {
            data:     _stale[key].data,
            stale:    true,
            staleMin: Math.round((_now() - _stale[key].ts) / 60000),
            error:    err.message,
            ts:       _stale[key].ts,
          };
        }
        return { data: null, stale: true, error: err.message };
      });
  }

  function _get(key, url, ttl) {
    if (!RIGHTS_CONFIRMED) {
      return Promise.reject(new Error('RIGHTS_CONFIRMED = false — live-данные отключены'));
    }

    if (_isFresh(key, ttl)) {
      return Promise.resolve({ data: _cache[key].data, stale: false, fromCache: true, ts: _cache[key].ts });
    }

    if (_inflight[key]) return _inflight[key];

    var requestPromise = _requestWithRetry(key, url, MAX_RETRIES);
    _inflight[key] = requestPromise;
    function cleanup() {
      if (_inflight[key] === requestPromise) delete _inflight[key];
    }
    requestPromise.then(cleanup, cleanup);
    return requestPromise;
  }

  // ── Тикеры для батч-запроса индексов ─────────────────────────────────────
  var ALL_INDEX_TICKERS = [
    // Основные
    'IMOEX', 'RTSI', 'MOEX10', 'MOEXBC', 'MOEXBMI',
    // Облигационные
    'RGBI', 'RUCBTRNS',
    // Волатильность
    'RVI',
    // Отраслевые
    'MOEXOG', 'MOEXFN', 'MOEXTL', 'MOEXCH', 'MOEXMM',
    'MOEXTN', 'MOEXIT', 'MOEXCN', 'MOEXEU', 'MOEXRE',
  ];

  // Конфигурация свечей по периоду
  var PERIOD_CFG = {
    '1d': { interval: 10, daysBack: 2   },   // 10-минутные свечи
    '1w': { interval: 60, daysBack: 8   },   // часовые
    '1m': { interval: 24, daysBack: 32  },   // дневные
    '3m': { interval: 24, daysBack: 92  },
    '6m': { interval: 24, daysBack: 184 },
    '1y': { interval: 24, daysBack: 367 },
  };

  // ── Публичный API ─────────────────────────────────────────────────────────
  window.MOEXAdapter = {
    RIGHTS_CONFIRMED: RIGHTS_CONFIRMED,
    SOURCE_LABEL:     'Московская биржа, ISS',
    SOURCE_URL:       'https://iss.moex.com/',
    CACHE_TTL:        CACHE_TTL,
    parseIss:         _parseIss,
    dateStr:          _dateStr,

    isEnabled: function () { return RIGHTS_CONFIRMED; },

    // Батч-запрос всех индексов (основные + облигационные + волатильность + отраслевые)
    // Один HTTP-запрос покрывает все 6 российских блоков
    getIndices: function () {
      var url = 'https://iss.moex.com/iss/engines/stock/markets/index/securities.json'
        + '?securities=' + ALL_INDEX_TICKERS.join(',')
        + '&iss.meta=off'
        + '&iss.only=securities,marketdata'
        + '&securities.columns=SECID,SHORTNAME'
        + '&marketdata.columns=SECID,CURRENTVALUE,LASTCHANGEPRC,LASTCHANGE,UPDATETIME,SYSTIME';
      return _get('indices-v2', url, CACHE_TTL.indices);
    },

    // Свечи для выбранного тикера и периода
    // RVI на доске RTSI; все остальные индексы — на SNDX
    getCandles: function (ticker, period) {
      var cfg   = PERIOD_CFG[period] || PERIOD_CFG['1m'];
      var board = (ticker === 'RVI') ? 'RTSI' : 'SNDX';
      var till  = _dateStr(new Date());
      var from  = _dateStr(_daysAgo(cfg.daysBack));

      var url = 'https://iss.moex.com/iss/engines/stock/markets/index/boards/' + board
        + '/securities/' + encodeURIComponent(ticker) + '/candles.json'
        + '?from=' + from + '&till=' + till
        + '&interval=' + cfg.interval
        + '&iss.meta=off'
        + '&iss.only=candles'
        + '&candles.columns=open,close,high,low,begin';

      var key = 'candles-' + ticker + '-' + period;
      return _get(key, url, CACHE_TTL.candles);
    },

    // Лидеры дня: все акции TQBR, сортировка на клиенте
    getLeaders: function () {
      var url = 'https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities.json'
        + '?iss.meta=off'
        + '&iss.only=securities,marketdata'
        + '&securities.columns=SECID,SHORTNAME'
        + '&marketdata.columns=SECID,LAST,LASTTOPREVPRICE,VOLTODAY';
      return _get('leaders-v2', url, CACHE_TTL.leaders);
    },

    clearCache: function () { _cache = {}; },
  };
}());
