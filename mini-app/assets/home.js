// assets/home.js v1 — Home screen rendering
// Depends on: script.js (STATE, setPage), data.js (DATA)

(function () {
  'use strict';

  // ── Configuration ───────────────────────────────────────────────────────────
  var HOME_CFG = {
    portfolios: {
      title: 'Портфели клуба',
      desc:  'Актуальные портфели и материалы по их ведению',
      url:   'https://investfriend.ru/teach/control/lesson/view/id/348403796',
    },

    intensiv: {
      tag:    'МАКРО',
      title:  'Экономика и портфель: как принимать решения по данным',
      start:  '2026-08-03',
      end:    '2026-08-10',
      url:    'https://investfriend.ru/teach/control/stream/view/id/935709630',
    },

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
      { id: 'step1', label: 'Ступень 1', sub: 'Финансовая грамотность',     desc: 'Активы и пассивы, финансовый резерв, налоговые вычеты, первые шаги на фондовом рынке.', url: 'https://investfriend.ru/teach/control/stream/view/id/935112977' },
      { id: 'step2', label: 'Ступень 2', sub: 'Инвестиции',                 desc: 'Пассивный доход, портфель, облигации, акции, дивиденды и психология инвестора.',         url: 'https://investfriend.ru/teach/control/stream/view/id/935112984' },
      { id: 'step3', label: 'Ступень 3', sub: 'Продвинутые инструменты',    desc: 'Зарубежный рынок, крипта, технический и фундаментальный анализ, фьючерсы.',             url: 'https://investfriend.ru/teach/control/stream/view/id/935131947' },
    ],

    archives: [
      { id: 'arc-intensivy', title: 'Записи живых интенсивов', url: 'https://investfriend.ru/teach/control/stream/view/id/935539310' },
      { id: 'arc-efiry',     title: 'Записи эфиров',            url: 'https://investfriend.ru/teach/control/stream/view/id/935138978' },
    ],

    accordion: {
      title: 'Как пользоваться обучением',
      body:  'Обучение разделено на три ступени — от основ до продвинутых инструментов. Начните с первой: финансовая грамотность, активы, первые инвестиции. После завершения переходите к следующей. Нажмите «Открыть» на любой ступени, чтобы попасть в неё. Звёздочку ★ используйте, чтобы отметить ступень как важную.',
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

  function nearestEvent() {
    for (var i = 0; i < HOME_CFG.events.length; i++) {
      if (eventStatus(HOME_CFG.events[i]).cls !== 'hp-status-done') return HOME_CFG.events[i];
    }
    return HOME_CFG.events[HOME_CFG.events.length - 1];
  }

  // ── Utilities ────────────────────────────────────────────────────────────────
  function openUrl(url) {
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openLink) tg.openLink(url);
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

  // ── Render: Портфели клуба ────────────────────────────────────────────────
  function renderPortfolios() {
    var el = document.getElementById('hp-portfolios');
    if (!el) return;
    var c = HOME_CFG.portfolios;
    el.innerHTML = '<div class="hp-portfolios-card" role="button" tabindex="0">'
      + '<div class="hp-portfolios-icon" aria-hidden="true">'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="26" height="26"><path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z"/></svg>'
      + '</div>'
      + '<div class="hp-portfolios-body">'
      + '<div class="hp-portfolios-title">' + c.title + '</div>'
      + '<div class="hp-portfolios-desc">' + c.desc + '</div>'
      + '</div>'
      + '<div class="hp-portfolios-arr" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="18" height="18"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg></div>'
      + '</div>';
    el.querySelector('.hp-portfolios-card').addEventListener('click', function () { openUrl(c.url); });
  }

  // ── Render: кнопка «Общение» ──────────────────────────────────────────────
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

  // ── Render: «Сейчас в клубе» (карточка интенсива) ────────────────────────
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
      + '<div class="hp-intensiv-period">3–10 августа 2026</div>'
      + '</div>';
    el.querySelector('.hp-intensiv-card').addEventListener('click', function () {
      openUrl(HOME_CFG.intensiv.url);
    });
  }

  // ── Render: Расписание ────────────────────────────────────────────────────
  var MONTH_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  var DAY_SHORT   = ['вс','пн','вт','ср','чт','пт','сб'];

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
          + '<span class="hp-cal-date-label">' + MONTH_SHORT[d.getMonth()] + ' · ' + DAY_SHORT[d.getDay()] + '</span>'
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
    // Link to intensiv for the whole section
    html += '<a class="hp-cal-link" data-url="' + HOME_CFG.intensiv.url + '">Открыть программу интенсива →</a>';
    el.innerHTML = html;
    el.querySelector('.hp-cal-link').addEventListener('click', function () {
      openUrl(HOME_CFG.intensiv.url);
    });
  }

  // ── Render: Обучение ──────────────────────────────────────────────────────
  function renderLearning() {
    var el = document.getElementById('hp-learning');
    if (!el) return;

    // How-to accordion
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

    // Step cards
    var stepsHtml = HOME_CFG.steps.map(function (s) {
      var fav = isStepFav(s.id);
      return '<div class="hp-step-card">'
        + '<div class="hp-step-body" data-url="' + s.url + '">'
        + '<div class="hp-step-label">' + s.label + '</div>'
        + '<div class="hp-step-sub">' + s.sub + '</div>'
        + '<div class="hp-step-desc">' + s.desc + '</div>'
        + '<button class="hp-step-open" data-url="' + s.url + '">Открыть</button>'
        + '</div>'
        + '<button class="hp-step-fav ' + (fav ? 'active' : '') + '" data-step="' + s.id + '" aria-label="Избранное">'
        + (fav ? FAV_ACTIVE : FAV_EMPTY)
        + '</button>'
        + '</div>';
    }).join('');

    // Archive accordions
    var archHtml = HOME_CFG.archives.map(function (a) {
      return '<div class="hp-acc-wrap hp-archive-item">'
        + '<button class="hp-acc-btn" data-hp-acc="' + a.id + '">'
        + '<span class="hp-acc-title">' + a.title + '</span>'
        + '<span class="hp-acc-icon">' + CHEVRON_SVG + '</span>'
        + '</button>'
        + '<div class="hp-acc-body" data-hp-body="' + a.id + '" hidden>'
        + '<a class="hp-archive-link" data-url="' + a.url + '">Перейти к материалам →</a>'
        + '</div>'
        + '</div>';
    }).join('');

    el.innerHTML = '<div class="hp-section-title">Обучение</div>'
      + howHtml + stepsHtml + archHtml;

    // Delegated events
    el.addEventListener('click', function (e) {
      // Accordion toggle
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
      // Fav toggle
      var favBtn = e.target.closest('.hp-step-fav');
      if (favBtn) {
        e.stopPropagation();
        toggleStepFav(favBtn.dataset.step, favBtn);
        return;
      }
      // Step open button
      var openBtn = e.target.closest('.hp-step-open');
      if (openBtn) { openUrl(openBtn.dataset.url); return; }
      // Archive link
      var arcLink = e.target.closest('.hp-archive-link');
      if (arcLink) { openUrl(arcLink.dataset.url); return; }
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function initHome() {
    renderPortfolios();
    renderChatsBtn();
    renderNow();
    renderCalendar();
    renderLearning();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
  } else {
    initHome();
  }

}());
