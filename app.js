'use strict';
/* =========================================================
   Lumen — dashboard, to-do, planner & time-blocking system
   All data lives in localStorage (key: lumen.v1).
   ========================================================= */

/* ---------- utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => fmt(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toHHMM = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const fromHHMM = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function tStr(m) {
  m = Math.round(m);
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  if (S.settings.h24) return `${pad(h)}:${pad(mm)}`;
  const ap = h < 12 ? 'am' : 'pm', h12 = h % 12 || 12;
  return mm ? `${h12}:${pad(mm)}${ap}` : `${h12}${ap}`;
}
function durStr(m) {
  m = Math.round(m);
  const h = Math.floor(m / 60), mm = m % 60;
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
}
function niceDate(s, opts = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return parse(s).toLocaleDateString(undefined, opts);
}
function relDate(s) {
  const t = todayStr();
  if (s === t) return 'Today';
  if (s === addDays(t, 1)) return 'Tomorrow';
  if (s === addDays(t, -1)) return 'Yesterday';
  return niceDate(s, { month: 'short', day: 'numeric' });
}

/* ---------- icons ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12 3 3 5-6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="4"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  blocks: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18M9 21V9"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  done: '<path d="m5 12 5 5 9-10"/>',
  skip: '<path d="M5 5l9 7-9 7zM17 5v14"/>',
  wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M3 21l9-9"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
};
const icon = (name, cls = '') => `<span class="ico ${cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg></span>`;
function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach(el => { el.outerHTML = icon(el.dataset.icon, el.className.replace('ico', '').trim()); });
}

/* ---------- state ---------- */
const STORE_KEY = 'lumen.v1';
const UI_KEY = 'lumen.ui';
const DEFAULT_CATS = [
  { id: 'deep', name: 'Deep Work', color: '#8b7cf6' },
  { id: 'study', name: 'Study', color: '#4fb8e8' },
  { id: 'admin', name: 'Admin', color: '#f2a65a' },
  { id: 'health', name: 'Health', color: '#5cc98f' },
  { id: 'personal', name: 'Personal', color: '#f07fa8' },
  { id: 'meeting', name: 'Meetings', color: '#e8c95a' },
  { id: 'break', name: 'Break', color: '#9aa3b5' },
];
const QUOTES = [
  'Protect the block, and the block protects you.',
  'A calm plan beats a frantic day.',
  'Small hours, stacked daily, build big years.',
  'Decide once in the morning, not fifty times a day.',
  'What gets a time gets done.',
  'Do the hard thing while your mind is fresh.',
  'Rest is a block too. Schedule it.',
  'One focused hour is worth four scattered ones.',
];

function defaultState() {
  return {
    todos: [], blocks: [], cats: DEFAULT_CATS.map(c => ({ ...c })),
    events: {}, monthGoals: {}, monthFocus: {}, yearGoals: {}, templates: [],
    settings: {
      name: '', dayStart: 5, dayEnd: 24, h24: false, snap: 15,
      theme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
      accent: '#a78bfa', notify: false, sound: true, pomodoro: 25,
    },
  };
}
function seed(s) {
  const t = todayStr();
  const now = Date.now();
  s.todos = [
    { id: uid(), text: 'Outline the plan for this week', done: false, priority: 1, due: t, tag: 'work', est: 60, created: now, subs: [] },
    { id: uid(), text: 'Read 20 pages', done: false, priority: 2, due: t, tag: 'growth', est: 30, created: now, subs: [] },
    { id: uid(), text: 'Clear pending emails', done: false, priority: 3, due: addDays(t, 1), tag: 'admin', est: 30, created: now, subs: [] },
    { id: uid(), text: 'Plan next week\'s workouts', done: false, priority: 2, due: '', tag: 'health', est: 20, created: now, subs: [{ id: uid(), text: 'Pick 3 run days', done: false }] },
  ];
  s.blocks = [
    { id: uid(), date: t, start: 420, end: 465, title: 'Morning run', cat: 'health', recur: 'daily', ex: {}, notes: '' },
    { id: uid(), date: t, start: 540, end: 660, title: 'Deep work — main project', cat: 'deep', recur: 'weekdays', ex: {}, notes: 'Phone in another room.' },
    { id: uid(), date: t, start: 660, end: 675, title: 'Tea break', cat: 'break', recur: 'none', status: 'planned', notes: '' },
    { id: uid(), date: t, start: 840, end: 930, title: 'Study session', cat: 'study', recur: 'none', status: 'planned', notes: '' },
    { id: uid(), date: t, start: 1020, end: 1050, title: 'Inbox & admin', cat: 'admin', recur: 'none', status: 'planned', notes: '' },
  ];
  s.templates = [{
    id: uid(), name: 'Deep Focus Day', blocks: [
      { start: 480, end: 600, title: 'Deep work I', cat: 'deep' },
      { start: 600, end: 615, title: 'Break', cat: 'break' },
      { start: 615, end: 735, title: 'Deep work II', cat: 'deep' },
      { start: 735, end: 795, title: 'Lunch', cat: 'personal' },
      { start: 810, end: 900, title: 'Study', cat: 'study' },
      { start: 900, end: 960, title: 'Admin & email', cat: 'admin' },
      { start: 1080, end: 1140, title: 'Workout', cat: 'health' },
    ],
  }];
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw), def = defaultState();
      return { ...def, ...d, settings: { ...def.settings, ...(d.settings || {}) } };
    }
  } catch (e) { /* fall through */ }
  return seed(defaultState());
}
let S = load();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } }, 80);
}

const ui = (() => {
  const def = { view: 'dashboard', todoFilter: 'all', todoTag: '', bDate: todayStr(), bMode: 'day', pMode: 'month', pYear: new Date().getFullYear(), pMonth: new Date().getMonth() };
  try { return { ...def, ...JSON.parse(localStorage.getItem(UI_KEY) || '{}'), bDate: todayStr() }; } catch (e) { return def; }
})();
const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) { } };

const cat = id => S.cats.find(c => c.id === id) || S.cats[0] || { id: '?', name: 'Other', color: '#888' };
const getBlock = id => S.blocks.find(b => b.id === id);
const getTodo = id => S.todos.find(t => t.id === id);
const isRecur = b => b.recur && b.recur !== 'none';

/* ---------- blocks engine ---------- */
function recurMatches(b, date) {
  if (date < b.date) return false;
  if (b.until && date > b.until) return false;
  const dow = parse(date).getDay();
  switch (b.recur) {
    case 'daily': return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekends': return dow === 0 || dow === 6;
    case 'weekly': return dow === parse(b.date).getDay();
    default: return false;
  }
}
function blocksForDate(date) {
  const out = [];
  for (const b of S.blocks) {
    if (!isRecur(b)) { if (b.date === date) out.push({ ...b, occ: date, status: b.status || 'planned' }); continue; }
    const ex = (b.ex || {})[date];
    if (ex === 'deleted' || !recurMatches(b, date)) continue;
    out.push({ ...b, occ: date, status: ex || 'planned' });
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}
function setStatus(id, date, status) {
  const b = getBlock(id); if (!b) return;
  if (isRecur(b)) {
    b.ex = b.ex || {};
    if (status === 'planned') delete b.ex[date]; else b.ex[date] = status;
  } else b.status = status;
  if (status === 'done' && b.todoId) {
    const t = getTodo(b.todoId);
    if (t && !t.done) { t.done = true; t.doneAt = todayStr(); }
  }
  save();
}
function deleteBlock(id, date, scope = 'all') {
  const b = getBlock(id); if (!b) return;
  if (isRecur(b) && scope === 'one') { b.ex = b.ex || {}; b.ex[date] = 'deleted'; }
  else if (isRecur(b) && scope === 'future') { b.until = addDays(date, -1); if (b.until < b.date) S.blocks = S.blocks.filter(x => x.id !== id); }
  else S.blocks = S.blocks.filter(x => x.id !== id);
  save();
}
/* lay out overlapping blocks side by side; flag conflicts */
function layoutBlocks(list) {
  const sorted = [...list].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach(b => {
      let i = lanes.findIndex(end => end <= b.start);
      if (i < 0) { i = lanes.length; lanes.push(0); }
      lanes[i] = b.end; b._lane = i;
    });
    cluster.forEach(b => { b._lanes = lanes.length; b._conflict = lanes.length > 1; });
    out.push(...cluster); cluster = [];
  };
  for (const b of sorted) {
    if (cluster.length && b.start >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(b); clusterEnd = Math.max(clusterEnd, b.end);
  }
  if (cluster.length) flush();
  return out;
}
function dayStats(date) {
  const list = blocksForDate(date).filter(b => b.status !== 'skipped');
  const byCat = {};
  let planned = 0, done = 0;
  list.forEach(b => {
    const d = b.end - b.start;
    planned += d; if (b.status === 'done') done += d;
    byCat[b.cat] = (byCat[b.cat] || 0) + d;
  });
  // union of covered minutes for "free time"
  let covered = 0, curS = -1, curE = -1;
  [...list].sort((a, b) => a.start - b.start).forEach(b => {
    if (b.start > curE) { covered += curE - curS; curS = b.start; curE = b.end; }
    else curE = Math.max(curE, b.end);
  });
  covered += curE - curS;
  const window = (S.settings.dayEnd - S.settings.dayStart) * 60;
  return { planned, done, byCat, free: Math.max(0, window - covered), count: list.length, list };
}
function findFreeSlot(date, dur) {
  const step = S.settings.snap;
  let from = Math.max(S.settings.dayStart * 60, date === todayStr() ? Math.ceil(nowMin() / step) * step : 8 * 60);
  const list = blocksForDate(date).filter(b => b.status !== 'skipped');
  for (let s = from; s + dur <= S.settings.dayEnd * 60; s += step) {
    if (!list.some(b => b.start < s + dur && b.end > s)) return s;
  }
  return null;
}

/* ---------- toast / modal ---------- */
function toast(msg, action) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${msg}</span>${action ? `<button class="btn">${action.label}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { action.fn(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = 0; setTimeout(() => el.remove(), 400); }, action ? 5000 : 2600);
}
function openModal(title, body, mount) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h3>${title}<button class="icon-btn sm" data-close>${icon('x')}</button></h3>${body}</div></div>`;
  const back = root.firstElementChild;
  const close = () => { root.innerHTML = ''; };
  back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  $$('[data-close]', back).forEach(b => b.onclick = close);
  mount && mount(back.querySelector('.modal'), close);
  const first = back.querySelector('input:not([type=checkbox]):not([type=color]), textarea');
  first && setTimeout(() => first.focus(), 30);
  return close;
}
function confirmBox(msg, okLabel = 'Confirm') {
  return new Promise(res => {
    openModal('Are you sure?', `<p class="muted">${msg}</p><div class="modal-foot"><span></span><div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="okBtn">${okLabel}</button></div></div>`, (m, close) => {
      $('#okBtn', m).onclick = () => { close(); res(true); };
      $$('[data-close]', m).forEach(b => b.addEventListener('click', () => res(false)));
    });
  });
}

/* ---------- sound & notifications ---------- */
let audioCtx;
function chime() {
  if (!S.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = audioCtx.currentTime + i * .16;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .9);
      o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 1);
    });
  } catch (e) { }
}
const notified = new Set();
function checkReminders() {
  const t = todayStr(), m = nowMin();
  blocksForDate(t).forEach(b => {
    const key = `${b.id}|${t}|${b.start}`;
    if (b.status === 'planned' && b.start === m && !notified.has(key)) {
      notified.add(key);
      chime();
      toast(`${icon('bell')} <b>${esc(b.title)}</b> starts now`, { label: 'Focus', fn: () => openFocus() });
      if (S.settings.notify && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification(`Now: ${b.title}`, { body: `${tStr(b.start)} – ${tStr(b.end)} · ${cat(b.cat).name}` }); } catch (e) { }
      }
    }
  });
}

