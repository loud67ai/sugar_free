// ============================================================
// Sugar Free — app.js  v2
// ============================================================

const STORAGE_KEY = 'sugarfree_v2';

// ── Sprite config ─────────────────────────────────────────────
const SPRITE = { frameW:153, frameH:128, labelH:25, rowH:154, groupW:458 };

// ── Character definitions ─────────────────────────────────────
// earnAt: streak day earned.  -1 = special (broken streak reward)
const CHARACTER_DEFS = {
  sprout:   { name:'Sugar Sprout',  earnAt:1,   customSrc:'avatars/avatar-sprout.png', shinySrc:'avatars/avatar-sprout-shiny.png', frames:3, shinyAt:7,   speed:'0.9s',  desc:'Your first step to freedom!' },
  jumprope: { name:'Week Warrior',  earnAt:7,   customSrc:'avatars/avatar-jumprope.png', shinySrc:'avatars/avatar-jumprope-shiny.png', shinyAt:28,  speed:'1.0s',  desc:'7 days sugar free!' },
  bicep:    { name:'Iron Pumper',   earnAt:21,  customSrc:'avatars/avatar-bicep.png',    shinySrc:'avatars/avatar-bicep-shiny.png',    shinyAt:35,  speed:'0.8s',  desc:'Three weeks of strength!' },
  broccoli: { name:'Broccoli Boss', earnAt:14,  src:'sprites.png', frames:3, row:1, col:1, shinyAt:28,  speed:'0.8s',  desc:'Two strong weeks!' },
  zen:      { name:'Zen Master',    earnAt:30,  customSrc:'avatars/avatar-zen.png',      shinySrc:'avatars/avatar-zen-shiny.png',      shinyAt:42,  speed:'1.2s',  desc:'A whole month!' },
  runner:   { name:'Trail Runner',  earnAt:60,  customSrc:'avatars/avatar-runner.png',    shinySrc:'avatars/avatar-runner-shiny.png',    shinyAt:50,  speed:'0.8s',  desc:'Two months, full stride!' },
  bookworm: { name:'Bookworm',      earnAt:100, customSrc:'avatars/avatar-bookworm.png',  shinySrc:'avatars/avatar-bookworm-shiny.png',  shinyAt:60,  speed:'1.0s',  desc:'100 days — incredible!' },
  legend:   { name:'Year Legend',   earnAt:365, src:'sprites.png', frames:3, row:4, col:2, shinyAt:100, speed:'0.65s', desc:'A full year. Legendary!' },
  crash:    { name:'Sugar Crash',   earnAt:-1,  customSrc:'avatars/avatar-crash.png', shinySrc:'avatars/avatar-crash-shiny.png', shinyAt:14,  speed:'2.5s',  desc:'Even crashes can shine…' },
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
    characters:{},    // id → { defKey, ownStreak, isShiny, useShiny }
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
  data.characters[id] = { defKey, ownStreak:0, isShiny:false, useShiny:false };
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
      if (def && ch.ownStreak >= def.shinyAt) { ch.isShiny = true; ch.useShiny = true; }
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

function applySpriteEl(el, def, isShiny=false) {
  const src = (isShiny && def.shinySrc) ? def.shinySrc : def.customSrc;
  if (src) { el.src = src; el.classList.add('avatar-img'); }
  else { el.classList.remove('avatar-img'); }
  el.style.filter = def.filter||'';
  el.style.opacity = '1';
}

function spriteCardHTML(def, isShiny=false) {
  const src = (isShiny && def.shinySrc) ? def.shinySrc : def.customSrc;
  const shimmer = isShiny && !def.shinySrc ? ' filter:drop-shadow(0 0 6px gold);' : '';
  const styleAttr = `${def.filter?'filter:'+def.filter+';':''}${shimmer}`;
  const cls = src ? 'sprite-frame avatar-img' : 'sprite-frame';
  return `<img class="${cls}" ${src?`src="${src}"`:''}${styleAttr?` style="${styleAttr}"`:''} alt="">`;
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
    const showShiny = ch?.useShiny ?? ch?.isShiny ?? false;
    sprEl.closest('.avatar-wrap').style.display = '';
    sprEl.className = 'sprite-frame' + (showShiny ? ' shiny' : '');
    applySpriteEl(sprEl, def, showShiny);
    if (showShiny && !def.shinySrc) sprEl.style.filter = def.filter||'';
    nmEl.textContent = def.name + (showShiny ? ' ✨' : '');
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
    sprEl.closest('.avatar-wrap').style.display = 'none';
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
  const preShiny    = new Set(Object.keys(data.characters).filter(id => data.characters[id].isShiny));
  tickCharacters(data);
  const newShinyIds = Object.keys(data.characters).filter(id =>
    !preShiny.has(id) && data.characters[id].isShiny && !newChars.some(c => c.id === id));
  saveData(data);
  if ('vibrate' in navigator) navigator.vibrate(200);
  const events = [
    ...newChars.map(c => ({ type:'unlock', id:c.id, defKey:c.defKey })),
    ...newShinyIds.map(id => ({ type:'shiny', id, defKey:data.characters[id].defKey })),
  ];
  if (events.length > 0)  showEventQueue(events);
  else { if (cheatEarned > 0) showCheatEarned(cheatEarned); updateHomeScreen(); }
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
  const newChars    = checkMilestones(data, prev, next);
  const preShiny    = new Set(Object.keys(data.characters).filter(id => data.characters[id].isShiny));
  tickCharacters(data);
  const newShinyIds = Object.keys(data.characters).filter(id =>
    !preShiny.has(id) && data.characters[id].isShiny && !newChars.some(c => c.id === id));
  saveData(data);
  if ('vibrate' in navigator) navigator.vibrate(200);
  const events = [
    ...newChars.map(c => ({ type:'unlock', id:c.id, defKey:c.defKey })),
    ...newShinyIds.map(id => ({ type:'shiny', id, defKey:data.characters[id].defKey })),
  ];
  if (events.length > 0) showEventQueue(events);
  else updateHomeScreen();
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

function showEventQueue(events, idx = 0) {
  if (idx >= events.length) { updateHomeScreen(); return; }
  const ev = events[idx];
  const next = () => showEventQueue(events, idx + 1);
  if (ev.type === 'unlock') showUnlockChoice(ev.id, ev.defKey, next);
  else if (ev.type === 'shiny') showShinyChoice(ev.id, ev.defKey, next);
  else next();
}

function showUnlockChoice(charId, defKey, onDone) {
  const def = CHARACTER_DEFS[defKey]; if (!def) { onDone(); return; }
  const src = def.customSrc || '';
  const o = document.createElement('div'); o.className = 'celebration-overlay';
  o.innerHTML = `<div class="celebration-content">
    <div class="cel-badge">New Character! 🎉</div>
    <div class="sprite-wrap-xl"><img class="sprite-frame${src ? ' avatar-img' : ''}" ${src ? `src="${src}"` : ''} alt=""></div>
    <h3>${def.name}</h3>
    <p>${def.desc}</p>
    <p class="cel-shiny-note">Check in ${def.shinyAt} more days to ✨ Shine!</p>
    <p class="cel-question">Set as your active avatar?</p>
    <div class="cel-btn-col">
      <button class="cel-btn-primary" id="cel-set-active">✅ Use ${def.name}</button>
      <button class="cel-btn-secondary" id="cel-keep">Keep Current</button>
    </div>
  </div>`;
  document.body.appendChild(o);
  o.querySelector('#cel-set-active').addEventListener('click', () => {
    const data = loadData();
    data.activeCharId = charId;
    data.characters[charId].useShiny = false;
    saveData(data);
    o.remove(); onDone();
  });
  o.querySelector('#cel-keep').addEventListener('click', () => { o.remove(); onDone(); });
}

function showShinyChoice(charId, defKey, onDone) {
  const def = CHARACTER_DEFS[defKey]; if (!def) { onDone(); return; }
  const normalSrc = def.customSrc || '';
  const shinySrc  = def.shinySrc  || def.customSrc || '';
  const o = document.createElement('div'); o.className = 'celebration-overlay';
  o.innerHTML = `<div class="celebration-content">
    <div class="cel-badge shiny-badge">✨ Shiny Unlocked!</div>
    <h3>${def.name}</h3>
    <p class="cel-question">Which version do you want to use?</p>
    <div class="cel-variants">
      <div class="cel-variant">
        <div class="sprite-wrap-sm"><img class="sprite-frame${normalSrc ? ' avatar-img' : ''}" ${normalSrc ? `src="${normalSrc}"` : ''} alt=""></div>
        <div class="cel-variant-label">Normal</div>
      </div>
      <div class="cel-variant cel-variant-shiny">
        <div class="sprite-wrap-sm"><img class="sprite-frame${shinySrc ? ' avatar-img' : ''}" ${shinySrc ? `src="${shinySrc}"` : ''} alt=""></div>
        <div class="cel-variant-label">✨ Shiny</div>
      </div>
    </div>
    <div class="cel-btn-col">
      <button class="cel-btn-shiny" id="cel-use-shiny">✨ Switch to Shiny</button>
      <button class="cel-btn-secondary" id="cel-keep-normal">Keep Current</button>
    </div>
  </div>`;
  document.body.appendChild(o);
  o.querySelector('#cel-use-shiny').addEventListener('click', () => {
    const data = loadData();
    data.activeCharId = charId;
    data.characters[charId].useShiny = true;
    saveData(data);
    o.remove(); onDone();
  });
  o.querySelector('#cel-keep-normal').addEventListener('click', () => { o.remove(); onDone(); });
}

// ── Avatar picker ────────────────────────────────────────────

function showAvatarPicker() {
  const data = loadData();
  if (!Object.keys(data.characters).length) return;

  const o = document.createElement('div');
  o.className = 'avatar-picker-overlay';

  let rows = '';
  for (const [id, ch] of Object.entries(data.characters)) {
    const def = CHARACTER_DEFS[ch.defKey]; if (!def) continue;
    const activeId  = data.activeCharId;
    const useShiny  = ch.useShiny || false;
    const normalSrc = def.customSrc || '';
    const shinySrc  = def.shinySrc  || def.customSrc || '';
    const isNormSel = id === activeId && !useShiny;
    const isShSel   = id === activeId && useShiny;

    rows += `<div class="picker-row">
      <div class="picker-row-name">${def.name}</div>
      <div class="picker-variants">
        <div class="picker-tile${isNormSel ? ' picker-tile-sel' : ''}" data-id="${id}" data-shiny="false">
          <div class="sprite-wrap-sm"><img class="sprite-frame${normalSrc ? ' avatar-img' : ''}" ${normalSrc ? `src="${normalSrc}"` : ''} alt=""></div>
          <div class="picker-tile-label">Normal</div>
        </div>
        <div class="picker-tile${ch.isShiny ? (isShSel ? ' picker-tile-sel picker-tile-shiny' : ' picker-tile-shiny') : ' picker-tile-locked'}" ${ch.isShiny ? `data-id="${id}" data-shiny="true"` : ''}>
          ${ch.isShiny
            ? `<div class="sprite-wrap-sm"><img class="sprite-frame${shinySrc ? ' avatar-img' : ''}" ${shinySrc ? `src="${shinySrc}"` : ''} alt=""></div>`
            : `<div class="sprite-wrap-sm sprite-locked-wrap"><span class="sprite-locked-icon">🔒</span></div>`}
          <div class="picker-tile-label">${ch.isShiny ? '✨ Shiny' : `${ch.ownStreak||0}/${def.shinyAt}d`}</div>
        </div>
      </div>
    </div>`;
  }

  o.innerHTML = `<div class="avatar-picker-panel">
    <div class="picker-header">
      <span class="picker-title">Change Avatar</span>
      <button class="picker-close" id="picker-close">✕</button>
    </div>
    <div class="picker-body">${rows}</div>
  </div>`;

  document.body.appendChild(o);

  o.querySelector('#picker-close').addEventListener('click', () => o.remove());
  o.addEventListener('click', e => { if (e.target === o) o.remove(); });

  o.querySelectorAll('.picker-tile[data-id]').forEach(tile => {
    tile.addEventListener('click', () => {
      setActiveChar(tile.dataset.id, tile.dataset.shiny === 'true');
      o.remove();
      updateHomeScreen();
    });
  });
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

  for (const [id, ch] of Object.entries(data.characters)) {
    const def = CHARACTER_DEFS[ch.defKey]; if (!def) continue;
    const isActiveChar = id === data.activeCharId;
    const useShiny     = ch.useShiny || false;
    const pct = ch.isShiny ? 100 : Math.min(100, ((ch.ownStreak||0) / def.shinyAt) * 100);
    const sub = ch.isShiny ? '✨ Shiny unlocked!' : `${ch.ownStreak||0}/${def.shinyAt} days to ✨`;

    const card = document.createElement('div');
    card.className = 'char-card' + (isActiveChar ? ' active' : '');
    card.innerHTML = `
      <div class="char-card-header">
        <span class="char-card-name">${def.name}</span>
        ${isActiveChar ? '<span class="char-active-badge">Active</span>' : ''}
      </div>
      <div class="char-variants">
        <div class="char-variant${isActiveChar && !useShiny ? ' selected' : ''}" data-id="${id}" data-shiny="false">
          <div class="sprite-wrap-sm">${spriteCardHTML(def, false)}</div>
          <div class="variant-label">Normal</div>
        </div>
        <div class="char-variant${ch.isShiny ? (isActiveChar && useShiny ? ' selected' : '') : ' locked'}">
          ${ch.isShiny ? `<div class="sprite-wrap-sm">${spriteCardHTML(def, true)}</div>` : '<div class="sprite-wrap-sm sprite-locked-wrap"><span class="sprite-locked-icon">🔒</span></div>'}
          <div class="variant-label">✨ Shiny</div>
        </div>
      </div>
      <div class="char-own-bar"><div class="char-own-fill" style="width:${pct}%"></div></div>
      <div class="char-card-sub">${sub}</div>`;

    // Attach click to normal variant
    card.querySelector('.char-variant[data-id]').addEventListener('click', () => setActiveChar(id, false));
    // Attach click to shiny variant only when unlocked
    if (ch.isShiny) {
      const shinyVariant = card.querySelectorAll('.char-variant')[1];
      shinyVariant.dataset.id    = id;
      shinyVariant.dataset.shiny = 'true';
      shinyVariant.addEventListener('click', () => setActiveChar(id, true));
    }

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

function setActiveChar(id, useShiny = false) {
  const data = loadData();
  if (!data.characters[id]) return;
  data.activeCharId = id;
  data.characters[id].useShiny = useShiny;
  saveData(data);
  renderDeck();
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

  // Populate character select
  const sel = document.getElementById('dev-char-select');
  if (sel) {
    const prev = sel.value;
    sel.innerHTML = Object.entries(CHARACTER_DEFS)
      .map(([key,def]) => `<option value="${key}">${def.name} (${def.earnAt<0?'special':'day '+def.earnAt})</option>`)
      .join('');
    if (prev) sel.value = prev;
  }
  const st = document.getElementById('dev-unlock-status');
  if (st) st.textContent = '';
}

function devUnlockChar(defKey, makeShiny) {
  const data = loadData();
  const def = CHARACTER_DEFS[defKey];
  if (!def) return;
  let id = Object.keys(data.characters).find(k => data.characters[k].defKey === defKey);
  if (!id) id = addCharacter(data, defKey);
  const ch = data.characters[id];
  if (makeShiny) {
    ch.isShiny = true;
    ch.useShiny = true;
    ch.ownStreak = def.shinyAt;
  }
  if (!data.activeCharId) data.activeCharId = id;
  saveData(data);
  const st = document.getElementById('dev-unlock-status');
  if (st) st.textContent = makeShiny ? `✨ ${def.name} is now shiny!` : `🔓 ${def.name} unlocked!`;
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
