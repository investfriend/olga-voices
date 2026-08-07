// assets/favorites.js v1 — Unified favorites system
(function () {
  'use strict';

  // ── Star SVGs ────────────────────────────────────────────────────────────────
  var _SE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M239.2,97.4A16.4,16.4,0,0,0,225,86.5l-65.5-5.7L134.2,19.2a16.4,16.4,0,0,0-29.4,0L80.5,80.8,15,86.5A16.4,16.4,0,0,0,.8,97.4,16.4,16.4,0,0,0,5.4,114l48.8,42.8L39.1,220.8a16.3,16.3,0,0,0,6.4,17.1,16.4,16.4,0,0,0,18.1-.7L128,200.2l64.4,36.9a16.4,16.4,0,0,0,18.1-.7,16.3,16.3,0,0,0,6.4-17.1L201.8,156.8l48.8-42.8A16.4,16.4,0,0,0,239.2,97.4Zm-30.5,51.1a16.2,16.2,0,0,0-5.2,16l14.4,60.2-65.1-37.4a16.2,16.2,0,0,0-15,0L72.7,224.7l14.4-60.2a16.2,16.2,0,0,0-5.2-16L33,107.5l65.1-5.7a16.2,16.2,0,0,0,13.5-9.6L128,30.1l26.1,62.1a16.2,16.2,0,0,0,13.5,9.6l65.1,5.7Z"/></svg>';
  var _SF = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M234.5,98.4a16,16,0,0,0-13.7-11.1l-63.7-5.6L133.7,24.1a16,16,0,0,0-29.4,0L81.9,81.7,18.2,87.3A16,16,0,0,0,8.7,114.7l48,42.1L42.5,218a16,16,0,0,0,23.9,17.4L128,203.2l61.6,32.2A16,16,0,0,0,213.5,218l-14.2-61.2,48-42.1A16,16,0,0,0,234.5,98.4Z"/></svg>';

  // Group type icons (Phosphor, 16×16)
  var _GICONS = {
    steps:    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M243.28,68.24l-112-40a8,8,0,0,0-6.56,0l-112,40a8,8,0,0,0,0,15.52L36,93.57V176a16,16,0,0,0,16,16H204a16,16,0,0,0,16-16V93.57l16-5.81V192a8,8,0,0,0,16,0V76A8,8,0,0,0,243.28,68.24ZM204,176H52V99.43l72,26.18a8.06,8.06,0,0,0,2.73.48,8,8,0,0,0,2.73-.48L204,98.59Zm-76-66.61L41.08,76,128,45.19,214.92,76Z" opacity="0.25"/><path d="M243.28,68.24l-112-40a8,8,0,0,0-6.56,0l-112,40a8,8,0,0,0,0,15.52L36,93.57V176a16,16,0,0,0,16,16H204a16,16,0,0,0,16-16V93.57l16-5.81V192a8,8,0,0,0,16,0V76A8,8,0,0,0,243.28,68.24ZM204,176H52V99.43l72,26.18a8.06,8.06,0,0,0,5.46,0L204,98.59Zm-76-66.61L41.08,76,128,45.19,214.92,76Z"/></svg>',
    lessons:  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M208,24H72A32,32,0,0,0,40,56V224a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16H56a16,16,0,0,1,16-16H208a8,8,0,0,0,8-8V32A8,8,0,0,0,208,24Zm-8,168H72a31.82,31.82,0,0,0-16,4.29V56A16,16,0,0,1,72,40H200Z"/></svg>',
    intensiv: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M213.85,125.46A8,8,0,0,0,208,120H160V40a8,8,0,0,0-14.85-4.16l-88,128A8,8,0,0,0,64,176h48v40a8,8,0,0,0,14.85,4.16l88-128A8,8,0,0,0,213.85,125.46ZM144,198.61V168a8,8,0,0,0-8-8H88.17L112,57.39V88a8,8,0,0,0,8,8h55.83Z"/></svg>',
    efiry:    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M208,40H48A24,24,0,0,0,24,64V168a24,24,0,0,0,24,24h68.92L104.19,216H88a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16H151.81l-12.72-24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,128a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Z"/></svg>',
    faq:      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>',
    resource: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M224,104a8,8,0,0,1-16,0V79.32l-82.34,82.34a8,8,0,0,1-11.32-11.32L196.68,68H172a8,8,0,0,1,0-16h44a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>',
  };

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _openUrl(url) {
    if (!url) return;
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openLink) { tg.openLink(url); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function _openFaqItem(id) {
    if (typeof setPage === 'function') setPage('faq');
    setTimeout(function () {
      if (typeof window._faqExpand === 'function') window._faqExpand(id);
    }, 90);
  }

  // ── Resolve a key → display metadata ────────────────────────────────────────
  function resolveKey(key) {
    var sep = key.indexOf('/');
    if (sep < 0) return null;
    var prefix = key.slice(0, sep);
    var id = key.slice(sep + 1);

    if (prefix === 'faq') {
      if (typeof FAQ_DATA === 'undefined') return null;
      var fi = null;
      for (var i = 0; i < FAQ_DATA.length; i++) {
        if (FAQ_DATA[i].id === id) { fi = FAQ_DATA[i]; break; }
      }
      if (!fi) return null;
      return (function (fid) {
        return {
          group: 'faq', groupLabel: 'FAQ', groupOrder: 5,
          typLabel: 'FAQ', title: fi.question, short: fi.short || '',
          key: key, open: function () { _openFaqItem(fid); },
        };
      }(id));
    }

    if (prefix === 'home') {
      var cfg = typeof HOME_CFG !== 'undefined' ? HOME_CFG : null;
      if (!cfg) return null;

      if (cfg.steps) {
        for (var si = 0; si < cfg.steps.length; si++) {
          if (cfg.steps[si].id === id) {
            return (function (s) {
              return {
                group: 'steps', groupLabel: 'Курсы и ступени', groupOrder: 1,
                typLabel: s.label, title: s.label + ' · ' + s.sub, short: s.desc,
                key: key, open: function () { _openUrl(s.url); },
              };
            }(cfg.steps[si]));
          }
        }
      }

      if (cfg.archives) {
        for (var ai = 0; ai < cfg.archives.length; ai++) {
          if (cfg.archives[ai].id === id) {
            return (function (a) {
              var isEfir = a.id === 'arc-efiry';
              return {
                group: isEfir ? 'efiry' : 'intensiv',
                groupLabel: isEfir ? 'Эфиры' : 'Интенсивы',
                groupOrder: isEfir ? 4 : 3,
                typLabel: isEfir ? 'Эфир' : 'Интенсив',
                title: a.title,
                short: 'Архив всех ' + (isEfir ? 'эфиров клуба' : 'живых интенсивов'),
                key: key, open: function () { _openUrl(a.url); },
              };
            }(cfg.archives[ai]));
          }
        }
      }
      return null;
    }

    if (prefix === 'resource') {
      if (typeof CHAT_CFG === 'undefined') return null;
      for (var rsi = 0; rsi < CHAT_CFG.sections.length; rsi++) {
        var rsec = CHAT_CFG.sections[rsi];
        for (var rii = 0; rii < rsec.items.length; rii++) {
          if (rsec.items[rii].id === id) {
            return (function (ri) {
              return {
                group: 'resource', groupLabel: 'Полезные ресурсы', groupOrder: 6,
                typLabel: 'Ресурс', title: ri.title, short: ri.desc || '',
                key: key, open: function () { _openUrl(ri.url); },
              };
            }(rsec.items[rii]));
          }
        }
      }
      return null;
    }

    // DATA.categories items (legacy catId/itemId keys)
    if (typeof DATA !== 'undefined') {
      for (var ci = 0; ci < DATA.categories.length; ci++) {
        if (DATA.categories[ci].id !== prefix) continue;
        var cat = DATA.categories[ci];
        for (var ii = 0; ii < cat.items.length; ii++) {
          if (cat.items[ii].id !== id) continue;
          return (function (c, item) {
            return {
              group: 'lessons', groupLabel: 'Уроки', groupOrder: 2,
              typLabel: item.tag || 'Урок', title: item.title, short: item.desc || '',
              key: key,
              open: function () {
                if (typeof openItem === 'function') openItem(c.id, item.id);
              },
            };
          }(cat, cat.items[ii]));
        }
      }
    }

    return null;
  }

  // ── Favorites screen ─────────────────────────────────────────────────────────
  var _currentResolved = [];
  var _listenerAttached = false;

  function renderScreen() {
    var el = document.getElementById('fav-screen');
    if (!el) return;

    var all = window.STATE ? [].concat(STATE.favorites).reverse() : [];
    _currentResolved = all.map(resolveKey).filter(Boolean);

    if (!_currentResolved.length) {
      el.innerHTML =
        '<div class="fav-empty">'
        + '<div class="fav-empty-icon">' + _SE + '</div>'
        + '<div class="fav-empty-title">Здесь пока пусто</div>'
        + '<div class="fav-empty-text">Ставьте звезду рядом с полезными материалами — они сохранятся здесь, чтобы вы могли быстро к ним вернуться.</div>'
        + '</div>';
      return;
    }

    var groupMap = {}, groupKeys = [];
    _currentResolved.forEach(function (r) {
      if (!groupMap[r.group]) {
        groupMap[r.group] = { label: r.groupLabel, order: r.groupOrder, items: [] };
        groupKeys.push(r.group);
      }
      groupMap[r.group].items.push(r);
    });
    groupKeys.sort(function (a, b) { return groupMap[a].order - groupMap[b].order; });

    el.innerHTML = groupKeys.map(function (gk) {
      var g = groupMap[gk];
      return '<div class="fav-group">'
        + '<div class="fav-group-head">'
        + (_GICONS[gk] ? '<span class="fav-group-icon">' + _GICONS[gk] + '</span>' : '')
        + '<span class="fav-group-title">' + g.label + '</span>'
        + '<span class="fav-group-count">' + g.items.length + '</span>'
        + '</div>'
        + g.items.map(function (r) {
            return '<div class="fav-card">'
              + '<div class="fav-card-type">' + _esc(r.typLabel) + '</div>'
              + '<div class="fav-card-title">' + _esc(r.title) + '</div>'
              + (r.short ? '<div class="fav-card-short">' + _esc(r.short) + '</div>' : '')
              + '<div class="fav-card-actions">'
              + '<button class="fav-card-open" data-fav-open="' + _esc(r.key) + '">Открыть</button>'
              + '<button class="fav-star-btn is-fav" data-fav-key="' + _esc(r.key) + '" aria-label="Убрать из избранного">' + _SF + '</button>'
              + '</div>'
              + '</div>';
          }).join('')
        + '</div>';
    }).join('');

    if (!_listenerAttached) {
      _listenerAttached = true;
      el.addEventListener('click', function (e) {
        var openBtn = e.target.closest('[data-fav-open]');
        if (openBtn) {
          var k = openBtn.dataset.favOpen;
          for (var i = 0; i < _currentResolved.length; i++) {
            if (_currentResolved[i].key === k) { _currentResolved[i].open(); break; }
          }
          return;
        }
        var starBtn = e.target.closest('[data-fav-key]');
        if (starBtn) FAV.toggle(starBtn.dataset.favKey, starBtn);
      });
    }
  }

  // ── FAV global API ───────────────────────────────────────────────────────────
  var FAV = {
    starEmpty: _SE,
    starFill:  _SF,

    isFav: function (key) {
      return !!(window.STATE && STATE.favorites.indexOf(key) >= 0);
    },

    toggle: function (key, btn) {
      if (!window.STATE) return;
      var idx = STATE.favorites.indexOf(key);
      if (idx >= 0) {
        STATE.favorites.splice(idx, 1);
      } else {
        STATE.favorites.push(key);
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
      localStorage.setItem('iv_favs', JSON.stringify(STATE.favorites));
      FAV._syncButtons(key);
      if (window.STATE && STATE.page === 'favorites') renderScreen();
    },

    _syncButtons: function (key) {
      var isFav = FAV.isFav(key);
      document.querySelectorAll('[data-fav-key="' + key + '"]').forEach(function (b) {
        b.classList.toggle('is-fav', isFav);
        b.innerHTML = isFav ? _SF : _SE;
        b.setAttribute('aria-label', isFav ? 'Убрать из избранного' : 'Добавить в избранное');
      });
    },

    renderScreen: renderScreen,
  };

  window.FAV = FAV;
  window.renderFavorites = renderScreen;

}());
