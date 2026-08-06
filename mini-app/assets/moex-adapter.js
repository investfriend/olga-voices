// assets/moex-adapter.js — Адаптер данных ISS MOEX
// ⚠️ Переключить MOEX_DISPLAY_RIGHTS_CONFIRMED в true только после
// получения письменного подтверждения прав на публичное отображение данных МосБиржи.

(function () {
  'use strict';

  var MOEX_DISPLAY_RIGHTS_CONFIRMED = false; // НЕ менять без согласования
  var CACHE_TTL   = 5 * 60 * 1000; // 5 минут
  var TIMEOUT_MS  = 10000;          // 10 секунд тайм-аут
  var MAX_RETRIES = 1;              // одна повторная попытка

  var _cache = {};  // url → { data, ts }
  var _last  = {};  // key → { data, ts }  — последний успешный ответ

  function _age(ts) { return Date.now() - ts; }
  function _fresh(ts) { return _age(ts) < CACHE_TTL; }

  function _fetchTimeout(url) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('Тайм-аут ' + TIMEOUT_MS + 'мс')); }
      }, TIMEOUT_MS);
      fetch(url)
        .then(function (r) { clearTimeout(timer); if (!settled) { settled = true; resolve(r); } })
        .catch(function (e) { clearTimeout(timer); if (!settled) { settled = true; reject(e); } });
    });
  }

  function _fetch(key, url, retriesLeft) {
    if (retriesLeft === undefined) retriesLeft = MAX_RETRIES;

    // Если права не подтверждены — запрос не выполняется
    if (!MOEX_DISPLAY_RIGHTS_CONFIRMED) {
      return Promise.reject(new Error(
        'MOEX_DISPLAY_RIGHTS_CONFIRMED = false. Live-данные MOEX отключены.'
      ));
    }

    // Горячий кэш (данные свежие)
    if (_cache[url] && _fresh(_cache[url].ts)) {
      return Promise.resolve({ data: _cache[url].data, stale: false, cached: true });
    }

    return _fetchTimeout(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.statusText);
        return r.json();
      })
      .then(function (data) {
        _cache[url] = { data: data, ts: Date.now() };
        _last[key]  = { data: data, ts: Date.now() };
        return { data: data, stale: false, cached: false };
      })
      .catch(function (err) {
        if (retriesLeft > 0) return _fetch(key, url, retriesLeft - 1);
        // Возвращаем последний успешный ответ, помечаем как устаревший
        if (_last[key]) {
          return {
            data:        _last[key].data,
            stale:       true,
            cached:      true,
            staleAgeMin: Math.round(_age(_last[key].ts) / 60000),
            error:       err.message,
          };
        }
        // Нет ни кэша, ни истории
        return { data: null, stale: true, cached: false, error: err.message };
      });
  }

  // ── Публичный API ─────────────────────────────────────────────────────────
  window.MOEXAdapter = {
    RIGHTS_CONFIRMED: MOEX_DISPLAY_RIGHTS_CONFIRMED,
    SOURCE_LABEL:     'Московская биржа, ISS API',
    SOURCE_URL:       'https://iss.moex.com/iss/',

    isEnabled: function () { return MOEX_DISPLAY_RIGHTS_CONFIRMED; },

    getIndex: function (ticker) {
      var url = 'https://iss.moex.com/iss/engines/stock/markets/index/boards/SNDX/securities/'
        + encodeURIComponent(ticker)
        + '.json?iss.meta=off&iss.only=securities,marketdata';
      return _fetch('idx-' + ticker, url);
    },

    getIndices: function () {
      var url = 'https://iss.moex.com/iss/engines/stock/markets/index/boards/SNDX/securities.json?iss.meta=off&iss.only=securities,marketdata';
      return _fetch('indices-all', url);
    },

    clearCache: function () { _cache = {}; },
  };
}());
