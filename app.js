// ============================================================
// Sugar Free — app.js  v2
// ============================================================

const STORAGE_KEY = 'sugarfree_v2';

// ── Sprite config ─────────────────────────────────────────────
const SPRITE = { frameW:153, frameH:128, labelH:25, rowH:154, groupW:458 };

// ── Character definitions ─────────────────────────────────────
// earnAt: streak day earned.  -1 = special (broken streak reward)
const CHARACTER_DEFS = {
  sprout:   { name:'Sugar Sprout',  earnAt:1,   src:'sprites.png', frames:3, row:4, col:0, shinyAt:7,   speed:'0.9s',  desc:'Your first step to freedom!' },
  jumprope: { name:'Week Warrior',  earnAt:7,   customSrc:'avatar-jumprope.png', frames:7,              shinyAt:28,  speed:'1.0s',  desc:'7 days sugar free!' },
  broccoli: { name:'Broccoli Boss', earnAt:14,  src:'sprites.png', frames:3, row:1, col:1, shinyAt:28,  speed:'0.8s',  desc:'Two strong weeks!' },
  zen:      { name:'Zen Master',    earnAt:30,  src:'sprites.png', frames:3, row:1, col:2, shinyAt:42,  speed:'1.2s',  desc:'A whole month!' },
  bookworm: { name:'Bookworm',      earnAt:100, src:'sprites.png', frames:3, row:3, col:2, shinyAt:60,  speed:'1.0s',  desc:'100 days — incredible!' },
  legend:   { name:'Year Legend',   earnAt:365, src:'sprites.png', frames:3, row:4, col:2, shinyAt:100, speed:'0.65s', desc:'A full year. Legendary!' },
  crash:    { name:'Sugar Crash',   earnAt:-1,  src:'sprites.png', frames:3, row:2, col:2, shinyAt:14,  speed:'2.5s',  desc:'Even crashes can shine…',
               filter:'grayscale(0.85) hue-rotate(195deg) brightness(0.7)' },
};

const MILESTONES = Object.entries(CHARACTER_DEFS)
  .filter(([,d]) => d.earnAt > 0)
  .map(([key,d]) => ({ key, ...d }))
  .sort((a,b) => a.earnAt - b.earnAt);

// ── Data ──────────────────────────────────────────────────────

function freshData() {
  return {
    version:2,
    checkins:{},      // "YYYY-MM-DD": "clean"|"cheat"|"fasted"
    streak:{ current:0, longest:0, cheatBalance:0, cheatMilestonesEarned:0 },
    characters:{},    // id → { defKey, ownStreak, isShiny }
    activeCharId:null,
    ui:{ brokenAckedDate:null },
    settings:{},
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem('sugarfree_v1');
      return old ? migrateV1(JSON.parse(old)) : freshData();
    }
    const d = JSON.parse(raw);
    return d.version === 2 ? { ...freshData(), ...d } : freshData();
  } catch { return freshData(); }
}

function migrateV1(old) {
  const d = freshData();
  d.settings = old.settings || {};
  for (const [date,val] of Object.entries(old.checkins || {})) {
    if (val === true) d.checkins[date] = 'clean';
  }
  const streak = computeStreakRaw(d.checkins);
  d.streak.current = streak;
  d.streak.longest = streak;
  for (const [key,def] of Object.entries(CHARACTER_DEFS)) {
    if (def.earnAt > 0 && streak >= def.earnAt) {
      const id = addCharacter(d, key);
      d.activeCharId = id;
    }
  }
  return d;
}

function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ── Date utilities ────────────────────────────────────────────

const DEV_KEY = 'sugarfree_devoffset';

