// === Telegram WebApp init ===
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const user = tg?.initDataUnsafe?.user;
const USER_ID = user?.id || 'demo';
const BOT_USERNAME = 'investic_app_bot';

// === Состояние ===
const STATE = {
  page: 'home',
  pageStack: [],
  activeCategory: null,
  activeItem: null,
  activeFilter: 'Все',
  favorites: JSON.parse(localStorage.getItem('iv_favs') || '[]'),
};

// === Routing ===
function setPage(name, push = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.querySelector(`[data-page="${name}"]`);
  if (target) target.classList.add('active');

  const mainPages = ['home', 'about', 'chats', 'favorites', 'ambassador', 'faq', 'market'];
  if (mainPages.includes(name)) {
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.target === name);
    });
    STATE.pageStack = [];
  } else if (push) {
    STATE.pageStack.push(STATE.page);
  }
  STATE.page = name;

  if (name === 'favorites') renderFavorites();

  window.scrollTo(0, 0);
}

function openPage(name) { setPage(name); }

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => setPage(btn.dataset.target));
});

// === Render: главная сетка категорий ===
function renderCategories() {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;
  grid.innerHTML = DATA.categories.map(c => `
    <div class="cat-tile" onclick="openCategory('${c.id}')">
      <div class="cat-tile-bg" style="background: ${c.gradient};"></div>
      <div class="cat-tile-emoji">${c.icon}</div>
      <div class="cat-tile-count">${c.items.length}</div>
      <div class="cat-tile-title">${c.title}</div>
    </div>
  `).join('');
}

function renderFilters() {
  const cont = document.getElementById('filters');
  if (!cont) return;
  cont.innerHTML = DATA.filters.map(f => `
    <button class="filter-chip ${f === STATE.activeFilter ? 'active' : ''}" onclick="setFilter('${f}')">${f}</button>
  `).join('');
  renderFilteredList();
}

function setFilter(f) {
  STATE.activeFilter = f;
  renderFilters();
}

function renderFilteredList() {
  const list = document.getElementById('filtered-list');
  if (!list) return;
  let items = [];
  DATA.categories.forEach(c => {
    c.items.forEach(i => items.push({ ...i, _cat: c.id, _catTitle: c.title }));
  });
  if (STATE.activeFilter !== 'Все') {
    items = items.filter(i => i.tag === STATE.activeFilter);
  }
  items = items.slice(0, 10);
  if (!items.length) {
    list.innerHTML = `<div class="empty-state" style="padding: 30px;"><p>Ничего не найдено в категории «${STATE.activeFilter}»</p></div>`;
    return;
  }
  list.innerHTML = items.map(i => itemCardHTML(i)).join('');
}

function itemCardHTML(item) {
  const favKey = `${item._cat || STATE.activeCategory}/${item.id}`;
  const isFav = STATE.favorites.includes(favKey);
  return `
    <div class="card" onclick="openItem('${item._cat || STATE.activeCategory}', '${item.id}')">
      <div class="card-ic">${getIconForItem(item)}</div>
      <div class="card-body">
        <div class="card-t">${item.title}</div>
        ${item.duration ? `<div class="card-d">${item.duration}</div>` : ''}
        ${item.tag ? `<div class="card-meta"><span class="card-tag">${item.tag}</span></div>` : ''}
      </div>
      <button class="card-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav('${favKey}', this)">${isFav ? '★' : '☆'}</button>
    </div>
  `;
}

function getIconForItem(item) {
  if (item.tag === 'Курс') return '🎓';
  if (item.tag === 'Регулярно') return '📅';
  if (item.tag === 'Базовый') return '1️⃣';
  if (item.tag === 'Средний') return '2️⃣';
  if (item.tag === 'Продвинутый') return '3️⃣';
  if (item.tag === 'Стратегия') return '🎯';
  if (item.tag === 'Крипта') return '💎';
  if (item.tag === 'Q&A') return '❓';
  if (item.tag === 'Гостевые') return '🎤';
  if (item.tag === 'Шаблон') return '📋';
  if (item.tag === 'Инструмент') return '🧮';
  if (item.tag === 'Гайд') return '📖';
  if (item.tag === 'Чат' || item.tag === 'Чаты') return '💬';
  if (item.tag === 'Офлайн') return '🌍';
  if (item.tag === 'Подборки') return '📚';
  return '📌';
}

