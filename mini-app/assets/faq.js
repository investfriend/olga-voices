// === FAQ MODULE v3 — data-* delegation, no inline onclick ===
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  // ── safe HTML escape ────────────────────────────────────────────────────
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── normalise for search (ё→е, strip punctuation) ───────────────────────
  const norm = s =>
    String(s || '').toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/gi, ' ')
      .replace(/\s+/g, ' ').trim();

  const STOP = new Set(['я','мы','вы','он','она','они','не','как','где','что',
    'это','если','или','для','при','мне','мой','мои','мою','ли','на','в','во',
    'с','со','по','к','у','из','за','до','от','и','а']);

  function plural(n, a, b, c) {
    const x = n % 10, y = n % 100;
    return x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && !(y >= 12 && y <= 14) ? b : c;
  }

  function getCat(id) {
    return FAQ_CATS.find(c => c.id === id) || { id, label: id, icon: '' };
  }

  function expandQuery(q) {
    let x = norm(q);
    Object.entries(FAQ_SYNONYMS).forEach(([k, v]) => {
      if (x.includes(norm(k))) x += ' ' + norm(v);
    });
    return norm(x);
  }

  function getBodyText(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return norm(d.textContent || '');
  }

  function scoreItem(item, q) {
    if (!q) return item.popular ? 3 : 1;
    const nq = norm(q);
    const tokens = [...new Set(
      expandQuery(q).split(' ').filter(t => t.length > 2 && !STOP.has(t))
    )];
    const qq = norm(item.question);
    const sh = norm(item.short || '');
    const kw = norm((item.keywords || []).join(' '));
    const bd = getBodyText(item.body || '');
    let z = 0, m = 0, exact = false;
    if (qq.includes(nq)) { z += 30; exact = true; }
    if (kw.includes(nq)) { z += 22; exact = true; }
    if (sh.includes(nq)) { z += 16; exact = true; }
    if (bd.includes(nq)) { z += 10; exact = true; }
    tokens.forEach(t => {
      if (qq.includes(t))      { z += 7; m++; }
      else if (kw.includes(t)) { z += 6; m++; }
      else if (sh.includes(t)) { z += 4; m++; }
      else if (bd.includes(t)) { z += 2; m++; }
    });
    if (!exact && m === 0) return 0;
    if (!exact && tokens.length > 1 && m < Math.ceil(tokens.length * 0.6)) return 0;
    return z;
  }

  // ── Phosphor SVG icons ───────────────────────────────────────────────────
  // Each returns a complete <svg> string; inlined directly into HTML
  const SVG = {
    // MagnifyingGlass – search
    search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z" opacity="0.2"/><path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg>`,
    // PlusCircle – accordion expand
    plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M164,128a8,8,0,0,1-8,8H136v20a8,8,0,0,1-16,0V136H100a8,8,0,0,1,0-16h20V100a8,8,0,0,1,16,0v20h20A8,8,0,0,1,164,128Zm60,0A96,96,0,1,1,128,32,96.11,96.11,0,0,1,224,128Zm-16,0a80,80,0,1,0-80,80A80.09,80.09,0,0,0,208,128Z"/></svg>`,
    // MinusCircle – accordion collapse
    minus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M164,128a8,8,0,0,1-8,8H100a8,8,0,0,1,0-16h56A8,8,0,0,1,164,128Zm60,0A96,96,0,1,1,128,32,96.11,96.11,0,0,1,224,128Zm-16,0a80,80,0,1,0-80,80A80.09,80.09,0,0,0,208,128Z"/></svg>`,
    // SignIn – access / entry
    access: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M112,216H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h64Z" opacity="0.2"/><path d="M141.66,205.66l-32,32A8,8,0,0,1,96,232V176H48A16,16,0,0,1,32,160V96A16,16,0,0,1,48,80H96V24a8,8,0,0,1,13.66-5.66l32,32A8,8,0,0,1,144,56V96h64a16,16,0,0,1,16,16v32a16,16,0,0,1-16,16H144v40A8,8,0,0,1,141.66,205.66ZM128,176V160h64V96H128V80L104,56V96H48v64h56v40Z"/></svg>`,
    // BookOpen – learning
    learning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232,56V184a8,8,0,0,1-4.29,7.1L128,240,28.29,191.1A8,8,0,0,1,24,184V56a8,8,0,0,1,8-8H224A8,8,0,0,1,232,56Z" opacity="0.2"/><path d="M231.65,172.43l-96-144A8,8,0,0,0,122.35,27.57l-96,144A8,8,0,0,0,32,184a8,8,0,0,0,8,8H216a8,8,0,0,0,6.65-12.57ZM50.64,176,128,60.53,205.36,176Z"/></svg>`,
    // ChatTeardrop – events/questions
    events: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,136a88.11,88.11,0,0,1-88,88H40V136a88,88,0,0,1,176,0Z" opacity="0.2"/><path d="M216,128a88.11,88.11,0,0,0-176,0v75.33A16,16,0,0,0,56,224h72a88.1,88.1,0,0,0,88-88Zm-88,72H56V128a72,72,0,0,1,144,0A72.08,72.08,0,0,1,128,200Z"/></svg>`,
    // ChatsCircle – telegram chats
    telegram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M231.66,213.73a8,8,0,0,1-9.93,9.93L194,215.5A72.05,72.05,0,0,1,92.06,175.89h0c1.31.07,2.62.11,3.94.11a72,72,0,0,0,67.93-95.88h0A72,72,0,0,1,223.5,186Z" opacity="0.2"/><path d="M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86ZM62,159.5a8.28,8.28,0,0,0-2.26.32L32,168l8.17-27.76a8,8,0,0,0-.63-6,64,64,0,1,1,26.26,26.26A8,8,0,0,0,62,159.5Zm153.79,28.73L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z"/></svg>`,
    // ChartLineUp – portfolio
    portfolio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232,200H32V48" opacity="0.2"/><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V200H224A8,8,0,0,1,232,208ZM69.66,133.66a8,8,0,0,0,11.32,0L128,86.63l42.34,42.35a8,8,0,0,0,11.32,0l56-56a8,8,0,0,0-11.32-11.32L176,111.37l-42.34-42.35a8,8,0,0,0-11.32,0L75.32,116l-13.66-13.66A8,8,0,0,0,50.34,113.66Z"/></svg>`,
    // CreditCard – payment
    payment: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,96H32V56a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8Z" opacity="0.2"/><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V112H224Zm0-96H32V64H224Z"/></svg>`,
    // Gift – bonus
    bonus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M208,128v72a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V128Z" opacity="0.2"/><path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z"/></svg>`,
    // Wrench – tech
    tech: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,88a56.07,56.07,0,0,1-56,56H80l-16,16H168a56,56,0,0,1,0,112H88a56,56,0,0,1-22.63-107.38L222.77,7.52A8,8,0,0,1,232,16,56.07,56.07,0,0,1,176,72H80A56,56,0,0,0,80,184H168A40,40,0,0,0,168,104H92.29l16-16H160A56.07,56.07,0,0,1,216,88Z" opacity="0.2"/><path d="M245.34,101.37a8,8,0,0,0-8.69-1.73L208,111.38V88A64.07,64.07,0,0,0,144,24H64A16,16,0,0,0,48,40V200a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V168.62l28.65,11.74A8,8,0,0,0,248,172V108A8,8,0,0,0,245.34,101.37ZM192,200H64V40h80a48.05,48.05,0,0,1,48,48V200Zm40-42.25-24-9.83V108.08l24-9.83Z"/></svg>`,
    // ArrowSquareOut – external link indicator
    external: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,40V152H176V80H104V40Z" opacity="0.2"/><path d="M224,104a8,8,0,0,1-16,0V59.32l-82.34,82.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"/></svg>`,
  };

  function catSvg(id) { return SVG[id] || SVG.learning; }

  // ── open link via Telegram or browser ───────────────────────────────────
  function openLink(url) {
    if (!url) return;
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) { tg.openLink(url); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── state ────────────────────────────────────────────────────────────────
  let fQ = '';
  let fCat = 'all';
  let topicQ = '';

  // ── render quick chips ───────────────────────────────────────────────────
  function renderQuick() {
    const el = $('faqQuick');
    if (!el) return;
    el.innerHTML = FAQ_QUICK.map(x =>
      `<button data-faq-query="${esc(x.query)}">${esc(x.label)}</button>`
    ).join('');
  }

  // ── render category filter ───────────────────────────────────────────────
  function renderCats() {
    const el = $('faqCats');
    if (!el) return;
    // FAQ_CATS[0] is "all" — render it first, then the rest
    el.innerHTML = FAQ_CATS.map(c => {
      const active = fCat === c.id ? ' is-active' : '';
      const icon = c.id !== 'all'
        ? `<span class="faq-cat-icon">${catSvg(c.id)}</span>`
        : '';
      return `<button class="faq-cat-btn${active}" data-faq-cat="${esc(c.id)}">${icon}${esc(c.label)}</button>`;
    }).join('');
  }

  // ── render learning topics navigator ────────────────────────────────────
  function renderTopics() {
    const el = $('faqTopics');
    if (!el) return;
    if (fQ.trim()) { el.style.display = 'none'; return; }
    el.style.display = '';

    const tqn = norm(topicQ);
    const parts = tqn.split(' ').filter(Boolean);
    const list = FAQ_TOPICS.filter(t => {
      if (!tqn) return true;
      const hay = norm([t.title, t.desc, t.step, String(t.keywords || '')].join(' '));
      return parts.every(p => hay.includes(p));
    });

    const cardsHTML = list.length
      ? list.map(t =>
          `<div class="faq-topic-card" data-lesson-url="${esc(t.url)}" role="button" tabindex="0" aria-label="${esc(t.title)}">
            <span class="faq-topic-step">${esc(t.step)}</span>
            <div class="faq-topic-title">${esc(t.title)}</div>
            <div class="faq-topic-desc">${esc(t.desc)}</div>
          </div>`
        ).join('')
      : `<div class="faq-empty" style="grid-column:1/-1;padding:16px 0"><b>Тема не найдена</b><p>Попробуйте другое слово.</p></div>`;

    el.innerHTML = `
      <div class="faq-topics-wrap">
        <div class="faq-topics-head">
          <span class="faq-topics-icon">${SVG.search}</span>Навигатор по обучению
        </div>
        <input id="faqTopicInput" class="faq-topic-search" type="search"
               placeholder="Облигации, налоги, крипта…" autocomplete="off"
               value="${esc(topicQ)}">
        <div class="faq-topic-grid">${cardsHTML}</div>
      </div>`;

    $('faqTopicInput')?.addEventListener('input', e => {
      topicQ = e.target.value;
      renderTopics();
    });
  }

  // ── render faq groups (accordion cards) ─────────────────────────────────
  function renderGroups() {
    const el = $('faqGroups');
    const titleEl = $('faqTitle');
    const countEl = $('faqCount');
    if (!el) return;

    let list = FAQ_DATA
      .filter(i => fCat === 'all' || i.category === fCat)
      .map(i => ({ ...i, _sc: scoreItem(i, fQ) }))
      .filter(i => !fQ || i._sc > 0)
      .sort((a, b) =>
        b._sc - a._sc ||
        Number(b.popular) - Number(a.popular) ||
        a.question.localeCompare(b.question, 'ru')
      );
    if (fQ) list = list.slice(0, 12);

    if (countEl) countEl.textContent =
      `${list.length} ${plural(list.length, 'ответ', 'ответа', 'ответов')}`;
    if (titleEl) {
      titleEl.textContent = fQ
        ? `По запросу «${fQ}»`
        : (fCat === 'all' ? 'Все вопросы' : getCat(fCat).label);
    }

    // Market search results (injected before FAQ results)
    const mktHtml = (fQ && window.marketSearchHtml) ? window.marketSearchHtml(fQ) : '';

    if (!list.length) {
      el.innerHTML = mktHtml || `<div class="faq-empty"><b>Ответ не найден</b><p>Сократите запрос или попробуйте другое слово.</p></div>`;
      return;
    }

    // Group by category (or single "results" group when searching)
    const groups = {};
    list.forEach(i => {
      const key = fQ ? '__results__' : i.category;
      (groups[key] || (groups[key] = [])).push(i);
    });

    el.innerHTML = mktHtml + Object.entries(groups).map(([key, items]) => {
      const meta = key === '__results__'
        ? { id: '__results__', label: 'Найденные ответы' }
        : getCat(key);
      const iconHTML = key === '__results__'
        ? `<span class="faq-group-icon">${SVG.search}</span>`
        : `<span class="faq-group-icon">${catSvg(key)}</span>`;

      return `<div class="faq-group">
        <div class="faq-group-title">${iconHTML}${esc(meta.label)}</div>
        ${items.map(i => {
          const cm = getCat(i.category);
          // action buttons — data-action-url, NO onclick
          const actionsHTML = (i.actions && i.actions.length)
            ? `<div class="faq-card-actions">${i.actions.map(a =>
                `<button class="faq-act-btn ${a.kind === 'secondary' ? 'secondary' : 'primary'}"
                         data-action-url="${esc(a.url)}">${esc(a.label)}&nbsp;${SVG.external}</button>`
              ).join('')}</div>`
            : '';
          const faqFavKey = `faq/${esc(i.id)}`;
          const faqIsFav = typeof FAV !== 'undefined' && FAV.isFav('faq/' + i.id);
          const faqStar = typeof FAV !== 'undefined'
            ? `<button class="fav-star-btn faq-fav-btn${faqIsFav ? ' is-fav' : ''}"
                 data-faq-fav="${esc(i.id)}"
                 data-fav-key="${faqFavKey}"
                 aria-label="${faqIsFav ? 'Убрать из избранного' : 'Добавить в избранное'}">${faqIsFav ? FAV.starFill : FAV.starEmpty}</button>`
            : '';
          return `<div class="faq-card" id="faqcard-${esc(i.id)}">
            <div class="faq-card-header"
                 data-faq-toggle="${esc(i.id)}"
                 role="button" tabindex="0"
                 aria-expanded="false"
                 aria-controls="faqbody-${esc(i.id)}">
              <div class="faq-card-left">
                <span class="faq-card-label">
                  <span class="faq-card-label-icon">${catSvg(cm.id)}</span>${esc(cm.label)}
                </span>
                <div class="faq-card-q">${esc(i.question)}</div>
                <div class="faq-card-short">${esc(i.short)}</div>
              </div>
              <div class="faq-card-right">
                ${faqStar}
                <div class="faq-card-toggle" aria-hidden="true">
                  <span class="faq-toggle-plus">${SVG.plus}</span>
                  <span class="faq-toggle-minus">${SVG.minus}</span>
                </div>
              </div>
            </div>
            <div class="faq-card-body" id="faqbody-${esc(i.id)}" hidden>
              ${i.body}${actionsHTML}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  function render() {
    renderCats();
    renderTopics();
    renderGroups();
  }

  // ── accordion toggle ─────────────────────────────────────────────────────
  function toggleCard(id) {
    const card = document.getElementById('faqcard-' + id);
    if (!card) return;
    const header = card.querySelector('[data-faq-toggle]');
    const body = card.querySelector('.faq-card-body');
    const isOpen = card.classList.contains('is-open');

    // close siblings
    const group = card.closest('.faq-group');
    if (group) {
      group.querySelectorAll('.faq-card.is-open').forEach(c => {
        if (c !== card) {
          c.classList.remove('is-open');
          const h = c.querySelector('[data-faq-toggle]');
          const b = c.querySelector('.faq-card-body');
          if (h) h.setAttribute('aria-expanded', 'false');
          if (b) b.hidden = true;
        }
      });
    }

    card.classList.toggle('is-open', !isOpen);
    if (header) header.setAttribute('aria-expanded', String(!isOpen));
    if (body) body.hidden = isOpen;

    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  }

  // ── event delegation on the FAQ page ────────────────────────────────────
  function bindDelegation() {
    const page = document.querySelector('[data-page="faq"]');
    if (!page) return;

    page.addEventListener('click', e => {
      // Links inside card body → openLink
      const bodyLink = e.target.closest('.faq-card-body a[href]');
      if (bodyLink) { e.preventDefault(); openLink(bodyLink.href); return; }

      // Star button — must check BEFORE toggle to avoid opening accordion
      const favBtn = e.target.closest('[data-faq-fav]');
      if (favBtn) {
        if (typeof FAV !== 'undefined') FAV.toggle('faq/' + favBtn.dataset.faqFav, favBtn);
        return;
      }

      // Find nearest data-* handler
      const t = e.target.closest(
        '[data-faq-query],[data-faq-cat],[data-faq-toggle],[data-lesson-url],[data-action-url]'
      );
      if (!t) return;

      const { faqQuery, faqCat, faqToggle, lessonUrl, actionUrl } = t.dataset;

      if (faqQuery !== undefined) {
        const inp = $('faqSearch');
        const clr = $('faqClear');
        if (inp) inp.value = faqQuery;
        if (clr) clr.style.display = faqQuery ? 'flex' : 'none';
        fQ = faqQuery;
        fCat = 'all';
        render();
        return;
      }
      if (faqCat !== undefined) { fCat = faqCat; render(); return; }
      if (faqToggle !== undefined) { toggleCard(faqToggle); return; }
      if (lessonUrl !== undefined) { openLink(lessonUrl); return; }
      if (actionUrl !== undefined) { openLink(actionUrl); return; }
    });

    // Keyboard: Enter/Space on focusable FAQ elements
    page.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const t = e.target.closest('[data-faq-toggle],[data-lesson-url],[data-faq-query],[data-faq-cat]');
      if (!t) return;
      e.preventDefault();
      t.click();
    });
  }

  // ── init ─────────────────────────────────────────────────────────────────
  function init() {
    renderQuick();
    render();
    bindDelegation();

    const inp = $('faqSearch');
    const clr = $('faqClear');

    inp?.addEventListener('input', () => {
      fQ = inp.value;
      if (clr) clr.style.display = fQ.trim() ? 'flex' : 'none';
      render();
    });
    clr?.addEventListener('click', () => {
      if (inp) inp.value = '';
      fQ = '';
      clr.style.display = 'none';
      render();
    });
  }

  // Expose: navigate to FAQ and expand a card by ID (used by favorites screen)
  window._faqExpand = function (id) {
    const card = document.getElementById('faqcard-' + id);
    if (!card) return;
    if (!card.classList.contains('is-open')) toggleCard(id);
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
