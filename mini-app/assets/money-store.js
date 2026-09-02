/* assets/money-store.js v1 — unified iv_money storage layer */
/* Exposes window.MONEY_STORE — must load before money.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'iv_money';
  var SCHEMA_VERSION = 1;
  var _state = null;
  var _storageOk = false;
  var _subscribers = [];

  // ─── Internal helpers ──────────────────────────────────────────────────────

  function _now() { return new Date().toISOString(); }

  function _localDateStr() {
    var d = new Date();
    return d.getFullYear() + '-'
      + ('0' + (d.getMonth() + 1)).slice(-2) + '-'
      + ('0' + d.getDate()).slice(-2);
  }

  function _checkStorage() {
    try {
      var k = '__mn_chk__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function _persist(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); return true; }
    catch (e) { return false; }
  }

  // Returns: null = key missing, undefined = parse error, object = parsed data
  function _read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) { return undefined; }
  }

  function _emptyState() {
    var ts = _now();
    return {
      schemaVersion: SCHEMA_VERSION,
      createdAt: ts,
      updatedAt: ts,
      migration: { from: null, migratedAt: null, status: 'fresh' },
      settings: { currency: 'RUB', storageMode: 'local', categories: [] },
      accounts: [],
      transactions: [],
      quickExpenses: [],
      goals: [],
      monthlyPlans: []
    };
  }

  function _migrateFromV1(old) {
    var ts = _now();
    var s = _emptyState();
    s.createdAt = ts;
    s.migration = { from: 'money_state_v1', migratedAt: ts, status: 'completed' };

    if (Array.isArray(old.templates)) {
      s.quickExpenses = old.templates.map(function (t) {
        return {
          id: t.id,
          name: t.title,
          category: t.category || '',
          amountMinor: t.amountMinor || 0,
          accountId: null,
          active: t.active !== false,
          createdAt: t.createdAt || ts,
          updatedAt: t.updatedAt || ts
        };
      });
    }

    if (Array.isArray(old.operations)) {
      s.transactions = old.operations.map(function (op) {
        return {
          id: op.id,
          type: op.type === 'investment' ? 'investment' : 'expense',
          title: op.title || '',
          amountMinor: op.amountMinor || 0,
          localDate: op.localDate || _localDateStr(),
          accountId: null,
          toAccountId: null,
          category: op.category || null,
          note: '',
          quickExpenseId: op.templateId || null,
          createdAt: op.createdAt || ts,
          updatedAt: op.createdAt || ts
        };
      });
    }

    if (old.investmentPlans && typeof old.investmentPlans === 'object'
        && !Array.isArray(old.investmentPlans)) {
      s.monthlyPlans = Object.keys(old.investmentPlans).map(function (month) {
        var plan = old.investmentPlans[month];
        return {
          id: 'mp_' + month.replace('-', ''),
          month: month,
          plannedIncomes: [],
          mandatoryExpenses: [],
          plannedInvestmentMinor: plan.amountMinor || 0,
          goalAllocations: [],
          createdAt: ts,
          updatedAt: ts
        };
      });
    }

    return s;
  }

  function _notify() {
    for (var i = 0; i < _subscribers.length; i++) {
      try { _subscribers[i](_state); } catch (e) {}
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function validate(s) {
    return !!(s && typeof s === 'object'
      && s.schemaVersion === SCHEMA_VERSION
      && Array.isArray(s.accounts)
      && Array.isArray(s.transactions)
      && Array.isArray(s.quickExpenses)
      && Array.isArray(s.goals)
      && Array.isArray(s.monthlyPlans)
      && s.settings && typeof s.settings === 'object');
  }

  function load() {
    _storageOk = _checkStorage();

    if (!_storageOk) {
      _state = _emptyState();
      _state.settings.storageMode = 'memory';
      return { ok: false, error: 'storage_unavailable' };
    }

    var parsed = _read();

    // Corrupted JSON
    if (parsed === undefined) {
      _state = _emptyState();
      _state.migration = { from: 'iv_money', migratedAt: null, status: 'corrupted' };
      return { ok: false, error: 'corrupted' };
    }

    // Valid iv_money already exists — skip migration
    if (parsed !== null && validate(parsed)) {
      _state = parsed;
      return { ok: true };
    }

    // iv_money exists but fails schema check — don't auto-overwrite with empty
    if (parsed !== null) {
      _state = _emptyState();
      _state.migration = { from: 'iv_money', migratedAt: null, status: 'corrupted' };
      return { ok: false, error: 'invalid_schema' };
    }

    // iv_money missing — attempt migration from money_state_v1
    var oldRaw = null;
    try { oldRaw = localStorage.getItem('money_state_v1'); } catch (e) {}
    if (oldRaw) {
      var old = null;
      try { old = JSON.parse(oldRaw); } catch (e) {}
      if (old && Array.isArray(old.templates) && Array.isArray(old.operations)) {
        var migrated = _migrateFromV1(old);
        if (_persist(migrated)) {
          var verify = _read();
          if (verify && validate(verify)) {
            _state = verify;
            return { ok: true, migrated: true };
          }
        }
        // Save failed — use migrated state in memory only
        _state = migrated;
        _state.settings.storageMode = 'memory';
        return { ok: false, error: 'migration_save_failed' };
      }
    }

    // Fresh start
    _state = _emptyState();
    _persist(_state);
    return { ok: true };
  }

  function getState() { return _state; }

  function update(fn) {
    fn(_state);
    _state.updatedAt = _now();
    _notify();
  }

  function save() {
    if (!_storageOk) return false;
    _state.updatedAt = _now();
    return _persist(_state);
  }

  function exportData() {
    return JSON.parse(JSON.stringify(_state));
  }

  function importData(data) {
    if (!validate(data)) return false;
    _state = JSON.parse(JSON.stringify(data));
    _state.updatedAt = _now();
    _notify();
    return _storageOk ? _persist(_state) : false;
  }

  function subscribe(fn) {
    if (typeof fn === 'function') _subscribers.push(fn);
  }

  function unsubscribe(fn) {
    _subscribers = _subscribers.filter(function (s) { return s !== fn; });
  }

  window.MONEY_STORE = {
    load: load,
    getState: getState,
    update: update,
    save: save,
    createId: createId,
    validate: validate,
    exportData: exportData,
    importData: importData,
    subscribe: subscribe,
    unsubscribe: unsubscribe
  };

}());
