// assets/favorites.js v1 — Unified favorites system
(function () {
  'use strict';

  // ── Star SVGs ────────────────────────────────────────────────────────────────
  var _SE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M239.2,97.4A16.4,16.4,0,0,0,225,86.5l-65.5-5.7L134.2,19.2a16.4,16.4,0,0,0-29.4,0L80.5,80.8,15,86.5A16.4,16.4,0,0,0,.8,97.4,16.4,16.4,0,0,0,5.4,114l48.8,42.8L39.1,220.8a16.3,16.3,0,0,0,6.4,17.1,16.4,16.4,0,0,0,18.1-.7L128,200.2l64.4,36.9a16.4,16.4,0,0,0,18.1-.7,16.3,16.3,0,0,0,6.4-17.1L201.8,156.8l48.8-42.8A16.4,16.4,0,0,0,239.2,97.4Zm-30.5,51.1a16.2,16.2,0,0,0-5.2,16l14.4,60.2-65.1-37.4a16.2,16.2,0,0,0-15,0L72.7,224.7l14.4-60.2a16.2,16.2,0,0,0-5.2-16L33,107.5l65.1-5.7a16.2,16.2,0,0,0,13.5-9.6L128,30.1l26.1,62.1a16.2,16.2,0,0,0,13.5,9.6l65.1,5.7Z"/></svg>';
  var _SF = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M234.5,98.4a16,16,0,0,0-13.7-11.1l-63.7-5.6L133.7,24.1a16,16,0,0,0-29.4,0L81.9,81.7,18.2,87.3A16,16,0,0,0,8.7,114.7l48,42.1L42.5,218a16,16,0,0,0,23.9,17.4L128,203.2l61.6,32.2A16,16,0,0,0,213.5,218l-14.2-61.2,48-42.1A16,16,0,0,0,234.5,98.4Z"/></svg>';

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