function todayStr() {
  const d = new Date();
  const offset = parseInt(localStorage.getItem(DEV_KEY) || '0', 10);
  if (offset) d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function advanceDevDay() {
  const n = parseInt(localStorage.getItem(DEV_KEY) || '0', 10);
  localStorage.setItem(DEV_KEY, String(n + 1));
  loadSettingsScreen();
}

function resetDevDate() {
  localStorage.removeItem(DEV_KEY);
  loadSettingsScreen();
}
function pad(n) { return String(n).padStart(2,'0'); }
function subtractDay(s) {
  const [y,m,d] = s.split('-').map(Number);
  const dt = new Date(y,m-1,d); dt.setDate(dt.getDate()-1);
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}
function makeDateKey(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function daysBetween(a,b) {
  return Math.round((new Date(b+'T12:00:00') - new Date(a+'T12:00:00')) / 86400000);
}

// ── Streak logic ──────────────────────────────────────────────

function isSuccessDay(s) { return s==='clean' || s==='cheat' || s==='fasted'; }

function computeStreakRaw(checkins) {
  const t = todayStr();
  let date = isSuccessDay(checkins[t]) ? t : subtractDay(t);
  let n = 0;
  while (isSuccessDay(checkins[date])) { n++; date = subtractDay(date); if(n>3000)break; }
  return n;
}

function lastSuccessDate(checkins) {
  const t = todayStr();
  return Object.keys(checkins).filter(d => d<=t && isSuccessDay(checkins[d])).sort().pop() || null;
}

// Returns { type: 'new'|'pending'|'checked-in'|'broken', canFast? }
function streakState(data) {
  const c = data.checkins, t = todayStr(), y = subtractDay(t);
  if (isSuccessDay(c[t]))       return { type:'checked-in' };
  if (isSuccessDay(c[y]))       return { type:'pending' };
  if (computeStreakRaw(c) > 0)  return { type:'pending' };
  const last = lastSuccessDate(c);
  if (!last)                    return { type:'new' };
  return { type:'broken', canFast: daysBetween(last,t) === 2 };
}

function shouldShowBroken(data) {
  const s = streakState(data);
  return s.type === 'broken' && data.ui?.brokenAckedDate !== todayStr();
}

// ── Cheat days ────────────────────────────────────────────────

function applyCheatMilestones(data, newStreak) {
  const expected = Math.floor(newStreak / 14);
  const already  = data.streak.cheatMilestonesEarned || 0;
  if (expected > already) {
    const earned = expected - already;
    data.streak.cheatBalance = (data.streak.cheatBalance || 0) + earned;
    data.streak.cheatMilestonesEarned = expected;
    return earned;
  }
  return 0;
}

// ── Character management ──────────────────────────────────────

function addCharacter(data, defKey) {
  const id = defKey + '-' + Date.now();
  data.characters[id] = { defKey, ownStreak:0, isShiny:false };
  if (!data.activeCharId) data.activeCharId = id;
  return id;
}

function getActiveDef(data) {
  const ch = data.characters[data.activeCharId];
  return ch ? CHARACTER_DEFS[ch.defKey] : null;
}

function getActiveChar(data) { return data.characters[data.activeCharId] || null; }

function checkMilestones(data, prev, next) {
  const newChars = [];
  for (const [key,def] of Object.entries(CHARACTER_DEFS)) {
    if (def.earnAt <= 0) continue;
    if (prev < def.earnAt && next >= def.earnAt) {
      if (!Object.values(data.characters).some(c => c.defKey === key)) {
        newChars.push({ defKey:key, id: addCharacter(data,key) });
      }
    }
  }
  return newChars;
}

// Increment own-streak for every earned character
function tickCharacters(data) {
  for (const ch of Object.values(data.characters)) {
    if (!ch.isShiny) {
      ch.ownStreak = (ch.ownStreak||0) + 1;
      const def = CHARACTER_DEFS[ch.defKey];
      if (def && ch.ownStreak >= def.shinyAt) ch.isShiny = true;
    }
  }
}

// Reset own-streak for non-shiny characters on streak break
function resetCharacters(data) {
  for (const ch of Object.values(data.characters)) {
    if (!ch.isShiny) ch.ownStreak = 0;
  }
}

// ── Sprite helpers ────────────────────────────────────────────

function spritePos(def) {
  return { sx:-(def.col*SPRITE.groupW), sy:-(def.row*SPRITE.rowH+SPRITE.labelH) };
}

function applySpriteEl(el, def) {
  if (def.customSrc) {
    el.style.setProperty('--sprite-img', `url('${def.customSrc}')`);
    el.style.setProperty('--sprite-group-w', (SPRITE.frameW*def.frames)+'px');
    el.style.setProperty('--sx','0px');
    el.style.backgroundPositionY = '0px';
  } else {
    const {sx,sy} = spritePos(def);
    el.style.setProperty('--sprite-img', `url('sprites.png')`);
    el.style.setProperty('--sprite-group-w', SPRITE.groupW+'px');
    el.style.setProperty('--sx', sx+'px');
    el.style.backgroundPositionY = sy+'px';
  }
  el.style.setProperty('--speed', def.speed||'0.8s');
  el.style.filter = def.filter||'';
  el.style.opacity = '1';
}

function spriteCardHTML(def) {
  const style = def.customSrc
    ? `--sprite-img:url('${def.customSrc}'); --sprite-group-w:${SPRITE.frameW*def.frames}px; --sx:0px; --speed:${def.speed||'0.8s'};`
    : `--sx:${-(def.col*SPRITE.groupW)}px; background-position-y:${-(def.row*SPRITE.rowH+SPRITE.labelH)}px; --speed:${def.speed||'0.8s'};`;
  return `<div class="sprite-frame" style="${style}${def.filter?' filter:'+def.filter+';':''}"></div>`;
}

// ── Screen navigation ─────────────────────────────────────────

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.screen === name));
  if (name==='home')     updateHomeScreen();
  if (name==='deck')     renderDeck();
  if (name==='calendar') renderCalendar();
  if (name==='settings') loadSettingsScreen();
}

