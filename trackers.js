'use strict';
/* =========================================================
   Lumen — Habits & Sleep trackers.
   Extends app.js: shares S, ui, helpers, VIEWS/AFTER, modals.
   ========================================================= */

Object.assign(ICONS, {
  flame: '<path d="M12 22c4 0 7-2.8 7-7 0-3.2-2-5.4-3.4-7.2-.6 1.8-1.7 3-3.1 3.2.3-3.4-1-6.6-4-9 .2 4-4.5 6.8-4.5 13 0 4.2 3.6 7 8 7z"/>',
  bed: '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="2"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  minus: '<path d="M5 12h14"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M5 3 2 6M19 3l3 3"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  sunrise: '<path d="M12 2v6M5 9l1.5 1.5M19 9l-1.5 1.5M3 17h18M7 17a5 5 0 0 1 10 0M3 21h18"/>',
});

/* ---------- palette (validated categorical order; dark-surface steps) ---------- */
const HABIT_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9', '#008300'];
const POS = '#199e70', NEG = '#d95926'; // diverging poles for "factor impact"
const TOD = [['morning', '🌅 Morning'], ['afternoon', '☀️ Afternoon'], ['evening', '🌙 Evening'], ['anytime', '✨ Anytime']];
const SLEEP_TAGS = ['caffeine', 'alcohol', 'late screens', 'exercise', 'stress', 'late meal', 'reading', 'nap', 'meditation'];

/* ---------- data & demo seed ---------- */
function newHabit(o = {}) {
  return { id: uid(), name: '', icon: '✨', color: HABIT_COLORS[S.habits.length % HABIT_COLORS.length], type: 'check', target: 1, unit: '', freq: 'daily', days: [1, 2, 3, 4, 5], perWeek: 3, tod: 'anytime', area: '', reminder: '', created: todayStr(), archived: false, log: {}, notes: {}, ...o };
}
function seedTrackers(s) {
  const t = todayStr(), born = addDays(t, -90);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const mk = o => ({ id: uid(), icon: '✨', type: 'check', target: 1, unit: '', freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], perWeek: 3, tod: 'anytime', area: '', reminder: '', created: born, archived: false, log: {}, notes: {}, demo: true, ...o });
  s.habits = [
    mk({ name: 'Meditate', icon: '🧘', color: HABIT_COLORS[5], type: 'duration', target: 10, unit: 'min', tod: 'morning', area: 'Mind' }),
    mk({ name: 'Drink water', icon: '💧', color: HABIT_COLORS[0], type: 'count', target: 8, unit: 'glasses', area: 'Health' }),
    mk({ name: 'Workout', icon: '🏋️', color: HABIT_COLORS[1], freq: 'weekly', perWeek: 4, tod: 'evening', area: 'Health' }),
    mk({ name: 'Read', icon: '📚', color: HABIT_COLORS[2], type: 'duration', target: 20, unit: 'min', tod: 'evening', area: 'Growth' }),
    mk({ name: 'No sugar', icon: '🍬', color: HABIT_COLORS[4], freq: 'days', days: [1, 2, 3, 4, 5], area: 'Health' }),
    mk({ name: 'Journal', icon: '✍️', color: HABIT_COLORS[3], tod: 'evening', area: 'Mind' }),
  ];
  for (let d = 1; d <= 90; d++) {
    const ds = addDays(t, -d), p = .5 + .4 * (1 - d / 90);
    s.habits.forEach(h => {
      if (h.freq === 'days' && !h.days.includes(parse(ds).getDay())) return;
      const r = Math.random();
      if (h.freq === 'weekly') { if (r < .55) h.log[ds] = 1; return; }
      if (r < p) h.log[ds] = h.type === 'duration' ? h.target + Math.round(rnd(0, 3)) * 5 : h.target;
      else if (r < p + .12 && h.type !== 'check') h.log[ds] = Math.max(1, Math.round(h.target * rnd(.3, .8)));
    });
  }
  s.habits[1].log[t] = 3; s.habits[0].log[t] = 10;
  s.habits[0].notes[addDays(t, -2)] = 'Felt much calmer after a longer sit.';
  s.sleep = [];
  for (let d = 0; d < 45; d++) {
    const date = addDays(t, -d), dow = parse(date).getDay(), wknd = dow === 0 || dow === 6;
    const tags = SLEEP_TAGS.filter(() => Math.random() < .18);
    const bad = (tags.includes('caffeine') ? 1 : 0) + (tags.includes('alcohol') ? 1 : 0) + (tags.includes('late screens') ? 1 : 0);
    const good = (tags.includes('exercise') ? 1 : 0) + (tags.includes('reading') ? 1 : 0);
    const bed = Math.round((23 * 60 + 5 + gauss() * 45 + (dow === 6 || dow === 0 ? 40 : 0) + bad * 20 + 1440) % 1440 / 5) * 5;
    const wake = Math.round((6 * 60 + 50 + gauss() * 25 + (wknd ? 75 : 0)) / 5) * 5;
    s.sleep.push({ id: uid(), date, bed, wake, lat: Math.round(clamp(8 + gauss() * 10 + bad * 12 - good * 4, 2, 70)), awk: Math.round(clamp(rnd(0, 2.4) + bad * .7, 0, 5)), q: Math.round(clamp(3.6 + gauss() - bad * .8 + good * .5, 1, 5)), energy: Math.round(clamp(3.4 + gauss() - bad * .6 + good * .4, 1, 5)), tags, note: '' });
  }
  s.trackerDemo = true;
}
MIGRATIONS.push(s => {
  if (!s.habits) seedTrackers(s);
  s.sleep = s.sleep || [];
  s.sleepCfg = { goal: 8, bed: 23 * 60, wake: 7 * 60, windDown: true, ...(s.sleepCfg || {}) };
  if (s.sleepLive === undefined) s.sleepLive = null;
});
Object.assign(ui, { hTab: 'today', hArea: '', sRange: 14, ...(() => { try { const u = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); return { hTab: u.hTab || 'today', hArea: u.hArea || '', sRange: u.sRange || 14 }; } catch (e) { return {}; } })(), hDate: todayStr() });

/* =========================================================
   HABIT ENGINE
   ========================================================= */
