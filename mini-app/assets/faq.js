// === FAQ MODULE ===
(function () {
  'use strict';

  // ---- helpers ----
  const $ = id => document.getElementById(id);
  const norm = v =>
    String(v || '').toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const STOP = new Set(['я','мы','вы','он','она','они','не','как','где','что',
    'это','если','или','для','при','мне','мой','мои','мою','ли','на','в','во',
    'с','со','по','к','у','из','за','до','от','и','а']);

  function getCatMeta(id) {
    return FAQ_CATS.find(c => c.id === id) || FAQ_CATS[0];
  }

  function plural(n, a, b, c) {
    const x = n % 10, y = n % 100;
    return x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && !(y >= 12 && y <= 14) ? b : c;
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

  // ---- state ----
  let fQ = '';
  let fCat = 'all';
  let topicQ = '';

  // ---- render quick chips ----
  function renderQuick() {
    const el = $('faqQuick');
    if (!el) return;
    el.innerHTML = FAQ_QUICK.map(x =>
      `<button onclick="window._faqQuery(${JSON.stringify(x.query)})">${x.label}</button>`
    ).join('');
  }

  // ---- render category nav ----
  function renderCats() {
    const el = $('faqCats');
    if (!el) return;
    el.innerHTML = FAQ_CATS.map(c =>
      `<button class="faq-cat-btn${fCat === c.id ? ' is-active' : ''}" onclick="window._faqCat(${JSON.stringify(c.id)})">${c.label}</button>`
    ).join('');
  }

  // ---- render topics ----
  function renderTopics() {
    const el = $('faqTopics');
    if (!el) return;
    if (fQ.trim()) { el.style.display = 'none'; return; }
    el.style.display = '';
    const tqn = norm(topicQ);
    const parts = tqn.split(' ').filter(Boolean);
    const list = FAQ_TOPICS.filter(t => {
      if (!tqn) return true;
      const hay = norm([t.title, t.desc, t.step, t.keywords].join(' '));
      return parts.every(p => hay.includes(p));
    });
    el.innerHTML = `
      <div class="faq-topics-wrap">
        <div class="faq-topics-head">🔎 Навигатор по обучению</div>
        <input id="faqTopicInput" class="faq-topic-search" type="search"
               placeholder="Облигации, налоги, крипта..." autocomplete="off"
               value="${topicQ.replace(/"/g, '&quot;')}">
        <div class="faq-topic-grid">${
          list.length
            ? list.map(t => `
              <div class="faq-topic-card" onclick="openLessonLink(${JSON.stringify(t.url)})">
                <span class="faq-topic-step">${t.step}</span>
                <div class="faq-topic-title">${t.title}</div>
                <div class="faq-topic-desc">${t.desc}</div>
              </div>`).join('')
            : `<div class="faq-empty" style="grid-column:1/-1;padding:20px 0"><b>Тема не найдена</b><p>Попробуйте короткое слово.</p></div>`
        }</div>
      </div>`;
    const inp = $('faqTopicInput');
    if (inp) inp.oninput = e => { topicQ = e.target.value; renderTopics(); };
  }

  // ---- build action buttons ----
  function actHTML(actions) {
    if (!actions || !actions.length) return '';
    return `<div class="faq-card-actions">${actions.map(a =>
      `<button class="faq-act-btn${a.kind === 'secondary' ? ' secondary' : ' primary'}"
               onclick="openLessonLink(${JSON.stringify(a.url)})">${a.label} ↗</button>`
    ).join('')}</div>`;
  }

  // ---- render faq groups ----
  function renderGroups() {
    const el = $('faqGroups');
    const titleEl = $('faqTitle');
    const countEl = $('faqCount');
    if (!el) return;

    let list = FAQ_DATA
      .filter(i => fCat === 'all' || i.category === fCat)
      .map(i => ({ ...i, _sc: scoreItem(i, fQ) }))
      .filter(i => !fQ || i._sc > 0)
      .sort((a, b) => b._sc - a._sc || Number(b.popular) - Number(a.popular)
        || a.question.localeCompare(b.question, 'ru'));
    if (fQ) list = list.slice(0, 12);

    if (countEl) countEl.textContent = `${list.length} ${plural(list.length, 'ответ', 'ответа', 'ответов')}`;
    if (titleEl) titleEl.textContent = fQ ? `По запросу «${fQ}»` : getCatMeta(fCat).label;

    if (!list.length) {
      el.innerHTML = `<div class="faq-empty"><b>Ответ не найден</b>
        <p>Сократите запрос или попробуйте другое слово.</p></div>`;
      return;
    }

    const groups = {};
    list.forEach(i => {
      const key = fQ ? 'results' : i.category;
      (groups[key] || (groups[key] = [])).push(i);
    });

    el.innerHTML = Object.entries(groups).map(([key, items]) => {
      const m = key === 'results' ? { label: 'Найденные ответы', icon: '🔎' } : getCatMeta(key);
      return `<div class="faq-group">
        <div class="faq-group-title">${m.icon} ${m.label}</div>
        ${items.map(i => {
          const cm = getCatMeta(i.category);
          return `<div class="faq-card" id="faqcard-${i.id}">
            <div class="faq-card-header" onclick="window._faqToggle(${JSON.stringify(i.id)})">
              <div class="faq-card-left">
                <span class="faq-card-label">${cm.icon} ${cm.label}</span>
                <div class="faq-card-q">${i.question}</div>
                <div class="faq-card-short">${i.short}</div>
              </div>
              <div class="faq-card-toggle">+</div>
            </div>
            <div class="faq-card-body">
              ${i.body}
              ${actHTML(i.actions)}
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

  // ---- public API (called from onclick attributes) ----
  window._faqToggle = function (id) {
    const card = document.getElementById('faqcard-' + id);
    if (!card) return;
    const wasOpen = card.classList.contains('is-open');
    // close all others in same group
    card.closest('.faq-group')?.querySelectorAll('.faq-card.is-open').forEach(c => {
      if (c !== card) c.classList.remove('is-open');
    });
    card.classList.toggle('is-open', !wasOpen);
    if (window.tg?.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
  };

  window._faqQuery = function (q) {
    const inp = $('faqSearch');
    if (inp) inp.value = q;
    const clr = $('faqClear');
    if (clr) clr.style.display = q ? 'flex' : 'none';
    fQ = q;
    fCat = 'all';
    render();
  };

  window._faqCat = function (cat) {
    fCat = cat;
    render();
  };

  // ---- init ----
  function init() {
    renderQuick();
    render();

    const inp = $('faqSearch');
    const clr = $('faqClear');

    if (inp) {
      inp.addEventListener('input', () => {
        fQ = inp.value;
        if (clr) clr.style.display = fQ.trim() ? 'flex' : 'none';
        render();
      });
    }
    if (clr) {
      clr.addEventListener('click', () => {
        if (inp) inp.value = '';
        fQ = '';
        clr.style.display = 'none';
        render();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