// ── Home screen ───────────────────────────────────────────────

function updateHomeScreen() {
  const data = loadData();

  if (shouldShowBroken(data)) {
    const s = streakState(data);
    showBrokenScreen(s.canFast);
    return;
  }

  const streak   = computeStreakRaw(data.checkins);
  const checked  = isSuccessDay(data.checkins[todayStr()]);
  const def      = getActiveDef(data);
  const ch       = getActiveChar(data);
  const cheatBal = data.streak?.cheatBalance || 0;

  // Character + name + own-streak bar
  const sprEl = document.getElementById('current-avatar');
  const nmEl  = document.getElementById('avatar-name');
  const ownEl = document.getElementById('own-streak');

  if (def) {
    sprEl.className = 'sprite-frame' + (ch?.isShiny ? ' shiny' : '');
    applySpriteEl(sprEl, def);
    if (ch?.isShiny) sprEl.style.filter = (def.filter||'') + ' drop-shadow(0 0 8px gold)';
    nmEl.textContent = def.name + (ch?.isShiny ? ' ✨' : '');
    if (ch) {
      const own = ch.ownStreak||0;
      if (ch.isShiny) {
        ownEl.innerHTML = '<span class="own-shiny">✨ Shiny!</span>';
      } else {
        const pct  = Math.min(100,(own/def.shinyAt)*100);
        const left = def.shinyAt - own;
        ownEl.innerHTML = `<div class="own-progress-bar"><div class="own-progress-fill" style="width:${pct}%"></div></div><span>${left} day${left!==1?'s':''} to ✨ shine</span>`;
      }
    }
  } else {
    sprEl.className = 'sprite-frame';
    applySpriteEl(sprEl, CHARACTER_DEFS.sprout);
    sprEl.style.opacity = '0.15';
    sprEl.style.setProperty('--speed','99s');
    nmEl.textContent = 'Check in to unlock!';
    ownEl.textContent = '';
  }

  document.getElementById('streak-count').textContent = streak;

  // Next milestone progress
  const fill   = document.getElementById('progress-fill');
  const lbl    = document.getElementById('progress-label');
  const earned = new Set(Object.values(data.characters).map(c => c.defKey));
  const nextM  = MILESTONES.find(m => !earned.has(m.key));

  if (!nextM) {
    fill.style.width = '100%';
    lbl.textContent  = '🏆 All characters unlocked!';
  } else if (streak === 0) {
    fill.style.width = '0%';
    lbl.textContent  = 'Check in today to start your streak!';
  } else {
    const prevM    = [...MILESTONES].reverse().find(m => earned.has(m.key));
    const prevDays = prevM ? prevM.earnAt : 0;
    const pct      = Math.max(0,Math.min(100,((streak-prevDays)/(nextM.earnAt-prevDays))*100));
    fill.style.width = pct + '%';
    const left = nextM.earnAt - streak;
    lbl.textContent = `${left} more day${left!==1?'s':''} to unlock ${nextM.name}`;
  }

  // Cheat day
  const badge   = document.getElementById('cheat-badge');
  const cheatBt = document.getElementById('cheat-btn');
  if (cheatBal > 0 && !checked) {
    badge.textContent   = `🍀 ${cheatBal} cheat day${cheatBal>1?'s':''} available`;
    badge.style.display = 'block';
    if (cheatBt) cheatBt.style.display = 'block';
  } else {
    badge.style.display = 'none';
    if (cheatBt) cheatBt.style.display = 'none';
  }

  // Check-in button
  const btn = document.getElementById('checkin-btn');
  const sts = document.getElementById('checkin-status');
  if (checked) {
    btn.disabled=true; btn.textContent='✅ Done for today!'; btn.classList.add('done');
    sts.textContent='Come back tomorrow to keep your streak going!';
    sts.className='checkin-status success';
  } else {
    btn.disabled=false; btn.textContent="✓ I'm Sugar Free Today!"; btn.classList.remove('done');
    sts.textContent = streak>0 ? `Don't break your ${streak}-day streak! 💪` : 'Tap to start your streak!';
    sts.className = streak>0 ? 'checkin-status warning' : 'checkin-status';
  }
}