const activeHabits = () => S.habits.filter(h => !h.archived);
const weekStart = d => { const x = parse(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return fmt(x); };
function hDue(h, d) {
  if (d < h.created) return false;
  return h.freq === 'days' ? h.days.includes(parse(d).getDay()) : true;
}
const hSkip = (h, d) => h.log[d] === 'skip';
const hNum = (h, d) => typeof h.log[d] === 'number' ? h.log[d] : 0;
const hProg = (h, d) => Math.min(1, hNum(h, d) / (h.target || 1));
const hDone = (h, d) => hProg(h, d) >= 1;
function weekCount(h, ws) { let n = 0; for (let i = 0; i < 7; i++) if (hDone(h, addDays(ws, i))) n++; return n; }
function hStreak(h) {
  const t = todayStr();
  if (h.freq === 'weekly') {
    let ws = weekStart(t), n = weekCount(h, ws) >= h.perWeek ? 1 : 0;
    for (ws = addDays(ws, -7); ws >= weekStart(h.created); ws = addDays(ws, -7)) { if (weekCount(h, ws) >= h.perWeek) n++; else break; }
    return n;
  }
  let d = t, n = 0;
  if (!hDone(h, d)) d = addDays(d, -1); // today still open: doesn't break the streak
  for (let i = 0; i < 4000 && d >= h.created; i++, d = addDays(d, -1)) {
    if (!hDue(h, d) || hSkip(h, d)) continue;
    if (hDone(h, d)) n++; else break;
  }
  return n;
}
function hBest(h) {
  const t = todayStr(); let best = 0, run = 0;
  if (h.freq === 'weekly') {
    for (let ws = weekStart(h.created); ws <= t; ws = addDays(ws, 7)) {
      if (weekCount(h, ws) >= h.perWeek) best = Math.max(best, ++run); else if (ws !== weekStart(t)) run = 0;
    }
    return best;
  }
  for (let d = h.created; d <= t; d = addDays(d, 1)) {
    if (!hDue(h, d) || hSkip(h, d)) continue;
    if (hDone(h, d)) best = Math.max(best, ++run); else if (d !== t) run = 0;
  }
  return best;
}
function hRate(h, n = 30) {
  const t = todayStr();
  if (h.freq === 'weekly') {
    let w = 0, m = 0;
    for (let ws = weekStart(addDays(t, -n + 1)); ws <= t; ws = addDays(ws, 7)) {
      if (ws < weekStart(h.created)) continue;
      const c = weekCount(h, ws);
      if (ws === weekStart(t) && c < h.perWeek) continue;
      w++; m += Math.min(1, c / h.perWeek);
    }
    return w ? m / w : 0;
  }
  let due = 0, done = 0;
  for (let i = 0; i < n; i++) {
    const d = addDays(t, -i); if (d < h.created) break;
    if (!hDue(h, d) || hSkip(h, d) || (d === t && !hDone(h, d))) continue;
    due++; if (hDone(h, d)) done++;
  }
  return due ? done / due : 0;
}
/* habit strength: exponential moving average of progress (half-life 14 due-days / 4 weeks) */
function hStrengthSeries(h) {
  const t = todayStr(), out = []; let s = 0;
  if (h.freq === 'weekly') {
    const a = 1 - Math.pow(.5, 1 / 4);
    for (let ws = weekStart(h.created); ws <= t; ws = addDays(ws, 7)) {
      const c = weekCount(h, ws);
      if (!(ws === weekStart(t) && c < h.perWeek)) s = s * (1 - a) + a * Math.min(1, c / h.perWeek);
      for (let i = 0; i < 7 && addDays(ws, i) <= t; i++) out.push({ d: addDays(ws, i), s });
    }
    return out;
  }
  const a = 1 - Math.pow(.5, 1 / 14);
  for (let d = h.created; d <= t; d = addDays(d, 1)) {
    if (hDue(h, d) && !hSkip(h, d) && !(d === t && !hDone(h, d))) s = s * (1 - a) + a * hProg(h, d);
    out.push({ d, s });
  }
  return out;
}
const hStrength = h => { const s = hStrengthSeries(h); return s.length ? s[s.length - 1].s : 0; };
const hTotal = h => Object.keys(h.log).filter(d => hDone(h, d)).length;
function dayScore(d) { // completion across daily/specific-day habits that are due on d
  const list = activeHabits().filter(h => h.freq !== 'weekly' && hDue(h, d) && !hSkip(h, d));
  if (!list.length) return null;
  const sum = list.reduce((a, h) => a + hProg(h, d), 0);
  return { v: sum / list.length, done: list.filter(h => hDone(h, d)).length, n: list.length };
}
function perfectStreak() {
  let d = todayStr(), n = 0;
  const first = dayScore(d); if (!first || first.v < 1) d = addDays(d, -1);
  for (let i = 0; i < 2000; i++, d = addDays(d, -1)) {
    const s = dayScore(d); if (s === null) { if (!S.habits.some(h => h.created <= d)) break; continue; }
    if (s.v >= 1) n++; else break;
  }
  return n;
}
function schedText(h) {
  if (h.freq === 'weekly') return `${h.perWeek}× per week`;
  if (h.freq === 'days') return h.days.length === 5 && !h.days.includes(0) && !h.days.includes(6) ? 'Weekdays' : h.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => DOW[x].slice(0, 2)).join(' ');
  return 'Every day';
}
const goalText = h => h.type === 'check' ? '' : `${h.target} ${esc(h.unit || (h.type === 'duration' ? 'min' : ''))}`;

function hSet(h, d, v) {
  const wasDone = hDone(h, d);
  if (v == null || v === 0) delete h.log[d]; else h.log[d] = v;
  save();
  if (!wasDone && hDone(h, d)) celebrate(h, d);
}
function celebrate(h, d) {
  chimeSoft();
  const st = hStreak(h);
  const sc = dayScore(d);
  if (sc && sc.v >= 1 && d === todayStr()) toast('✨ Perfect day — every habit done!');
  else toast(`${h.icon} ${esc(h.name)} done${st > 1 ? ` · 🔥 ${st} ${h.freq === 'weekly' ? 'week' : 'day'} streak` : ''}`);
}
function chimeSoft() {
  if (!S.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + .12);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
    o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + .55);
  } catch (e) { }
}
function hTap(h, d) { if (hSkip(h, d)) delete h.log[d]; hSet(h, d, hDone(h, d) ? null : h.type === 'check' ? 1 : h.target); }
function hStep(h, d, dir) { const step = h.type === 'duration' ? 5 : 1; hSet(h, d, Math.max(0, hNum(h, d) + dir * step)); }

/* =========================================================
   HABITS VIEW
   ========================================================= */
