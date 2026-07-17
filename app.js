// ============================================================
// Sugar Free — app.js
// ============================================================

const STORAGE_KEY = 'sugarfree_v1';

// ── Sprite sheet configuration ────────────────────────────────
// Adjust these numbers after saving sprites.png to match the
// actual pixel dimensions of your sprite sheet.
const SPRITE = {
  frameW: 153,   // px — width of ONE animation frame  (1376 / 9 frames ≈ 153)
  frameH: 128,   // px — height of the character area (below label)
  labelH: 25,    // px — height of the label text row above each sprite row
  rowH:   154,   // px — total row height  (768 / 5 rows ≈ 154)
  groupW: 458,   // px — width of one 3-frame group  (1376 / 3 groups ≈ 458)
};

// ── Avatar definitions ────────────────────────────────────────
// row/col reference the position in the sprite sheet grid
//   col: 0 = left group, 1 = center group, 2 = right group
//   row: 0 = top, 4 = bottom
const AVATARS = [
  { name: 'Sugar Sprout',  days: 1,   row: 4, col: 0, speed: '0.9s',  desc: 'Just getting started!' },
  { name: 'Week Warrior',  days: 7,   row: 0, col: 0, speed: '0.55s', desc: '7 days sugar free!' },
  { name: 'Broccoli Boss', days: 14,  row: 1, col: 1, speed: '0.8s',  desc: 'Two strong weeks!' },
  { name: 'Zen Master',    days: 30,  row: 1, col: 2, speed: '1.2s',  desc: 'A whole month!' },
  { name: 'Bookworm',      days: 100, row: 3, col: 2, speed: '1.0s',  desc: '100 days — incredible!' },
  { name: 'Year Legend',   days: 365, row: 4, col: 2, speed: '0.65s', desc: 'A full year. Legendary!' },
];

// ── Storage ──────────────────────────────────────────────────

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { checkins: {}, settings: {}, ...parsed };
  } catch {
    return { checkins: {}, settings: {} };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Date Utilities ────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function subtractDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function makeDateKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// ── Streak Calculation ────────────────────────────────────────

function computeStreak(checkins) {
  const t = todayStr();
  // Start from today if checked in, otherwise from yesterday
  let date = checkins[t] === true ? t : subtractDay(t);
  let count = 0;
  while (checkins[date] === true) {
    count++;
    date = subtractDay(date);
    if (count > 3000) break; // safety
  }
  return count;
}

// ── Avatar Logic ──────────────────────────────────────────────

function getCurrentAvatar(streak) {
  let result = null;
  for (const a of AVATARS) {
    if (streak >= a.days) result = a;
  }
  return result;
}

function getProgressInfo(streak) {
  for (let i = 0; i < AVATARS.length; i++) {
    if (streak < AVATARS[i].days) {
      const prevDays = i > 0 ? AVATARS[i - 1].days : 0;
      const range    = AVATARS[i].days - prevDays;
      const pct      = Math.max(0, ((streak - prevDays) / range) * 100);
      return { next: AVATARS[i], pct, remaining: AVATARS[i].days - streak };
    }
  }
  return null;
}

// ── Sprite helpers ────────────────────────────────────────────

// Returns { sx, sy } background-position values for an avatar
function spritePos(avatar) {
  return {
    sx: -(avatar.col * SPRITE.groupW),
    sy: -(avatar.row * SPRITE.rowH + SPRITE.labelH),
  };
}

// Apply sprite sheet position + animation speed to any .sprite-frame element
function applySpriteEl(el, avatar) {
  const { sx, sy } = spritePos(avatar);
  el.style.setProperty('--sx', sx + 'px');
  el.style.backgroundPositionY = sy + 'px';
  el.style.setProperty('--speed', avatar.speed || '0.8s');
  el.style.opacity = '1';
}

// Build the innerHTML for an avatar card (unlocked)
function spriteCardHTML(avatar) {
  const { sx, sy } = spritePos(avatar);
  return `<div class="sprite-frame" style="--sx:${sx}px; background-position-y:${sy}px; --speed:${avatar.speed || '0.8s'};"></div>`;
}

// ── Screen Navigation ─────────────────────────────────────────

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });

  if (name === 'home')     updateHomeScreen();
  if (name === 'calendar') renderCalendar();
  if (name === 'avatars')  renderAvatars();
  if (name === 'settings') loadSettingsScreen();
}