// ── Check-in ──────────────────────────────────────────────────

function doCheckin() {
  const data = loadData(), today = todayStr();
  if (isSuccessDay(data.checkins[today])) return;
  const prev = computeStreakRaw(data.checkins);
  data.checkins[today] = 'clean';
  const next = computeStreakRaw(data.checkins);
  data.streak.current = next;
  data.streak.longest = Math.max(data.streak.longest||0, next);
  const cheatEarned = applyCheatMilestones(data, next);
  const newChars    = checkMilestones(data, prev, next);
  tickCharacters(data);
  saveData(data);
  if ('vibrate' in navigator) navigator.vibrate(200);
  if (newChars.length>0)   showUnlockCelebration(newChars[0].defKey);
  else if (cheatEarned>0)  showCheatEarned(cheatEarned);
  updateHomeScreen();
}

function useCheatDay() {
  const data = loadData(), today = todayStr();
  if ((data.streak.cheatBalance||0)<=0 || isSuccessDay(data.checkins[today])) return;
  const prev = computeStreakRaw(data.checkins);
  data.checkins[today] = 'cheat';
  data.streak.cheatBalance--;
  const next = computeStreakRaw(data.checkins);
  data.streak.current = next;
  data.streak.longest = Math.max(data.streak.longest||0, next);
  applyCheatMilestones(data, next);
  const newChars = checkMilestones(data, prev, next);
  tickCharacters(data);
  saveData(data);
  if ('vibrate' in navigator) navigator.vibrate(200);
  if (newChars.length>0) showUnlockCelebration(newChars[0].defKey);
  updateHomeScreen();
}

// ── Broken streak ─────────────────────────────────────────────

function showBrokenScreen(canFast) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-broken').classList.add('active');
  document.getElementById('fast-recover-btn').style.display = canFast ? 'block' : 'none';
  document.getElementById('no-recover-note').style.display  = canFast ? 'none'  : 'block';
  const sadEl = document.getElementById('broken-char');
  sadEl.className = 'sprite-frame';
  applySpriteEl(sadEl, CHARACTER_DEFS.crash);
}

function fastToRecover() {
  const data = loadData();
  data.checkins[subtractDay(todayStr())] = 'fasted';
  const next = computeStreakRaw(data.checkins);
  data.streak.current = next;
  data.streak.longest = Math.max(data.streak.longest||0, next);
  tickCharacters(data);
  if (!Object.values(data.characters).some(c => c.defKey==='crash'))
    addCharacter(data,'crash');
  saveData(data);
  showScreen('home');
}

function restartAfterBreak() {
  const data = loadData();
  addCharacter(data,'crash');
  resetCharacters(data);
  data.streak.cheatMilestonesEarned = 0;
  if (!data.ui) data.ui = {};
  data.ui.brokenAckedDate = todayStr();
  saveData(data);
  showScreen('home');
}

// ── Celebrations ──────────────────────────────────────────────

function showUnlockCelebration(defKey) {
  const def = CHARACTER_DEFS[defKey]; if (!def) return;
  const sty = def.customSrc
    ? `--sprite-img:url('${def.customSrc}'); --sprite-group-w:${SPRITE.frameW*def.frames}px; --sx:0px; --speed:${def.speed};`
    : `--sx:${-(def.col*SPRITE.groupW)}px; background-position-y:${-(def.row*SPRITE.rowH+SPRITE.labelH)}px; --speed:${def.speed};`;
  const o = document.createElement('div'); o.className='celebration-overlay';
  o.innerHTML=`<div class="celebration-content">
    <div class="sprite-wrap-xl"><div class="sprite-frame" style="${sty}${def.filter?' filter:'+def.filter+';':''}"></div></div>
    <h2>New Character! 🎉</h2><h3>${def.name}</h3><p>${def.desc}</p>
    <p class="cel-shiny-note">Check in ${def.shinyAt} more days to ✨ Shine!</p>
    <p style="margin-top:12px;font-size:11px;opacity:0.5">Tap to dismiss</p>
  </div>`;
  document.body.appendChild(o);
  o.addEventListener('click',()=>o.remove());
  setTimeout(()=>{if(o.parentNode)o.remove();},6000);
}

function showCheatEarned(n) {
  const o = document.createElement('div'); o.className='celebration-overlay';
  o.innerHTML=`<div class="celebration-content">
    <div style="font-size:80px;margin-bottom:16px;">🍀</div>
    <h2>Cheat Day Earned!</h2><h3>${n} cheat day${n>1?'s':''} added</h3>
    <p>Use it on any future day to keep your streak!</p>
    <p style="margin-top:12px;font-size:11px;opacity:0.5">Tap to dismiss</p>
  </div>`;
  document.body.appendChild(o);
  o.addEventListener('click',()=>o.remove());
  setTimeout(()=>{if(o.parentNode)o.remove();},4000);
}

