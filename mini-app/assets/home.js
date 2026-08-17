// assets/home.js v3 — Home screen rendering
// Depends on: script.js (STATE, setPage, showToast), data.js (DATA)

(function () {
  'use strict';

  var _EXT_IC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M224,104a8,8,0,0,1-16,0V79.32l-82.34,82.34a8,8,0,0,1-11.32-11.32L196.68,68H172a8,8,0,0,1,0-16h44a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>';

  // ── Configuration ───────────────────────────────────────────────────────────
  var HOME_CFG = {

    // ── Карусель портфелей (верхний блок главной) ──────────────────────────
    portfolioCarousel: {
      title:    'Портфели клуба',
      subtitle: 'Динамика портфелей относительно выбранных рыночных бенчмарков',
      portfolios: [
        {
          id: 'passive',
          title: 'Пассивный портфель',
          snowballPublicUrl:      'https://snowball-income.com/public/portfolios/rcnzdddwrtchfmzqsrke#growth',
          dataEndpoint:           null,
          benchmarkCode:          'RGBITR',
          benchmarkLabel:         'RGBITR',
          defaultPeriod:          'С начала года',
          currency:               'RUB',
          portfolioReturn:        null,
          benchmarkReturn:        null,
          differencePp:           null,
          status:                 null,
          chartSeries:            null,
          lastUpdatedAt:          null,
          updateIntervalMinutes:  15,
          dataState:              'awaiting_source',
        },
        {
          id: 'invest',
          title: 'Инвестиционный портфель',
          snowballPublicUrl:      'https://snowball-income.com/public/portfolios/cfboczzvxkxjfcbfyevh#growth',
          dataEndpoint:           null,
          benchmarkCode:          'IMOEX',
          benchmarkLabel:         'Индекс Мосбиржи',
          defaultPeriod:          'С начала года',
          currency:               'RUB',
          portfolioReturn:        null,
          benchmarkReturn:        null,
          differencePp:           null,
          status:                 null,
          chartSeries:            null,
          lastUpdatedAt:          null,
          updateIntervalMinutes:  15,
          dataState:              'awaiting_source',
        },
        {
          id: 'crypto',
          title: 'Криптовалютный портфель',
          snowballPublicUrl:      'https://snowball-income.com/public/portfolios/kdeffzxwnplewitkepvp#growth',
          dataEndpoint:           null,
          benchmarkCode:          'BTC',
          benchmarkLabel:         'Bitcoin',
          defaultPeriod:          'С начала года',
          currency:               'USD',
          portfolioReturn:        null,
          benchmarkReturn:        null,
          differencePp:           null,
          status:                 null,
          chartSeries:            null,
          lastUpdatedAt:          null,
          updateIntervalMinutes:  15,
          dataState:              'awaiting_source',
        },
        {
          id: 'foreign',
          title: 'Зарубежный портфель',
          snowballPublicUrl:      'https://snowball-income.com/public/portfolios/vdpfsqtldzcuccihgvmy#growth',
          dataEndpoint:           null,
          benchmarkCode:          'SPX',
          benchmarkLabel:         'S&P 500',
          defaultPeriod:          'С начала года',
          currency:               'USD',
          portfolioReturn:        null,
          benchmarkReturn:        null,
          differencePp:           null,
          status:                 null,
          chartSeries:            null,
          lastUpdatedAt:          null,
          updateIntervalMinutes:  15,
          dataState:              'awaiting_source',
        },
        {
          id: 'highrisk',
          title: 'Портфель высокого риска',
          snowballPublicUrl:      'https://snowball-income.com/public/portfolios/opkiaazasggytxmhskez#growth',
          dataEndpoint:           null,
          benchmarkCode:          'IMOEX',
          benchmarkLabel:         'Индекс Мосбиржи',
          defaultPeriod:          'С начала года',
          currency:               'RUB',
          portfolioReturn:        null,
          benchmarkReturn:        null,
          differencePp:           null,
          status:                 null,
          chartSeries:            null,
          lastUpdatedAt:          null,
          updateIntervalMinutes:  15,
          dataState:              'awaiting_source',
        },
      ],
    },

    // ── Плашка интенсива по крипте (сразу под каруселью) ───────────────────
    cryptoEvent: {
      tag:      'Живой интенсив · Август',
      title:    'Криптовалюты',
      subtitle: 'Программа, даты и подробности появятся после согласования.',
      url:      null,
      btnLabel: 'Подробнее',
      btnToast: 'Подробности о криптоинтенсиве появятся после согласования программы.',
    },

    // ── Карточка-ссылка «Портфели клуба» ──────────────────────────────────
    portfolios: {
      title: 'Материалы по портфелям',
      desc:  'Уроки и материалы по ведению портфелей клуба',
      url:   'https://investfriend.ru/teach/control/lesson/view/id/348403796',
    },

    // ── Макро-интенсив (секция «Сейчас в клубе») ──────────────────────────
    intensiv: {
      tag:   'МАКРО',
      title: 'Экономика и портфель: как принимать решения по данным',
      start: '2026-08-03',
      end:   '2026-08-10',
      url:   'https://investfriend.ru/teach/control/stream/view/id/935709630',
    },

    // ── Расписание событий ─────────────────────────────────────────────────
    events: [
      { date: '2026-08-03', title: 'День 1. Где находится экономика сейчас',           desc: 'В течение дня',     allDay: true  },
      { date: '2026-08-04', title: 'День 2. Инфляция и ставка',                        desc: 'В течение дня',     allDay: true  },
      { date: '2026-08-04', title: 'Живой эфир 1',                                     desc: '18:30 – 19:30 мск', live: true, timeStart: '18:30', timeEnd: '19:30' },
      { date: '2026-08-05', title: 'День 3. Как экономика меняет цену активов',         desc: 'В течение дня',     allDay: true  },
      { date: '2026-08-06', title: 'День 4. Отрасли и компании',                       desc: 'В течение дня',     allDay: true  },
      { date: '2026-08-07', title: 'День 5. Как читать новости и принимать решения',    desc: 'В течение дня',     allDay: true  },
      { date: '2026-08-07', title: 'Живой эфир 2. Три сценария для портфеля',           desc: '18:30 – 19:30 мск', live: true, timeStart: '18:30', timeEnd: '19:30' },
      { date: '2026-08-08', title: 'Завершение интенсива и подготовка вопросов',        desc: 'В течение дня',     allDay: true  },
      { date: '2026-08-09', title: 'Завершение интенсива и подготовка вопросов',        desc: 'В течение дня',     allDay: true  },
      { date: '2026-08-10', title: 'Проверка заданий и обратная связь',                 desc: 'В течение дня',     allDay: true  },
    ],

    // TODO: confirm final descriptions with content team
    steps: [
      { id: 'step1', label: 'Ступень 1', sub: 'Подготовка к инвестициям',   desc: 'Для тех, кто начинает с финансовой основы: личный капитал, резерв, цели, долги, налоговые вычеты и устройство фондового рынка.' },
      { id: 'step2', label: 'Ступень 2', sub: 'Пассивное инвестирование',    desc: 'Для тех, кто готов перейти к брокерскому счёту, первым покупкам и созданию собственного портфеля с учётом цели, срока и риска.' },
      { id: 'step3', label: 'Ступень 3', sub: 'Самостоятельный анализ',      desc: 'Для тех, кто освоил базовые инструменты и хочет анализировать компании и рынок, изучать криптовалюту, технический анализ, фьючерсы и зарубежные активы.' },
    ],

    archives: [
      { id: 'arc-intensivy', title: 'Записи живых интенсивов', url: 'https://investfriend.ru/teach/control/stream/view/id/935539310' },
      { id: 'arc-efiry',     title: 'Записи эфиров',            url: 'https://investfriend.ru/teach/control/stream/view/id/935138978' },
    ],

    accordion: {
      title: 'Как пользоваться обучением',
      body:  'Обучение разделено на три ступени — от основ до продвинутых инструментов. Начните с первой. Нажмите на ступень, чтобы увидеть все курсы и перейти к нужному. Из карточки курса можно открыть его в GetCourse. Звёздочку ★ используйте, чтобы отметить ступень как важную.',
    },
  };

  window.HOME_CFG = HOME_CFG;

  // ── Moscow time ──────────────────────────────────────────────────────────────
  function getMskNow() {
    var now = new Date();
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 3 * 3600000);
  }

  function todayMsk() {
    var m = getMskNow();
    return m.getFullYear() + '-'
      + String(m.getMonth() + 1).padStart(2, '0') + '-'
      + String(m.getDate()).padStart(2, '0');
  }

  function eventStatus(ev) {
    var today = todayMsk();
    if (ev.date > today) return { label: 'Скоро',     cls: 'hp-status-soon'  };
    if (ev.date < today) return { label: 'Завершено', cls: 'hp-status-done'  };
    if (ev.live) {
      var msk = getMskNow();
      var nowM = msk.getHours() * 60 + msk.getMinutes();
      var sS = ev.timeStart.split(':'); var eS = ev.timeEnd.split(':');
      var startM = +sS[0] * 60 + +sS[1];
      var endM   = +eS[0] * 60 + +eS[1];
      if (nowM >= startM && nowM < endM) return { label: 'Идёт сейчас', cls: 'hp-status-live'  };
      if (nowM < startM)                 return { label: 'Скоро',       cls: 'hp-status-soon'  };
      return { label: 'Завершено', cls: 'hp-status-done' };
    }
    return { label: 'Сегодня', cls: 'hp-status-today' };
  }

  function intensivStatus() {
    var t = todayMsk();
    var c = HOME_CFG.intensiv;
    if (t < c.start) return { label: 'Скоро',             cls: 'hp-status-soon'  };
    if (t > c.end)   return { label: 'Записи доступны',   cls: 'hp-status-done'  };
    return { label: 'Идёт сейчас', cls: 'hp-status-live' };
  }

  // ── Utilities ────────────────────────────────────────────────────────────────
  function openUrl(url) {
    if (window.openExternal) { openExternal(url); return; }
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openLink) tg.openLink(url, { try_instant_view: false });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  function isStepFav(id) {
    return (window.STATE && STATE.favorites || []).includes('home/' + id);
  }

  var FAV_EMPTY  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="20" height="20"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"/></svg>';
  var FAV_ACTIVE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="20" height="20"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"/></svg>';

  function toggleStepFav(stepId, btn) {
    if (!window.STATE) return;
    var key = 'home/' + stepId;
    var idx = STATE.favorites.indexOf(key);
    if (idx >= 0) {
      STATE.favorites.splice(idx, 1);
      btn.classList.remove('active');
      btn.innerHTML = FAV_EMPTY;
    } else {
      STATE.favorites.push(key);
      btn.classList.add('active');
      btn.innerHTML = FAV_ACTIVE;
      var tg = window.Telegram && window.Telegram.WebApp;
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }
    localStorage.setItem('iv_favs', JSON.stringify(STATE.favorites));
  }

  var CHEVRON_SVG = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>';

  var MONTH_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];

  // ── SVG-график (два временных ряда) ─────────────────────────────────────────
  // chartSeries: [{label, color, points: [{date:'YYYY-MM-DD', value:number}]}]
  // Возвращает строку SVG или null (если данных нет).
  function _svgChart(chartSeries) {
    if (!chartSeries || !chartSeries.length) return null;
    var valid = chartSeries.filter(function (s) {
      return s && s.points && s.points.length >= 2;
    });
    if (!valid.length) return null;

    var W = 280, H = 56;

    // Нормализуем каждый ряд: первая точка = 100
    var norm = valid.map(function (s) {
      var base = s.points[0].value || 1;
      return {
        color: s.color,
        pts: s.points.map(function (p, i) {
          return { i: i, y: p.value / base * 100, n: s.points.length };
        }),
      };
    });

    // Y-домен с 10%-отступом
    var allY = [];
    norm.forEach(function (s) { s.pts.forEach(function (p) { allY.push(p.y); }); });
    var minY = Math.min.apply(null, allY);
    var maxY = Math.max.apply(null, allY);
    var rng  = maxY - minY || 1;
    var yMin = minY - rng * 0.1;
    var yMax = maxY + rng * 0.1;

    function svgY(v) { return ((yMax - v) / (yMax - yMin) * H).toFixed(1); }
    function svgX(i, n) { return (n > 1 ? i / (n - 1) * W : W / 2).toFixed(1); }

    // Базовая линия на уровне 100 (начало периода)
    var zy = parseFloat(svgY(100));
    var baseline = (zy > 1 && zy < H - 1)
      ? '<line x1="0" y1="' + zy.toFixed(1) + '" x2="' + W + '" y2="' + zy.toFixed(1)
        + '" stroke="rgba(255,255,255,.1)" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/>'
      : '';

    var polylines = norm.map(function (s) {
      var pts = s.pts.map(function (p) { return svgX(p.i, p.n) + ',' + svgY(p.y); }).join(' ');
      return '<polyline points="' + pts + '" fill="none" stroke="' + s.color
        + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
    }).join('');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H
      + '" preserveAspectRatio="none" aria-hidden="true" style="display:block">'
      + baseline + polylines + '</svg>';
  }

  // ── Карусель портфелей ────────────────────────────────────────────────────────

  function _statusBadge(p) {
    if (p.dataState === 'awaiting_source' || p.differencePp === null) {
      return '<span class="hp-pcc-badge hp-pcc-badge--waiting">Подключается</span>';
    }
    if (p.dataState === 'stale') {
      return '<span class="hp-pcc-badge hp-pcc-badge--stale">Данные не обновлены</span>';
    }
    if (p.differencePp > 0)  return '<span class="hp-pcc-badge hp-pcc-badge--ahead">Опережает бенчмарк</span>';
    if (p.differencePp === 0) return '<span class="hp-pcc-badge hp-pcc-badge--even">На уровне бенчмарка</span>';
    return '<span class="hp-pcc-badge hp-pcc-badge--behind">Отстаёт от бенчмарка</span>';
  }

  function _fmtPct(v) {
    if (v === null || v === undefined) return '<span class="hp-ph">—</span>';
    return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
  }

  function _fmtPp(v) {
    if (v === null || v === undefined) return '<span class="hp-ph">—</span>';
    return (v >= 0 ? '+' : '') + v.toFixed(1) + ' п.п.';
  }

  function _portfolioCardHTML(p, idx, total) {
    var svgStr = _svgChart(p.chartSeries);

    // Даты из первого ряда
    var firstDate = '', lastDate = '';
    if (p.chartSeries && p.chartSeries[0] && p.chartSeries[0].points && p.chartSeries[0].points.length >= 2) {
      var pts = p.chartSeries[0].points;
      var d0 = new Date(pts[0].date + 'T00:00:00');
      var dN = new Date(pts[pts.length - 1].date + 'T00:00:00');
      firstDate = d0.getDate() + ' ' + MONTH_SHORT[d0.getMonth()];
      lastDate  = dN.getDate() + ' ' + MONTH_SHORT[dN.getMonth()];
    }

    // Легенда
    var legendSeries = p.chartSeries && p.chartSeries.length
      ? p.chartSeries
      : [
          { label: 'Портфель',        color: '#27C98A' },
          { label: p.benchmarkLabel,  color: '#8B8FA8' },
        ];
    var legHTML = '<div class="hp-pcc-legend">'
      + legendSeries.map(function (s) {
        return '<span class="hp-pcc-leg-item">'
          + '<span class="hp-pcc-leg-dot" style="background:' + s.color + '"></span>'
          + s.label
          + '</span>';
      }).join('') + '</div>';

    var _MONTHS_RU = ['января','февраля','марта','апреля','мая','июня',
                      'июля','августа','сентября','октября','ноября','декабря'];
    var updStr = 'Источник подключается';
    if (p.lastUpdatedAt) {
      var _dt = new Date(p.lastUpdatedAt);
      if (!isNaN(_dt)) {
        var _msk = new Date(_dt.getTime() + 3 * 3600000);
        updStr = 'Обновлено ' + _msk.getUTCDate() + ' ' + _MONTHS_RU[_msk.getUTCMonth()]
          + ' ' + _msk.getUTCFullYear() + ', '
          + String(_msk.getUTCHours()).padStart(2, '0') + ':'
          + String(_msk.getUTCMinutes()).padStart(2, '0') + ' МСК';
      } else {
        updStr = 'Обновлено ' + p.lastUpdatedAt;
      }
    }

    return '<div class="hp-pcslide" role="group" aria-label="' + (idx + 1) + ' из ' + total + ': ' + p.title + '">'
      + '<div class="hp-pccard">'

      // Название + период
      + '<div class="hp-pcc-name">' + p.title + '</div>'
      + '<div class="hp-pcc-period">' + p.defaultPeriod + '</div>'

      // Метрики — вертикальный список
      + '<div class="hp-pcc-metrics">'
      + '<div class="hp-pcc-metric">'
      + '<span class="hp-pcc-mlbl">Портфель</span>'
      + '<span class="hp-pcc-mval font-num">' + _fmtPct(p.portfolioReturn) + '</span>'
      + '</div>'
      + '<div class="hp-pcc-metric">'
      + '<span class="hp-pcc-mlbl">' + p.benchmarkLabel + '</span>'
      + '<span class="hp-pcc-mval font-num">' + _fmtPct(p.benchmarkReturn) + '</span>'
      + '</div>'
      + '<div class="hp-pcc-metric hp-pcc-metric--diff">'
      + '<span class="hp-pcc-mlbl">Разница</span>'
      + '<span class="hp-pcc-mval font-num">' + _fmtPp(p.differencePp) + '</span>'
      + '</div>'
      + '</div>'

      // Статус
      + _statusBadge(p)

      // График
      + '<div class="hp-pcc-chart">'
      + (svgStr
        ? svgStr
          + '<div class="hp-pcc-chart-dates"><span>' + firstDate + '</span><span>' + lastDate + '</span></div>'
        : '<div class="hp-pcc-chart-empty"><span>График подключается</span></div>'
      )
      + '</div>'

      // Легенда
      + legHTML

      // Кнопка Snowball
      + (p.snowballPublicUrl
        ? '<button class="hp-pcc-sb-btn" data-url="' + p.snowballPublicUrl + '" aria-label="Открыть Snowball">'
          + 'Открыть Snowball&nbsp;' + _EXT_IC
          + '</button>'
        : '')

      // Футер
      + '<div class="hp-pcc-footer">'
      + '<span class="hp-pcc-source">' + (p.source || 'Snowball Income') + '</span>'
      + '<span class="hp-pcc-updated">' + updStr + '</span>'
      + '</div>'
      + '<div class="hp-pcc-warning">Данные могут отображаться с задержкой до 15 минут</div>'

      + '</div>' // hp-pccard
      + '</div>'; // hp-pcslide
  }

  function _initPortfolioCarousel(wrap, total) {
    var track   = wrap.querySelector('.hp-pctrack');
    var dots    = wrap.querySelectorAll('.hp-dot');
    var counter = wrap.querySelector('.hp-pc-counter');
    var cur     = 0;

    function slideStep() {
      var s = track && track.querySelector('.hp-pcslide');
      return s ? s.offsetWidth + 10 : 0; // offsetWidth + margin-right
    }

    function updateUI(idx) {
      cur = Math.max(0, Math.min(total - 1, idx));
      dots.forEach(function (d, i) { d.classList.toggle('active', i === cur); });
      if (counter) counter.textContent = (cur + 1) + ' из ' + total;
    }

    function getIndex() {
      var step = slideStep();
      return step > 0 ? Math.round(wrap.scrollLeft / step) : 0;
    }

    function scrollBehavior() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    }

    // scrollend fires once after scroll fully settles (Chrome 114+, Firefox 109+, Safari 17+)
    if ('onscrollend' in window) {
      wrap.addEventListener('scrollend', function () { updateUI(getIndex()); }, { passive: true });
    } else {
      // Debounced fallback for older WebViews — only registered when scrollend is absent
      var _st;
      wrap.addEventListener('scroll', function () {
        clearTimeout(_st);
        _st = setTimeout(function () { updateUI(getIndex()); }, 120);
      }, { passive: true });
    }

    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        var step = slideStep();
        if (step > 0) wrap.scrollTo({ left: +d.dataset.idx * step, behavior: scrollBehavior() });
      });
    });

    updateUI(0);
  }

  function renderPortfolioCarousel() {
    var wrap = document.getElementById('hp-slider-wrap');
    if (!wrap) return;
    var cfg   = HOME_CFG.portfolioCarousel;
    var items = cfg.portfolios;
    var total = items.length;

    var slidesHTML = items.map(function (p, i) {
      return _portfolioCardHTML(p, i, total);
    }).join('');

    var dotsHTML = items.map(function (_, i) {
      return '<button class="hp-dot' + (i === 0 ? ' active' : '') + '" data-idx="' + i
        + '" aria-label="Портфель ' + (i + 1) + '"></button>';
    }).join('');

    wrap.innerHTML =
      '<div class="hp-pc-head">'
      + '<div class="hp-pc-head-title">' + cfg.title + '</div>'
      + '<div class="hp-pc-head-sub">' + cfg.subtitle + '</div>'
      + '</div>'
      + '<div class="hp-pctrack">' + slidesHTML + '</div>'
      + '<div class="hp-pc-controls">'
      + '<span class="hp-pc-counter">1 из ' + total + '</span>'
      + '<div class="hp-slider-dots">' + dotsHTML + '</div>'
      + '</div>';

    _initPortfolioCarousel(wrap, total);

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.hp-pcc-sb-btn');
      if (btn && btn.dataset.url) { openUrl(btn.dataset.url); }
    });
  }

  // ── Плашка крипто-интенсива ──────────────────────────────────────────────────
  function renderCryptoEvent() {
    var el = document.getElementById('hp-crypto-event');
    if (!el) return;
    var c = HOME_CFG.cryptoEvent;
    el.innerHTML = '<div class="hp-slide-inner hp-slide-crypto">'
      + '<div class="hp-crypto-bg-icon" aria-hidden="true">&#x20BF;</div>'
      + '<div class="hp-slide-top">'
      + '<span class="hp-slide-tag">' + c.tag + '</span>'
      + '</div>'
      + '<div class="hp-slide-title font-cond">' + c.title + '</div>'
      + '<div class="hp-slide-sub">' + c.subtitle + '</div>'
      + '<button class="hp-slide-btn hp-crypto-evt-btn"'
      + (c.url ? ' data-url="' + c.url + '"' : '')
      + (c.btnToast ? ' data-toast="' + c.btnToast + '"' : '')
      + '>' + c.btnLabel + '</button>'
      + '</div>';
    el.querySelector('.hp-crypto-evt-btn').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      if (btn.dataset.url) { openUrl(btn.dataset.url); return; }
      if (btn.dataset.toast && window.showToast) showToast(btn.dataset.toast);
    });
  }

  // ── Render: Портфели клуба (ссылка на GetCourse) ─────────────────────────────
  function renderPortfolios() {
    var el = document.getElementById('hp-portfolios');
    if (!el) return;
    var c = HOME_CFG.portfolios;
    el.innerHTML = '<div class="hp-portfolios-card" role="button" tabindex="0" aria-label="Открыть на GetCourse">'
      + '<div class="hp-portfolios-icon" aria-hidden="true">'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="26" height="26"><path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z"/></svg>'
      + '</div>'
      + '<div class="hp-portfolios-body">'
      + '<div class="hp-portfolios-title">' + c.title + '</div>'
      + '<div class="hp-portfolios-desc">' + c.desc + '</div>'
      + '</div>'
      + '<div class="hp-portfolios-arr" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18"><path d="M224,104a8,8,0,0,1-16,0V79.32l-82.34,82.34a8,8,0,0,1-11.32-11.32L196.68,68H172a8,8,0,0,1,0-16h44a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg></div>'
      + '</div>';
    el.querySelector('.hp-portfolios-card').addEventListener('click', function () { openUrl(c.url); });
  }

  // ── Render: кнопка «Общение» ──────────────────────────────────────────────────
  function renderChatsBtn() {
    var el = document.getElementById('hp-chats');
    if (!el) return;
    el.innerHTML = '<button class="hp-chats-btn">'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M231.66,213.73a8,8,0,0,1-9.93,9.93L194,215.5A72.05,72.05,0,0,1,92.06,175.89h0c1.31.07,2.62.11,3.94.11a72,72,0,0,0,67.93-95.88h0A72,72,0,0,1,223.5,186Z" opacity="0.2"/><path d="M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86ZM62,159.5a8.28,8.28,0,0,0-2.26.32L32,168l8.17-27.76a8,8,0,0,0-.63-6,64,64,0,1,1,26.26,26.26A8,8,0,0,0,62,159.5Zm153.79,28.73L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z"/></svg>'
      + 'Перейти к общению'
      + '</button>';
    el.querySelector('.hp-chats-btn').addEventListener('click', function () {
      if (window.setPage) setPage('chats');
    });
  }

  // ── Render: «Сейчас в клубе» (макро-интенсив) ────────────────────────────────
  function renderNow() {
    var el = document.getElementById('hp-now');
    if (!el) return;
    var intSt = intensivStatus();
    el.innerHTML = '<div class="hp-section-title">Сейчас в клубе</div>'
      + '<div class="hp-intensiv-card" role="button" tabindex="0">'
      + '<div class="hp-intensiv-head">'
      + '<span class="hp-intensiv-tag">' + HOME_CFG.intensiv.tag + '</span>'
      + '<span class="hp-status ' + intSt.cls + '">' + intSt.label + '</span>'
      + '</div>'
      + '<div class="hp-intensiv-title">' + HOME_CFG.intensiv.title + '</div>'
      + '<div class="hp-intensiv-period">3–10 августа 2026</div>'
      + '</div>';
    el.querySelector('.hp-intensiv-card').addEventListener('click', function () {
      openUrl(HOME_CFG.intensiv.url);
    });
  }

  // ── Render: Расписание ────────────────────────────────────────────────────────
  var DAY_SHORT = ['вс','пн','вт','ср','чт','пт','сб'];

  function renderCalendar() {
    var el = document.getElementById('hp-calendar');
    if (!el) return;
    var html = '<div class="hp-section-title">Расписание интенсива</div>'
      + '<div class="hp-calendar">';
    var lastDate = '';
    HOME_CFG.events.forEach(function (ev) {
      var st = eventStatus(ev);
      if (ev.date !== lastDate) {
        var d = new Date(ev.date + 'T00:00:00');
        html += '<div class="hp-cal-date-row">'
          + '<span class="hp-cal-date-num">' + d.getDate() + '</span>'
          + '<span class="hp-cal-date-label">' + MONTH_SHORT[d.getMonth()] + ' · ' + DAY_SHORT[d.getDay()] + '</span>'
          + '</div>';
        lastDate = ev.date;
      }
      html += '<div class="hp-cal-event' + (st.cls === 'hp-status-done' ? ' hp-cal-done' : '') + '">'
        + '<div class="hp-cal-event-body">'
        + '<div class="hp-cal-event-title">' + ev.title + '</div>'
        + '<div class="hp-cal-event-desc">' + ev.desc + '</div>'
        + '</div>'
        + '<span class="hp-status ' + st.cls + '">' + st.label + '</span>'
        + '</div>';
    });
    html += '</div>';
    html += '<a class="hp-cal-link" data-url="' + HOME_CFG.intensiv.url + '" aria-label="Открыть программу интенсива на GetCourse">Открыть программу интенсива&nbsp;' + _EXT_IC + '</a>';
    el.innerHTML = html;
    el.querySelector('.hp-cal-link').addEventListener('click', function () {
      openUrl(HOME_CFG.intensiv.url);
    });
  }

  // ── Render: Обучение ──────────────────────────────────────────────────────────
  function renderLearning() {
    var el = document.getElementById('hp-learning');
    if (!el) return;

    var acc = HOME_CFG.accordion;
    var howHtml = '<div class="hp-acc-wrap hp-how-acc">'
      + '<button class="hp-acc-btn" data-hp-acc="how-to">'
      + '<span class="hp-acc-title">' + acc.title + '</span>'
      + '<span class="hp-acc-icon">' + CHEVRON_SVG + '</span>'
      + '</button>'
      + '<div class="hp-acc-body" data-hp-body="how-to" hidden>'
      + '<p class="hp-how-text">' + acc.body + '</p>'
      + '</div>'
      + '</div>';

    var stepCat = window.COURSE_CATALOG && window.COURSE_CATALOG.stepCatalog;
    var stepsHtml = HOME_CFG.steps.map(function (s) {
      var fav = isStepFav(s.id);
      var catEntry = stepCat && stepCat.filter(function(sc) { return sc.id === s.id; })[0];
      var courseCount = catEntry ? catEntry.courses.length + ' курсов' : 'Курсы →';
      return '<div class="hp-step-card">'
        + '<div class="hp-step-body">'
        + '<div class="hp-step-label">' + s.label + '</div>'
        + '<div class="hp-step-sub">' + s.sub + '</div>'
        + '<div class="hp-step-desc">' + s.desc + '</div>'
        + '<button class="hp-step-open" data-step-id="' + s.id + '">' + courseCount + ' →</button>'
        + '</div>'
        + '<button class="hp-step-fav ' + (fav ? 'active' : '') + '" data-step="' + s.id + '" aria-label="Избранное">'
        + (fav ? FAV_ACTIVE : FAV_EMPTY)
        + '</button>'
        + '</div>';
    }).join('');

    var archHtml = HOME_CFG.archives.map(function (a) {
      var arcKey = 'home/' + a.id;
      var arcFav = typeof FAV !== 'undefined' && FAV.isFav(arcKey);
      var arcStar = typeof FAV !== 'undefined'
        ? '<button class="fav-star-btn hp-arc-star' + (arcFav ? ' is-fav' : '') + '"'
          + ' data-fav-key="' + arcKey + '"'
          + ' data-arc-fav="' + a.id + '"'
          + ' aria-label="' + (arcFav ? 'Убрать из избранного' : 'Добавить в избранное') + '">'
          + (arcFav ? FAV.starFill : FAV.starEmpty)
          + '</button>'
        : '';
      return '<div class="hp-acc-wrap hp-archive-item">'
        + '<button class="hp-acc-btn" data-hp-acc="' + a.id + '">'
        + '<span class="hp-acc-title">' + a.title + '</span>'
        + '<span class="hp-acc-icon">' + CHEVRON_SVG + '</span>'
        + '</button>'
        + '<div class="hp-acc-body" data-hp-body="' + a.id + '" hidden>'
        + '<div class="hp-archive-row">'
        + '<a class="hp-archive-link" data-url="' + a.url + '" aria-label="Открыть материалы на GetCourse">Перейти к материалам&nbsp;' + _EXT_IC + '</a>'
        + arcStar
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    el.innerHTML = '<div class="hp-section-title">Обучение</div>'
      + howHtml + stepsHtml + archHtml;

    el.addEventListener('click', function (e) {
      var accBtn = e.target.closest('[data-hp-acc]');
      if (accBtn && el.contains(accBtn)) {
        var id   = accBtn.dataset.hpAcc;
        var body = el.querySelector('[data-hp-body="' + id + '"]');
        if (body) {
          var open = !body.hidden;
          body.hidden = open;
          var icon = accBtn.querySelector('.hp-acc-icon');
          if (icon) icon.style.transform = open ? '' : 'rotate(180deg)';
        }
        return;
      }
      var favBtn = e.target.closest('.hp-step-fav');
      if (favBtn) {
        e.stopPropagation();
        toggleStepFav(favBtn.dataset.step, favBtn);
        return;
      }
      var arcFavBtn = e.target.closest('[data-arc-fav]');
      if (arcFavBtn) {
        e.stopPropagation();
        if (typeof FAV !== 'undefined') FAV.toggle(arcFavBtn.dataset.favKey, arcFavBtn);
        return;
      }
      var openBtn = e.target.closest('.hp-step-open');
      if (openBtn) {
        if (typeof openStep === 'function') openStep(openBtn.dataset.stepId);
        return;
      }
      var arcLink = e.target.closest('.hp-archive-link');
      if (arcLink) { openUrl(arcLink.dataset.url); return; }
    });
  }

  // ── Загрузка данных всех портфелей из portfolios.json ───────────────────────
  function loadAllPortfolioData() {
    fetch('data/portfolios.json')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        if (!data) return;
        var changed = false;
        HOME_CFG.portfolioCarousel.portfolios.forEach(function (cfg) {
          var d = data[cfg.id];
          if (!d) return;
          cfg.portfolioReturn = d.portfolioReturn;
          cfg.benchmarkReturn = d.benchmarkReturn;
          cfg.differencePp    = d.differencePp;
          cfg.chartSeries     = d.chartSeries;
          cfg.lastUpdatedAt   = d.lastUpdatedAt;
          cfg.defaultPeriod   = d.defaultPeriod;
          cfg.source          = d.source || 'Snowball Income';
          cfg.dataState       = d._stale ? 'stale' : 'connected';
          changed = true;
        });
        if (changed) renderPortfolioCarousel();
      })
      .catch(function () { /* оставляем карточки в состоянии «Подключается» */ });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function initHome() {
    renderPortfolioCarousel();
    renderCryptoEvent();
    renderPortfolios();
    renderChatsBtn();
    renderNow();
    renderCalendar();
    renderLearning();
    loadAllPortfolioData(); // async; перерисовывает карусель при успехе
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
  } else {
    initHome();
  }

}());
