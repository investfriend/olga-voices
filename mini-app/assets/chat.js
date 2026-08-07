// assets/chat.js v1 — Экран «Общение»
(function () {
  'use strict';

  // ── Иконки Phosphor (inline SVG) ─────────────────────────────────────────────
  var _IC = {
    // ChatCircleDots — каналы общения
    chat: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M231.66,213.73a8,8,0,0,1-9.93,9.93L194,215.5A72.05,72.05,0,0,1,92.06,175.89h0c1.31.07,2.62.11,3.94.11a72,72,0,0,0,67.93-95.88h0A72,72,0,0,1,223.5,186Z" opacity="0.2"/><path d="M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86ZM62,159.5a8.28,8.28,0,0,0-2.26.32L32,168l8.17-27.76a8,8,0,0,0-.63-6,64,64,0,1,1,26.26,26.26A8,8,0,0,0,62,159.5Zm153.79,28.73L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z"/></svg>',
    // Users — группы и сообщества
    users: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z" opacity="0.2"/><path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/></svg>',
    // Question — помощь и вопросы
    question: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>',
    // ChartLineUp — финансовые ресурсы
    chart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232,200a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16H224A8,8,0,0,1,232,200ZM48,168a8,8,0,0,0,5.66-2.34L96,123.31l34.34,34.35a8,8,0,0,0,11.32,0l96-96a8,8,0,0,0-11.32-11.32L136,140.69,101.66,106.34a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,48,168Z" opacity="0.2"/><path d="M232,200a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16H224A8,8,0,0,1,232,200ZM40.34,154.34,88,106.63l34.34,34.35a8,8,0,0,0,11.32,0l96-96A8,8,0,0,0,218.34,33.66L128,123.31,93.66,89A8,8,0,0,0,82.34,89l-53.66,53.65a8,8,0,1,0,11.32,11.32Z"/></svg>',
    // ArrowSquareOut — внешняя ссылка
    ext: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M224,104a8,8,0,0,1-16,0V79.32l-82.34,82.34a8,8,0,0,1-11.32-11.32L196.68,68H172a8,8,0,0,1,0-16h44a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>',
    // ArrowRight — внутренний переход
    arrow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></svg>',
  };

  // ── Конфигурация ─────────────────────────────────────────────────────────────
  var CHAT_CFG = {
    sections: [
      {
        id: 'channels',
        title: 'Каналы клуба',
        items: [
          {
            id: 'telegram-club',
            title: 'Telegram клуба',
            badge: 'Для участников клуба',
            access: 'getcourse_protected',
            icon: 'chat',
            desc: 'Основная площадка общения клуба. Здесь публикуются анонсы, обсуждения, инвестиционные идеи, комментарии аналитиков и сообщения участников.',
            note: 'Сейчас подключение выполняется через специальный урок и Telegram-бота, который управляет доступом участника.',
            btn: 'Подключить Telegram',
            connectionLessonUrl: 'https://investfriend.ru/pl/teach/control/lesson/view?id=346013705&editMode=0',
            directUrl: null,
          },
          {
            id: 'max-channel',
            title: 'Канал клуба в MAX',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'chat',
            desc: 'Официальный канал инвестклуба «Финансовой свободы». Здесь дублируются ключевые анонсы и важные сообщения клуба: эфиры и мероприятия, обновления и новости, важные напоминания.',
            note: 'Подойдёт тем, кто хочет следить за основными событиями клуба в MAX.',
            btn: 'Открыть MAX',
            url: 'https://max.ru/sabitovaolga',
          },
          {
            id: 'getcourse-chat',
            title: 'Чат клуба в GetCourse',
            badge: 'Для участников клуба',
            access: 'getcourse_protected',
            icon: 'users',
            desc: 'Общение с участниками клуба внутри учебной платформы.',
            note: 'После перехода нажмите синюю кнопку «Вступить в чат». После вступления откроются общий чат и дополнительные чаты, которые дублируют ветки Telegram.',
            btn: 'Открыть чат',
            url: 'https://investfriend.ru/chtm/app/getcourse/chat/VebyXBF5Hp9BCoOtm2UL3',
          },
        ],
      },
      {
        id: 'help',
        title: 'Помощь и вопросы',
        items: [
          {
            id: 'support',
            title: 'Поддержка',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'question',
            desc: 'Помощь по доступу, оплате, работе платформы и другим организационным вопросам.',
            btn: 'Написать в поддержку',
            url: 'https://investfriend.ru/cms/system/contact',
          },
          {
            id: 'analysts-question',
            title: 'Задать вопрос аналитикам',
            badge: 'Для участников клуба',
            access: 'getcourse_protected',
            icon: 'question',
            desc: 'Форма для гарантированной фиксации вопроса аналитикам.',
            note: 'Используйте форму, если вопрос требует ответа или разбора со стороны аналитической команды клуба.',
            btn: 'Задать вопрос',
            url: 'https://investfriend.ru/club-questions',
          },
          {
            id: 'community-manager',
            title: 'Менеджер комьюнити',
            badge: 'Скоро',
            access: 'coming_soon',
            icon: 'users',
            featured: true,
            desc: 'Персональная помощь по вопросам участия, комьюнити и организационным вопросам.',
            btn: 'Скоро',
            url: null,
          },
        ],
      },
      {
        id: 'resources',
        title: 'Полезные ресурсы',
        intro: 'Сервисы и официальные источники, которые помогут следить за рынком, анализировать активы и вести портфель.',
        items: [
          {
            id: 'tradingview',
            title: 'TradingView',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'chart',
            external: true,
            desc: 'Графики, котировки и инструменты технического анализа.',
            btn: 'Открыть',
            url: 'https://ru.tradingview.com/',
          },
          {
            id: 'snowball',
            title: 'Snowball Income',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'chart',
            external: true,
            desc: 'Учёт активов, дивидендов и структуры инвестиционного портфеля.',
            btn: 'Открыть',
            url: 'https://snowball-income.com/',
          },
          {
            id: 'cbr',
            title: 'Банк России',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'chart',
            external: true,
            desc: 'Ключевая ставка, инфляция, курсы валют, решения и статистика регулятора.',
            btn: 'Открыть',
            url: 'https://www.cbr.ru/',
          },
          {
            id: 'dohod',
            title: 'ДОХОДЪ',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'chart',
            external: true,
            desc: 'Сервисы для анализа российских акций, облигаций и дивидендов.',
            btn: 'Открыть',
            url: 'https://www.dohod.ru/ik/analytics/dividend',
          },
        ],
      },
    ],
  };

  window.CHAT_CFG = CHAT_CFG;

  // ── Утилиты ──────────────────────────────────────────────────────────────────
  function _findItem(id) {
    var found = null;
    CHAT_CFG.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        if (it.id === id) found = it;
      });
    });
    return found;
  }

  // ── Бейдж доступа ────────────────────────────────────────────────────────────
  function _badgeHTML(item) {
    var cls = item.access === 'public' ? 'ch-badge--open'
      : item.access === 'coming_soon' ? 'ch-badge--soon'
      : 'ch-badge--auth';
    return '<span class="ch-badge ' + cls + '">' + item.badge + '</span>';
  }

  // ── Карточка ─────────────────────────────────────────────────────────────────
  function _cardHTML(item) {
    var isSoon = item.access === 'coming_soon';
    var btnIcon = item.external ? _IC.ext : _IC.arrow;
    var btn = '<button class="ch-btn' + (isSoon ? ' ch-btn--disabled' : '') + '"'
      + (isSoon ? ' disabled aria-disabled="true"' : ' data-action="' + item.id + '"')
      + '>'
      + (isSoon ? '' : btnIcon)
      + item.btn
      + '</button>';

    return '<div class="ch-card' + (item.featured ? ' ch-card--featured' : '') + '">'
      + '<div class="ch-card-head">'
      + '<div class="ch-ic">' + (_IC[item.icon] || _IC.chat) + '</div>'
      + '<div class="ch-card-meta">'
      + '<div class="ch-card-title">' + item.title + '</div>'
      + _badgeHTML(item)
      + '</div>'
      + '</div>'
      + '<p class="ch-card-desc">' + item.desc + '</p>'
      + (item.note ? '<p class="ch-card-note">' + item.note + '</p>' : '')
      + btn
      + '</div>';
  }

  // ── Секция ───────────────────────────────────────────────────────────────────
  function _sectionHTML(sec) {
    return '<div class="ch-section">'
      + '<h3 class="ch-section-title">' + sec.title + '</h3>'
      + (sec.intro ? '<p class="ch-section-intro">' + sec.intro + '</p>' : '')
      + sec.items.map(_cardHTML).join('')
      + '</div>';
  }

  // ── Обработчик кликов ────────────────────────────────────────────────────────
  var _pendingUrl = null;

  function _handleClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var item = _findItem(btn.dataset.action);
    if (!item) return;

    if (item.access === 'public') {
      openUrl(item.url);
    } else if (item.access === 'getcourse_protected') {
      // Для Telegram используем connectionLessonUrl пока directUrl не задан
      var target = item.url || (item.directUrl || item.connectionLessonUrl);
      _showModal(target);
    }
  }

  // ── Модальное окно GetCourse ─────────────────────────────────────────────────
  function _showModal(url) {
    _pendingUrl = url;
    var overlay = document.getElementById('ch-modal');
    if (!overlay) return;
    overlay.removeAttribute('aria-hidden');
    overlay.classList.add('ch-modal--visible');
    document.body.classList.add('ch-no-scroll');
  }

  function _hideModal() {
    _pendingUrl = null;
    var overlay = document.getElementById('ch-modal');
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('ch-modal--visible');
    document.body.classList.remove('ch-no-scroll');
  }

  function _initModal() {
    var overlay = document.getElementById('ch-modal');
    var goBtn   = document.getElementById('ch-modal-go');
    var cancelBtn = document.getElementById('ch-modal-cancel');
    if (!overlay) return;

    goBtn && goBtn.addEventListener('click', function () {
      var url = _pendingUrl;
      _hideModal();
      if (url) openUrl(url);
    });
    cancelBtn && cancelBtn.addEventListener('click', _hideModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _hideModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') _hideModal();
    });
  }

  // ── Рендер страницы ──────────────────────────────────────────────────────────
  function renderChat() {
    var root = document.getElementById('ch-root');
    if (!root) return;
    root.innerHTML =
      '<div class="ch-page-head">'
      + '<h2 class="ch-page-title">Общение</h2>'
      + '<p class="ch-page-sub">Выберите удобные площадки для общения, получения анонсов и связи с командой клуба. Можно выбрать все.</p>'
      + '</div>'
      + CHAT_CFG.sections.map(_sectionHTML).join('');
    root.addEventListener('click', _handleClick);
  }

  // ── Инициализация ────────────────────────────────────────────────────────────
  function initChat() {
    renderChat();
    _initModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }

}());
