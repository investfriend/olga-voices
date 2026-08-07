// assets/course-catalog.js — Единый справочник потоков и уроков GetCourse
// Обновлён: 2026-08-04. Источник: дерево GetCourse от 04.08.2026.
// Канонический формат:
//   поток → https://investfriend.ru/teach/control/stream/view/id/ID
//   урок  → https://investfriend.ru/teach/control/lesson/view/id/ID

window.COURSE_CATALOG = (function () {

  function streamUrl(id) {
    return 'https://investfriend.ru/teach/control/stream/view/id/' + id;
  }
  function lessonUrl(id) {
    return 'https://investfriend.ru/teach/control/lesson/view/id/' + id;
  }

  // ── Потоки ───────────────────────────────────────────────────────────────
  var STREAMS = {
    // Корневые потоки ступеней
    935112977: { title: 'Ступень 1',             section: 'root' },
    935112984: { title: 'Ступень 2',             section: 'root' },
    935131947: { title: 'Ступень 3',             section: 'root' },

    // Ступень 1 — темы
    935120610: { title: 'Крысиные бега',                      section: 'stupen-1', parent: 935112977 },
    935120627: { title: 'Финансовый резерв',                   section: 'stupen-1', parent: 935112977 },
    935120629: { title: 'Активы, долги и потребление',         section: 'stupen-1', parent: 935112977 },
    935120631: { title: 'Финансовые цели',                     section: 'stupen-1', parent: 935112977 },
    935120637: { title: 'Налоговые вычеты',                    section: 'stupen-1', parent: 935112977 },
    935120640: { title: 'Кредиты и долговая нагрузка',         section: 'stupen-1', parent: 935112977 },
    935120642: { title: 'Фондовый рынок',                      section: 'stupen-1', parent: 935112977 },

    // Ступень 2 — темы
    935131063: { title: 'Пассивный доход с нуля',              section: 'stupen-2', parent: 935112984 },
    935131337: { title: 'Собственная стратегия пассивного дохода', section: 'stupen-2', parent: 935112984 },
    935131527: { title: 'Инвестиционный портфель',             section: 'stupen-2', parent: 935112984 },
    935131599: { title: 'Облигации',                           section: 'stupen-2', parent: 935112984 },
    935131705: { title: 'Дивиденды и фонды',                   section: 'stupen-2', parent: 935112984 },
    935132033: { title: 'Налоги инвестора в РФ',               section: 'stupen-2', parent: 935112984 },
    935132398: { title: 'Психология и дисциплина',             section: 'stupen-2', parent: 935112984 },

    // Ступень 3 — темы
    935131949: { title: 'Фундаментальный анализ',              section: 'stupen-3', parent: 935131947 },
    935131950: { title: 'Крипторынок',                         section: 'stupen-3', parent: 935131947 },
    935131951: { title: 'Пассивный криптоинвестор',            section: 'stupen-3', parent: 935131947 },
    935133068: { title: 'Технический анализ',                  section: 'stupen-3', parent: 935131947 },
    935138997: { title: 'Фьючерсы',                           section: 'stupen-3', parent: 935131947 },
    935195068: { title: 'Зарубежный рынок',                    section: 'stupen-3', parent: 935131947 },

    // Служебные потоки
    935107967: { title: 'Управление подпиской',               section: 'service' },
    935138978: { title: 'Записи эфиров',                      section: 'service' },
    935539310: { title: 'Интенсивы — архив',                  section: 'service' },
    935443339: { title: 'Реферальная программа',              section: 'service' },
    935260268: { title: 'Интенсив март 2026 — ИИС и налоги', section: 'intensive' },
  };

  // ── Уроки ────────────────────────────────────────────────────────────────
  var LESSONS = {
    // Навигация / подключение
    346013705: { title: 'Урок подключения к Telegram',         section: 'service' },
    347903316: { title: 'Кто помогает в клубе',               section: 'service' },

    // Контент
    348403796: { title: 'Портфели клуба',                     section: 'service' },
    347253452: { title: 'Бонусная система',                   section: 'service' },

    // Ступень 2 — учебные уроки
    348424558: { title: 'Инструменты инвестора',              section: 'stupen-2', parent: 935112984 },
    348739714: { title: 'Словарь инвестора',                  section: 'stupen-2', parent: 935112984 },

    // Ступень 3 — учебные уроки
    347743216: { title: 'Обзоры рынка РФ',                    section: 'stupen-3', parent: 935131947 },
  };

  // ── Каталог ступеней (иерархия для внутреннего навигатора) ───────────────
  var STEP_CATALOG = [
    {
      id: 'step1', streamId: 935112977,
      label: 'Ступень 1', sub: 'Подготовка к инвестициям',
      desc: 'Для тех, кто начинает с финансовой основы: личный капитал, резерв, цели, долги, налоговые вычеты и устройство фондового рынка.',
      courses: [
        { streamId: 935120610 },
        { streamId: 935120627 },
        { streamId: 935120629, noLessons: true },
        { streamId: 935120631 },
        { streamId: 935120637 },
        { streamId: 935120640 },
        { streamId: 935120642 },
      ],
      materials: [],
    },
    {
      id: 'step2', streamId: 935112984,
      label: 'Ступень 2', sub: 'Пассивное инвестирование',
      desc: 'Для тех, кто готов перейти к брокерскому счёту, первым покупкам и созданию собственного портфеля с учётом цели, срока и риска.',
      courses: [
        { streamId: 935131063 },
        { streamId: 935131337 },
        { streamId: 935131527 },
        { streamId: 935131599 },
        { streamId: 935131705 },
        { streamId: 935132033 },
        { streamId: 935132398 },
      ],
      materials: [
        { lessonId: 348424558 },
        { lessonId: 348739714 },
      ],
    },
    {
      id: 'step3', streamId: 935131947,
      label: 'Ступень 3', sub: 'Самостоятельный анализ',
      desc: 'Для тех, кто освоил базовые инструменты и хочет анализировать компании и рынок, изучать криптовалюту, технический анализ, фьючерсы и зарубежные активы.',
      courses: [
        { streamId: 935131949 },
        { streamId: 935131950 },
        { streamId: 935131951 },
        { streamId: 935133068 },
        { streamId: 935138997 },
        { streamId: 935195068 },
      ],
      materials: [
        { lessonId: 347743216 },
      ],
    },
  ];

  // ── Публичный API ─────────────────────────────────────────────────────────
  return {
    streamUrl: streamUrl,
    lessonUrl: lessonUrl,

    streams: STREAMS,
    lessons: LESSONS,
    stepCatalog: STEP_CATALOG,

    /** Возвращает канонический URL по типу и ID */
    url: function (type, id) {
      return type === 'stream' ? streamUrl(id) : lessonUrl(id);
    },

    /** Возвращает заголовок потока или урока по ID */
    title: function (type, id) {
      var map = type === 'stream' ? STREAMS : LESSONS;
      return (map[id] && map[id].title) || null;
    },
  };
}());