// ── Home Screen ───────────────────────────────────────────────

function updateHomeScreen() {
  const data    = loadData();
  const streak  = computeStreak(data.checkins);
  const checked = data.checkins[todayStr()] === true;
  const avatar  = getCurrentAvatar(streak);
  const info    = getProgressInfo(streak);

  // Avatar display
  const emojiEl = document.getElementById('current-avatar');
  const nameEl  = document.getElementById('avatar-name');
  emojiEl.className = 'sprite-frame';
  if (avatar) {
    applySpriteEl(emojiEl, avatar);
    nameEl.textContent = avatar.name;
  } else {
    // No avatar yet — show first avatar dimmed as a teaser
    const { sx, sy } = spritePos(AVATARS[0]);
    emojiEl.style.setProperty('--sx', sx + 'px');
    emojiEl.style.backgroundPositionY = sy + 'px';
    emojiEl.style.setProperty('--speed', '99s'); // effectively paused
    emojiEl.style.opacity = '0.15';
    nameEl.textContent = 'Check in to unlock!';
  }

  // Streak counter
  document.getElementById('streak-count').textContent = streak;

  // Progress bar
  const fill  = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  if (streak === 0) {
    fill.style.width  = '0%';
    label.textContent = 'Check in today to start your streak!';
  } else if (info) {
    fill.style.width  = info.pct + '%';
    const d = info.remaining;
    label.textContent = `${d} more day${d !== 1 ? 's' : ''} to unlock ${info.next.emoji} ${info.next.name}`;
  } else {
    fill.style.width  = '100%';
    label.textContent = '🏆 All avatars unlocked — you\'re legendary!';
  }

  // Check-in button + status
  const btn    = document.getElementById('checkin-btn');
  const status = document.getElementById('checkin-status');
  if (checked) {
    btn.disabled      = true;
    btn.textContent   = '✅ Done for today!';
    btn.classList.add('done');
    status.textContent = 'Come back tomorrow to keep your streak going!';
    status.className   = 'checkin-status success';
  } else {
    btn.disabled      = false;
    btn.textContent   = '✓ I\'m Sugar Free Today!';
    btn.classList.remove('done');
    if (streak > 0) {
      status.textContent = `Don't break your ${streak}-day streak! 💪`;
      status.className   = 'checkin-status warning';
    } else {
      status.textContent = 'Tap to start your streak!';
      status.className   = 'checkin-status';
    }
  }
}

// ── Check-in ──────────────────────────────────────────────────

function doCheckin() {
  const data  = loadData();
  const today = todayStr();
  if (data.checkins[today]) return;

  const streakBefore = computeStreak(data.checkins);
  data.checkins[today] = true;
  saveData(data);
  const streakAfter = computeStreak(data.checkins);

  // Check for new avatar unlock
  const before = getCurrentAvatar(streakBefore);
  const after  = getCurrentAvatar(streakAfter);
  if (after && (!before || after.days > before.days)) {
    showUnlockCelebration(after);
  }

  if ('vibrate' in navigator) navigator.vibrate(200);
  updateHomeScreen();
}