// === Категория ===
function openCategory(id) {
  const cat = DATA.categories.find(c => c.id === id);
  if (!cat) return;
  localStorage.setItem('iv_last_cat', id);
  STATE.activeCategory = id;
  const cont = document.getElementById('category-content');
  cont.innerHTML = `
    <div class="cat-header" style="background: ${cat.gradient};">
      <div class="cat-header-emoji">${cat.icon}</div>
      <div class="cat-header-title">${cat.title}</div>
      <div class="cat-header-sub">${cat.subtitle} · ${cat.items.length} материалов</div>
    </div>
    ${cat.items.map(i => itemCardHTML(i)).join('')}
  `;
  setPage('category');
}

// === Материал ===
function openItem(catId, itemId) {
  const cat = DATA.categories.find(c => c.id === catId);
  if (!cat) return;
  const item = cat.items.find(i => i.id === itemId);
  if (!item) return;
  STATE.activeItem = { catId, itemId };
  const favKey = `${catId}/${itemId}`;
  const isFav = STATE.favorites.includes(favKey);
  const cont = document.getElementById('item-content');
  const hasLessons = item.lessons && item.lessons.length > 0;
  const lessonsHTML = hasLessons
    ? `<h3 class="section-title" style="margin-top: 4px;">Уроки темы (${item.lessons.length})</h3>
       <ul class="cards">
         ${item.lessons.map((l, i) => `
           <li class="card" onclick="openLessonLink('${l.url.replace(/'/g, "\\'")}')">
             <div class="card-ic-circle">${i + 1}</div>
             <div class="card-body">
               <div class="card-t">${l.title}</div>
               <div class="card-d">Открыть на платформе клуба</div>
             </div>
             <div class="card-arr">›</div>
           </li>
         `).join('')}
       </ul>`
    : `<button class="watch-btn" onclick="noLink()">▶ Откроется скоро</button>`;
  cont.innerHTML = `
    <div class="cat-header" style="background: ${cat.gradient}; min-height: 200px;">
      <div class="cat-header-emoji">${cat.icon}</div>
      <div class="cat-header-title">${item.title}</div>
      ${item.subtitle ? `<div class="cat-header-sub">${item.subtitle}</div>` : ''}
      <button class="card-fav ${isFav ? 'active' : ''}" style="top: 18px; right: 18px; font-size: 26px;" onclick="toggleFav('${favKey}', this)">${isFav ? '★' : '☆'}</button>
    </div>
    <div class="item-card-full">
      <div class="meta">
        ${item.tag ? `<span class="card-tag">${item.tag}</span>` : ''}
      </div>
      <p>${item.desc}</p>
    </div>
    ${lessonsHTML}
  `;
  document.getElementById('item-back').onclick = () => openCategory(catId);
  setPage('item');
}

// === Избранное ===
function toggleFav(key, btn) {
  const idx = STATE.favorites.indexOf(key);
  if (idx >= 0) {
    STATE.favorites.splice(idx, 1);
    btn.classList.remove('active');
    btn.textContent = '☆';
  } else {
    STATE.favorites.push(key);
    btn.classList.add('active');
    btn.textContent = '★';
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  }
  localStorage.setItem('iv_favs', JSON.stringify(STATE.favorites));
}

function renderFavorites() {
  if (typeof FAV !== 'undefined') { FAV.renderScreen(); return; }
  // legacy fallback (no-op if favorites.js not loaded)
}

// === Referral ===
const refLink = `https://t.me/${BOT_USERNAME}?start=ambassador_${USER_ID}`;
function setRefLinks() {
  const a = document.getElementById('ref-link');
  const b = document.getElementById('ref-link-mini');
  if (a) a.textContent = refLink;
  if (b) b.textContent = refLink;
}

function copyRef() {
  navigator.clipboard.writeText(refLink).then(() => {
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showToast('Ссылка скопирована');
  });
}

function shareRef() {
  const text = encodeURIComponent('Присоединяйся к ИнвестКлубу');
  const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank');
}

function becomeAmbassador() {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
  showToast('Заявка отправлена администратору');
}

function submitComplaint() {
  const ta = document.querySelector('.form-textarea');
  if (!ta.value.trim()) { showToast('Опиши ситуацию'); return; }
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showToast('Жалоба отправлена, разберёмся');
  ta.value = '';
}

function openLessonLink(url) {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  if (tg?.openLink) tg.openLink(url);
  else window.open(url, '_blank');
}

function noLink() {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  showToast('Скоро будет доступно');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.85); color: white; padding: 12px 18px;
    border-radius: 8px; font-size: 14px; z-index: 1000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4); animation: fadeIn .2s;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// === Поиск ===
const SEARCH_INPUT = document.getElementById('search-input');
const SEARCH_RESULTS = document.getElementById('search-results');
const HOME_DEFAULT = document.getElementById('home-default');

