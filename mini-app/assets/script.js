// === Telegram WebApp init ===
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0e1a17');
  tg.setBackgroundColor('#0e1a17');
}

// === User context ===
const user = tg?.initDataUnsafe?.user;
const USER_ID = user?.id || 'demo';
const BOT_USERNAME = 'investic_app_bot';

// === Routing ===
function setPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.querySelector(`[data-page="${name}"]`);
  if (target) target.classList.add('active');
  // Обновить активную кнопку нав (только для основных вкладок)
  const mainPages = ['home', 'about', 'chats', 'favorites', 'ambassador'];
  if (mainPages.includes(name)) {
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.target === name);
    });
  }
  window.scrollTo(0, 0);
}

function openPage(name) { setPage(name); }

// === Nav handlers ===
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => setPage(btn.dataset.target));
});

// === Placeholder for disabled links ===
function noLink() {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  showToast('Скоро будет доступно');
}

// === Open external link ===
function openLink(url) {
  if (tg?.openTelegramLink && url.startsWith('https://t.me/')) {
    tg.openTelegramLink(url);
  } else if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

// === Referral ===
const refLink = `https://t.me/${BOT_USERNAME}?start=ambassador_${USER_ID}`;
document.getElementById('ref-link').textContent = refLink;

function copyRef() {
  navigator.clipboard.writeText(refLink).then(() => {
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showToast('Ссылка скопирована');
  });
}

function shareRef() {
  const text = encodeURIComponent('Присоединяйся к ИнвестКлубу — закрытому сообществу частных инвесторов');
  const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`;
  openLink(url);
}

function becomeAmbassador() {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
  showToast('Заявка отправлена администратору');
}

function submitComplaint() {
  const ta = document.querySelector('.form-textarea');
  if (!ta.value.trim()) {
    showToast('Опиши ситуацию');
    return;
  }
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showToast('Жалоба отправлена, разберёмся');
  ta.value = '';
}

// === Toast ===
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

// Init: показать главную
setPage('home');