function showUnlockCelebration(avatar) {
  const { sx, sy } = spritePos(avatar);
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.innerHTML = `
    <div class="celebration-content">
      <div class="sprite-wrap-xl">
        <div class="sprite-frame" style="--sx:${sx}px; background-position-y:${sy}px; --speed:${avatar.speed || '0.8s'};"></div>
      </div>
      <h2>New Avatar Unlocked!</h2>
      <h3>${avatar.name}</h3>
      <p>${avatar.desc}</p>
      <p style="margin-top:12px;font-size:11px;opacity:0.5">Tap to dismiss</p>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', () => overlay.remove());
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 5000);
}

// ── Calendar ──────────────────────────────────────────────────

function renderCalendar() {
  const data      = loadData();
  const container = document.getElementById('calendar-container');
  container.innerHTML = '';

  const now = new Date();
  for (let offset = 0; offset <= 2; offset++) {
    const year  = now.getFullYear();
    const month = now.getMonth() - offset;
    // new Date handles month underflow automatically
    const d = new Date(year, month, 1);
    container.appendChild(buildMonth(d.getFullYear(), d.getMonth(), data.checkins));
  }
}

function buildMonth(year, month, checkins) {
  const label       = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow    = new Date(year, month, 1).getDay(); // 0 = Sunday
  const todayKey    = todayStr();

  const wrap = document.createElement('div');
  wrap.className = 'cal-month';
  wrap.innerHTML = `
    <h3 class="cal-title">${label}</h3>
    <div class="cal-dow">
      <span>Su</span><span>Mo</span><span>Tu</span>
      <span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
    </div>
    <div class="cal-grid"></div>
  `;

  const grid = wrap.querySelector('.cal-grid');

  // Empty cells before first day of month
  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key      = makeDateKey(year, month, day);
    const isToday  = key === todayKey;
    const checked  = checkins[key] === true;
    const isFuture = key > todayKey;

    const cell = document.createElement('div');
    let cls = 'cal-day';
    if (checked)  cls += ' checked';
    if (isToday)  cls += ' today';
    if (isFuture) cls += ' future';
    cell.className   = cls;
    cell.textContent = day;
    grid.appendChild(cell);
  }

  return wrap;
}

// ── Avatars / Rewards ─────────────────────────────────────────

function renderAvatars() {
  const data   = loadData();
  const streak = computeStreak(data.checkins);
  const cur    = getCurrentAvatar(streak);
  const grid   = document.getElementById('avatars-grid');
  grid.innerHTML = '';

  for (const a of AVATARS) {
    const unlocked = streak >= a.days;
    const isCurrent = cur && cur.days === a.days;

    const card = document.createElement('div');
    card.className = 'avatar-card' +
      (unlocked  ? ' unlocked' : ' locked') +
      (isCurrent ? ' current'  : '');

    if (unlocked) {
      card.innerHTML = `
        <div class="avatar-card-inner">
          <div class="sprite-wrap-sm">
            ${spriteCardHTML(a)}
          </div>
        </div>
        <div class="avatar-card-name">${a.name}</div>
        <div class="avatar-card-days">${a.days} day${a.days !== 1 ? 's' : ''}</div>
        <div class="avatar-card-desc">${a.desc}</div>
      `;
    } else {
      card.innerHTML = `
        <div class="avatar-card-inner">
          <span class="sprite-locked-icon">🔒</span>
        </div>
        <div class="avatar-card-name">${a.name}</div>
        <div class="avatar-card-days">${a.days} day${a.days !== 1 ? 's' : ''}</div>
        <div class="avatar-card-desc">???</div>
      `;
    }
    grid.appendChild(card);

// ── Settings ──────────────────────────────────────────────────

function loadSettingsScreen() {
  const data = loadData();
  const input = document.getElementById('pat-input');
  input.value = data.settings?.githubPAT || '';
  document.getElementById('backup-status').textContent = '';
  document.getElementById('backup-status').className = 'backup-status';
}

function resetData() {
  if (!confirm('This will permanently delete all your streak data. Are you sure?')) return;
  localStorage.removeItem(STORAGE_KEY);
  showScreen('home');
}

// ── Service Worker Registration ───────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ── Init ──────────────────────────────────────────────────────
updateHomeScreen();