// ── Deck ──────────────────────────────────────────────────────

function renderDeck() {
  const data = loadData();
  const grid = document.getElementById('deck-grid');
  grid.innerHTML = '';

  for (const [id,ch] of Object.entries(data.characters)) {
    const def = CHARACTER_DEFS[ch.defKey]; if (!def) continue;
    const isActive = id === data.activeCharId;
    const pct      = ch.isShiny ? 100 : Math.min(100,((ch.ownStreak||0)/def.shinyAt)*100);
    const card = document.createElement('div');
    card.className = 'char-card'+(isActive?' active':'')+(ch.isShiny?' shiny':'');
    card.onclick = () => setActiveChar(id);
    card.innerHTML = `
      <div class="sprite-wrap-sm">${spriteCardHTML(def)}</div>
      <div class="char-card-name">${def.name}${ch.isShiny?' ✨':''}</div>
      <div class="char-own-bar"><div class="char-own-fill" style="width:${pct}%"></div></div>
      <div class="char-card-sub">${ch.isShiny?'✨ Shiny!':((ch.ownStreak||0)+'/'+def.shinyAt+' days')}</div>
      ${isActive?'<div class="char-active-badge">Active</div>':''}`;
    grid.appendChild(card);
  }

  const earnedKeys = new Set(Object.values(data.characters).map(c => c.defKey));
  for (const m of MILESTONES) {
    if (earnedKeys.has(m.key)) continue;
    const card = document.createElement('div');
    card.className = 'char-card locked';
    card.innerHTML = `
      <div class="sprite-wrap-sm sprite-locked-wrap"><span class="sprite-locked-icon">🔒</span></div>
      <div class="char-card-name">${m.name}</div>
      <div class="char-card-sub">Day ${m.earnAt}</div>`;
    grid.appendChild(card);
  }
}

function setActiveChar(id) {
  const data = loadData();
  if (!data.characters[id]) return;
  data.activeCharId = id;
  saveData(data);
  showScreen('home');
}

// ── Calendar ──────────────────────────────────────────────────

function renderCalendar() {
  const data = loadData();
  const c = document.getElementById('calendar-container');
  c.innerHTML = '';
  const now = new Date();
  for (let i=0;i<=2;i++) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    c.appendChild(buildMonth(d.getFullYear(), d.getMonth(), data.checkins));
  }
}

function buildMonth(year, month, checkins) {
  const label    = new Date(year,month,1).toLocaleString('default',{month:'long',year:'numeric'});
  const days     = new Date(year,month+1,0).getDate();
  const startDow = new Date(year,month,1).getDay();
  const todayKey = todayStr();
  const wrap = document.createElement('div');
  wrap.className = 'cal-month';
  wrap.innerHTML = `
    <h3 class="cal-title">${label}</h3>
    <div class="cal-dow"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
    <div class="cal-grid"></div>`;
  const grid = wrap.querySelector('.cal-grid');
  for (let i=0;i<startDow;i++){const e=document.createElement('div');e.className='cal-day empty';grid.appendChild(e);}
  for (let day=1;day<=days;day++) {
    const key=makeDateKey(year,month,day), status=checkins[key];
    const cell=document.createElement('div');
    let cls='cal-day';
    if (status==='clean')  cls+=' checked';
    if (status==='cheat')  cls+=' cheat';
    if (status==='fasted') cls+=' fasted';
    if (key===todayKey)    cls+=' today';
    if (key>todayKey)      cls+=' future';
    cell.className=cls; cell.textContent=day;
    grid.appendChild(cell);
  }
  return wrap;
}

// ── Settings ──────────────────────────────────────────────────

function loadSettingsScreen() {
  const data = loadData();
  document.getElementById('pat-input').value = data.settings?.githubPAT||'';
  const s=document.getElementById('backup-status');
  s.textContent=''; s.className='backup-status';
  const offset = parseInt(localStorage.getItem(DEV_KEY)||'0', 10);
  const el = document.getElementById('dev-date');
  if (el) el.textContent = offset > 0
    ? `Simulated: ${todayStr()}  (+${offset} days)`
    : `Today: ${todayStr()}`;
}

function resetData() {
  if (!confirm('This will permanently delete all your data. Are you sure?')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('sugarfree_v1');
  showScreen('home');
}

// ── Service Worker ────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

// ── Init ──────────────────────────────────────────────────────
updateHomeScreen();
