// assets/investik.js v1 — Инвестик: плавающий помощник по материалам клуба
(function () {
  'use strict';

  // ── Config & feature flag ─────────────────────────────────────────────────
  var CFG = window.INVESTIK_CFG || {};
  var _paramFlag = (function () {
    var s = (window.location && window.location.search) || '';
    var h = (window.location && window.location.hash)   || '';
    // Also check Telegram startParam passed via initDataUnsafe
    var tg = window.Telegram && window.Telegram.WebApp;
    var sp = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || '';
    return s.indexOf('investik=1') >= 0 ||
           h.indexOf('investik=1') >= 0 ||
           sp.indexOf('investik=1') >= 0;
  }());
  var _enabled = !!(CFG.enabled || _paramFlag);
  if (!_enabled) return;

  // No server AI endpoint → demoMode (search project data only)
  var _DEMO = true;

  var _greeting = CFG.greeting ||
    'Привет! Я Инвестик, помощник по материалам клуба. ' +
    'Могу объяснить инвестиционный термин или помочь найти нужный урок. ' +
    'Нажмите на меня и задайте вопрос.';

  var _disclaimer =
    'График у меня на голове, но индивидуальных инвестиционных рекомендаций я не даю.';

  var _quickQ = CFG.quickQuestions || [
    'Что такое облигация?',
    'Чем акция отличается от облигации?',
    'С чего начать обучение?',
    'Как найти нужный урок?',
  ];

  var _BUY_KW = [
    'что купить', 'что продать', 'стоит купить', 'стоит продать',
    'купи мне', 'выбери акцию', 'посоветуй акцию', 'посоветуй актив',
  ];
  var _BUY_DENY =
    'Я не выбираю активы за пользователя. ' +
    'Могу помочь сравнить варианты по цели, сроку, риску и ликвидности.';

  var _NO_ANSWER =
    'В материалах клуба пока нет точного ответа. ' +
    'Попробуйте уточнить вопрос или обратиться к менеджеру.';

  var _NAV_H = 70; // навигация + safe area
  var LS_POS  = 'iv_investik_pos';
  var SS_GREET = 'iv_investik_greet';

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ёЁ]/g, 'е')
      .replace(/[^а-яёa-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _openUrl(url) {
    if (!url) return;
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openLink) { tg.openLink(url); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Search (demoMode) ─────────────────────────────────────────────────────
  function _scoreText(query, text) {
    var q = _norm(query);
    var t = _norm(text);
    if (!q || !t) return 0;
    if (t.indexOf(q) >= 0) return 10;
    var words = q.split(' ').filter(function (w) { return w.length > 2; });
    var hits = 0;
    for (var i = 0; i < words.length; i++) {
      if (t.indexOf(words[i]) >= 0) hits++;
    }
    return hits;
  }

  function _search(raw) {
    var q = _norm(raw);

    // Buy/advice denial
    for (var bi = 0; bi < _BUY_KW.length; bi++) {
      if (q.indexOf(_norm(_BUY_KW[bi])) >= 0) {
        return { text: _BUY_DENY };
      }
    }

    // Expand synonyms
    if (typeof FAQ_SYNONYMS !== 'undefined') {
      Object.keys(FAQ_SYNONYMS).forEach(function (k) {
        if (q.indexOf(_norm(k)) >= 0) q += ' ' + FAQ_SYNONYMS[k];
      });
    }

    var best = null;
    var bestScore = 0;

    // Search FAQ_DATA
    if (typeof FAQ_DATA !== 'undefined') {
      for (var fi = 0; fi < FAQ_DATA.length; fi++) {
        var item = FAQ_DATA[fi];
        var hay = _norm([item.question, item.short, (item.keywords || []).join(' ')].join(' '));
        var s = _scoreText(q, hay);
        if (s > bestScore) {
          bestScore = s;
          var acts = (item.actions || []).slice(0, 2).map(function (a) {
            return { label: a.label, url: a.url };
          });
          best = { text: item.short || item.question, actions: acts.length ? acts : undefined };
        }
      }
    }

    // Search FAQ_TOPICS (course modules)
    if (typeof FAQ_TOPICS !== 'undefined') {
      for (var ti = 0; ti < FAQ_TOPICS.length; ti++) {
        var tp = FAQ_TOPICS[ti];
        var hay2 = _norm([tp.title, tp.desc, tp.keywords || ''].join(' '));
        var s2 = _scoreText(q, hay2);
        if (s2 > bestScore) {
          bestScore = s2;
          best = {
            text: (tp.step ? tp.step + ': ' : '') + tp.title + ' — ' + tp.desc,
            actions: tp.url ? [{ label: 'Открыть материал', url: tp.url }] : undefined,
          };
        }
      }
    }

    if (!best || bestScore < 1) {
      return {
        text: _NO_ANSWER,
        actions: [{ label: 'Написать в поддержку', url: 'https://investfriend.ru/cms/system/contact' }],
      };
    }
    return best;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  var _wrapEl = null;
  var _greetEl = null;
  var _dialogEl = null;
  var _dialogOpen = false;
  var _messages = [];
  var _thinking = false;

  // ── Build DOM ─────────────────────────────────────────────────────────────
  function _build() {
    // Wrapper
    _wrapEl = document.createElement('div');
    _wrapEl.className = 'ivk-wrap';
    _wrapEl.setAttribute('role', 'complementary');
    _wrapEl.setAttribute('aria-label', 'Инвестик');

    // Character image with emoji fallback
    var img = document.createElement('img');
    img.src = 'assets/investik.png';
    img.alt = 'Инвестик';
    img.className = 'ivk-char';
    img.setAttribute('draggable', 'false');
    img.onerror = function () {
      // Fallback: emoji placeholder if PNG not yet uploaded
      var fb = document.createElement('div');
      fb.className = 'ivk-char ivk-char-fb';
      fb.textContent = '🤖';
      img.parentNode && img.parentNode.replaceChild(fb, img);
    };

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'ivk-close';
    closeBtn.setAttribute('aria-label', 'Скрыть Инвестика');
    closeBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="10" height="10">' +
      '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32' +
      'L116.69,128,50.34,61.66a8,8,0,0,1,11.32-11.32L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32' +
      'L139.31,128Z"/></svg>';

    // Greeting bubble
    _greetEl = document.createElement('div');
    _greetEl.className = 'ivk-bubble';
    _greetEl.innerHTML =
      '<button class="ivk-bubble-close" aria-label="Закрыть приветствие">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="10" height="10">' +
      '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32' +
      'L116.69,128,50.34,61.66a8,8,0,0,1,11.32-11.32L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32' +
      'L139.31,128Z"/></svg></button>' +
      '<p class="ivk-bubble-text">' + _esc(_greeting) + '</p>';

    _wrapEl.appendChild(img);
    _wrapEl.appendChild(closeBtn);
    _wrapEl.appendChild(_greetEl);

    // Dialog bottom sheet
    _dialogEl = document.createElement('div');
    _dialogEl.className = 'ivk-dialog';
    _dialogEl.setAttribute('role', 'dialog');
    _dialogEl.setAttribute('aria-modal', 'true');
    _dialogEl.setAttribute('aria-label', 'Инвестик — помощник');
    _dialogEl.setAttribute('aria-hidden', 'true');
    _dialogEl.innerHTML =
      '<div class="ivk-dlg-handle"></div>' +
      '<div class="ivk-dlg-head">' +
        '<div class="ivk-dlg-headinfo">' +
          '<div class="ivk-dlg-title">Инвестик</div>' +
          '<div class="ivk-dlg-sub">Помощник по материалам клуба</div>' +
        '</div>' +
        '<button class="ivk-dlg-close" aria-label="Закрыть">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="20" height="20">' +
          '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32' +
          'L116.69,128,50.34,61.66a8,8,0,0,1,11.32-11.32L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32' +
          'L139.31,128Z"/></svg></button>' +
      '</div>' +
      '<div class="ivk-dlg-msgs"></div>' +
      '<div class="ivk-dlg-quick"></div>' +
      '<div class="ivk-dlg-input-row">' +
        '<input class="ivk-dlg-input" type="text"' +
          ' placeholder="Задайте вопрос об инвестициях или материалах клуба"' +
          ' autocomplete="off" maxlength="300">' +
        '<button class="ivk-dlg-send" aria-label="Отправить">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18">' +
          '<path d="M231.4,44.34a12,12,0,0,0-12.57-3L28.19,108.84a12,12,0,0,0,.25,22.6l80,28.88,' +
          '28.88,80A12,12,0,0,0,148.57,248h.42a12,12,0,0,0,11.28-7.87l67.53-190.64' +
          'A12,12,0,0,0,231.4,44.34ZM148.89,228l-26.89-74.47L172.15,103.4a12,12,0,0,0-17-17' +
          'L104.8,136.56,29.88,109.16l191-67.35Z"/></svg>' +
        '</button>' +
      '</div>';

    document.body.appendChild(_wrapEl);
    document.body.appendChild(_dialogEl);

    _restorePos();
    _bindEvents(img, closeBtn);
  }

  // ── Position & drag ───────────────────────────────────────────────────────
  function _restorePos() {
    try {
      var saved = JSON.parse(localStorage.getItem(LS_POS) || 'null');
      if (saved && saved.side) { _applyPos(saved.side, saved.top); return; }
    } catch (e) {}
    _applyPos('right', Math.floor(window.innerHeight * 0.55));
  }

  function _applyPos(side, top) {
    var maxTop = window.innerHeight - _NAV_H - 100;
    var t = Math.max(60, Math.min(top, maxTop));
    _wrapEl.style.top  = t + 'px';
    _wrapEl.style.right = side === 'right' ? '12px' : 'auto';
    _wrapEl.style.left  = side === 'left'  ? '12px' : 'auto';
  }

  function _savePos(side, top) {
    try { localStorage.setItem(LS_POS, JSON.stringify({ side: side, top: top })); } catch (e) {}
  }

  function _bindEvents(img, closeBtn) {
    var _isDrag = false, _moved = false;
    var _startX = 0, _startY = 0, _startTop = 0;

    function _ptOf(e) { return e.touches ? e.touches[0] : e; }

    function _onDown(e) {
      if (e.target === closeBtn || closeBtn.contains(e.target)) return;
      _isDrag = true;
      _moved  = false;
      var pt  = _ptOf(e);
      _startX = pt.clientX;
      _startY = pt.clientY;
      _startTop = parseInt(_wrapEl.style.top, 10) || 0;
      _wrapEl.classList.add('ivk-dragging');
      e.preventDefault();
    }

    function _onMove(e) {
      if (!_isDrag) return;
      var pt = _ptOf(e);
      var dx = pt.clientX - _startX;
      var dy = pt.clientY - _startY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) _moved = true;
      var newTop = _startTop + dy;
      var maxTop = window.innerHeight - _NAV_H - _wrapEl.offsetHeight - 8;
      _wrapEl.style.top = Math.max(60, Math.min(newTop, maxTop)) + 'px';
      e.preventDefault();
    }

    function _onUp(e) {
      if (!_isDrag) return;
      _isDrag = false;
      _wrapEl.classList.remove('ivk-dragging');

      if (!_moved) {
        // Tap → toggle dialog
        if (_dialogOpen) _closeDialog(); else _openDialog();
        return;
      }

      // Snap to nearest horizontal edge
      var pt = e.changedTouches ? e.changedTouches[0] : e;
      var side = pt.clientX < window.innerWidth / 2 ? 'left' : 'right';
      var top  = parseInt(_wrapEl.style.top, 10) || 0;
      _applyPos(side, top);
      _savePos(side, top);
    }

    _wrapEl.addEventListener('touchstart', _onDown, { passive: false });
    _wrapEl.addEventListener('touchmove',  _onMove, { passive: false });
    _wrapEl.addEventListener('touchend',   _onUp);
    _wrapEl.addEventListener('mousedown',  _onDown);
    document.addEventListener('mousemove', _onMove);
    document.addEventListener('mouseup',   _onUp);

    // Close character button
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _wrapEl.style.display  = 'none';
      _dialogEl.style.display = 'none';
    });

    // Greeting close
    var greetClose = _greetEl.querySelector('.ivk-bubble-close');
    greetClose.addEventListener('click', function (e) {
      e.stopPropagation();
      _hideGreeting();
    });

    // Dialog close button
    _dialogEl.querySelector('.ivk-dlg-close').addEventListener('click', _closeDialog);

    // Send
    _dialogEl.querySelector('.ivk-dlg-send').addEventListener('click', _handleSend);
    _dialogEl.querySelector('.ivk-dlg-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _handleSend(); }
    });

    // Quick questions
    var quickEl = _dialogEl.querySelector('.ivk-dlg-quick');
    quickEl.innerHTML = _quickQ.map(function (q) {
      return '<button class="ivk-quick-btn" data-q="' + _esc(q) + '">' + _esc(q) + '</button>';
    }).join('');
    quickEl.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.ivk-quick-btn');
      if (btn) _submitMsg(btn.getAttribute('data-q'));
    });

    // Show greeting once per session
    if (!sessionStorage.getItem(SS_GREET)) {
      setTimeout(function () { _greetEl.classList.add('ivk-bubble--show'); }, 700);
    } else {
      _greetEl.style.display = 'none';
    }
  }

  function _hideGreeting() {
    _greetEl.classList.remove('ivk-bubble--show');
    setTimeout(function () { _greetEl.style.display = 'none'; }, 280);
    try { sessionStorage.setItem(SS_GREET, '1'); } catch (e) {}
  }

  // ── Dialog ────────────────────────────────────────────────────────────────
  function _openDialog() {
    _hideGreeting();
    _dialogOpen = true;
    _dialogEl.classList.add('ivk-dialog--open');
    _dialogEl.setAttribute('aria-hidden', 'false');

    if (_messages.length === 0) {
      _messages.push({ role: 'bot', text: 'Привет! Задайте вопрос — я найду ответ в материалах клуба.' });
      _renderMsgs();
    }

    setTimeout(function () {
      var inp = _dialogEl.querySelector('.ivk-dlg-input');
      if (inp) inp.focus();
    }, 310);
  }

  function _closeDialog() {
    _dialogOpen = false;
    _dialogEl.classList.remove('ivk-dialog--open');
    _dialogEl.setAttribute('aria-hidden', 'true');
  }

  function _renderMsgs() {
    var el = _dialogEl.querySelector('.ivk-dlg-msgs');
    if (!el) return;

    var isFirstBot = true;
    el.innerHTML = _messages.map(function (m) {
      var isBot = m.role === 'bot';
      var cls   = isBot ? 'ivk-msg ivk-msg--bot' : 'ivk-msg ivk-msg--user';

      var actionsHTML = '';
      if (m.actions && m.actions.length) {
        actionsHTML = '<div class="ivk-msg-actions">'
          + m.actions.map(function (a) {
              return '<button class="ivk-action-btn" data-url="' + _esc(a.url || '') + '">'
                + _esc(a.label) + '</button>';
            }).join('')
          + '</div>';
      }

      // Disclaimer on all bot messages except the initial greeting
      var disc = '';
      if (isBot) {
        if (isFirstBot) { isFirstBot = false; }
        else { disc = '<div class="ivk-disclaimer">' + _esc(_disclaimer) + '</div>'; }
      }

      return '<div class="' + cls + '">'
        + '<div class="ivk-msg-text">' + _esc(m.text) + '</div>'
        + actionsHTML + disc + '</div>';
    }).join('');

    el.scrollTop = el.scrollHeight;

    // Bind action buttons
    el.querySelectorAll('.ivk-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { _openUrl(btn.getAttribute('data-url')); });
    });
  }

  function _handleSend() {
    var inp = _dialogEl.querySelector('.ivk-dlg-input');
    var text = (inp.value || '').trim();
    if (!text) return;
    inp.value = '';
    _submitMsg(text);
  }

  function _submitMsg(text) {
    if (_thinking) return;

    // Hide quick questions after first interaction
    var qEl = _dialogEl.querySelector('.ivk-dlg-quick');
    if (qEl) qEl.style.display = 'none';

    _messages.push({ role: 'user', text: text });
    _renderMsgs();

    // Add "thinking" placeholder
    _thinking = true;
    var placeholder = { role: 'bot', text: '…' };
    _messages.push(placeholder);
    _renderMsgs();

    setTimeout(function () {
      var result = _search(text);
      placeholder.text    = result.text;
      placeholder.actions = result.actions;
      _thinking = false;
      _renderMsgs();
    }, 350);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _build);
  } else {
    _build();
  }

}());