function ringSVG(p, size, color, stroke = 4) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" style="transition:stroke-dashoffset .5s"/></svg>`;
}
function demoBanner() {
  return S.trackerDemo ? `<div class="demo-banner">${icon('sparkle')}<span class="grow">You're looking at <b>sample data</b> so the charts have something to show. Clear it whenever you're ready to start fresh.</span><button class="btn" id="clearDemo">Clear sample data</button></div>` : '';
}
function bindDemoBanner() {
  const b = $('#clearDemo'); if (!b) return;
  b.onclick = async () => {
    if (!(await confirmBox('Remove the sample habits and sleep nights? Habits, nights and focus sessions you added yourself are kept.', 'Clear samples'))) return;
    S.habits = S.habits.filter(h => !h.demo);
    S.sleep = S.sleep.filter(e => e.userMade);
    if (S.pomo) S.pomo.sessions = S.pomo.sessions.filter(x => !x.demo);
    S.trackerDemo = false; save(); render(); toast('Fresh start — sample data cleared');
  };
}
function renderHabits() {
  const t = todayStr(), d = ui.hDate > t ? t : ui.hDate;
  const list = activeHabits().filter(h => !ui.hArea || h.area === ui.hArea);
  const areas = [...new Set(activeHabits().map(h => h.area).filter(Boolean))];
  const sc = dayScore(t);
  const avgStr = activeHabits().length ? activeHabits().reduce((a, h) => a + hStrength(h), 0) / activeHabits().length : 0;
  const rate30 = (() => { let s = 0, n = 0; for (let i = 1; i <= 30; i++) { const x = dayScore(addDays(t, -i)); if (x) { s += x.v; n++; } } return n ? s / n : 0; })();
  const ws = weekStart(d);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map(x => {
    const s = dayScore(x), fut = x > t;
    return `<button class="day-pill ${x === d ? 'on' : ''} ${x === t ? 'today' : ''}" ${fut ? 'disabled' : ''} data-hday="${x}">
      <span class="dp-ring">${ringSVG(s ? s.v : 0, 38, 'var(--accent)', 3.5)}<b>${parse(x).getDate()}</b></span><span>${DOW[parse(x).getDay()]}</span></button>`;
  }).join('');
  return `
  <div class="view-head">
    <div><div class="eyebrow">${d === t ? 'Today' : relDate(d)} · ${niceDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1 class="title">Habit <em>tracker</em></h1></div>
    <div class="toolbar">
      <div class="seg">${[['today', 'Check-in'], ['grid', 'Grid'], ['insights', 'Insights']].map(([k, l]) => `<button data-htab="${k}" class="${ui.hTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <button class="btn primary" id="hNew">${icon('plus')} New habit</button>
    </div>
  </div>
  ${demoBanner()}
  <div class="h-stats">
    <div class="card h-stat"><span class="dp-ring big">${ringSVG(sc ? sc.v : 0, 64, 'var(--accent)', 6)}<b>${sc ? Math.round(sc.v * 100) : 0}%</b></span><div><div class="stat-k">Today</div><div class="stat-v">${sc ? `${sc.done}/${sc.n}` : '—'}</div><div class="faint">habits completed</div></div></div>
    <div class="card h-stat"><div class="h-stat-ico">🔥</div><div><div class="stat-k">Perfect-day streak</div><div class="stat-v">${perfectStreak()}<small> days</small></div><div class="faint">every daily habit done</div></div></div>
    <div class="card h-stat"><div class="h-stat-ico">📈</div><div><div class="stat-k">30-day completion</div><div class="stat-v">${Math.round(rate30 * 100)}<small>%</small></div><div class="faint">across scheduled habits</div></div></div>
    <div class="card h-stat"><div class="h-stat-ico">💪</div><div><div class="stat-k">Avg. habit strength</div><div class="stat-v">${Math.round(avgStr * 100)}<small>%</small></div><div class="faint">momentum, not just streaks</div></div></div>
  </div>
  ${areas.length > 1 ? `<div class="filters" style="margin-top:0">${['', ...areas].map(a => `<button class="chip ${ui.hArea === a ? 'on' : ''}" data-harea="${esc(a)}">${a ? esc(a) : 'All areas'}</button>`).join('')}</div>` : ''}
  ${!S.habits.length ? `<div class="card empty" style="padding:50px">No habits yet. <br><br><button class="btn primary" id="hNew2">${icon('plus')} Create your first habit</button></div>` :
    ui.hTab === 'today' ? `<div class="card week-strip"><button class="icon-btn" id="hPrevW">${icon('left')}</button><div class="strip">${strip}</div><button class="icon-btn" id="hNextW" ${addDays(ws, 7) > t ? 'disabled' : ''}>${icon('right')}</button></div>${habitCheckin(list, d)}` :
    ui.hTab === 'grid' ? habitGrid(list) : habitInsights(list)}`;
}
function habitCard(h, d) {
  const due = hDue(h, d), done = hDone(h, d), skip = hSkip(h, d), p = hProg(h, d);
  const st = hStreak(h);
  const wk = h.freq === 'weekly' ? weekCount(h, weekStart(d)) : 0;
  const ctrl = h.type === 'check'
    ? `<button class="h-check ${done ? 'on' : ''}" data-htap aria-label="Toggle ${esc(h.name)}">${icon('done')}</button>`
    : `<div class="h-counter"><button class="icon-btn sm" data-hdec aria-label="Less">${icon('minus')}</button><button class="h-val" data-hval title="Set exact value"><b>${hNum(h, d)}</b><span>/${h.target} ${esc(h.unit || (h.type === 'duration' ? 'min' : ''))}</span></button><button class="icon-btn sm" data-hinc aria-label="More">${icon('plus')}</button><button class="h-check sm ${done ? 'on' : ''}" data-htap aria-label="Complete">${icon('done')}</button></div>`;
  return `<div class="habit ${done ? 'done' : ''} ${skip ? 'skipped' : ''} ${!due ? 'rest' : ''}" style="--c:${h.color}" data-hid="${h.id}">
    <div class="h-fill" style="width:${p * 100}%"></div>
    <button class="h-ico" data-hopen title="Details">${h.icon}</button>
    <div class="grow" data-hopen style="cursor:pointer">
      <div class="h-name">${esc(h.name)}</div>
      <div class="h-meta">${st ? `<span class="streak">🔥 ${st}${h.freq === 'weekly' ? 'w' : 'd'}</span>` : ''}<span>${schedText(h)}</span>${h.freq === 'weekly' ? `<span>${wk}/${h.perWeek} this week</span>` : ''}${goalText(h) ? `<span>goal ${goalText(h)}</span>` : ''}${skip ? '<span>skipped</span>' : ''}${h.notes[d] ? `<span title="${esc(h.notes[d])}">📝 note</span>` : ''}</div>
    </div>
    ${ctrl}
    <div class="h-more"><button class="icon-btn sm" data-hskip title="${skip ? 'Unskip' : 'Skip (keeps your streak)'}">${icon('skip')}</button><button class="icon-btn sm" data-hnote title="Note for this day">${icon('note')}</button></div>
  </div>`;
}
function habitCheckin(list, d) {
  const due = list.filter(h => hDue(h, d)), rest = list.filter(h => !hDue(h, d));
  const groups = TOD.map(([k, l]) => [l, due.filter(h => h.tod === k)]).filter(g => g[1].length);
  return groups.map(([l, items]) => `<div class="group-h">${l} <span class="chip">${items.filter(h => hDone(h, d)).length}/${items.length}</span></div><div class="habit-list">${items.map(h => habitCard(h, d)).join('')}</div>`).join('') +
    (rest.length ? `<div class="group-h">😌 Rest day for</div><div class="habit-list">${rest.map(h => habitCard(h, d)).join('')}</div>` : '') +
    (S.habits.some(h => h.archived) ? `<button class="btn ghost" id="hArchived" style="margin-top:14px">${icon('archive')} Archived habits (${S.habits.filter(h => h.archived).length})</button>` : '');
}
function habitGrid(list) {
  const t = todayStr(), N = innerWidth < 760 ? 10 : 28;
  const days = Array.from({ length: N }, (_, i) => addDays(t, i - N + 1));
  return `<div class="card hgrid-card"><div class="hgrid" style="grid-template-columns:minmax(150px,1.4fr) repeat(${N}, minmax(22px,1fr)) 92px">
    <div></div>${days.map(d => `<div class="hg-h ${d === t ? 'today' : ''}">${DOW[parse(d).getDay()][0]}<b>${parse(d).getDate()}</b></div>`).join('')}<div class="hg-h">Strength</div>
    ${list.map(h => `<button class="hg-name" data-hopen-id="${h.id}"><span>${h.icon}</span><span class="grow">${esc(h.name)}</span><span class="streak">🔥${hStreak(h)}</span></button>
      ${days.map(d => {
        const due = hDue(h, d), p = hProg(h, d), skip = hSkip(h, d);
        const tipTxt = `<b>${esc(h.name)}</b><br>${niceDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}<br>${skip ? 'Skipped' : !due ? 'Not scheduled' : h.type === 'check' ? (p >= 1 ? 'Done ✓' : 'Not done') : `${hNum(h, d)} / ${h.target} ${esc(h.unit || 'min')}`}`;
        return `<button class="hg-cell ${!due ? 'off' : ''} ${skip ? 'skip' : ''} ${p >= 1 ? 'full' : ''}" style="--c:${h.color};--p:${Math.round(p * 100)}%" data-hcell="${h.id}" data-d="${d}" ${tipAttr(tipTxt)}></button>`;
      }).join('')}
      <div class="hg-str"><div class="bar"><i style="width:${hStrength(h) * 100}%;background:${h.color}"></i></div><span>${Math.round(hStrength(h) * 100)}%</span></div>`).join('')}
  </div><div class="faint" style="font-size:12px;margin-top:12px">Click a cell to toggle it · partial fills show progress toward count/time goals · hatched = skipped</div></div>`;
}
function habitInsights(list) {
  const ranked = list.map(h => ({ h, s: hStrength(h), r: hRate(h, 30), b: hBest(h) })).sort((a, b) => b.s - a.s);
  return `<div class="dash">
    <div class="card span-12">${chartHead('habitYear', 'Your year in habits', 'grid', 'daily completion of scheduled habits')}<div data-chart="habitYear"></div></div>
    <div class="card span-7">${chartHead('habitTrend', 'Completion · last 60 days', 'chart', '7-day rolling avg')}<div data-chart="habitTrend"></div></div>
    <div class="card span-5">${chartHead('habitDow', 'Best days of the week', 'calendar')}<div data-chart="habitDow"></div></div>
    <div class="card span-7">${chartHead('habitCompare', 'Habit strength · all habits', 'flame', '90 days')}<div data-chart="habitCompare"></div></div>
    <div class="card span-5">${chartHead('habitMix', 'Check-ins by habit', 'target', '30 days')}<div data-chart="habitMix"></div></div>
    <div class="card span-12"><div class="card-h"><span class="card-t">${icon('flame')} Leaderboard</span><span class="faint" style="font-size:12px">strength = momentum that rewards consistency and forgives a single miss</span></div>
      <div class="lb">${ranked.map(({ h, s, r, b }, i) => `<button class="lb-row" data-hopen-id="${h.id}"><span class="lb-rank">${i + 1}</span><span class="h-ico sm" style="--c:${h.color}">${h.icon}</span><span class="lb-name">${esc(h.name)}<small>${schedText(h)}</small></span><div class="bar lb-bar"><i style="width:${s * 100}%;background:${h.color}"></i></div><span class="lb-v"><b>${Math.round(s * 100)}%</b><small>strength</small></span><span class="lb-v"><b>${Math.round(r * 100)}%</b><small>30-day</small></span><span class="lb-v"><b>${hStreak(h)}</b><small>streak</small></span><span class="lb-v"><b>${b}</b><small>best</small></span></button>`).join('')}</div>
    </div>
  </div>`;
}
AFTER.habits = () => {
  bindDemoBanner();
  $$('[data-htab]').forEach(b => b.onclick = () => { ui.hTab = b.dataset.htab; saveUI(); render(); });
  $$('[data-harea]').forEach(b => b.onclick = () => { ui.hArea = b.dataset.harea; saveUI(); render(); });
  ['#hNew', '#hNew2'].forEach(id => { const b = $(id); if (b) b.onclick = () => openHabitEditor(); });
  $$('[data-hday]').forEach(b => b.onclick = () => { ui.hDate = b.dataset.hday; render(); });
  const pw = $('#hPrevW'), nw = $('#hNextW');
  if (pw) pw.onclick = () => { ui.hDate = addDays(ui.hDate, -7); render(); };
  if (nw) nw.onclick = () => { const n = addDays(ui.hDate, 7); ui.hDate = n > todayStr() ? todayStr() : n; render(); };
  const arc = $('#hArchived'); if (arc) arc.onclick = openArchived;
  bindHabitCards($('#main'), ui.hDate > todayStr() ? todayStr() : ui.hDate);
  $$('[data-hcell]').forEach(c => c.onclick = () => { const h = S.habits.find(x => x.id === c.dataset.hcell); hTap(h, c.dataset.d); render(); });
  $$('[data-hopen-id]').forEach(b => b.onclick = () => openHabitDetail(S.habits.find(x => x.id === b.dataset.hopenId)));
  drawCharts($('#main'));
};
function bindHabitCards(root, d) {
  $$('[data-hid]', root).forEach(el => {
    const h = S.habits.find(x => x.id === el.dataset.hid); if (!h) return;
    const on = (sel, fn) => $$(sel, el).forEach(b => b.onclick = e => { e.stopPropagation(); fn(); });
    on('[data-htap]', () => { hTap(h, d); render(); });
    on('[data-hinc]', () => { hStep(h, d, 1); render(); });
    on('[data-hdec]', () => { hStep(h, d, -1); render(); });
    on('[data-hopen]', () => openHabitDetail(h));
    on('[data-hskip]', () => { if (hSkip(h, d)) delete h.log[d]; else h.log[d] = 'skip'; save(); render(); });
    on('[data-hnote]', () => openHabitNote(h, d));
    on('[data-hval]', () => openModal(`${h.icon} ${esc(h.name)}`, `<div class="field"><label>${h.type === 'duration' ? 'Minutes' : esc(h.unit || 'Count')} on ${relDate(d).toLowerCase()}</label><input type="number" id="hvIn" min="0" value="${hNum(h, d)}"></div><div class="modal-foot"><span></span><button class="btn primary" id="hvSave">Save</button></div>`, (m, close) => {
      const go = () => { hSet(h, d, Math.max(0, +$('#hvIn', m).value || 0)); close(); render(); };
      $('#hvSave', m).onclick = go; $('#hvIn', m).onkeydown = e => { if (e.key === 'Enter') go(); };
    }));
  });
}
function openHabitNote(h, d) {
  openModal(`${h.icon} Note`, `<div class="field"><label>${esc(h.name)} · ${relDate(d)}</label><textarea id="hnIn" rows="4" placeholder="How did it go? What helped or got in the way?">${esc(h.notes[d] || '')}</textarea></div><div class="modal-foot"><span></span><button class="btn primary" id="hnSave">Save note</button></div>`, (m, close) => {
    $('#hnSave', m).onclick = () => { const v = $('#hnIn', m).value.trim(); if (v) h.notes[d] = v; else delete h.notes[d]; save(); close(); render(); };
  });
}
function openHabitDetail(h) {
  const st = hStreak(h), best = hBest(h), r30 = hRate(h, 30), r90 = hRate(h, 90), str = hStrength(h), tot = hTotal(h);
  const notes = Object.entries(h.notes).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  const u = h.freq === 'weekly' ? 'wk' : 'd';
  const close = openModal(`<span class="row" style="gap:12px"><span class="h-ico" style="--c:${h.color}">${h.icon}</span>${esc(h.name)}</span>`, `
    <div class="faint" style="margin:-10px 0 16px">${schedText(h)}${goalText(h) ? ` · goal ${goalText(h)}` : ''} · ${TOD.find(x => x[0] === h.tod)[1]}${h.area ? ` · ${esc(h.area)}` : ''} · since ${niceDate(h.created, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
    <div class="tiles">
      <div><span>Current streak</span><b>${st}<small>${u}</small></b></div>
      <div><span>Best streak</span><b>${best}<small>${u}</small></b></div>
      <div><span>30-day rate</span><b>${Math.round(r30 * 100)}<small>%</small></b></div>
      <div><span>90-day rate</span><b>${Math.round(r90 * 100)}<small>%</small></b></div>
      <div><span>Strength</span><b>${Math.round(str * 100)}<small>%</small></b></div>
      <div><span>Total done</span><b>${tot}</b></div>
    </div>
    <div class="sub-h"><span class="lbl-sm">Last 6 months</span>${chartPicker('habitOneYear')}</div><div data-chart="habitOneYear" data-arg="${h.id}"></div>
    <div class="two-col">
      <div><div class="sub-h"><span class="lbl-sm">Strength over time</span>${chartPicker('habitStrength')}</div><div data-chart="habitStrength" data-arg="${h.id}"></div></div>
      <div><div class="sub-h"><span class="lbl-sm">By weekday</span>${chartPicker('habitOneDow')}</div><div data-chart="habitOneDow" data-arg="${h.id}"></div></div>
    </div>
    ${notes.length ? `<div class="lbl-sm" style="margin:18px 0 8px">Recent notes</div>${notes.map(([d, n]) => `<div class="note-row"><span class="faint">${relDate(d)}</span><span>${esc(n)}</span></div>`).join('')}` : ''}
    <div class="modal-foot"><div class="row"><button class="btn danger" id="hdDel">${icon('trash')} Delete</button><button class="btn" id="hdArc">${icon('archive')} ${h.archived ? 'Restore' : 'Archive'}</button></div><button class="btn primary" id="hdEdit">${icon('edit')} Edit habit</button></div>`, (m, close) => {
    m.classList.add('wide');
    setTimeout(() => drawCharts(m), 0);
    $('#hdEdit', m).onclick = () => { close(); openHabitEditor(h); };
    $('#hdArc', m).onclick = () => { h.archived = !h.archived; save(); close(); render(); toast(h.archived ? 'Archived — history kept' : 'Restored'); };
    $('#hdDel', m).onclick = async () => {
      close();
      if (await confirmBox(`Delete “${esc(h.name)}” and all its history? Archive instead if you might come back to it.`, 'Delete habit')) { S.habits = S.habits.filter(x => x !== h); save(); render(); toast('Habit deleted'); }
    };
  });
}
function openArchived() {
  const arc = S.habits.filter(h => h.archived);
  openModal('Archived habits', arc.map(h => `<div class="goal"><span class="h-ico sm" style="--c:${h.color}">${h.icon}</span><span class="grow">${esc(h.name)}</span><button class="btn" data-restore="${h.id}">Restore</button></div>`).join('') || '<div class="empty">Nothing archived.</div>', (m, close) => {
    $$('[data-restore]', m).forEach(b => b.onclick = () => { S.habits.find(x => x.id === b.dataset.restore).archived = false; save(); close(); render(); });
  });
}
const EMOJIS = ['🧘', '💧', '🏋️', '📚', '🏃', '🥗', '✍️', '💤', '🧠', '🎸', '🌿', '🚭', '💊', '🧹', '💰', '🙏', '☀️', '📵', '🦷', '🍎'];
function openHabitEditor(h) {
  const isNew = !h; const d = h ? { ...h, days: [...h.days] } : newHabit();
  openModal(isNew ? 'New habit' : 'Edit habit', `
    <div class="row" style="align-items:flex-end;gap:12px;margin-bottom:14px">
      <div class="field" style="margin:0;width:70px"><label>Icon</label><input id="heIcon" value="${d.icon}" maxlength="4" style="text-align:center;font-size:20px;padding:6px"></div>
      <div class="field grow" style="margin:0"><label>Habit</label><input id="heName" value="${esc(d.name)}" placeholder="e.g. Meditate, Drink water, No phone after 10pm"></div>
    </div>
    <div class="emoji-row">${EMOJIS.map(e => `<button data-emo="${e}">${e}</button>`).join('')}</div>
    <div class="field"><label>Colour</label><div class="row">${HABIT_COLORS.map(c => `<button class="dot" data-hcol="${c}" style="width:24px;height:24px;background:${c};${c === d.color ? 'outline:2px solid var(--text);outline-offset:2px' : ''}"></button>`).join('')}</div></div>
    <div class="field"><label>Type</label><div class="seg" id="heType">${[['check', 'Yes / No'], ['count', 'Count'], ['duration', 'Time']].map(([k, l]) => `<button data-k="${k}" class="${d.type === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="field-row" id="heGoalRow" style="${d.type === 'check' ? 'display:none' : ''}">
      <div class="field"><label>Daily goal</label><input type="number" id="heTarget" min="1" value="${d.target}"></div>
      <div class="field"><label>Unit</label><input id="heUnit" value="${esc(d.unit)}" placeholder="glasses, pages, min…"></div>
    </div>
    <div class="field"><label>Frequency</label><div class="seg" id="heFreq">${[['daily', 'Every day'], ['days', 'Specific days'], ['weekly', 'X per week']].map(([k, l]) => `<button data-k="${k}" class="${d.freq === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="heDays" class="day-toggles" style="${d.freq === 'days' ? '' : 'display:none'}">${[1, 2, 3, 4, 5, 6, 0].map(x => `<button data-day="${x}" class="${d.days.includes(x) ? 'on' : ''}">${DOW[x].slice(0, 2)}</button>`).join('')}</div>
      <div id="heWeekly" class="row" style="margin-top:8px;${d.freq === 'weekly' ? '' : 'display:none'}"><input type="number" id="hePer" min="1" max="7" value="${d.perWeek}" style="width:80px"><span class="muted">times per week</span></div>
    </div>
    <div class="field"><label>Time of day</label><div class="seg" id="heTod">${TOD.map(([k, l]) => `<button data-k="${k}" class="${d.tod === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="field-row">
      <div class="field"><label>Life area</label><input id="heArea" list="areaList" value="${esc(d.area)}" placeholder="Health, Mind, Work…"><datalist id="areaList">${[...new Set(S.habits.map(x => x.area).filter(Boolean))].map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
      <div class="field"><label>Reminder</label><input type="time" id="heRem" value="${d.reminder || ''}"></div>
    </div>
    <div class="modal-foot"><span></span><div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="heSave">${isNew ? 'Create habit' : 'Save'}</button></div></div>`, (m, close) => {
    const segPick = (id, fn) => $$(`${id} button`, m).forEach(b => b.onclick = () => { $$(`${id} button`, m).forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.k); });
    segPick('#heType', k => { d.type = k; $('#heGoalRow', m).style.display = k === 'check' ? 'none' : ''; if (k === 'duration' && !$('#heUnit', m).value) $('#heUnit', m).value = 'min'; });
    segPick('#heFreq', k => { d.freq = k; $('#heDays', m).style.display = k === 'days' ? '' : 'none'; $('#heWeekly', m).style.display = k === 'weekly' ? '' : 'none'; });
    segPick('#heTod', k => d.tod = k);
    $$('#heDays button', m).forEach(b => b.onclick = () => { const x = +b.dataset.day; d.days = d.days.includes(x) ? d.days.filter(y => y !== x) : [...d.days, x]; b.classList.toggle('on'); });
    $$('[data-emo]', m).forEach(b => b.onclick = () => { $('#heIcon', m).value = b.dataset.emo; });
    $$('[data-hcol]', m).forEach(b => b.onclick = () => { d.color = b.dataset.hcol; $$('[data-hcol]', m).forEach(x => x.style.outline = x === b ? '2px solid var(--text)' : 'none'); });
    const saveIt = () => {
      const name = $('#heName', m).value.trim(); if (!name) return $('#heName', m).focus();
      if (d.freq === 'days' && !d.days.length) d.freq = 'daily';
      Object.assign(d, { name, icon: $('#heIcon', m).value.trim() || '✨', target: d.type === 'check' ? 1 : Math.max(1, +$('#heTarget', m).value || 1), unit: $('#heUnit', m).value.trim(), perWeek: clamp(+$('#hePer', m).value || 3, 1, 7), area: $('#heArea', m).value.trim(), reminder: $('#heRem', m).value });
      if (isNew) S.habits.push(d); else Object.assign(h, d);
      save(); close(); if (ui.view !== 'habits') go('habits'); else render(); toast(isNew ? `${d.icon} ${esc(name)} added — small steps, every day` : 'Habit updated');
    };
    $('#heSave', m).onclick = saveIt;
    $('#heName', m).onkeydown = e => { if (e.key === 'Enter') saveIt(); };
  });
}

/* =========================================================
   SLEEP ENGINE
   ========================================================= */
const inBedMin = e => ((e.wake - e.bed + 1440) % 1440) || 1440;
const asleepMin = e => Math.max(0, inBedMin(e) - (e.lat || 0) - (e.awk || 0) * 5);
const relBed = b => b < 720 ? b + 1440 : b;          // minutes after previous noon-ish axis (18:00 → 1080 … 02:00 → 1560)
const circDiff = (a, b) => { const d = Math.abs(a - b) % 1440; return Math.min(d, 1440 - d); };
function sleepScore(e) {
  const goal = S.sleepCfg.goal * 60, a = asleepMin(e);
  const dur = a >= goal ? clamp(1 - (a - goal - 90) / 240, .6, 1) : clamp((a - goal * .5) / (goal * .5), 0, 1);
  const q = ((e.q || 3) - 1) / 4;
  const timing = 1 - Math.min(1, circDiff(e.bed, S.sleepCfg.bed) / 120);
  const disrupt = (clamp(1 - ((e.lat || 0) - 15) / 45, 0, 1) + clamp(1 - (e.awk || 0) / 4, 0, 1)) / 2;
  return Math.round(100 * (.45 * dur + .25 * q + .15 * timing + .15 * disrupt));
}
const scoreWord = s => s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 55 ? 'Fair' : 'Poor';
const sleepSorted = () => [...S.sleep].sort((a, b) => b.date.localeCompare(a.date));
function sleepRange(n) { const from = addDays(todayStr(), -n + 1); return sleepSorted().filter(e => e.date >= from); }
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const sd = arr => { if (arr.length < 2) return 0; const m = avg(arr); return Math.sqrt(avg(arr.map(x => (x - m) ** 2))); };
const timeOf = rel => tStr(((Math.round(rel) % 1440) + 1440) % 1440);
function sleepStats(list) {
  const beds = list.map(e => relBed(e.bed)), wakes = list.map(e => relBed(e.bed) + inBedMin(e));
  const goal = S.sleepCfg.goal * 60;
  const last7 = sleepRange(7);
  const debt = last7.reduce((a, e) => a + (goal - asleepMin(e)), 0);
  const consistency = list.length > 2 ? Math.round(clamp(100 - (sd(beds) + sd(wakes)) / 2 * .8, 0, 100)) : null;
  const mid = list.length ? avg(list.map(e => relBed(e.bed) + inBedMin(e) / 2)) - 1440 : NaN;
  return {
    n: list.length, dur: avg(list.map(asleepMin)), score: avg(list.map(sleepScore)), bed: avg(beds), wake: avg(wakes),
    eff: avg(list.map(e => asleepMin(e) / inBedMin(e))), lat: avg(list.map(e => e.lat || 0)), q: avg(list.map(e => e.q || 3)),
    debt, consistency, mid,
  };
}
function chronotype(mid) {
  if (!isFinite(mid)) return null;
  if (mid < 180) return ['🐦 Early bird', 'Your mid-sleep point is early. Protect your mornings for deep work.'];
  if (mid < 270) return ['🕊️ In-between', 'A balanced rhythm. Late morning is likely your sharpest window.'];
  return ['🦉 Night owl', 'You naturally run late. Guard a consistent wake time to anchor your clock.'];
}
function factorImpact(list) {
  const all = avg(list.map(sleepScore));
  const tags = [...new Set(list.flatMap(e => e.tags || []))];
  return tags.map(t => {
    const w = list.filter(e => (e.tags || []).includes(t)), wo = list.filter(e => !(e.tags || []).includes(t));
    if (w.length < 2 || wo.length < 2) return null;
    const a = avg(w.map(sleepScore)), b = avg(wo.map(sleepScore));
    return { tag: t, diff: a - b, n: w.length, with: a, without: b, dur: avg(w.map(asleepMin)) - avg(wo.map(asleepMin)) };
  }).filter(Boolean).sort((a, b) => b.diff - a.diff);
}
function sleepInsights(list) {
  if (list.length < 3) return ['Log a few nights to unlock personal insights.'];
  const out = [], s = sleepStats(list), goal = S.sleepCfg.goal * 60;
  const gap = s.dur - goal;
  out.push(Math.abs(gap) < 15 ? `You're averaging <b>${durStr(s.dur)}</b>, right on your ${S.sleepCfg.goal}h goal.` : gap < 0 ? `You average <b>${durStr(s.dur)}</b>, <b>${durStr(-gap)}</b> short of your ${S.sleepCfg.goal}h goal. Try going to bed ${durStr(Math.round(-gap / 5) * 5)} earlier.` : `You average <b>${durStr(s.dur)}</b>, ${durStr(gap)} above your goal.`);
  const wk = list.filter(e => { const d = parse(e.date).getDay(); return d === 0 || d === 6; }), wd = list.filter(e => { const d = parse(e.date).getDay(); return d > 0 && d < 6; });
  if (wk.length >= 2 && wd.length >= 2) {
    const jl = avg(wk.map(e => relBed(e.bed) + inBedMin(e) / 2)) - avg(wd.map(e => relBed(e.bed) + inBedMin(e) / 2));
    if (Math.abs(jl) >= 40) out.push(`<b>Social jet lag:</b> your sleep shifts ${durStr(Math.abs(Math.round(jl)))} ${jl > 0 ? 'later' : 'earlier'} on weekends. Keeping wake time within an hour helps energy on Mondays.`);
  }
  const f = factorImpact(list);
  if (f.length) {
    const worst = f[f.length - 1], best = f[0];
    if (worst.diff < -3) out.push(`Nights with <b>${esc(worst.tag)}</b> score <b>${Math.round(-worst.diff)} points lower</b> on average (${worst.n} nights).`);
    if (best.diff > 3) out.push(`<b>${esc(best.tag)}</b> nights score <b>${Math.round(best.diff)} points higher</b>. Keep doing it.`);
  }
  if (s.lat > 25) out.push(`It takes you about <b>${Math.round(s.lat)} min</b> to fall asleep. A screen-free wind-down and a cooler room usually help.`);
  if (s.consistency != null) out.push(s.consistency >= 80 ? `Your schedule is very consistent (<b>${s.consistency}/100</b>). That's the #1 driver of good sleep.` : `Consistency is <b>${s.consistency}/100</b>. Your bedtime varies by about ${durStr(Math.round(sd(list.map(e => relBed(e.bed)))))}. A fixed wake time is the easiest fix.`);
  const top = [...list].sort((a, b) => sleepScore(b) - sleepScore(a))[0];
  out.push(`Best night: <b>${niceDate(top.date, { weekday: 'short', month: 'short', day: 'numeric' })}</b> · ${timeOf(relBed(top.bed))} → ${tStr(top.wake)} · score ${sleepScore(top)}.`);
  return out;
}

/* =========================================================
   SLEEP VIEW
   ========================================================= */
function liveSleepCard(compact = false) {
  const L = S.sleepLive;
  if (L) {
    const since = new Date(L.bedAt);
    return `<div class="card sleep-live on ${compact ? '' : 'span-12'}"><div class="moon-orb"></div><div class="grow"><div class="eyebrow">Sleeping</div><div class="sl-title">Good night 🌙</div><div class="muted">In bed since ${tStr(since.getHours() * 60 + since.getMinutes())} · <b data-elapsed="${L.bedAt}">…</b></div></div><div class="row"><button class="btn ghost" id="slCancel">Cancel</button><button class="btn primary" id="slWake">${icon('sunrise')} I'm awake</button></div></div>`;
  }
  const nm = nowMin(), until = (S.sleepCfg.bed - nm + 1440) % 1440;
  const msg = until < 60 ? `Bedtime in <b>${durStr(until)}</b>. Start winding down 🌙` : until > 1440 - 180 ? `You're up past your ${tStr(S.sleepCfg.bed)} bedtime` : `Target bedtime <b>${tStr(S.sleepCfg.bed)}</b> · in ${durStr(until)}`;
  return `<div class="card sleep-live ${compact ? '' : 'span-12'}"><div class="moon-orb off"></div><div class="grow"><div class="eyebrow">Tonight</div><div class="sl-title">Ready for bed?</div><div class="muted">${msg} · wake ${tStr(S.sleepCfg.wake)}</div></div><div class="row"><button class="btn primary" id="slBed">${icon('moon')} Going to bed</button></div></div>`;
}
function renderSleep() {
  const n = ui.sRange, list = sleepRange(n), all = sleepSorted();
  const last = all[0], s = sleepStats(list), goal = S.sleepCfg.goal * 60;
  const ls = last ? sleepScore(last) : 0;
  const R = 70, C = 2 * Math.PI * R;
  const ct = chronotype(sleepStats(sleepRange(30)).mid);
  const moons = q => '●'.repeat(q) + '<span class="faint">' + '●'.repeat(5 - q) + '</span>';
  return `
  <div class="view-head">
    <div><div class="eyebrow">Sleep · goal ${S.sleepCfg.goal}h · ${tStr(S.sleepCfg.bed)} → ${tStr(S.sleepCfg.wake)}</div><h1 class="title">Sleep <em>tracker</em></h1></div>
    <div class="toolbar">
      <div class="seg">${[7, 14, 30, 90].map(k => `<button data-srange="${k}" class="${n === k ? 'on' : ''}">${k}d</button>`).join('')}</div>
      <button class="icon-btn" id="sCfg" title="Sleep goals">${icon('gear')}</button>
      <button class="btn primary" id="sLog">${icon('plus')} Log night</button>
    </div>
  </div>
  ${demoBanner()}
  <div class="dash">
    ${liveSleepCard()}
    ${last ? `
    <div class="card span-4 score-card">
      <div class="card-h"><span class="card-t">${icon('moon')} ${last.date === todayStr() ? 'Last night' : relDate(last.date)}</span><button class="btn ghost" data-sedit="${last.id}">${icon('edit')}</button></div>
      <div class="score-ring">
        <svg width="170" height="170" viewBox="0 0 170 170"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><circle cx="85" cy="85" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="12"/><circle cx="85" cy="85" r="${R}" fill="none" stroke="url(#sg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - ls / 100)}" transform="rotate(-90 85 85)"/></svg>
        <div class="sr-lbl"><b>${ls}</b><span>${scoreWord(ls)}</span></div>
      </div>
      <div class="sc-dur">${durStr(asleepMin(last))}<small> asleep</small></div>
      <div class="muted" style="text-align:center">${tStr(last.bed)} → ${tStr(last.wake)} · ${Math.round(asleepMin(last) / inBedMin(last) * 100)}% efficient</div>
      <div class="sc-row"><span>Quality <b class="moons">${moons(last.q || 3)}</b></span><span>Energy <b class="moons">${moons(last.energy || 3)}</b></span></div>
      ${(last.tags || []).length ? `<div class="row" style="flex-wrap:wrap;gap:5px;justify-content:center;margin-top:10px">${last.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    </div>` : `<div class="card span-4 empty" style="display:grid;place-items:center">No nights logged yet.<br><br><button class="btn primary" id="sLog2">${icon('plus')} Log last night</button></div>`}
    <div class="span-8 s-tiles">
      <div class="card"><span class="stat-k">Avg. sleep · ${n}d</span><div class="stat-v">${list.length ? durStr(s.dur) : '—'}</div><div class="bar" style="margin:8px 0 4px"><i style="width:${clamp(s.dur / goal * 100, 0, 100)}%"></i></div><span class="faint">${list.length ? `${Math.round(s.dur / goal * 100)}% of ${S.sleepCfg.goal}h goal` : 'no data'}</span></div>
      <div class="card"><span class="stat-k">Sleep debt · 7d</span><div class="stat-v" style="${s.debt > 120 ? 'color:' + NEG : ''}">${s.debt > 0 ? durStr(s.debt) : '0m'}</div><span class="faint">${s.debt > 0 ? 'owed vs. your goal this week' : 'fully rested this week 🎉'}</span></div>
      <div class="card"><span class="stat-k">Consistency</span><div class="stat-v">${s.consistency ?? '—'}<small>${s.consistency != null ? '/100' : ''}</small></div><span class="faint">how steady your bed & wake times are</span></div>
      <div class="card"><span class="stat-k">Avg. score</span><div class="stat-v">${list.length ? Math.round(s.score) : '—'}</div><span class="faint">${list.length ? scoreWord(s.score) + ` · ${list.length} nights` : ''}</span></div>
      <div class="card"><span class="stat-k">Avg. bedtime</span><div class="stat-v sm">${list.length ? timeOf(s.bed) : '—'}</div><span class="faint">target ${tStr(S.sleepCfg.bed)}</span></div>
      <div class="card"><span class="stat-k">Avg. wake-up</span><div class="stat-v sm">${list.length ? timeOf(s.wake) : '—'}</div><span class="faint">target ${tStr(S.sleepCfg.wake)}</span></div>
      <div class="card"><span class="stat-k">Fall asleep in</span><div class="stat-v sm">${list.length ? Math.round(s.lat) + 'm' : '—'}</div><span class="faint">10–20 min is ideal</span></div>
      <div class="card"><span class="stat-k">Chronotype</span><div class="stat-v sm">${ct ? ct[0] : '—'}</div><span class="faint">${ct ? `mid-sleep ≈ ${timeOf(s.mid + 1440)}` : 'needs more nights'}</span></div>
    </div>

    <div class="card span-12">${chartHead('sleepWin', 'Sleep windows', 'clock')}<div data-chart="sleepWin"></div></div>
    <div class="card span-7">${chartHead('sleepDur', 'Hours asleep', 'chart')}<div data-chart="sleepDur"></div></div>
    <div class="card span-5">${chartHead('sleepFactors', 'What affects your sleep', 'sparkle', 'score vs. nights without')}<div data-chart="sleepFactors"></div></div>
    <div class="card span-7">${chartHead('sleepScore', 'Sleep score trend', 'moon')}<div data-chart="sleepScore"></div></div>
    <div class="card span-5">${chartHead('sleepMix', 'How your nights rate', 'target')}<div data-chart="sleepMix"></div></div>
    <div class="card span-5">${chartHead('sleepDow', 'By weekday', 'calendar', 'avg hours · 60d')}<div data-chart="sleepDow"></div></div>
    <div class="card span-7"><div class="card-h"><span class="card-t">${icon('wand')} Insights</span></div><ul class="insights">${sleepInsights(list).map(x => `<li>${x}</li>`).join('')}</ul>${ct ? `<div class="faint" style="font-size:12.5px;margin-top:8px">${ct[1]}</div>` : ''}</div>
    <div class="card span-12">${chartHead('sleepCal', 'Sleep score calendar', 'grid', 'last 6 months')}<div data-chart="sleepCal"></div></div>
    <div class="card span-12"><div class="card-h"><span class="card-t">${icon('note')} Sleep log</span><span class="faint">${all.length} nights</span></div>
      <div class="slog">${all.slice(0, 21).map(e => { const sc = sleepScore(e); return `<button class="slog-row" data-sedit="${e.id}"><span class="slog-d">${niceDate(e.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span><span class="slog-t">${tStr(e.bed)} → ${tStr(e.wake)}</span><span class="slog-dur">${durStr(asleepMin(e))}</span><span class="slog-bar"><i style="width:${clamp(asleepMin(e) / (goal * 1.25) * 100, 0, 100)}%"></i><em style="left:${80}%"></em></span><span class="slog-sc" style="background:${seq(sc / 100)}">${sc}</span><span class="slog-tags">${(e.tags || []).slice(0, 3).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</span></button>`; }).join('') || '<div class="empty">No nights yet.</div>'}</div>
    </div>
  </div>`;
}
AFTER.sleep = () => {
  bindDemoBanner();
  $$('[data-srange]').forEach(b => b.onclick = () => { ui.sRange = +b.dataset.srange; saveUI(); render(); });
  ['#sLog', '#sLog2'].forEach(id => { const b = $(id); if (b) b.onclick = () => openSleepEditor(); });
  $('#sCfg').onclick = openSleepCfg;
  $$('[data-sedit]').forEach(b => b.onclick = () => openSleepEditor(S.sleep.find(e => e.id === b.dataset.sedit)));
  bindLiveSleep();
  if (typeof pomoDashBind === 'function') pomoDashBind();
  drawCharts($('#main'));
};
function bindLiveSleep() {
  const bed = $('#slBed'), wake = $('#slWake'), cancel = $('#slCancel');
  if (bed) bed.onclick = () => { S.sleepLive = { bedAt: Date.now() }; save(); render(); toast('Sleep well 🌙 Tap “I\'m awake” when you get up.'); };
  if (cancel) cancel.onclick = () => { S.sleepLive = null; save(); render(); };
  if (wake) wake.onclick = () => {
    const b = new Date(S.sleepLive.bedAt);
    const hrs = (Date.now() - S.sleepLive.bedAt) / 36e5;
    openSleepEditor(null, { date: todayStr(), bed: b.getHours() * 60 + b.getMinutes(), wake: nowMin(), live: true, longGap: hrs > 16 });
  };
}
function openSleepEditor(e, preset = {}) {
  const isNew = !e;
  const d = e ? { ...e, tags: [...(e.tags || [])] } : { date: todayStr(), bed: S.sleepCfg.bed, wake: S.sleepCfg.wake, lat: 10, awk: 0, q: 3, energy: 3, tags: [], note: '', ...preset };
  const allTags = [...new Set([...SLEEP_TAGS, ...S.sleep.flatMap(x => x.tags || [])])];
  const pick = (id, val, labels) => `<div class="seg pick5" id="${id}">${[1, 2, 3, 4, 5].map(i => `<button data-v="${i}" class="${val === i ? 'on' : ''}" title="${labels[i - 1]}">${i}</button>`).join('')}</div><div class="faint" style="font-size:11.5px;display:flex;justify-content:space-between"><span>${labels[0]}</span><span>${labels[4]}</span></div>`;
  openModal(isNew ? (preset.live ? 'Good morning ☀️' : 'Log a night') : 'Edit night', `
    ${preset.longGap ? '<p class="muted" style="margin-top:-8px">That was a long time — double-check the times below.</p>' : ''}
    <div class="field-row three">
      <div class="field"><label>Woke up on</label><input type="date" id="seDate" value="${d.date}"></div>
      <div class="field"><label>Bedtime</label><input type="time" id="seBed" value="${toHHMM(d.bed)}"></div>
      <div class="field"><label>Wake time</label><input type="time" id="seWake" value="${toHHMM(d.wake)}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Fell asleep after (min)</label><input type="number" id="seLat" min="0" max="240" value="${d.lat}"></div>
      <div class="field"><label>Times woke up</label><input type="number" id="seAwk" min="0" max="20" value="${d.awk}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Sleep quality</label>${pick('seQ', d.q, ['Awful', 'Poor', 'OK', 'Good', 'Amazing'])}</div>
      <div class="field"><label>Energy on waking</label>${pick('seE', d.energy, ['Drained', 'Low', 'OK', 'Good', 'Charged'])}</div>
    </div>
    <div class="field"><label>Factors</label><div class="cat-pick" id="seTags">${allTags.map(t => `<button data-t="${esc(t)}" style="--c:var(--accent)" class="${d.tags.includes(t) ? 'on' : ''}">${esc(t)}</button>`).join('')}</div><input class="sub-add" id="seTagAdd" placeholder="+ custom factor, press Enter" style="margin-top:6px"></div>
    <div class="field"><label>Dreams / notes</label><textarea id="seNote" rows="2" placeholder="Anything worth remembering?">${esc(d.note || '')}</textarea></div>
    <div class="se-preview" id="sePrev"></div>
    <div class="modal-foot"><div>${!isNew ? `<button class="btn danger" id="seDel">${icon('trash')} Delete</button>` : ''}</div><div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="seSave">${isNew ? 'Save night' : 'Save'}</button></div></div>`, (m, close) => {
    const read = () => ({ ...d, date: $('#seDate', m).value || todayStr(), bed: fromHHMM($('#seBed', m).value || '23:00'), wake: fromHHMM($('#seWake', m).value || '07:00'), lat: Math.max(0, +$('#seLat', m).value || 0), awk: Math.max(0, +$('#seAwk', m).value || 0), note: $('#seNote', m).value.trim() });
    const prev = () => { const x = read(), sc = sleepScore(x); $('#sePrev', m).innerHTML = `<span class="slog-sc" style="background:${seq(sc / 100)}">${sc}</span><span><b>${durStr(asleepMin(x))}</b> asleep · ${durStr(inBedMin(x))} in bed · ${Math.round(asleepMin(x) / inBedMin(x) * 100)}% efficiency · <b>${scoreWord(sc)}</b></span>`; };
    const seg = (id, key) => $$(`#${id} button`, m).forEach(b => b.onclick = () => { d[key] = +b.dataset.v; $$(`#${id} button`, m).forEach(x => x.classList.toggle('on', x === b)); prev(); });
    seg('seQ', 'q'); seg('seE', 'energy');
    const bindTags = () => $$('#seTags button', m).forEach(b => b.onclick = () => { const t = b.dataset.t; d.tags = d.tags.includes(t) ? d.tags.filter(x => x !== t) : [...d.tags, t]; b.classList.toggle('on'); });
    bindTags();
    $('#seTagAdd', m).onkeydown = ev => {
      const v = ev.target.value.trim().toLowerCase(); if (ev.key !== 'Enter' || !v) return;
      if (!d.tags.includes(v)) d.tags.push(v);
      if (!$(`#seTags [data-t="${CSS.escape(v)}"]`, m)) $('#seTags', m).insertAdjacentHTML('beforeend', `<button data-t="${esc(v)}" style="--c:var(--accent)" class="on">${esc(v)}</button>`);
      ev.target.value = ''; bindTags();
    };
    ['#seBed', '#seWake', '#seLat', '#seAwk', '#seDate'].forEach(id => $(id, m).addEventListener('input', prev));
    prev();
    $('#seSave', m).onclick = () => {
      const x = read();
      if (isNew) {
        const dup = S.sleep.find(y => y.date === x.date);
        if (dup) S.sleep = S.sleep.filter(y => y !== dup);
        S.sleep.push({ id: uid(), userMade: true, ...x });
      } else Object.assign(e, x, { userMade: true });
      if (preset.live) S.sleepLive = null;
      save(); close(); render();
      toast(`Night saved · score ${sleepScore(x)} (${scoreWord(sleepScore(x))})`);
    };
    if (!isNew) $('#seDel', m).onclick = () => { S.sleep = S.sleep.filter(y => y !== e); save(); close(); render(); toast('Night deleted', { label: 'Undo', fn: () => { S.sleep.push(e); save(); render(); } }); };
  });
}
function openSleepCfg() {
  const c = S.sleepCfg;
  openModal('Sleep goals', `
    <div class="field"><label>Sleep goal (hours asleep)</label><div class="seg" id="scGoal">${[6, 6.5, 7, 7.5, 8, 8.5, 9].map(h => `<button data-v="${h}" class="${c.goal === h ? 'on' : ''}">${h}h</button>`).join('')}</div></div>
    <div class="field-row"><div class="field"><label>Target bedtime</label><input type="time" id="scBed" value="${toHHMM(c.bed)}"></div><div class="field"><label>Target wake time</label><input type="time" id="scWake" value="${toHHMM(c.wake)}"></div></div>
    <label class="row"><input type="checkbox" class="chk" id="scWind" ${c.windDown ? 'checked' : ''}> Wind-down reminder 30 min before bedtime</label>
    <p class="faint" style="font-size:12.5px">Your score blends duration vs. goal (45%), quality (25%), timing vs. target bedtime (15%) and disruptions (15%).</p>
    <div class="modal-foot"><span></span><button class="btn primary" id="scSave">Save</button></div>`, (m, close) => {
    let goal = c.goal;
    $$('#scGoal button', m).forEach(b => b.onclick = () => { goal = +b.dataset.v; $$('#scGoal button', m).forEach(x => x.classList.toggle('on', x === b)); });
    $('#scSave', m).onclick = () => { Object.assign(c, { goal, bed: fromHHMM($('#scBed', m).value || '23:00'), wake: fromHHMM($('#scWake', m).value || '07:00'), windDown: $('#scWind', m).checked }); save(); close(); render(); };
  });
}

/* =========================================================
   DASHBOARD CARDS
   ========================================================= */
function dashExtras() {
  const t = todayStr(), due = activeHabits().filter(h => hDue(h, t));
  const sc = dayScore(t), last = sleepSorted()[0];
  const ls = last ? sleepScore(last) : null;
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)).map(d => S.sleep.find(e => e.date === d));
  const goal = S.sleepCfg.goal * 60;
  return `${typeof pomoDash === 'function' ? pomoDash() : ''}
    <div class="card span-7">
      <div class="card-h"><span class="card-t">${icon('flame')} Habits today ${sc ? `<span class="chip">${sc.done}/${sc.n}</span>` : ''}</span><button class="btn ghost" data-go="habits">All habits ${icon('right')}</button></div>
      ${due.length ? `<div class="dash-habits">${due.map(h => { const p = hProg(h, t); return `<button class="dh ${p >= 1 ? 'done' : ''}" data-dh="${h.id}" style="--c:${h.color}" ${tipAttr(`<b>${esc(h.name)}</b><br>${h.type === 'check' ? (p >= 1 ? 'Done ✓' : 'Tap to complete') : `${hNum(h, t)} / ${h.target} ${esc(h.unit || 'min')} · tap +${h.type === 'duration' ? 5 : 1}`}<br>🔥 ${hStreak(h)} streak`)}><span class="dh-ring">${ringSVG(p, 52, h.color, 4)}<span>${h.icon}</span></span><span class="dh-n">${esc(h.name)}</span></button>`; }).join('')}</div>` : `<div class="empty">No habits scheduled today. <a href="#habits" style="color:var(--accent)">Add one</a></div>`}
    </div>
    <div class="card span-5">
      <div class="card-h"><span class="card-t">${icon('moon')} Sleep</span><button class="btn ghost" data-go="sleep">Details ${icon('right')}</button></div>
      ${S.sleepLive ? liveSleepCard(true) : last ? `<div class="row" style="gap:18px"><div class="ring" style="width:96px;height:96px">${ringSVG(ls / 100, 96, 'var(--accent)', 8)}<div class="lbl"><div><b style="font-size:28px">${ls}</b><span>score</span></div></div></div>
        <div class="grow"><div class="big-num">${durStr(asleepMin(last))}</div><div class="muted" style="font-size:12.5px">${relDate(last.date)} · ${tStr(last.bed)} → ${tStr(last.wake)}</div>
        <div class="mini-sleep">${week.map((e, i) => `<i style="height:${e ? clamp(asleepMin(e) / (goal * 1.2) * 100, 6, 100) : 4}%;background:${e ? (asleepMin(e) >= goal - 15 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 42%, var(--surface-2))') : 'var(--surface-2)'}" ${tipAttr(e ? `<b>${niceDate(e.date, { weekday: 'short' })}</b> ${durStr(asleepMin(e))}` : 'not logged')}></i>`).join('')}</div></div></div>
        <div class="row" style="margin-top:12px"><button class="btn" id="slBed">${icon('moon')} Going to bed</button><button class="btn ghost" id="dsLog">${icon('plus')} Log night</button></div>` : `<div class="empty">No sleep logged yet.</div><div class="row"><button class="btn primary" id="dsLog">${icon('plus')} Log last night</button></div>`}
    </div>`;
}
function afterDashExtras() {
  const t = todayStr();
  $$('[data-dh]').forEach(b => b.onclick = () => { const h = S.habits.find(x => x.id === b.dataset.dh); if (h.type === 'check' || hDone(h, t)) hTap(h, t); else hStep(h, t, 1); render(); });
  const l = $('#dsLog'); if (l) l.onclick = () => openSleepEditor();
  drawCharts($('#main'));
  bindLiveSleep();
}

