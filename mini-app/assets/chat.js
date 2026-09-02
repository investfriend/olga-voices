// assets/chat.js v4 — Раздел «Клуб»: Лента + Общение
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

  // ── Иконки Phosphor для Ленты (36×36) ────────────────────────────────────────
  var _FIC = {
    // Newspaper / NewspaperClipping — все публикации
    newsp: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48H40A16,16,0,0,0,24,64V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H40V64H216ZM88,96a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm0,32a8,8,0,0,1,8-8H168a8,8,0,0,1,0,16H96A8,8,0,0,1,88,128Zm96,32H96a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16ZM152,96h24a8,8,0,0,1,0,16H152a8,8,0,0,1,0-16Z"/></svg>',
    // Trophy — результаты участников
    trophy: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,40H176V32a8,8,0,0,0-8-8H88a8,8,0,0,0-8,8v8H40A16,16,0,0,0,24,56V80c0,29.52,12.32,56.07,33.79,73.79A96.18,96.18,0,0,0,120,184.51V208H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V184.51a96.18,96.18,0,0,0,62.21-30.72C219.68,136.07,232,109.52,232,80V56A16,16,0,0,0,216,40ZM40,80V56H80v64.45C57.23,108.13,40,95.12,40,80Zm111.34,82.55A80.22,80.22,0,0,1,128,168a80.22,80.22,0,0,1-23.34-5.45A80,80,0,0,1,48,80V56H208V80A80,80,0,0,1,151.34,162.55ZM216,80c0,15.12-17.23,28.13-40,40.45V56h40Z"/></svg>',
    // CalendarDots — анонсы и расписание
    calendar: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V80H208ZM48,64V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V64Zm40,84a12,12,0,1,1-12-12A12,12,0,0,1,88,148Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,128,148Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,168,148Z"/></svg>',
    // Compass — правила и навигация
    compass: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm54.36-137.23-48,23.23a8.05,8.05,0,0,0-3.9,3.9l-23.23,48a8,8,0,0,0,10.58,10.58l48-23.23a8.05,8.05,0,0,0,3.9-3.9l23.23-48a8,8,0,0,0-10.58-10.58ZM152,152,115.2,169.88l17.92-37.08L169.92,115Z"/></svg>',
    // Microphone — весточка от Оли
    micro: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,176a48.05,48.05,0,0,0,48-48V88a48,48,0,0,0-96,0v40A48.05,48.05,0,0,0,128,176ZM96,88a32,32,0,0,1,64,0v40a32,32,0,0,1-64,0Zm40,144H136V208a80.09,80.09,0,0,0,80-80,8,8,0,0,0-16,0,64,64,0,0,1-128,0,8,8,0,0,0-16,0,80.09,80.09,0,0,0,80,80v24H120a8,8,0,0,0,0,16Z"/></svg>',
    // ChartBar — разборы компаний
    chartbar: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,200h-8V88a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8v24H104a8,8,0,0,0-8,8v24H48a8,8,0,0,0-8,8V200H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,96h40V200H160ZM112,128h40V200H112ZM56,152h48v48H56Z"/></svg>',
    // Newspaper (plain) — дайджест и новости
    news2: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48H40A16,16,0,0,0,24,64V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H40V64H216ZM80,104a8,8,0,0,1,8-8H168a8,8,0,0,1,0,16H88A8,8,0,0,1,80,104Zm0,32a8,8,0,0,1,8-8H168a8,8,0,0,1,0,16H88A8,8,0,0,1,80,136Zm96,32H80a8,8,0,0,1,0-16H176a8,8,0,0,1,0,16Z"/></svg>',
    // VideoCamera — ответы на вопросы
    video: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M251.77,73a8,8,0,0,0-8.21.39L208,97.05V72a16,16,0,0,0-16-16H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V158.95l35.56,23.71A8,8,0,0,0,248,184a8,8,0,0,0,8-8V80A8,8,0,0,0,251.77,73ZM192,184H32V72H192V184Zm48-22.95-32-21.33V116.28L240,95Z"/></svg>',
    // Lightning — идеи РФ высокий риск
    lightning: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M213.85,125.23l-112,120a8,8,0,0,1-13.69-7l14.66-73.34L48.15,138.77a8,8,0,0,1-1.38-14.69l112-72a8,8,0,0,1,12.4,9.15L155.48,134.6l58.37,14.59A8,8,0,0,1,213.85,125.23Z"/></svg>',
    // Globe — зарубежный рынок
    globe: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,191.63V184a8,8,0,0,0-16,0v31.63A88.21,88.21,0,0,1,40.37,136H72a8,8,0,0,0,0-16H40.37A88.21,88.21,0,0,1,120,40.37V72a8,8,0,0,0,16,0V40.37A88.21,88.21,0,0,1,215.63,120H184a8,8,0,0,0,0,16h31.63A88.21,88.21,0,0,1,136,215.63Z"/></svg>',
    // Briefcase — портфель клуба
    briefcase: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,72H180V60a28,28,0,0,0-28-28H104A28,28,0,0,0,76,60V72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM104,48h48a12,12,0,0,1,12,12V72H92V60A12,12,0,0,1,104,48ZM216,200H40V88H216V200Z"/></svg>',
    // House — недвижимость
    house: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H152V160H104v48H48V120l80-80,80,80Z"/></svg>',
    // CurrencyBtc — криптовалюта
    btc: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M176,120.06A40,40,0,0,0,144,48H80a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8h72a44,44,0,0,0,24-81.94ZM88,64h56a24,24,0,0,1,0,48H88Zm64,128H88V128h64a28,28,0,0,1,0,56Z"/></svg>',
    // PresentationChart — интенсив
    pres: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,40H136V24a8,8,0,0,0-16,0V40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16H79l-27.35,42.6a8,8,0,0,0,13.7,8.8L96,208h64l30.65,35.4a8,8,0,0,0,13.7-8.8L177,192h39a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,136H40V56H216V176Zm-80-96v64a8,8,0,0,1-16,0V80a8,8,0,0,1,16,0Zm-48,32v32a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm96-16v48a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0Z"/></svg>',
    // Scales — ИИС, налоги, законы
    scales: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M239.73,208l-32-128a8,8,0,0,0-7.79-6H128V56h32a8,8,0,0,0,0-16H128V32a8,8,0,0,0-16,0V40H96a8,8,0,0,0,0,16h32V74H56a8,8,0,0,0-7.73,5.94l-32,128A8,8,0,0,0,24,216H104a8,8,0,0,0,7.8-6.24L128,135.57l16.2,74.19A8,8,0,0,0,152,216h80a8,8,0,0,0,7.73-8ZM38.72,200,63.12,102l24.4,98Zm88.56,0H129L113,132Zm18.44,0L128,135.57,113,200Zm2-65.43L128,135.57l16.2-74.19L164,100,160,152Zm18.44,0,4-52h-8l5.56-22.22L167.72,88l19.4,77.6Zm19.84,65.43-24.4-98,24.4,98Z"/></svg>',
    // CaretRight — стрелка-разделитель
    caret: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg>',
  };


  // X (Close) — кнопка закрытия модалки
  var _X_IC = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';

  var _feedModalTrigger = null;

  // ── Каталог тем «Лента» ───────────────────────────────────────────────────────
  var FEED_CATALOG = [
    {
      type: 'all',
      icon: 'newsp',
      title: 'Все публикации',
      sub: 'Последние материалы из всех веток клуба',
    },
    {
      type: 'group',
      label: 'Главное',
      items: [
        { icon: 'trophy',    title: 'Ваши результаты',       sub: 'Портфели и достижения участников' },
        { icon: 'calendar',  title: 'Анонсы и расписание',   sub: 'Предстоящие эфиры и мероприятия' },
        { icon: 'compass',   title: 'Правила и навигация',   sub: 'Как пользоваться клубом' },
        { icon: 'micro',     title: 'Весточка от Оли',       sub: 'Личные сообщения от Ольги' },
      ],
    },
    {
      type: 'group',
      label: 'Аналитика',
      items: [
        { icon: 'chartbar',  title: 'Разборы компаний',      sub: 'Детальный анализ эмитентов',    topicId: 20 },
        { icon: 'news2',     title: 'Дайджест и новости',    sub: 'Важные события рынка и клуба',  topicId: 18 },
        { icon: 'video',     title: 'Ответы на вопросы',     sub: 'Записи эфиров и разборов' },
      ],
    },
    {
      type: 'group',
      label: 'Инвестиционные идеи',
      items: [
        { icon: 'lightning', title: 'Идеи РФ: высокий риск', sub: 'Высокодоходные истории с повышенным риском', topicId: 10 },
        { icon: 'globe',     title: 'Зарубежный рынок',      sub: 'Идеи по иностранным активам' },
        { icon: 'briefcase', title: 'Портфель клуба',        sub: 'Модельные позиции и изменения',               topicId: 8 },
        { icon: 'house',     title: 'Инвестиции в недвижимость', sub: 'ЗПИФ, объекты и стратегии' },
        { icon: 'btc',       title: 'Криптовалюта',          sub: 'Крипторынок, идеи и аналитика' },
      ],
    },
    {
      type: 'group',
      label: 'Специальные разделы',
      items: [
        { icon: 'pres',      title: 'Интенсив «Криптовалюта»', sub: 'Материалы и записи крипто-интенсива' },
        { icon: 'scales',    title: 'ИИС, налоги и законы',  sub: 'Правовые и налоговые вопросы инвестора' },
      ],
    },
  ];

  // ── Конфигурация раздела «Общение» ───────────────────────────────────────────
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
            external: true,
            btn: 'Открыть вход в Telegram',
            url: 'https://investfriend.ru/teach/control/lesson/view/id/346013705',
          },
          {
            id: 'max-channel',
            title: 'Канал клуба в MAX',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'chat',
            desc: 'Официальный канал инвестклуба «Финансовой свободы». Здесь дублируются ключевые анонсы и важные сообщения клуба: эфиры и мероприятия, обновления и новости, важные напоминания.',
            note: 'Подойдёт тем, кто хочет следить за основными событиями клуба в MAX.',
            external: true,
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
            external: true,
            btn: 'Открыть чат на GetCourse',
            url: 'https://investfriend.ru/chtm/app/getcourse/chat/VebyXBF5Hp9BCoOtm2UL3',
          },
        ],
      },
      {
        id: 'help',
        title: 'Помощь и вопросы',
        items: [
          {
            id: 'lost',
            title: 'Я потерялся, не знаю, с чего начать',
            badge: 'Кабинет участника',
            access: 'public',
            icon: 'question',
            featured: true,
            desc: 'Личный кабинет — отправная точка: там все материалы клуба, расписание и доступные курсы.',
            btn: 'Перейти в кабинет',
            url: 'https://investfriend.ru/cms/system/contact',
          },
          {
            id: 'support',
            title: 'Поддержка',
            badge: 'Открытый доступ',
            access: 'public',
            icon: 'question',
            desc: 'Помощь по доступу, оплате, работе платформы и другим организационным вопросам.',
            external: true,
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
            external: true,
            btn: 'Задать вопрос аналитикам',
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
            btn: 'Открыть TradingView',
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
            btn: 'Открыть Snowball',
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
            btn: 'Открыть сайт Банка России',
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

  // ── Лента: HTML ──────────────────────────────────────────────────────────────
  function _feedItemHTML(entry) {
    return '<button class="club-feed-item" type="button"'
      + ' data-feed-topic="' + entry.title + '"'
      + (entry.topicId ? ' data-feed-topic-id="' + entry.topicId + '"' : '')
      + ' aria-label="' + entry.title + '">'
      + '<span class="club-feed-icon">' + (_FIC[entry.icon] || _FIC.newsp) + '</span>'
      + '<span class="club-feed-text">'
      + '<span class="club-feed-title">' + entry.title + '</span>'
      + '<span class="club-feed-sub">' + entry.sub + '</span>'
      + '</span>'
      + '<span class="club-feed-caret">' + _FIC.caret + '</span>'
      + '</button>';
  }

  function _feedHTML() {
    var html = '';
    FEED_CATALOG.forEach(function (block) {
      if (block.type === 'all') {
        html += '<button class="club-feed-all" type="button" data-feed-topic="' + block.title + '" aria-label="' + block.title + '">'
          + '<span class="club-feed-icon">' + (_FIC[block.icon] || _FIC.newsp) + '</span>'
          + '<span class="club-feed-text">'
          + '<span class="club-feed-title">' + block.title + '</span>'
          + '<span class="club-feed-sub">' + block.sub + '</span>'
          + '</span>'
          + '<span class="club-feed-caret">' + _FIC.caret + '</span>'
          + '</button>';
      } else if (block.type === 'group') {
        html += '<div class="club-feed-group">'
          + '<div class="club-feed-group-label">' + block.label + '</div>';
        block.items.forEach(function (item) {
          html += _feedItemHTML(item);
        });
        html += '</div>';
      }
    });
    return '<div class="club-feed">' + html + '</div>';
  }

  // ── Лента: модальное окно-заглушка ─────────────────────────────────────────
  function _createFeedModal() {
    if (document.getElementById('feed-modal')) return;
    var el = document.createElement('div');
    el.id = 'feed-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'feed-modal-title');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="feed-modal-backdrop"></div>'
      + '<div class="feed-modal-sheet">'
      + '<button class="feed-modal-close" aria-label="Закрыть">' + _X_IC + '</button>'
      + '<h3 class="feed-modal-heading" id="feed-modal-title">Лента готовится</h3>'
      + '<p class="feed-modal-body">Сейчас мы подключаем автоматическую загрузку публикаций из Telegram. Скоро здесь появятся материалы выбранной темы.</p>'
      + '<p class="feed-modal-chosen">Вы выбрали: <span id="feed-modal-topic"></span></p>'
      + '<button class="feed-modal-ok">Понятно</button>'
      + '</div>';
    document.body.appendChild(el);

    el.querySelector('.feed-modal-backdrop').addEventListener('click', _closeFeedModal);
    el.querySelector('.feed-modal-close').addEventListener('click', _closeFeedModal);
    el.querySelector('.feed-modal-ok').addEventListener('click', _closeFeedModal);

    el.addEventListener('keydown', function (e) {
      if (!el.classList.contains('feed-modal--open')) return;
      if (e.key === 'Escape') { _closeFeedModal(); return; }
      if (e.key === 'Tab') {
        var foc = Array.prototype.slice.call(el.querySelectorAll('button'));
        var first = foc[0], last = foc[foc.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function _openFeedModal(title, triggerEl) {
    var modal = document.getElementById('feed-modal');
    if (!modal) return;
    _feedModalTrigger = triggerEl || null;
    var topicEl = document.getElementById('feed-modal-topic');
    if (topicEl) topicEl.textContent = title;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('feed-modal--open');
    document.body.classList.add('ch-no-scroll');
    var ok = modal.querySelector('.feed-modal-ok');
    if (ok) ok.focus();
  }

  function _closeFeedModal() {
    var modal = document.getElementById('feed-modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('feed-modal--open');
    document.body.classList.remove('ch-no-scroll');
    if (_feedModalTrigger) { _feedModalTrigger.focus(); _feedModalTrigger = null; }
  }

  // ── Лента: реальные посты из Telegram ────────────────────────────────────────
  var _feedPostsEl  = null;
  var _feedPostsTrigger = null;
  var _feedCache    = null;        // кешируем feed.json на сессию

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _createFeedPostsSheet() {
    if (_feedPostsEl) return;
    var el = document.createElement('div');
    el.id = 'feed-posts-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="fp-backdrop"></div>'
      + '<div class="fp-panel">'
      + '<div class="fp-header">'
      + '<h3 class="fp-title" id="fp-title"></h3>'
      + '<button class="fp-close" aria-label="Закрыть">' + _X_IC + '</button>'
      + '</div>'
      + '<div class="fp-body" id="fp-body"></div>'
      + '</div>';
    document.body.appendChild(el);
    _feedPostsEl = el;

    el.querySelector('.fp-backdrop').addEventListener('click', _closeFeedPosts);
    el.querySelector('.fp-close').addEventListener('click', _closeFeedPosts);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') _closeFeedPosts();
    });
  }

  function _openFeedPosts(topicId, title, triggerEl) {
    _createFeedPostsSheet();
    _feedPostsTrigger = triggerEl || null;
    var el = _feedPostsEl;
    el.querySelector('#fp-title').textContent = title;
    var body = el.querySelector('#fp-body');
    body.innerHTML = '<p class="fp-loading">Загружаем посты…</p>';
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('fp--open');
    document.body.classList.add('ch-no-scroll');

    var render = function (feed) {
      var topic = feed.topics && feed.topics[String(topicId)];
      if (!topic || !topic.posts || !topic.posts.length) {
        body.innerHTML = '<p class="fp-empty">Пока нет публикаций в этой теме.</p>';
        return;
      }
      var html = '';
      topic.posts.forEach(function (p) {
        var dateStr = p.date || '';
        var preview = _esc(p.preview || p.text || '');
        var link = p.link || '';
        html += '<div class="fp-post">'
          + '<div class="fp-post-date">' + _esc(dateStr) + '</div>'
          + '<p class="fp-post-text">' + preview.replace(/\n/g,'<br>') + '</p>'
          + (link ? '<a class="fp-post-link" href="' + _esc(link) + '" target="_blank" rel="noopener">Открыть в Telegram ↗</a>' : '')
          + '</div>';
      });
      var upd = feed.updated_at ? feed.updated_at.slice(0,10) : '';
      body.innerHTML = html
        + (upd ? '<p class="fp-updated">Обновлено ' + _esc(upd) + '</p>' : '');
    };

    if (_feedCache) { render(_feedCache); return; }

    fetch('assets/feed.json?' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) { _feedCache = data; render(data); })
      .catch(function () { body.innerHTML = '<p class="fp-empty">Не удалось загрузить данные. Попробуйте позже.</p>'; });
  }

  function _closeFeedPosts() {
    if (!_feedPostsEl) return;
    _feedPostsEl.setAttribute('aria-hidden', 'true');
    _feedPostsEl.classList.remove('fp--open');
    document.body.classList.remove('ch-no-scroll');
    if (_feedPostsTrigger) { _feedPostsTrigger.focus(); _feedPostsTrigger = null; }
  }

  // ── Общение: утилиты ──────────────────────────────────────────────────────────
  function _findItem(id) {
    var found = null;
    CHAT_CFG.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        if (it.id === id) found = it;
      });
    });
    return found;
  }

  function _badgeHTML(item) {
    var cls = item.access === 'public' ? 'ch-badge--open'
      : item.access === 'coming_soon' ? 'ch-badge--soon'
      : 'ch-badge--auth';
    return '<span class="ch-badge ' + cls + '">' + item.badge + '</span>';
  }

  function _cardHTML(item, favKey) {
    var isSoon = item.access === 'coming_soon';
    var btnIcon = item.external ? _IC.ext : _IC.arrow;
    var btn = '<button class="ch-btn' + (isSoon ? ' ch-btn--disabled' : '') + '"'
      + (isSoon ? ' disabled aria-disabled="true"' : ' data-action="' + item.id + '"')
      + (item.external && !isSoon ? ' aria-label="' + item.btn + '"' : '')
      + '>'
      + (isSoon ? item.btn : (item.external ? item.btn + '&nbsp;' + btnIcon : btnIcon + item.btn))
      + '</button>';

    var starBtn = '';
    if (favKey && typeof FAV !== 'undefined') {
      var isFav = FAV.isFav(favKey);
      starBtn = '<button class="fav-star-btn ch-res-star' + (isFav ? ' is-fav' : '') + '"'
        + ' data-fav-key="' + favKey + '"'
        + ' data-res-fav="' + item.id + '"'
        + ' aria-label="' + (isFav ? 'Убрать из избранного' : 'Добавить в избранное') + '">'
        + (isFav ? FAV.starFill : FAV.starEmpty)
        + '</button>';
    }

    return '<div class="ch-card' + (item.featured ? ' ch-card--featured' : '') + '">'
      + '<div class="ch-card-head">'
      + '<div class="ch-ic">' + (_IC[item.icon] || _IC.chat) + '</div>'
      + '<div class="ch-card-meta">'
      + '<div class="ch-card-title">' + item.title + '</div>'
      + _badgeHTML(item)
      + '</div>'
      + starBtn
      + '</div>'
      + '<p class="ch-card-desc">' + item.desc + '</p>'
      + (item.note ? '<p class="ch-card-note">' + item.note + '</p>' : '')
      + btn
      + '</div>';
  }

  function _sectionHTML(sec) {
    return '<div class="ch-section">'
      + '<h3 class="ch-section-title">' + sec.title + '</h3>'
      + (sec.intro ? '<p class="ch-section-intro">' + sec.intro + '</p>' : '')
      + sec.items.map(function (item) {
          var favKey = sec.id === 'resources' ? 'resource/' + item.id : null;
          return _cardHTML(item, favKey);
        }).join('')
      + '</div>';
  }

  // ── Обработчик кликов ────────────────────────────────────────────────────────
  var _pendingUrl = null;

  function _handleClick(e) {
    var feedBtn = e.target.closest('[data-feed-topic]');
    if (feedBtn) {
      var tid = feedBtn.dataset.feedTopicId;
      if (tid) {
        _openFeedPosts(parseInt(tid, 10), feedBtn.dataset.feedTopic, feedBtn);
      } else {
        _openFeedModal(feedBtn.dataset.feedTopic, feedBtn);
      }
      return;
    }

    var resFavBtn = e.target.closest('[data-res-fav]');
    if (resFavBtn) {
      if (typeof FAV !== 'undefined') FAV.toggle(resFavBtn.dataset.favKey, resFavBtn);
      return;
    }
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var item = _findItem(btn.dataset.action);
    if (!item) return;

    if (item.access === 'public') {
      openExternal(item.url);
    } else if (item.access === 'getcourse_protected') {
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
      if (url) openExternal(url);
    });
    cancelBtn && cancelBtn.addEventListener('click', _hideModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _hideModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') _hideModal();
    });
  }

  // ── Переключатель вкладок ────────────────────────────────────────────────────
  function _initTabs(root) {
    var tabs = root.querySelectorAll('[role="tab"]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        _selectTab(root, tab.id);
      });
    });
    root.addEventListener('keydown', function (e) {
      var focused = root.querySelector('[role="tab"]:focus');
      if (!focused) return;
      var allTabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
      var idx = allTabs.indexOf(focused);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        allTabs[(idx + 1) % allTabs.length].focus();
        _selectTab(root, allTabs[(idx + 1) % allTabs.length].id);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        allTabs[(idx - 1 + allTabs.length) % allTabs.length].focus();
        _selectTab(root, allTabs[(idx - 1 + allTabs.length) % allTabs.length].id);
      }
    });
  }

  function _selectTab(root, tabId) {
    var tabs   = root.querySelectorAll('[role="tab"]');
    var panels = root.querySelectorAll('[role="tabpanel"]');
    tabs.forEach(function (t) {
      var active = t.id === tabId;
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.setAttribute('tabindex', active ? '0' : '-1');
    });
    panels.forEach(function (p) {
      var controlled = p.getAttribute('aria-labelledby') === tabId;
      if (controlled) { p.removeAttribute('hidden'); }
      else             { p.setAttribute('hidden', ''); }
    });
  }

  // ── Рендер страницы ──────────────────────────────────────────────────────────
  function renderChat() {
    var root = document.getElementById('ch-root');
    if (!root) return;
    root.innerHTML =
      '<div class="ch-page-head">'
      + '<h2 class="ch-page-title">Клуб</h2>'
      + '<p class="ch-page-sub">Публикации, площадки общения и ресурсы клуба</p>'
      + '</div>'
      + '<div class="club-seg" role="tablist" aria-label="Разделы клуба">'
      + '<button class="club-seg-btn" role="tab" id="club-tab-feed"'
      + ' aria-selected="true" aria-controls="club-panel-feed" tabindex="0">Лента</button>'
      + '<button class="club-seg-btn" role="tab" id="club-tab-chat"'
      + ' aria-selected="false" aria-controls="club-panel-chat" tabindex="-1">Общение</button>'
      + '</div>'
      + '<div id="club-panel-feed" class="club-panel" role="tabpanel" aria-labelledby="club-tab-feed">'
      + _feedHTML()
      + '</div>'
      + '<div id="club-panel-chat" class="club-panel" role="tabpanel" aria-labelledby="club-tab-chat" hidden>'
      + CHAT_CFG.sections.map(_sectionHTML).join('')
      + '</div>';

    _initTabs(root);
    root.addEventListener('click', _handleClick);
  }

  // ── Инициализация ────────────────────────────────────────────────────────────
  function initChat() {
    renderChat();
    _initModal();
    _createFeedModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }

}());
