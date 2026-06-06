// === Telegram WebApp init ===
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0e1a17');
  tg.setBackgroundColor('#0e1a17');
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

  const mainPages = ['home', 'about', 'chats', 'favorites', 'ambassador'];
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
  cont.innerHTML = `
    <div class="cat-header" style="background: ${cat.gradient}; min-height: 200px;">
      <div class="cat-header-emoji">${cat.icon}</div>
      <div class="cat-header-title">${item.title}</div>
      ${item.subtitle ? `<div class="cat-header-sub">${item.subtitle}</div>` : ''}
      <button class="card-fav ${isFav ? 'active' : ''}" style="top: 18px; right: 18px; font-size: 26px;" onclick="toggleFav('${favKey}', this)">${isFav ? '★' : '☆'}</button>
    </div>
    <div class="item-card-full">
      <div class="meta">
        ${item.duration ? `<span>⏱ ${item.duration}</span>` : ''}
        ${item.tag ? `<span class="card-tag">${item.tag}</span>` : ''}
      </div>
      <p>${item.desc}</p>
      <button class="watch-btn" onclick="noLink()">▶ Подробнее в клубе</button>
    </div>
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
  const list = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');
  if (!STATE.favorites.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  const items = STATE.favorites.map(key => {
    const [catId, itemId] = key.split('/');
    const cat = DATA.categories.find(c => c.id === catId);
    if (!cat) return '';
    const item = cat.items.find(i => i.id === itemId);
    if (!item) return '';
    return itemCardHTML({ ...item, _cat: catId });
  }).filter(Boolean).join('');
  list.innerHTML = items;
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
document.getElementById('search-input').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  const list = document.getElementById('filtered-list');
  if (!q) { renderFilteredList(); return; }
  let items = [];
  DATA.categories.forEach(c => {
    c.items.forEach(i => {
      if (i.title.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q)) {
        items.push({ ...i, _cat: c.id });
      }
    });
  });
  if (!items.length) {
    list.innerHTML = `<div class="empty-state" style="padding: 30px;"><p>Ничего не найдено по запросу «${q}»</p></div>`;
    return;
  }
  list.innerHTML = items.map(i => itemCardHTML(i)).join('');
});

// === Init ===
setRefLinks();
renderCategories();
renderFilters();