/* ---------- navigation ---------- */
const VIEWS = { dashboard: renderDashboard, todo: renderTodo, planner: renderPlanner, blocker: renderBlocker };
function go(view) {
  if (!VIEWS[view]) view = 'dashboard';
  ui.view = view; saveUI();
  if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  render();
}
function render() {
  const main = $('#main');
  const scroll = $('#tlScroll')?.scrollTop;
  main.innerHTML = `<section class="view" id="view-${ui.view}">${VIEWS[ui.view]()}</section>`;
  const after = AFTER[ui.view]; after && after(scroll);
}
const AFTER = {};

/* =========================================================
   DASHBOARD
   ========================================================= */
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
}
function renderDashboard() {
  const t = todayStr(), now = new Date(), nm = nowMin();
  const blocks = blocksForDate(t).filter(b => b.status !== 'skipped');
  const current = blocks.find(b => b.start <= nm && nm < b.end);
  const next = blocks.find(b => b.start > nm);
  const st = dayStats(t);
  const open = S.todos.filter(x => !x.done);
  const focusTodos = open.filter(x => !x.due || x.due <= t).sort((a, b) => a.priority - b.priority).slice(0, 6);
  const doneToday = S.todos.filter(x => x.done && x.doneAt === t).length;
  const overdue = open.filter(x => x.due && x.due < t).length;
  const dayPct = clamp(((nm - S.settings.dayStart * 60) / ((S.settings.dayEnd - S.settings.dayStart) * 60)) * 100, 0, 100);
  const yStart = new Date(now.getFullYear(), 0, 1), yEnd = new Date(now.getFullYear() + 1, 0, 1);
  const yearPct = ((now - yStart) / (yEnd - yStart)) * 100;
  const mKey = `${now.getFullYear()}-${now.getMonth()}`;
  const mGoals = S.monthGoals[mKey] || [];
  const quote = QUOTES[(now.getDate() + now.getMonth()) % QUOTES.length];
  const R = 52, C = 2 * Math.PI * R;
  const ring = pct => `<svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="9"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="url(#rg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/><defs><linearGradient id="rg"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs></svg>`;

  // last 7 days focus chart
  const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(t, i - 6); const s = dayStats(d); return { d, ...s }; });
  const maxW = Math.max(60, ...week.map(w => w.planned));

  const blockRow = b => {
    const c = cat(b.cat).color;
    const cls = b.end <= nm ? 'past' : (b.start <= nm && nm < b.end ? 'now' : '');
    return `<div class="ag-item ${cls}" style="--c:${c}" data-open-block="${b.id}" data-date="${t}"><span class="time">${tStr(b.start)}</span><span class="stripe"></span><div class="grow"><div style="font-weight:600">${esc(b.title)}${b.status === 'done' ? ' <span class="chip">done</span>' : ''}</div><div class="faint" style="font-size:12px">${durStr(b.end - b.start)} · ${esc(cat(b.cat).name)}</div></div></div>`;
  };

  return `
  <div class="view-head">
    <div><div class="eyebrow">${niceDate(t)}</div><h1 class="title">${greeting()}${S.settings.name ? `, <em>${esc(S.settings.name)}</em>` : ''}.</h1></div>
    <div class="row"><button class="btn" data-go="blocker">${icon('blocks')} Plan my day</button><button class="btn primary" id="dashAdd">${icon('plus')} Quick add</button></div>
  </div>
  <div class="dash">
    <div class="card hero span-8">
      <div>
        <div class="clock" data-clock>--:--</div>
        <p class="quote">“${quote}”</p>
        <div style="margin-top:14px;max-width:380px">
          <div class="row" style="justify-content:space-between;font-size:12px" ><span class="muted">${now.getFullYear()} progress</span><span>${yearPct.toFixed(1)}%</span></div>
          <div class="bar" style="margin-top:6px"><i style="width:${yearPct}%"></i></div>
        </div>
      </div>
      <div class="ring">${ring(dayPct)}<div class="lbl"><div><b>${Math.round(dayPct)}%</b><span>of day</span></div></div></div>
    </div>

    <div class="card now-card span-4" style="--c:${current ? cat(current.cat).color : 'var(--accent)'}">
      <div class="card-h"><span class="card-t">${icon('target')} ${current ? 'Happening now' : 'Up next'}</span>${current ? `<span class="chip" style="border-color:${cat(current.cat).color}">${esc(cat(current.cat).name)}</span>` : ''}</div>
      ${current ? `
        <div class="now-title">${esc(current.title)}</div>
        <div class="muted">${tStr(current.start)} – ${tStr(current.end)}</div>
        <div class="row" style="margin-top:14px;align-items:baseline"><span class="countdown" data-countdown="${current.end}">--</span><span class="muted">left</span></div>
        <div class="bar" style="margin:10px 0 14px"><i data-progress="${current.start},${current.end}" style="width:${((nm - current.start) / (current.end - current.start)) * 100}%"></i></div>
        <div class="row"><button class="btn primary" id="dashFocus">${icon('play')} Focus</button><button class="btn" data-status="done" data-id="${current.id}">${icon('done')} Done</button></div>
      ` : next ? `
        <div class="now-title">${esc(next.title)}</div>
        <div class="muted">${tStr(next.start)} – ${tStr(next.end)} · starts in <span data-countdown="${next.start}">--</span></div>
        <div style="margin-top:16px" class="row"><button class="btn" id="dashFocus">${icon('play')} Free focus session</button></div>
      ` : `
        <div class="now-title">Nothing scheduled</div>
        <div class="muted">Your timeline is clear. Block some time, or start a free focus session.</div>
        <div style="margin-top:16px" class="row"><button class="btn primary" data-go="blocker">${icon('plus')} Block time</button><button class="btn" id="dashFocus">${icon('play')} Focus</button></div>
      `}
    </div>

    <div class="card span-3"><div class="stat"><b>${durStr(st.planned)}</b><span>planned today</span></div></div>
    <div class="card span-3"><div class="stat"><b>${durStr(st.done)}</b><span>blocks completed</span></div></div>
    <div class="card span-3"><div class="stat"><b>${doneToday}<span class="faint" style="font-size:22px"> / ${doneToday + focusTodos.length}</span></b><span>tasks done today</span></div></div>
    <div class="card span-3"><div class="stat"><b style="${overdue ? 'color:#f87171' : ''}">${overdue}</b><span>overdue tasks</span></div></div>

    <div class="card span-5">
      <div class="card-h"><span class="card-t">${icon('clock')} Today's agenda</span><button class="btn ghost" data-go="blocker">Open ${icon('right')}</button></div>
      <div class="agenda">${blocks.length ? blocks.map(blockRow).join('') : '<div class="empty">No blocks yet today.</div>'}</div>
    </div>

    <div class="card span-7">
      <div class="card-h"><span class="card-t">${icon('check')} Focus tasks</span><button class="btn ghost" data-go="todo">All tasks ${icon('right')}</button></div>
      <form class="row" id="dashTodoForm" style="margin-bottom:10px"><input name="text" class="grow" placeholder="Add a task for today and press Enter…" autocomplete="off"></form>
      ${focusTodos.length ? focusTodos.map(todoItem).join('') : '<div class="empty">All clear. Enjoy the calm ✨</div>'}
    </div>

    <div class="card span-7">
      <div class="card-h"><span class="card-t">${icon('sparkle')} Focus hours · last 7 days</span><span class="faint" style="font-size:12px">light = planned · bright = done</span></div>
      <div class="week-bars">${week.map(w => `<div class="wb ${w.d === t ? 'today' : ''}" title="${durStr(w.done)} done of ${durStr(w.planned)}"><div class="col"><i class="plan" style="height:${(w.planned / maxW) * 100}%"></i><i class="done" style="height:${(w.done / maxW) * 100}%"></i></div><span>${DOW[parse(w.d).getDay()]}</span></div>`).join('')}</div>
    </div>

    <div class="card span-5">
      <div class="card-h"><span class="card-t">${icon('flag')} ${MONTHS[now.getMonth()]} goals</span><button class="btn ghost" data-go="planner">Planner ${icon('right')}</button></div>
      ${S.monthFocus[mKey] ? `<p style="font-family:var(--serif);font-size:20px;margin:0 0 10px">“${esc(S.monthFocus[mKey])}”</p>` : ''}
      ${mGoals.length ? `<div class="bar" style="margin-bottom:10px"><i style="width:${(mGoals.filter(g => g.done).length / mGoals.length) * 100}%"></i></div>` + mGoals.slice(0, 5).map(g => `<div class="goal ${g.done ? 'done' : ''}"><input type="checkbox" class="chk" data-mgoal="${g.id}" ${g.done ? 'checked' : ''}><span>${esc(g.text)}</span></div>`).join('') : '<div class="empty">No goals set for this month yet.</div>'}
    </div>
  </div>`;
}
AFTER.dashboard = () => {
  bindTodoItems($('#main'));
  $('#dashTodoForm').onsubmit = e => {
    e.preventDefault();
    const v = e.target.text.value.trim(); if (!v) return;
    S.todos.unshift(newTodo({ text: v, due: todayStr() })); save(); render();
    setTimeout(() => $('#dashTodoForm input')?.focus(), 0);
  };
  $('#dashAdd').onclick = () => quickAdd();
  $('#dashFocus') && ($('#dashFocus').onclick = () => openFocus());
  $$('[data-status]').forEach(b => b.onclick = () => { setStatus(b.dataset.id, todayStr(), b.dataset.status); render(); toast('Block completed 🎉'); });
  $$('[data-open-block]').forEach(el => el.onclick = () => openBlockEditor(getBlock(el.dataset.openBlock), el.dataset.date));
  $$('[data-mgoal]').forEach(c => c.onchange = () => {
    const now = new Date(), key = `${now.getFullYear()}-${now.getMonth()}`;
    const g = (S.monthGoals[key] || []).find(x => x.id === c.dataset.mgoal); if (g) g.done = c.checked; save(); render();
  });
  tick();
};
function quickAdd() {
  openModal('Quick add', `
    <div class="seg" id="qaSeg" style="margin-bottom:16px"><button class="on" data-k="todo">Task</button><button data-k="block">Time block</button><button data-k="event">Event</button></div>
    <div class="field"><label>What</label><input id="qaText" placeholder="e.g. Draft the report"></div>
    <div class="field-row"><div class="field"><label>Date</label><input type="date" id="qaDate" value="${todayStr()}"></div><div class="field" id="qaTimeF" style="visibility:hidden"><label>Start</label><input type="time" id="qaTime" value="${toHHMM(Math.ceil(nowMin() / 15) * 15 % 1440)}"></div></div>
    <div class="modal-foot"><span></span><button class="btn primary" id="qaGo">${icon('plus')} Add</button></div>`, (m, close) => {
    let kind = 'todo';
    $$('#qaSeg button', m).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('#qaSeg button', m).forEach(x => x.classList.toggle('on', x === b)); $('#qaTimeF', m).style.visibility = kind === 'block' ? 'visible' : 'hidden'; });
    const go = () => {
      const text = $('#qaText', m).value.trim(); if (!text) return;
      const date = $('#qaDate', m).value || todayStr();
      if (kind === 'todo') S.todos.unshift(newTodo({ text, due: date }));
      else if (kind === 'block') { const s = fromHHMM($('#qaTime', m).value || '09:00'); S.blocks.push({ id: uid(), date, start: s, end: Math.min(s + 60, 1440), title: text, cat: S.cats[0].id, recur: 'none', status: 'planned', notes: '' }); }
      else (S.events[date] = S.events[date] || []).push({ id: uid(), text, color: S.settings.accent });
      save(); close(); render(); toast('Added ✓');
    };
    $('#qaGo', m).onclick = go;
    $('#qaText', m).onkeydown = e => { if (e.key === 'Enter') go(); };
  });
}