/* =========================================================
   TICKERS & REMINDERS
   ========================================================= */
let trkMinute = -1;
setInterval(() => {
  $$('[data-elapsed]').forEach(el => { el.textContent = durStr(Math.floor((Date.now() - +el.dataset.elapsed) / 60000)); });
  const m = nowMin(); if (m === trkMinute) return; trkMinute = m;
  const t = todayStr(), hhmm = toHHMM(m);
  const notify = (title, body) => { if (S.settings.notify && 'Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body }); } catch (e) { } } };
  activeHabits().forEach(h => {
    if (h.reminder === hhmm && hDue(h, t) && !hDone(h, t) && !hSkip(h, t)) { chimeSoft(); toast(`${h.icon} Time for <b>${esc(h.name)}</b>`, { label: 'Done', fn: () => { hTap(h, t); render(); } }); notify(`${h.icon} ${h.name}`, 'Your habit reminder'); }
  });
  if (S.sleepCfg && S.sleepCfg.windDown && !S.sleepLive && (S.sleepCfg.bed - 30 + 1440) % 1440 === m) { chimeSoft(); toast('🌙 Wind down — bedtime in 30 minutes', { label: 'Going to bed', fn: () => { S.sleepLive = { bedAt: Date.now() }; save(); render(); } }); notify('Wind down 🌙', `Bedtime at ${tStr(S.sleepCfg.bed)}`); }
}, 1000);

Object.assign(VIEWS, { habits: renderHabits, sleep: renderSleep });