function normalizeQ(s) {
  return s.toLowerCase().replace(/ё/g, 'е');
}

function runSearch(raw) {
  const q = normalizeQ(raw.trim());
  if (!q) { exitSearch(); return; }
  HOME_DEFAULT.style.display = 'none';
  SEARCH_RESULTS.style.display = 'block';
  let items = [];
  DATA.categories.forEach(c => {
    const catHay = normalizeQ([c.title, c.subtitle || ''].join(' '));
    c.items.forEach(i => {
      const hay = normalizeQ([i.title, i.desc || '', i.tag || '', catHay].join(' '));
      if (hay.includes(q)) items.push({ ...i, _cat: c.id, _catTitle: c.title });
    });
  });
  if (!items.length) {
    SEARCH_RESULTS.innerHTML = '<div class="empty-state" style="padding:30px 0;"><p>Ничего не найдено. Попробуйте изменить запрос.</p></div>';
    return;
  }
  SEARCH_RESULTS.innerHTML = items.map(i => itemCardHTML(i)).join('');
}

function exitSearch() {
  SEARCH_INPUT.value = '';
  updateSearchClear();
  HOME_DEFAULT.style.display = '';
  SEARCH_RESULTS.style.display = 'none';
  SEARCH_RESULTS.innerHTML = '';
}

function updateSearchClear() {
  const btn = document.getElementById('search-clear');
  if (btn) btn.style.display = SEARCH_INPUT.value ? 'flex' : 'none';
}

SEARCH_INPUT.addEventListener('input', e => {
  updateSearchClear();
  runSearch(e.target.value);
});

SEARCH_INPUT.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    SEARCH_INPUT.blur();
    runSearch(SEARCH_INPUT.value);
  }
});

document.getElementById('search-icon-btn').addEventListener('click', () => {
  if (SEARCH_INPUT.value.trim()) {
    runSearch(SEARCH_INPUT.value);
  } else {
    SEARCH_INPUT.focus();
  }
});

document.getElementById('search-clear').addEventListener('click', exitSearch);

// === Карточка обучения ===
const BOOK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M232,56V200H160a32,32,0,0,0-32,32,32,32,0,0,0-32-32H24V56H96a32,32,0,0,1,32,32,32,32,0,0,1,32-32Z" opacity="0.2"/><path d="M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64Z"/></svg>';

function renderLearningCard() {
  const el = document.getElementById('learning-card');
  if (!el) return;
  const lastCatId = localStorage.getItem('iv_last_cat');
  const lastCat = lastCatId ? DATA.categories.find(c => c.id === lastCatId) : null;
  const defaultCat = DATA.categories[0];
  const cat = lastCat || defaultCat;
  const label = lastCat ? 'Продолжить обучение' : 'Начните обучение';
  const btnText = lastCat ? 'Продолжить' : 'Открыть ступень 1';
  el.innerHTML = `
    <div class="learning-card-top">
      <div class="learning-card-icon">${BOOK_ICON}</div>
      <div class="learning-card-body">
        <div class="learning-card-label">${label}</div>
        <div class="learning-card-title">${cat.title}</div>
        <div class="learning-card-desc">${cat.subtitle}</div>
      </div>
    </div>
    <button class="learning-card-btn" onclick="openCategory('${cat.id}')">${btnText}</button>
  `;
}

// === Theme ===
var _SUN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="20" height="20"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>';
var _MOON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="20" height="20"><path d="M227.89,147.89A96,96,0,1,1,108.11,28.11,96.09,96.09,0,0,1,227.89,147.89Z" opacity="0.2"/><path d="M235.54,150.21a104.84,104.84,0,0,1-37,52.91A104,104,0,0,1,32,120,103.09,103.09,0,0,1,52.68,57.66a104.84,104.84,0,0,1,52.91-37,8,8,0,0,1,9.55,10.14,88.07,88.07,0,0,0,109.06,109.06,8,8,0,0,1,10.14,9.55Z"/></svg>';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('hdrTheme');
  if (btn) btn.innerHTML = t === 'light' ? _MOON : _SUN;
  localStorage.setItem('iv_theme', t);
  const col = t === 'light' ? '#F2F6F3' : '#101311';
  if (tg) { try { tg.setHeaderColor(col); tg.setBackgroundColor(col); } catch(e) {} }
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem('iv_theme') || 'light';
  applyTheme(saved);
  const btn = document.getElementById('hdrTheme');
  if (btn) btn.addEventListener('click', toggleTheme);
}

// === Init ===
setRefLinks();
initTheme();