/* =========================================================
   TO-DO
   ========================================================= */
function newTodo(o) { return { id: uid(), text: '', done: false, priority: 2, due: '', tag: '', est: 30, created: Date.now(), subs: [], ...o }; }
function todoItem(t) {
  const today = todayStr();
  const dueCls = t.due && t.due < today && !t.done ? 'style="color:#f87171;border-color:#f8717155"' : '';
  const subsDone = (t.subs || []).filter(s => s.done).length;
  const scheduled = S.blocks.some(b => b.todoId === t.id);
  return `<div class="todo ${t.done ? 'done' : ''}" data-todo="${t.id}" draggable="true">
    <span class="prio p${t.priority}"></span>
    <input type="checkbox" class="chk" data-toggle ${t.done ? 'checked' : ''}>
    <div class="grow">
      <div class="txt">${esc(t.text)}</div>
      <div class="meta">
        ${t.due ? `<span class="chip" ${dueCls}>${icon('calendar')} ${relDate(t.due)}</span>` : ''}
        ${t.tag ? `<span class="chip">#${esc(t.tag)}</span>` : ''}
        ${t.est ? `<span class="chip">${icon('clock')} ${durStr(t.est)}</span>` : ''}
        ${scheduled ? `<span class="chip on">${icon('blocks')} scheduled</span>` : ''}
        ${(t.subs || []).length ? `<span class="chip">${subsDone}/${t.subs.length} steps</span>` : ''}
      </div>
      ${(t.subs || []).length ? `<div class="subs">${t.subs.map(s => `<label class="sub ${s.done ? 'done' : ''}"><input type="checkbox" class="chk" data-sub="${s.id}" ${s.done ? 'checked' : ''}><span>${esc(s.text)}</span></label>`).join('')}</div>` : ''}
    </div>
    <div class="acts">
      ${!t.done ? `<button class="icon-btn sm" data-sched title="Schedule into next free slot">${icon('blocks')}</button>` : ''}
      <button class="icon-btn sm" data-edit title="Edit">${icon('edit')}</button>
      <button class="icon-btn sm" data-del title="Delete">${icon('trash')}</button>
    </div>
  </div>`;
}
function bindTodoItems(root) {
  $$('[data-todo]', root).forEach(el => {
    const t = getTodo(el.dataset.todo); if (!t) return;
    $('[data-toggle]', el).onchange = e => {
      t.done = e.target.checked; t.doneAt = t.done ? todayStr() : null; save();
      if (t.done) { el.style.opacity = .4; toast('Task done ✓', { label: 'Undo', fn: () => { t.done = false; t.doneAt = null; save(); render(); } }); }
      setTimeout(render, t.done ? 350 : 0);
    };
    $$('[data-sub]', el).forEach(c => c.onchange = () => { const s = t.subs.find(x => x.id === c.dataset.sub); s.done = c.checked; save(); render(); });
    $('[data-edit]', el).onclick = () => openTodoEditor(t);
    $('[data-del]', el).onclick = () => {
      const idx = S.todos.indexOf(t); S.todos.splice(idx, 1); save(); render();
      toast('Task deleted', { label: 'Undo', fn: () => { S.todos.splice(idx, 0, t); save(); render(); } });
    };
    const sc = $('[data-sched]', el);
    if (sc) sc.onclick = () => scheduleTodo(t, todayStr());
    el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/todo', t.id); e.dataTransfer.effectAllowed = 'copy'; });
    $('.txt', el).ondblclick = () => openTodoEditor(t);
  });
}
function scheduleTodo(t, date, start) {
  const dur = t.est || 30;
  if (start == null) start = findFreeSlot(date, dur);
  if (start == null) { toast('No free slot left on that day'); return; }
  const cat0 = S.cats.find(c => c.name.toLowerCase().includes((t.tag || '~').toLowerCase())) || S.cats[0];
  S.blocks.push({ id: uid(), date, start, end: Math.min(start + dur, S.settings.dayEnd * 60), title: t.text, cat: cat0.id, recur: 'none', status: 'planned', notes: '', todoId: t.id });
  save(); render();
  toast(`Scheduled ${relDate(date).toLowerCase()} at ${tStr(start)}`, { label: 'View', fn: () => { ui.bDate = date; go('blocker'); } });
}
function openTodoEditor(t) {
  const isNew = !t; t = t || newTodo({});
  const tags = [...new Set(S.todos.map(x => x.tag).filter(Boolean))];
  openModal(isNew ? 'New task' : 'Edit task', `
    <div class="field"><label>Task</label><input id="teText" value="${esc(t.text)}"></div>
    <div class="field-row three">
      <div class="field"><label>Priority</label><select id="tePrio"><option value="1" ${t.priority == 1 ? 'selected' : ''}>High</option><option value="2" ${t.priority == 2 ? 'selected' : ''}>Medium</option><option value="3" ${t.priority == 3 ? 'selected' : ''}>Low</option></select></div>
      <div class="field"><label>Due</label><input type="date" id="teDue" value="${t.due || ''}"></div>
      <div class="field"><label>Estimate (min)</label><input type="number" id="teEst" min="5" step="5" value="${t.est || 30}"></div>
    </div>
    <div class="field"><label>Tag</label><input id="teTag" list="tagList" value="${esc(t.tag)}" placeholder="work, study, health…"><datalist id="tagList">${tags.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    <div class="field"><label>Steps</label><div id="teSubs" class="subs"></div><input class="sub-add" id="teSubAdd" placeholder="+ Add a step and press Enter"></div>
    <div class="modal-foot"><span></span><div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="teSave">Save</button></div></div>`, (m, close) => {
    const subs = (t.subs || []).map(s => ({ ...s }));
    const drawSubs = () => {
      $('#teSubs', m).innerHTML = subs.map(s => `<div class="sub"><input type="checkbox" class="chk" ${s.done ? 'checked' : ''} data-s="${s.id}"><span class="grow">${esc(s.text)}</span><button class="icon-btn sm" data-rm="${s.id}">${icon('x')}</button></div>`).join('');
      $$('[data-s]', m).forEach(c => c.onchange = () => { subs.find(s => s.id === c.dataset.s).done = c.checked; });
      $$('[data-rm]', m).forEach(b => b.onclick = () => { subs.splice(subs.findIndex(s => s.id === b.dataset.rm), 1); drawSubs(); });
    };
    drawSubs();
    $('#teSubAdd', m).onkeydown = e => { if (e.key === 'Enter' && e.target.value.trim()) { subs.push({ id: uid(), text: e.target.value.trim(), done: false }); e.target.value = ''; drawSubs(); } };
    const saveIt = () => {
      const text = $('#teText', m).value.trim(); if (!text) return;
      Object.assign(t, { text, priority: +$('#tePrio', m).value, due: $('#teDue', m).value, est: +$('#teEst', m).value || 30, tag: $('#teTag', m).value.trim().replace(/^#/, ''), subs });
      if (isNew) S.todos.unshift(t);
      save(); close(); render();
    };
    $('#teSave', m).onclick = saveIt;
    $('#teText', m).onkeydown = e => { if (e.key === 'Enter') saveIt(); };
  });
}
function renderTodo() {
  const t = todayStr();
  const tags = [...new Set(S.todos.map(x => x.tag).filter(Boolean))];
  let list = S.todos.filter(x => !ui.todoTag || x.tag === ui.todoTag);
  const f = ui.todoFilter;
  if (f === 'today') list = list.filter(x => !x.done && x.due && x.due <= t);
  if (f === 'upcoming') list = list.filter(x => !x.done && x.due > t);
  if (f === 'someday') list = list.filter(x => !x.done && !x.due);
  if (f === 'done') list = list.filter(x => x.done);
  const sortFn = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.priority - b.priority;
  const groups = f === 'all' ? [
    ['Overdue', list.filter(x => !x.done && x.due && x.due < t), 'overdue'],
    ['Today', list.filter(x => !x.done && x.due === t)],
    ['Upcoming', list.filter(x => !x.done && x.due > t)],
    ['Someday', list.filter(x => !x.done && !x.due)],
    ['Completed', list.filter(x => x.done).slice(0, 30)],
  ] : [[{ today: 'Today & overdue', upcoming: 'Upcoming', someday: 'No date', done: 'Completed' }[f], list]];
  const open = S.todos.filter(x => !x.done);
  const totalEst = open.filter(x => x.due && x.due <= t).reduce((a, x) => a + (x.est || 0), 0);
  const counts = { all: open.length, today: open.filter(x => x.due && x.due <= t).length, upcoming: open.filter(x => x.due > t).length, someday: open.filter(x => !x.due).length, done: S.todos.length - open.length };
  return `
  <div class="view-head"><div><div class="eyebrow">${open.length} open · ${counts.done} done</div><h1 class="title">To-do <em>list</em></h1></div></div>
  <div class="todo-layout">
    <div>
      <div class="card">
        <form class="add-todo" id="todoForm">
          <input name="text" placeholder="What needs doing?" autocomplete="off">
          <select name="priority" title="Priority"><option value="1">High</option><option value="2" selected>Medium</option><option value="3">Low</option></select>
          <input type="date" name="due" value="${t}" title="Due date">
          <input name="tag" placeholder="#tag" style="width:100px" list="tagList2"><datalist id="tagList2">${tags.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
          <input type="number" name="est" value="30" min="5" step="5" title="Estimate (min)" style="width:76px">
          <button class="btn primary">${icon('plus')} Add</button>
        </form>
      </div>
      <div class="filters">
        ${['all', 'today', 'upcoming', 'someday', 'done'].map(k => `<button class="chip ${f === k ? 'on' : ''}" data-filter="${k}">${k[0].toUpperCase() + k.slice(1)} <span class="faint">${counts[k]}</span></button>`).join('')}
        ${tags.length ? '<span style="width:10px"></span>' : ''}
        ${tags.map(x => `<button class="chip ${ui.todoTag === x ? 'on' : ''}" data-tag="${esc(x)}">#${esc(x)}</button>`).join('')}
      </div>
      ${groups.filter(g => g[1].length).map(([name, items, cls]) => `<div class="group-h ${cls || ''}">${name} <span class="chip">${items.length}</span></div>${items.sort(sortFn).map(todoItem).join('')}`).join('') || '<div class="card empty" style="margin-top:16px">Nothing here. Add a task above.</div>'}
    </div>
    <div class="side-stack">
      <div class="card">
        <div class="card-t" style="margin-bottom:10px">${icon('clock')} Today's workload</div>
        <div class="big-num">${durStr(totalEst)}</div>
        <div class="muted" style="font-size:12px;margin:4px 0 12px">estimated across ${counts.today} task${counts.today === 1 ? '' : 's'} · ${durStr(dayStats(t).free)} free on your timeline</div>
        <button class="btn" id="autoSched" style="width:100%;justify-content:center">${icon('wand')} Auto-schedule today's tasks</button>
      </div>
      <div class="card">
        <div class="card-t" style="margin-bottom:8px">${icon('flag')} Priorities</div>
        ${[1, 2, 3].map(p => { const n = open.filter(x => x.priority === p).length; return `<div class="cat-row"><span class="prio p${p}" style="height:14px"></span><span style="width:60px">${['', 'High', 'Medium', 'Low'][p]}</span><div class="bar"><i style="width:${open.length ? (n / open.length) * 100 : 0}%"></i></div><span class="v">${n}</span></div>`; }).join('')}
      </div>
      <div class="card muted" style="font-size:12.5px">
        Tip: drag any task onto the <b>Time Blocks</b> timeline to schedule it, or press ${icon('blocks')} on a task to drop it into your next free slot.
      </div>
    </div>
  </div>`;
}
AFTER.todo = () => {
  const form = $('#todoForm');
  form.onsubmit = e => {
    e.preventDefault();
    const text = form.text.value.trim(); if (!text) return;
    S.todos.unshift(newTodo({ text, priority: +form.priority.value, due: form.due.value, tag: form.tag.value.trim().replace(/^#/, ''), est: +form.est.value || 30 }));
    save(); render(); $('#todoForm input[name=text]').focus();
  };
  $$('[data-filter]').forEach(b => b.onclick = () => { ui.todoFilter = b.dataset.filter; saveUI(); render(); });
  $$('[data-tag]').forEach(b => b.onclick = () => { ui.todoTag = ui.todoTag === b.dataset.tag ? '' : b.dataset.tag; saveUI(); render(); });
  $('#autoSched').onclick = () => {
    const t = todayStr();
    const list = S.todos.filter(x => !x.done && x.due && x.due <= t && !S.blocks.some(b => b.todoId === x.id)).sort((a, b) => a.priority - b.priority);
    let n = 0;
    list.forEach(x => {
      const s = findFreeSlot(t, x.est || 30); if (s == null) return;
      S.blocks.push({ id: uid(), date: t, start: s, end: s + (x.est || 30), title: x.text, cat: S.cats[0].id, recur: 'none', status: 'planned', notes: '', todoId: x.id }); n++;
    });
    save(); render();
    toast(n ? `Scheduled ${n} task${n > 1 ? 's' : ''} into free slots` : 'Nothing to schedule', n ? { label: 'View', fn: () => { ui.bDate = t; go('blocker'); } } : null);
  };
  bindTodoItems($('#main'));
};

/* =========================================================
   PLANNER (month + year)
   ========================================================= */
function monthCells(y, m) {
  const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - offset + i));
  return cells[35].getMonth() !== m ? cells.slice(0, 35) : cells;
}
function renderPlanner() {
  return `
  <div class="view-head">
    <div><div class="eyebrow">Planner</div><h1 class="title">${ui.pMode === 'month' ? `${MONTHS[ui.pMonth]} <em>${ui.pYear}</em>` : `The year <em>${ui.pYear}</em>`}</h1></div>
    <div class="toolbar">
      <div class="seg"><button data-pmode="month" class="${ui.pMode === 'month' ? 'on' : ''}">Month</button><button data-pmode="year" class="${ui.pMode === 'year' ? 'on' : ''}">Year</button></div>
      <button class="icon-btn" id="pPrev">${icon('left')}</button><button class="btn" id="pToday">Today</button><button class="icon-btn" id="pNext">${icon('right')}</button>
    </div>
  </div>
  ${ui.pMode === 'month' ? renderMonth() : renderYear()}`;
}
function goalList(list, attr) {
  return list.map(g => `<div class="goal ${g.done ? 'done' : ''}"><input type="checkbox" class="chk" data-${attr}="${g.id}" ${g.done ? 'checked' : ''}><span>${esc(g.text)}</span><button class="icon-btn sm x" data-${attr}-rm="${g.id}">${icon('x')}</button></div>`).join('');
}
function renderMonth() {
  const y = ui.pYear, m = ui.pMonth, t = todayStr();
  const key = `${y}-${m}`;
  const goals = S.monthGoals[key] || [];
  const cells = monthCells(y, m);
  let monthPlanned = 0, monthEvents = 0;
  const cellHTML = cells.map(d => {
    const ds = fmt(d), evs = S.events[ds] || [];
    const bl = blocksForDate(ds), due = S.todos.filter(x => x.due === ds && !x.done).length;
    if (d.getMonth() === m) { monthPlanned += bl.reduce((a, b) => a + b.end - b.start, 0); monthEvents += evs.length; }
    const wk = d.getDay() === 0 || d.getDay() === 6;
    return `<button class="cal-day ${d.getMonth() !== m ? 'out' : ''} ${ds === t ? 'today' : ''} ${wk ? 'weekend' : ''}" data-day="${ds}">
      <span class="n"><b>${d.getDate()}</b></span>
      ${evs.slice(0, 3).map(e => `<span class="ev" style="--c:${e.color}">${esc(e.text)}</span>`).join('')}
      ${evs.length > 3 ? `<span class="faint" style="font-size:11px">+${evs.length - 3} more</span>` : ''}
      <span class="cal-ind">${bl.length ? `<span>${icon('blocks')}${bl.length}</span>` : ''}${due ? `<span>${icon('check')}${due}</span>` : ''}</span>
    </button>`;
  }).join('');
  return `
  <div class="planner-layout">
    <div class="card">
      <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`).join('')}${cellHTML}</div>
    </div>
    <div class="side-stack">
      <div class="card">
        <div class="card-t" style="margin-bottom:10px">${icon('sparkle')} Theme of the month</div>
        <input id="mFocus" style="width:100%;font-family:var(--serif);font-size:19px" placeholder="e.g. Consistency over intensity" value="${esc(S.monthFocus[key] || '')}">
      </div>
      <div class="card">
        <div class="card-h"><span class="card-t">${icon('flag')} Monthly goals</span><span class="faint">${goals.filter(g => g.done).length}/${goals.length}</span></div>
        ${goals.length ? `<div class="bar" style="margin-bottom:8px"><i style="width:${(goals.filter(g => g.done).length / goals.length) * 100}%"></i></div>` : ''}
        ${goalList(goals, 'mg')}
        <input id="mgAdd" class="sub-add" style="width:100%;margin-top:6px" placeholder="+ Add a goal and press Enter">
      </div>
      <div class="card">
        <div class="card-t" style="margin-bottom:10px">${icon('clock')} This month</div>
        <div class="stat-grid" style="grid-template-columns:1fr 1fr;margin:0"><div><span>Time blocked</span><b class="big-num">${durStr(monthPlanned)}</b></div><div><span>Events</span><b class="big-num">${monthEvents}</b></div></div>
      </div>
    </div>
  </div>`;
}
function renderYear() {
  const y = ui.pYear, t = todayStr();
  const goals = S.yearGoals[y] || [];
  const now = new Date();
  const pct = y < now.getFullYear() ? 100 : y > now.getFullYear() ? 0 : ((now - new Date(y, 0, 1)) / (new Date(y + 1, 0, 1) - new Date(y, 0, 1))) * 100;
  const minis = MONTHS.map((name, m) => {
    const first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const mg = S.monthGoals[`${y}-${m}`] || [];
    let cells = '';
    for (let i = 0; i < off; i++) cells += '<i class="blank"></i>';
    for (let d = 1; d <= days; d++) {
      const ds = fmt(new Date(y, m, d)), n = (S.events[ds] || []).length;
      cells += `<i class="${n >= 2 ? 'e2' : n ? 'e1' : ''} ${ds === t ? 't' : ''} ${ds < t ? 'past' : ''}">${d}</i>`;
    }
    const isCur = y === now.getFullYear() && m === now.getMonth();
    return `<div class="card mini ${isCur ? 'cur' : ''}" data-month="${m}"><h4>${name.slice(0, 3)}<small>${mg.length ? `${mg.filter(g => g.done).length}/${mg.length} goals` : ''}</small></h4>${S.monthFocus[`${y}-${m}`] ? `<div class="faint" style="font-size:11.5px;margin:-4px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(S.monthFocus[`${y}-${m}`])}</div>` : ''}<div class="mini-cal">${cells}</div></div>`;
  }).join('');
  return `
  <div class="dash" style="margin-bottom:18px">
    <div class="card span-7">
      <div class="card-h"><span class="card-t">${icon('flag')} ${y} goals</span><span class="faint">${goals.filter(g => g.done).length}/${goals.length} achieved</span></div>
      ${goalList(goals, 'yg')}
      <input id="ygAdd" class="sub-add" style="width:100%;margin-top:6px" placeholder="+ Add a yearly goal and press Enter">
    </div>
    <div class="card span-5">
      <div class="card-t" style="margin-bottom:10px">${icon('clock')} Year progress</div>
      <div class="big-num" style="font-size:54px">${pct.toFixed(1)}%</div>
      <div class="bar" style="margin:12px 0 8px"><i style="width:${pct}%"></i></div>
      <div class="muted" style="font-size:12.5px">${y === now.getFullYear() ? `${Math.ceil((new Date(y + 1, 0, 1) - now) / 864e5)} days left in ${y}. Make them count.` : ''}</div>
    </div>
  </div>
  <div class="year-grid">${minis}</div>`;
}
AFTER.planner = () => {
  $$('[data-pmode]').forEach(b => b.onclick = () => { ui.pMode = b.dataset.pmode; saveUI(); render(); });
  const shift = n => {
    if (ui.pMode === 'year') ui.pYear += n;
    else { const d = new Date(ui.pYear, ui.pMonth + n, 1); ui.pYear = d.getFullYear(); ui.pMonth = d.getMonth(); }
    saveUI(); render();
  };
  $('#pPrev').onclick = () => shift(-1);
  $('#pNext').onclick = () => shift(1);
  $('#pToday').onclick = () => { const d = new Date(); ui.pYear = d.getFullYear(); ui.pMonth = d.getMonth(); saveUI(); render(); };
  $$('[data-day]').forEach(b => b.onclick = () => openDay(b.dataset.day));
  $$('[data-month]').forEach(b => b.onclick = () => { ui.pMonth = +b.dataset.month; ui.pMode = 'month'; saveUI(); render(); });

  const bindGoals = (attr, getList) => {
    $$(`[data-${attr}]`).forEach(c => c.onchange = () => { const g = getList().find(x => x.id === c.getAttribute(`data-${attr}`)); g.done = c.checked; save(); render(); });
    $$(`[data-${attr}-rm]`).forEach(b => b.onclick = () => { const l = getList(); l.splice(l.findIndex(x => x.id === b.getAttribute(`data-${attr}-rm`)), 1); save(); render(); });
  };
  const mKey = `${ui.pYear}-${ui.pMonth}`;
  bindGoals('mg', () => (S.monthGoals[mKey] = S.monthGoals[mKey] || []));
  bindGoals('yg', () => (S.yearGoals[ui.pYear] = S.yearGoals[ui.pYear] || []));
  const addGoal = (id, getList) => { const el = $(id); if (el) el.onkeydown = e => { if (e.key === 'Enter' && el.value.trim()) { getList().push({ id: uid(), text: el.value.trim(), done: false }); save(); render(); $(id)?.focus(); } }; };
  addGoal('#mgAdd', () => (S.monthGoals[mKey] = S.monthGoals[mKey] || []));
  addGoal('#ygAdd', () => (S.yearGoals[ui.pYear] = S.yearGoals[ui.pYear] || []));
  const mf = $('#mFocus');
  if (mf) mf.onchange = () => { S.monthFocus[mKey] = mf.value.trim(); save(); };
};
const EVENT_COLORS = ['#a78bfa', '#f0abfc', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'];
function openDay(ds) {
  const draw = (m) => {
    const evs = S.events[ds] || [];
    const bl = blocksForDate(ds);
    const due = S.todos.filter(x => x.due === ds);
    $('#dayBody', m).innerHTML = `
      <div class="lbl-sm" style="margin-bottom:6px">Events & notes</div>
      ${evs.map(e => `<div class="goal"><span class="dot" style="background:${e.color}"></span><span>${esc(e.text)}</span><button class="icon-btn sm x" data-ev-rm="${e.id}">${icon('x')}</button></div>`).join('') || '<div class="faint" style="font-size:13px;margin-bottom:6px">Nothing yet.</div>'}
      <div class="row" style="margin:8px 0 18px"><input id="evText" class="grow" placeholder="Birthday, exam, trip…"><div class="row" id="evColors" style="gap:4px">${EVENT_COLORS.map((c, i) => `<button class="dot" data-c="${c}" style="background:${c};width:18px;height:18px;${i === 0 ? 'outline:2px solid var(--text);outline-offset:2px' : ''}"></button>`).join('')}</div><button class="btn primary" id="evAdd">${icon('plus')}</button></div>
      <div class="lbl-sm" style="margin-bottom:6px">Time blocks (${bl.length})</div>
      ${bl.map(b => `<div class="ag-item" style="--c:${cat(b.cat).color};padding:6px 4px"><span class="time">${tStr(b.start)}</span><span class="stripe"></span><span class="grow">${esc(b.title)}</span><span class="faint" style="font-size:12px">${durStr(b.end - b.start)}</span></div>`).join('') || '<div class="faint" style="font-size:13px">No blocks.</div>'}
      <div class="lbl-sm" style="margin:18px 0 6px">Tasks due (${due.length})</div>
      ${due.map(x => `<div class="goal ${x.done ? 'done' : ''}"><span class="prio p${x.priority}" style="height:14px"></span><span>${esc(x.text)}</span></div>`).join('') || '<div class="faint" style="font-size:13px">No tasks due.</div>'}`;
    let color = EVENT_COLORS[0];
    $$('#evColors button', m).forEach(b => b.onclick = () => { color = b.dataset.c; $$('#evColors button', m).forEach(x => x.style.outline = x === b ? '2px solid var(--text)' : 'none'); });
    const add = () => { const v = $('#evText', m).value.trim(); if (!v) return; (S.events[ds] = S.events[ds] || []).push({ id: uid(), text: v, color }); save(); draw(m); render(); $('#evText', m).focus(); };
    $('#evAdd', m).onclick = add;
    $('#evText', m).onkeydown = e => { if (e.key === 'Enter') add(); };
    $$('[data-ev-rm]', m).forEach(b => b.onclick = () => { S.events[ds] = evs.filter(e => e.id !== b.dataset.evRm); if (!S.events[ds].length) delete S.events[ds]; save(); draw(m); render(); });
  };
  openModal(niceDate(ds), `<div id="dayBody"></div><div class="modal-foot"><button class="btn" id="dayTodo">${icon('check')} Add task</button><button class="btn primary" id="dayBlocks">${icon('blocks')} Open in Time Blocks</button></div>`, (m, close) => {
    draw(m);
    $('#dayBlocks', m).onclick = () => { close(); ui.bDate = ds; ui.bMode = 'day'; go('blocker'); };
    $('#dayTodo', m).onclick = () => { close(); openTodoEditor(null); setTimeout(() => { const d = $('#teDue'); if (d) d.value = ds; }, 40); };
  });
}

/* =========================================================
   TIME BLOCKER
   ========================================================= */
const PXM = 1.1; // px per minute — keep in sync with --pxm
function weekDates(ds) { const d = parse(ds), off = (d.getDay() + 6) % 7; return Array.from({ length: 7 }, (_, i) => addDays(ds, i - off)); }
function renderBlocker() {
  const dates = ui.bMode === 'day' ? [ui.bDate] : weekDates(ui.bDate);
  const t = todayStr(), nm = nowMin();
  const ds0 = S.settings.dayStart * 60, ds1 = S.settings.dayEnd * 60;
  const H = (ds1 - ds0) * PXM;
  const cols = `56px repeat(${dates.length}, minmax(${dates.length > 1 ? 110 : 200}px, 1fr))`;
  let hours = '';
  for (let h = S.settings.dayStart; h <= S.settings.dayEnd; h++) hours += `<span style="top:${(h * 60 - ds0) * PXM}px">${h === S.settings.dayEnd && h === 24 ? '' : tStr(h * 60)}</span>`;
  const colHTML = dates.map(d => {
    const laid = layoutBlocks(blocksForDate(d));
    const pastH = d < t ? H : d === t ? clamp((nm - ds0) * PXM, 0, H) : 0;
    return `<div class="tl-col ${d === t ? 'today' : ''} past-shade" data-date="${d}" style="height:${H}px;--past:${pastH}px">
      ${laid.map(b => blockHTML(b, d)).join('')}
      ${d === t && nm >= ds0 && nm <= ds1 ? `<div class="now-line" id="nowLine" style="top:${(nm - ds0) * PXM}px"><span>${tStr(nm)}</span></div>` : ''}
    </div>`;
  }).join('');
  const head = dates.length > 1 ? `<div class="tl-head" style="grid-template-columns:${cols}"><div></div>${dates.map(d => { const st = dayStats(d); return `<div class="${d === t ? 'today' : ''}" data-dayhead="${d}">${DOW[parse(d).getDay()]}<b>${parse(d).getDate()}</b><small>${st.planned ? durStr(st.planned) : '—'}</small></div>`; }).join('')}</div>` : '';

  // side panel data
  const statDates = dates;
  let planned = 0, done = 0, free = 0; const byCat = {};
  statDates.forEach(d => { const s = dayStats(d); planned += s.planned; done += s.done; free += s.free; Object.entries(s.byCat).forEach(([k, v]) => byCat[k] = (byCat[k] || 0) + v); });
  const maxCat = Math.max(1, ...Object.values(byCat));
  const unscheduled = S.todos.filter(x => !x.done && !S.blocks.some(b => b.todoId === x.id)).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.priority - b.priority).slice(0, 12);
  const label = ui.bMode === 'day' ? niceDate(ui.bDate) : `${niceDate(dates[0], { month: 'short', day: 'numeric' })} – ${niceDate(dates[6], { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return `
  <div class="view-head">
    <div><div class="eyebrow">${ui.bMode === 'day' ? relDate(ui.bDate) : 'Week view'}</div><h1 class="title">${ui.bMode === 'day' ? `${niceDate(ui.bDate, { weekday: 'long' })} <em>${niceDate(ui.bDate, { month: 'long', day: 'numeric' })}</em>` : esc(label)}</h1></div>
    <div class="toolbar">
      <div class="seg"><button data-bmode="day" class="${ui.bMode === 'day' ? 'on' : ''}">Day</button><button data-bmode="week" class="${ui.bMode === 'week' ? 'on' : ''}">Week</button></div>
      <button class="icon-btn" id="bPrev" title="Previous (←)">${icon('left')}</button><button class="btn" id="bToday" title="Today (T)">Today</button><button class="icon-btn" id="bNext" title="Next (→)">${icon('right')}</button>
      <input type="date" id="bJump" value="${ui.bDate}" style="width:150px">
      <button class="btn primary" id="bNew" title="New block (N)">${icon('plus')} Block</button>
    </div>
  </div>
  <div class="blk-layout">
    <div class="card tl-card">
      ${head}
      <div class="tl-scroll" id="tlScroll">
        <div class="tl-grid" style="grid-template-columns:${cols};height:${H + 16}px;padding-top:8px">
          <div class="tl-hours" style="height:${H}px">${hours}</div>
          ${colHTML}
        </div>
      </div>
    </div>
    <div class="side-stack">
      <div class="card">
        <div class="card-t" style="margin-bottom:12px">${icon('sparkle')} ${ui.bMode === 'day' ? 'Day' : 'Week'} at a glance</div>
        <div class="stat-grid"><div><span>Planned</span><b class="big-num" style="font-size:22px">${durStr(planned)}</b></div><div><span>Done</span><b class="big-num" style="font-size:22px">${durStr(done)}</b></div><div><span>Free</span><b class="big-num" style="font-size:22px">${durStr(free)}</b></div></div>
        <div class="bar" style="margin-bottom:12px" title="completion"><i style="width:${planned ? (done / planned) * 100 : 0}%"></i></div>
        ${Object.keys(byCat).length ? S.cats.filter(c => byCat[c.id]).map(c => `<div class="cat-row"><span class="dot" style="background:${c.color}"></span><span style="width:84px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</span><div class="bar"><i style="width:${(byCat[c.id] / maxCat) * 100}%;background:${c.color}"></i></div><span class="v">${durStr(byCat[c.id])}</span></div>`).join('') : '<div class="faint" style="font-size:13px">Drag on the timeline to create your first block.</div>'}
      </div>
      <div class="card">
        <div class="card-h"><span class="card-t">${icon('layout')} Day tools</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn" id="bTpl">${icon('layout')} Templates</button>
          <button class="btn" id="bSaveTpl">${icon('download')} Save as template</button>
          <button class="btn" id="bCopy">${icon('copy')} Copy prev. day</button>
          <button class="btn" id="bShift">${icon('clock')} Shift remaining</button>
          <button class="btn" id="bFocus">${icon('target')} Focus now</button>
          <button class="btn danger" id="bClear">${icon('trash')} Clear day</button>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><span class="card-t">${icon('check')} Unscheduled tasks</span><span class="faint" style="font-size:11.5px">drag → timeline</span></div>
        ${unscheduled.length ? unscheduled.map(x => `<div class="mini-todo" draggable="true" data-mtodo="${x.id}"><span class="prio p${x.priority}" style="height:14px"></span><span class="grow">${esc(x.text)}</span><span class="faint" style="font-size:11px">${durStr(x.est || 30)}</span></div>`).join('') : '<div class="faint" style="font-size:13px">Everything is scheduled. 👌</div>'}
      </div>
      <div class="card muted" style="font-size:12.5px;line-height:1.9">
        <div class="card-t" style="margin-bottom:6px">Shortcuts</div>
        <span class="kbd">Drag</span> empty space to create · <span class="kbd">Drag</span> block to move · pull bottom edge to resize<br>
        <span class="kbd">N</span> new block · <span class="kbd">T</span> today · <span class="kbd">←</span><span class="kbd">→</span> navigate · <span class="kbd">W</span> week/day · <span class="kbd">F</span> focus
      </div>
    </div>
  </div>`;
}
function blockHTML(b, date) {
  const c = cat(b.cat).color;
  const ds0 = S.settings.dayStart * 60;
  const top = (Math.max(b.start, ds0) - ds0) * PXM;
  const h = Math.max(14, (b.end - Math.max(b.start, ds0)) * PXM - 2);
  const w = 100 / (b._lanes || 1);
  const nm = nowMin(), isNow = date === todayStr() && b.start <= nm && nm < b.end && b.status === 'planned';
  const short = b.end - b.start < 40;
  return `<div class="blk ${b.status} ${b._conflict ? 'conflict' : ''} ${isNow ? 'current' : ''} ${short ? 'short' : ''}" data-id="${b.id}" data-date="${date}"
    style="--c:${c};top:${top}px;height:${h}px;left:calc(${(b._lane || 0) * w}% + 3px);width:calc(${w}% - 6px);right:auto"
    title="${esc(b.title)} · ${tStr(b.start)}–${tStr(b.end)}${b._conflict ? ' · ⚠ overlaps another block' : ''}">
    <div class="blk-title">${b.status === 'done' ? icon('done') : ''}${isRecur(b) ? icon('repeat') : ''}${b.todoId ? icon('link') : ''}<span style="overflow:hidden;text-overflow:ellipsis">${esc(b.title)}</span></div>
    <div class="blk-time">${tStr(b.start)} – ${tStr(b.end)} · ${durStr(b.end - b.start)}</div>
    ${!short && b.notes && h > 70 ? `<div class="blk-time" style="margin-top:4px;white-space:normal">${esc(b.notes)}</div>` : ''}
    <div class="blk-resize"></div>
  </div>`;
}
AFTER.blocker = prevScroll => {
  const sc = $('#tlScroll');
  if (prevScroll != null && sc.dataset.keep !== '0') sc.scrollTop = prevScroll;
  if (prevScroll == null || prevScroll === 0) {
    const target = ui.bDate === todayStr() || ui.bMode === 'week' ? nowMin() - 90 : 7 * 60;
    sc.scrollTop = Math.max(0, (target - S.settings.dayStart * 60) * PXM);
  }
  $$('[data-bmode]').forEach(b => b.onclick = () => { ui.bMode = b.dataset.bmode; saveUI(); renderFresh(); });
  $('#bPrev').onclick = () => shiftDay(-1);
  $('#bNext').onclick = () => shiftDay(1);
  $('#bToday').onclick = () => { ui.bDate = todayStr(); renderFresh(); };
  $('#bJump').onchange = e => { if (e.target.value) { ui.bDate = e.target.value; renderFresh(); } };
  $('#bNew').onclick = () => newBlockAtNextSlot();
  $('#bFocus').onclick = () => openFocus();
  $('#bTpl').onclick = openTemplates;
  $('#bSaveTpl').onclick = saveTemplate;
  $('#bCopy').onclick = copyPrevDay;
  $('#bClear').onclick = clearDay;
  $('#bShift').onclick = shiftRemaining;
  $$('[data-dayhead]').forEach(el => el.onclick = () => { ui.bDate = el.dataset.dayhead; ui.bMode = 'day'; renderFresh(); });
  $$('[data-mtodo]').forEach(el => el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/todo', el.dataset.mtodo); e.dataTransfer.effectAllowed = 'copy'; }));
  $$('.tl-col').forEach(col => {
    col.addEventListener('pointerdown', e => onColDown(e, col));
    col.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/todo')) { e.preventDefault(); col.classList.add('drop'); } });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('drop');
      const t = getTodo(e.dataTransfer.getData('text/todo')); if (!t) return;
      const start = clamp(Math.floor(yToMin(col, e.clientY) / S.settings.snap) * S.settings.snap, S.settings.dayStart * 60, S.settings.dayEnd * 60 - (t.est || 30));
      scheduleTodo(t, col.dataset.date, start);
    });
  });
};
function renderFresh() { saveUI(); const sc = $('#tlScroll'); if (sc) sc.dataset.keep = '0'; $('#main').innerHTML = `<section class="view" id="view-blocker">${renderBlocker()}</section>`; AFTER.blocker(null); }
function shiftDay(n) { ui.bDate = addDays(ui.bDate, ui.bMode === 'week' ? n * 7 : n); renderFresh(); }
function yToMin(col, clientY) { return S.settings.dayStart * 60 + (clientY - col.getBoundingClientRect().top) / PXM; }
const snapM = m => Math.round(m / S.settings.snap) * S.settings.snap;

function onColDown(e, col) {
  if (e.button !== 0) return;
  const blkEl = e.target.closest('.blk');
  if (blkEl) return onBlockDown(e, blkEl);
  const date = col.dataset.date, snap = S.settings.snap;
  const lo = S.settings.dayStart * 60, hi = S.settings.dayEnd * 60;
  const m0 = clamp(Math.floor(yToMin(col, e.clientY) / snap) * snap, lo, hi - snap);
  const isTouch = e.pointerType === 'touch';
  const sx = e.clientX, sy = e.clientY;
  if (isTouch) {
    // touch: tap to create (dragging scrolls)
    const up = ev => { col.removeEventListener('pointerup', up); if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 8) openBlockEditor(null, date, { start: m0, end: Math.min(m0 + 60, hi) }); };
    col.addEventListener('pointerup', up);
    return;
  }
  e.preventDefault();
  const ghost = document.createElement('div');
  ghost.className = 'tl-ghost';
  col.appendChild(ghost);
  let s = m0, en = m0 + snap;
  const draw = () => { ghost.style.top = (s - lo) * PXM + 'px'; ghost.style.height = (en - s) * PXM + 'px'; ghost.textContent = `${tStr(s)} – ${tStr(en)} · ${durStr(en - s)}`; };
  draw();
  const move = ev => {
    const m = clamp(yToMin(col, ev.clientY), lo, hi);
    if (m >= m0) { s = m0; en = Math.max(m0 + snap, Math.ceil(m / snap) * snap); }
    else { s = Math.floor(m / snap) * snap; en = m0 + snap; }
    draw();
  };
  const up = ev => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    ghost.remove();
    const clicked = Math.abs(ev.clientY - sy) < 5;
    if (clicked) { s = m0; en = Math.min(m0 + 60, hi); }
    openBlockEditor(null, date, { start: s, end: en });
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
function onBlockDown(e, el) {
  const b = getBlock(el.dataset.id); if (!b) return;
  const date = el.dataset.date;
  const isResize = e.target.classList.contains('blk-resize');
  const isTouch = e.pointerType === 'touch';
  const sx = e.clientX, sy = e.clientY, o0 = b.start, o1 = b.end, dur = o1 - o0;
  const lo = S.settings.dayStart * 60, hi = S.settings.dayEnd * 60, snap = S.settings.snap;
  const cols = $$('.tl-col').map(c => ({ c, r: c.getBoundingClientRect(), date: c.dataset.date }));
  let moved = false, ns = o0, ne = o1, tDate = date;
  e.preventDefault(); e.stopPropagation();
  const timeEl = $('.blk-time', el);
  const move = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (isTouch && !moved && !isResize) return; // keep taps as taps on touch
    moved = true; el.classList.add('dragging');
    const dm = dy / PXM;
    if (isResize) {
      ne = clamp(snapM(o1 + dm), o0 + snap, hi);
      el.style.height = (ne - o0) * PXM - 2 + 'px';
    } else {
      ns = clamp(snapM(o0 + dm), lo, hi - dur); ne = ns + dur;
      el.style.top = (ns - lo) * PXM + 'px';
      const hit = cols.find(c => ev.clientX >= c.r.left && ev.clientX < c.r.right);
      if (hit && hit.date !== tDate && !isRecur(b)) { tDate = hit.date; hit.c.appendChild(el); el.style.left = '3px'; el.style.width = 'calc(100% - 6px)'; }
    }
    timeEl.textContent = `${tStr(ns)} – ${tStr(ne)} · ${durStr(ne - ns)}`;
  };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    if (!moved) { openBlockEditor(b, date); return; }
    const before = { start: b.start, end: b.end, date: b.date };
    b.start = ns; b.end = ne;
    if (!isRecur(b)) b.date = tDate;
    save(); render();
    toast(`${isResize ? 'Resized' : 'Moved'} to ${tStr(ns)} – ${tStr(ne)}`, { label: 'Undo', fn: () => { Object.assign(b, before); save(); render(); } });
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
function newBlockAtNextSlot() {
  const s = findFreeSlot(ui.bDate, 60) ?? 9 * 60;
  openBlockEditor(null, ui.bDate, { start: s, end: Math.min(s + 60, S.settings.dayEnd * 60) });
}
function openBlockEditor(b, date, preset = {}) {
  const isNew = !b;
  const occ = date || ui.bDate;
  const d = b ? { ...b, status: isRecur(b) ? ((b.ex || {})[occ] || 'planned') : (b.status || 'planned') } : { title: '', cat: S.cats[0].id, start: preset.start ?? 540, end: preset.end ?? 600, recur: 'none', notes: '', status: 'planned', todoId: '' };
  const openTodos = S.todos.filter(x => !x.done || x.id === d.todoId);
  openModal(isNew ? 'New time block' : 'Edit block', `
    <div class="field"><label>Title</label><input id="beTitle" value="${esc(d.title)}" placeholder="What will you focus on?"></div>
    <div class="field"><label>Category</label><div class="cat-pick" id="beCats">${S.cats.map(c => `<button data-cat="${c.id}" style="--c:${c.color}" class="${c.id === d.cat ? 'on' : ''}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}</div></div>
    <div class="field-row three">
      <div class="field"><label>Date</label><input type="date" id="beDate" value="${isRecur(d) ? d.date : occ}"></div>
      <div class="field"><label>Start</label><input type="time" id="beStart" step="300" value="${toHHMM(d.start)}"></div>
      <div class="field"><label>End</label><input type="time" id="beEnd" step="300" value="${toHHMM(d.end)}"></div>
    </div>
    <div class="dur-chips" style="margin:-6px 0 14px">${[15, 25, 30, 45, 60, 90, 120].map(m => `<button class="chip" data-dur="${m}">${durStr(m)}</button>`).join('')}</div>
    <div class="field-row">
      <div class="field"><label>Repeat</label><select id="beRecur">${[['none', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Weekdays (Mon–Fri)'], ['weekends', 'Weekends'], ['weekly', 'Weekly on this day']].map(([v, l]) => `<option value="${v}" ${d.recur === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Linked task</label><select id="beTodo"><option value="">— none —</option>${openTodos.map(x => `<option value="${x.id}" ${x.id === d.todoId ? 'selected' : ''}>${esc(x.text.slice(0, 40))}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="beNotes" rows="2" placeholder="Intention, links, sub-steps…">${esc(d.notes || '')}</textarea></div>
    ${!isNew ? `<div class="field"><label>Status ${isRecur(d) ? `<span class="faint" style="text-transform:none;letter-spacing:0">(for ${relDate(occ).toLowerCase()})</span>` : ''}</label><div class="seg status-pick" id="beStatus">${['planned', 'done', 'skipped'].map(s => `<button data-s="${s}" class="${d.status === s ? 'on' : ''}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div></div>` : ''}
    <div id="beWarn" class="faint" style="font-size:12.5px;min-height:18px"></div>
    <div class="modal-foot">
      <div class="row">${!isNew ? `<button class="btn danger" id="beDel">${icon('trash')} Delete</button><button class="btn" id="beDup">${icon('copy')} Duplicate</button>` : ''}</div>
      <div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="beSave">${isNew ? 'Create block' : 'Save'}</button></div>
    </div>`, (m, close) => {
    let catId = d.cat, status = d.status;
    $$('#beCats button', m).forEach(btn => btn.onclick = () => { catId = btn.dataset.cat; $$('#beCats button', m).forEach(x => x.classList.toggle('on', x === btn)); });
    $$('#beStatus button', m).forEach(btn => btn.onclick = () => { status = btn.dataset.s; $$('#beStatus button', m).forEach(x => x.classList.toggle('on', x === btn)); });
    const readTimes = () => { const s = fromHHMM($('#beStart', m).value || '09:00'); let e = fromHHMM($('#beEnd', m).value || '10:00'); if (e <= s && e === 0) e = 1440; return [s, e]; };
    const warn = () => {
      const [s, e] = readTimes(), dt = $('#beDate', m).value;
      const clash = blocksForDate(dt).filter(x => x.id !== (b && b.id) && x.status !== 'skipped' && x.start < e && x.end > s);
      $('#beWarn', m).innerHTML = e <= s ? '<span style="color:#f87171">End must be after start.</span>' : clash.length ? `<span style="color:#fbbf24">⚠ Overlaps: ${clash.map(x => esc(x.title)).join(', ')}</span>` : `${durStr(e - s)} block`;
    };
    ['#beStart', '#beEnd', '#beDate'].forEach(id => $(id, m).addEventListener('input', warn));
    warn();
    $$('[data-dur]', m).forEach(c => c.onclick = () => { const [s] = readTimes(); $('#beEnd', m).value = toHHMM(Math.min(s + +c.dataset.dur, 1439)); warn(); });
    $('#beTodo', m).onchange = e => { const t = getTodo(e.target.value); if (t && !$('#beTitle', m).value.trim()) $('#beTitle', m).value = t.text; };
    const saveIt = () => {
      const [s, e] = readTimes();
      if (e <= s) return warn();
      const title = $('#beTitle', m).value.trim() || cat(catId).name;
      const vals = { title, cat: catId, start: s, end: e, recur: $('#beRecur', m).value, notes: $('#beNotes', m).value.trim(), todoId: $('#beTodo', m).value };
      const newDate = $('#beDate', m).value || occ;
      if (isNew) { S.blocks.push({ id: uid(), date: newDate, status: 'planned', ex: {}, ...vals }); }
      else {
        Object.assign(b, vals, { date: newDate });
        if (vals.recur !== 'none') b.ex = b.ex || {};
        if (status !== d.status) setStatus(b.id, occ, status);
      }
      save(); close(); render();
      if (status === 'done' && status !== d.status) chime();
    };
    $('#beSave', m).onclick = saveIt;
    $('#beTitle', m).onkeydown = e => { if (e.key === 'Enter') saveIt(); };
    if (!isNew) {
      $('#beDup', m).onclick = () => { const copy = { ...JSON.parse(JSON.stringify(b)), id: uid(), date: occ, recur: 'none', status: 'planned', ex: {} }; const len = b.end - b.start; copy.start = Math.min(b.end, S.settings.dayEnd * 60 - len); copy.end = copy.start + len; S.blocks.push(copy); save(); close(); render(); toast('Duplicated'); };
      $('#beDel', m).onclick = () => {
        if (!isRecur(b)) { const snapshot = JSON.parse(JSON.stringify(b)); deleteBlock(b.id, occ); close(); render(); toast('Block deleted', { label: 'Undo', fn: () => { S.blocks.push(snapshot); save(); render(); } }); return; }
        close();
        openModal('Delete repeating block', `<p class="muted">“${esc(b.title)}” repeats. What should be removed?</p><div style="display:flex;flex-direction:column;gap:8px;margin-top:14px"><button class="btn" data-scope="one">Only ${relDate(occ).toLowerCase()}</button><button class="btn" data-scope="future">This and all following</button><button class="btn danger" data-scope="all">The whole series</button></div>`, (m2, close2) => {
          $$('[data-scope]', m2).forEach(btn => btn.onclick = () => { deleteBlock(b.id, occ, btn.dataset.scope); close2(); render(); toast('Deleted'); });
        });
      };
    }
  });
}
function openTemplates() {
  openModal('Day templates', `
    <p class="muted" style="margin-top:-6px">Apply a saved routine to <b>${relDate(ui.bDate)}</b>. Existing blocks stay put.</p>
    <div id="tplList">${S.templates.map(tp => `<div class="card" style="padding:14px;margin-bottom:10px;box-shadow:none">
      <div class="row"><b class="grow">${esc(tp.name)}</b><button class="btn primary" data-apply="${tp.id}">Apply</button><button class="icon-btn sm" data-tdel="${tp.id}">${icon('trash')}</button></div>
      <div class="row" style="gap:3px;margin-top:10px;height:8px">${tp.blocks.map(x => `<span style="flex:${x.end - x.start};height:8px;border-radius:4px;background:${cat(x.cat).color}" title="${esc(x.title)}"></span>`).join('')}</div>
      <div class="faint" style="font-size:12px;margin-top:6px">${tp.blocks.length} blocks · ${durStr(tp.blocks.reduce((a, x) => a + x.end - x.start, 0))} · ${tStr(Math.min(...tp.blocks.map(x => x.start)))}–${tStr(Math.max(...tp.blocks.map(x => x.end)))}</div>
    </div>`).join('') || '<div class="empty">No templates yet. Plan a day, then “Save as template”.</div>'}</div>`, (m, close) => {
    $$('[data-apply]', m).forEach(btn => btn.onclick = () => {
      const tp = S.templates.find(x => x.id === btn.dataset.apply);
      tp.blocks.forEach(x => S.blocks.push({ id: uid(), date: ui.bDate, ...x, recur: 'none', status: 'planned', notes: x.notes || '' }));
      save(); close(); render(); toast(`Applied “${esc(tp.name)}”`);
    });
    $$('[data-tdel]', m).forEach(btn => btn.onclick = () => { S.templates = S.templates.filter(x => x.id !== btn.dataset.tdel); save(); close(); openTemplates(); });
  });
}
function saveTemplate() {
  const list = blocksForDate(ui.bDate);
  if (!list.length) return toast('This day has no blocks to save');
  openModal('Save as template', `<div class="field"><label>Template name</label><input id="tplName" placeholder="e.g. Study Day, Gym Day"></div><p class="faint" style="font-size:12.5px">${list.length} blocks from ${relDate(ui.bDate).toLowerCase()} will be saved.</p><div class="modal-foot"><span></span><button class="btn primary" id="tplSave">Save template</button></div>`, (m, close) => {
    const go = () => { const name = $('#tplName', m).value.trim() || 'My routine'; S.templates.push({ id: uid(), name, blocks: list.map(b => ({ start: b.start, end: b.end, title: b.title, cat: b.cat, notes: b.notes || '' })) }); save(); close(); toast('Template saved'); };
    $('#tplSave', m).onclick = go; $('#tplName', m).onkeydown = e => { if (e.key === 'Enter') go(); };
  });
}
function copyPrevDay() {
  const prev = addDays(ui.bDate, -1);
  const src = S.blocks.filter(b => !isRecur(b) && b.date === prev);
  if (!src.length) return toast('Previous day has no one-off blocks');
  src.forEach(b => S.blocks.push({ ...JSON.parse(JSON.stringify(b)), id: uid(), date: ui.bDate, status: 'planned' }));
  save(); render(); toast(`Copied ${src.length} blocks from ${relDate(prev).toLowerCase()}`);
}
async function clearDay() {
  const n = S.blocks.filter(b => !isRecur(b) && b.date === ui.bDate).length;
  if (!n) return toast('No one-off blocks to clear');
  if (!(await confirmBox(`Remove ${n} one-off block${n > 1 ? 's' : ''} from ${relDate(ui.bDate).toLowerCase()}? Repeating blocks are kept.`, 'Clear day'))) return;
  const removed = S.blocks.filter(b => !isRecur(b) && b.date === ui.bDate);
  S.blocks = S.blocks.filter(b => isRecur(b) || b.date !== ui.bDate);
  save(); render(); toast('Day cleared', { label: 'Undo', fn: () => { S.blocks.push(...removed); save(); render(); } });
}
function shiftRemaining() {
  // running late? push every upcoming one-off block today later
  openModal('Shift remaining blocks', `<p class="muted" style="margin-top:-6px">Running late or ahead? Move every <b>upcoming</b> one-off block on ${relDate(ui.bDate).toLowerCase()}.</p>
    <div class="dur-chips" style="margin:14px 0">${[-30, -15, 15, 30, 45, 60].map(m => `<button class="chip" data-sh="${m}">${m > 0 ? '+' : '−'}${durStr(Math.abs(m))}</button>`).join('')}</div>`, (m, close) => {
    $$('[data-sh]', m).forEach(btn => btn.onclick = () => {
      const by = +btn.dataset.sh, from = ui.bDate === todayStr() ? nowMin() : 0;
      const list = S.blocks.filter(b => !isRecur(b) && b.date === ui.bDate && b.start >= from && b.status !== 'done');
      list.forEach(b => { const len = b.end - b.start; b.start = clamp(b.start + by, S.settings.dayStart * 60, S.settings.dayEnd * 60 - len); b.end = b.start + len; });
      save(); close(); render(); toast(`Shifted ${list.length} block${list.length === 1 ? '' : 's'}`);
    });
  });
}

/* =========================================================
   FOCUS MODE
   ========================================================= */
const focus = { on: false, mode: 'block', blockId: null, date: null, startAt: 0, endAt: 0, paused: 0, finished: false };
function openFocus() {
  const t = todayStr(), nm = nowMin();
  const cur = blocksForDate(t).find(b => b.start <= nm && nm < b.end && b.status === 'planned');
  const base = new Date(); base.setHours(0, 0, 0, 0);
  if (cur) Object.assign(focus, { mode: 'block', blockId: cur.id, date: t, startAt: +base + cur.start * 60000, endAt: +base + cur.end * 60000 });
  else Object.assign(focus, { mode: 'pomo', blockId: null, startAt: Date.now(), endAt: Date.now() + S.settings.pomodoro * 60000 });
  Object.assign(focus, { on: true, paused: 0, finished: false });
  $('#focus').hidden = false;
  drawFocus();
}
function closeFocus() { focus.on = false; $('#focus').hidden = true; render(); }
function drawFocus() {
  const el = $('#focus'); if (!focus.on) return;
  const b = focus.blockId ? getBlock(focus.blockId) : null;
  const now = focus.paused || Date.now();
  const total = focus.endAt - focus.startAt, left = Math.max(0, focus.endAt - now);
  const pct = total ? 1 - left / total : 1;
  const R = 140, C = 2 * Math.PI * R;
  const mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60;
  const hh = Math.floor(mm / 60);
  const nextB = blocksForDate(todayStr()).find(x => x.start >= nowMin() && x.id !== focus.blockId && x.status === 'planned');
  const c = b ? cat(b.cat).color : 'var(--accent)';
  el.style.setProperty('--c', c);
  el.innerHTML = `
    <button class="icon-btn f-close" id="fClose" title="Exit (Esc)">${icon('x')}</button>
    <div class="f-wrap">
      <div class="eyebrow">${focus.mode === 'block' ? `${esc(cat(b.cat).name)} · ${tStr(b.start)} – ${tStr(b.end)}` : 'Free focus session'}</div>
      <h2 class="f-title">${focus.mode === 'block' ? esc(b.title) : 'Deep focus'}</h2>
      <div class="f-ring">
        <svg width="100%" height="100%" viewBox="0 0 300 300"><circle cx="150" cy="150" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="10"/><circle id="fRing" cx="150" cy="150" r="${R}" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="filter:drop-shadow(0 0 12px ${c});transition:stroke-dashoffset 1s linear"/></svg>
        <div class="f-time"><b id="fTimeB">${hh ? `${hh}:${pad(mm % 60)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`}</b><span class="muted" id="fState">${focus.finished ? 'Time’s up ✨' : focus.paused ? 'paused' : 'remaining'}</span></div>
      </div>
      ${b && b.notes ? `<p class="muted" style="max-width:420px">${esc(b.notes)}</p>` : ''}
      <div class="f-acts">
        ${focus.mode === 'block' ? `<button class="btn primary" id="fDone">${icon('done')} Complete</button><button class="btn" id="fExt">+15 min</button><button class="btn" id="fSkip">${icon('skip')} Skip</button>` :
      `<button class="btn primary" id="fPause">${focus.paused ? icon('play') + ' Resume' : icon('pause') + ' Pause'}</button><button class="btn" id="fExt">+5 min</button>${[25, 50, 90].map(n => `<button class="btn ghost" data-pomo="${n}">${n}m</button>`).join('')}`}
      </div>
      ${nextB ? `<div class="faint" style="font-size:13px">Up next · ${tStr(nextB.start)} ${esc(nextB.title)}</div>` : ''}
    </div>`;
  $('#fClose').onclick = closeFocus;
  const ext = $('#fExt');
  if (focus.mode === 'block') {
    $('#fDone').onclick = () => { setStatus(b.id, focus.date, 'done'); chime(); toast('Block completed 🎉'); closeFocus(); };
    $('#fSkip').onclick = () => { setStatus(b.id, focus.date, 'skipped'); closeFocus(); };
    ext.onclick = () => {
      // extend: for recurring blocks only this view changes; one-offs persist
      if (!isRecur(b)) { b.end = Math.min(b.end + 15, 1440); save(); }
      focus.endAt += 15 * 60000; focus.finished = false; drawFocus();
    };
  } else {
    $('#fPause').onclick = () => { if (focus.paused) { focus.endAt += Date.now() - focus.paused; focus.paused = 0; } else focus.paused = Date.now(); drawFocus(); };
    ext.onclick = () => { focus.endAt += 5 * 60000; focus.finished = false; drawFocus(); };
    $$('[data-pomo]').forEach(x => x.onclick = () => { Object.assign(focus, { startAt: Date.now(), endAt: Date.now() + x.dataset.pomo * 60000, paused: 0, finished: false }); drawFocus(); });
  }
}
function focusTick() {
  if (!focus.on || focus.paused) return;
  if (!focus.finished && Date.now() >= focus.endAt) { focus.finished = true; chime(); if (S.settings.notify && 'Notification' in window && Notification.permission === 'granted') { try { new Notification('Focus session finished', { body: 'Nice work. Take a breath.' }); } catch (e) { } } }
  // update numbers only, so buttons are never rebuilt mid-click
  const total = focus.endAt - focus.startAt, left = Math.max(0, focus.endAt - Date.now());
  const C = 2 * Math.PI * 140, mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60, hh = Math.floor(mm / 60);
  const ring = $('#fRing'), tb = $('#fTimeB'), st = $('#fState');
  if (ring) ring.setAttribute('stroke-dashoffset', C * (left / (total || 1)));
  if (tb) tb.textContent = hh ? `${hh}:${pad(mm % 60)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
  if (st) st.textContent = focus.finished ? 'Time’s up ✨' : 'remaining';
}

/* =========================================================
   SETTINGS
   ========================================================= */
function openSettings() {
  const s = S.settings;
  openModal('Settings', `
    <div class="field"><label>Your name</label><input id="stName" value="${esc(s.name)}" placeholder="For your greeting"></div>
    <div class="field-row three">
      <div class="field"><label>Day starts</label><select id="stStart">${Array.from({ length: 13 }, (_, h) => `<option value="${h}" ${h === s.dayStart ? 'selected' : ''}>${pad(h)}:00</option>`).join('')}</select></div>
      <div class="field"><label>Day ends</label><select id="stEnd">${Array.from({ length: 10 }, (_, i) => 15 + i).map(h => `<option value="${h}" ${h === s.dayEnd ? 'selected' : ''}>${h === 24 ? 'Midnight' : pad(h) + ':00'}</option>`).join('')}</select></div>
      <div class="field"><label>Snap to</label><select id="stSnap">${[5, 10, 15, 30].map(v => `<option value="${v}" ${v === s.snap ? 'selected' : ''}>${v} min</option>`).join('')}</select></div>
    </div>
    <div class="field-row three">
      <div class="field"><label>Clock</label><select id="stH24"><option value="0">12-hour</option><option value="1" ${s.h24 ? 'selected' : ''}>24-hour</option></select></div>
      <div class="field"><label>Focus length</label><select id="stPomo">${[15, 25, 30, 45, 50, 60, 90].map(v => `<option value="${v}" ${v === s.pomodoro ? 'selected' : ''}>${v} min</option>`).join('')}</select></div>
      <div class="field"><label>Accent</label><div class="row">${['#a78bfa', '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#fb923c'].map(c => `<button class="dot" data-acc="${c}" style="width:22px;height:22px;background:${c};${c === s.accent ? 'outline:2px solid var(--text);outline-offset:2px' : ''}"></button>`).join('')}</div></div>
    </div>
    <div class="field"><label>Alerts</label>
      <label class="row"><input type="checkbox" class="chk" id="stSound" ${s.sound ? 'checked' : ''}> Play a chime when a block starts / ends</label>
      <label class="row"><input type="checkbox" class="chk" id="stNotify" ${s.notify ? 'checked' : ''}> Desktop notifications (keep this tab open)</label>
    </div>
    <div class="field"><label>Categories</label><div id="stCats"></div><button class="btn" id="stCatAdd" style="margin-top:6px;align-self:flex-start">${icon('plus')} Category</button></div>
    <div class="field"><label>Your data</label><div class="row" style="flex-wrap:wrap"><button class="btn" id="stExport">${icon('download')} Export backup</button><label class="btn" style="cursor:pointer">${icon('upload')} Import<input type="file" id="stImport" accept="application/json" hidden></label><button class="btn danger" id="stReset">${icon('trash')} Reset all</button></div><span class="faint" style="font-size:12px">Everything is stored privately in this browser. Export regularly to keep a backup or move devices.</span></div>
    <div class="modal-foot"><span></span><button class="btn primary" id="stSave">Save settings</button></div>`, (m, close) => {
    let accent = s.accent;
    const cats = S.cats.map(c => ({ ...c }));
    const drawCats = () => {
      $('#stCats', m).innerHTML = cats.map((c, i) => `<div class="row" style="margin-bottom:6px"><input type="color" value="${c.color}" data-cc="${i}"><input class="grow" value="${esc(c.name)}" data-cn="${i}"><button class="icon-btn sm" data-cr="${i}" ${cats.length < 2 ? 'disabled' : ''}>${icon('x')}</button></div>`).join('');
      $$('[data-cc]', m).forEach(x => x.oninput = () => cats[x.dataset.cc].color = x.value);
      $$('[data-cn]', m).forEach(x => x.oninput = () => cats[x.dataset.cn].name = x.value);
      $$('[data-cr]', m).forEach(x => x.onclick = () => { cats.splice(+x.dataset.cr, 1); drawCats(); });
    };
    drawCats();
    $('#stCatAdd', m).onclick = () => { cats.push({ id: uid(), name: 'New category', color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') }); drawCats(); };
    $$('[data-acc]', m).forEach(b => b.onclick = () => { accent = b.dataset.acc; $$('[data-acc]', m).forEach(x => x.style.outline = x === b ? '2px solid var(--text)' : 'none'); applyTheme(accent); });
    $('#stNotify', m).onchange = e => { if (e.target.checked && 'Notification' in window && Notification.permission !== 'granted') Notification.requestPermission(); };
    $('#stExport', m).onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lumen-backup-${todayStr()}.json`; a.click(); URL.revokeObjectURL(a.href);
    };
    $('#stImport', m).onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => { try { const d = JSON.parse(txt); if (!d.todos || !d.blocks) throw 0; S = { ...defaultState(), ...d, settings: { ...defaultState().settings, ...d.settings } }; save(); close(); applyTheme(); render(); toast('Backup imported'); } catch (err) { toast('That file is not a Lumen backup'); } });
    };
    $('#stReset', m).onclick = async () => { close(); if (await confirmBox('This erases all tasks, blocks, goals and settings in this browser.', 'Erase everything')) { localStorage.removeItem(STORE_KEY); S = seed(defaultState()); save(); applyTheme(); render(); toast('Fresh start'); } };
    $('#stSave', m).onclick = () => {
      const st = +$('#stStart', m).value, en = +$('#stEnd', m).value;
      Object.assign(s, { name: $('#stName', m).value.trim(), dayStart: st, dayEnd: Math.max(en, st + 6), snap: +$('#stSnap', m).value, h24: $('#stH24', m).value === '1', pomodoro: +$('#stPomo', m).value, accent, sound: $('#stSound', m).checked, notify: $('#stNotify', m).checked });
      const kept = cats.filter(c => c.name.trim());
      if (kept.length) S.cats = kept;
      save(); close(); applyTheme(); render(); toast('Settings saved');
    };
  });
}
function applyTheme(accentPreview) {
  document.documentElement.dataset.theme = S.settings.theme;
  const a = accentPreview || S.settings.accent;
  document.documentElement.style.setProperty('--accent', a);
  const pairs = { '#a78bfa': '#f0abfc', '#60a5fa': '#a5f3fc', '#34d399': '#bef264', '#f472b6': '#fdba74', '#fbbf24': '#fda4af', '#fb923c': '#fde047' };
  document.documentElement.style.setProperty('--accent-2', pairs[a] || '#f0abfc');
  $('#themeBtn').innerHTML = icon(S.settings.theme === 'dark' ? 'sun' : 'moon');
}

/* =========================================================
   TICKING & BOOT
   ========================================================= */
function tick() {
  const now = new Date();
  $$('[data-clock]').forEach(el => {
    const h = now.getHours(), m = now.getMinutes();
    el.innerHTML = S.settings.h24 ? `${pad(h)}:${pad(m)}<small>:${pad(now.getSeconds())}</small>` : `${h % 12 || 12}:${pad(m)}<small>${h < 12 ? 'am' : 'pm'}</small>`;
  });
  const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  $$('[data-countdown]').forEach(el => {
    const left = Math.max(0, +el.dataset.countdown * 60 - secs);
    const h = Math.floor(left / 3600), m = Math.floor(left / 60) % 60, s = left % 60;
    el.textContent = h ? `${h}h ${pad(m)}m` : `${m}:${pad(s)}`;
  });
  $$('[data-progress]').forEach(el => { const [a, b] = el.dataset.progress.split(',').map(Number); el.style.width = clamp((secs / 60 - a) / (b - a) * 100, 0, 100) + '%'; });
}
let lastMinute = nowMin(), lastDay = todayStr();
setInterval(() => {
  tick();
  focusTick();
  const m = nowMin();
  if (m !== lastMinute) {
    lastMinute = m;
    checkReminders();
    if (todayStr() !== lastDay) { lastDay = todayStr(); if (!$('#modalRoot').innerHTML) render(); return; }
    // refresh live views when no modal is open and nothing is being dragged
    if (!$('#modalRoot').innerHTML && !$('.dragging') && !$('.tl-ghost') && !focus.on && document.activeElement?.tagName !== 'INPUT') {
      if (ui.view === 'dashboard' || ui.view === 'blocker') render();
    }
  }
}, 1000);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#modalRoot').innerHTML) $('#modalRoot').innerHTML = ''; else if (focus.on) closeFocus(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.metaKey || e.ctrlKey || e.altKey || $('#modalRoot').innerHTML || focus.on) return;
  const k = e.key.toLowerCase();
  if (['1', '2', '3', '4'].includes(k)) return go(['dashboard', 'todo', 'planner', 'blocker'][+k - 1]);
  if (k === 'f') return openFocus();
  if (k === 'q') return quickAdd();
  if (ui.view === 'blocker') {
    if (k === 'n') newBlockAtNextSlot();
    if (k === 't') { ui.bDate = todayStr(); renderFresh(); }
    if (k === 'w') { ui.bMode = ui.bMode === 'day' ? 'week' : 'day'; renderFresh(); }
    if (e.key === 'ArrowLeft') shiftDay(-1);
    if (e.key === 'ArrowRight') shiftDay(1);
  }
});

$$('#nav button').forEach(b => b.onclick = () => go(b.dataset.view));
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
$('#focusBtn').onclick = openFocus;
$('#settingsBtn').onclick = openSettings;
$('#themeBtn').onclick = () => { S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); };
window.addEventListener('hashchange', () => go(location.hash.slice(1)));

hydrateIcons();
applyTheme();
save();
go(location.hash.slice(1) || ui.view);
