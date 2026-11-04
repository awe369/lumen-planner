'use strict';
/* =========================================================
   Lumen — Pomodoro timer + ambient sound mixer.
   Every sound is synthesised live with Web Audio (no audio
   files), so they loop seamlessly and work offline.
   ========================================================= */

Object.assign(ICONS, {
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6M12 2v3"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/>',
});

/* =========================================================
   SOUND ENGINE
   ========================================================= */
const AMB = { ctx: null, master: null, playing: {} };
function ambCtx() {
  if (!AMB.ctx) {
    AMB.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AMB.master = AMB.ctx.createGain();
    AMB.master.gain.value = S.pomo.master;
    // makeup gain into a gentle limiter: stacked sounds stay loud enough without clipping
    const makeup = AMB.ctx.createGain(), lim = AMB.ctx.createDynamicsCompressor();
    makeup.gain.value = 2.2;
    lim.threshold.value = -12; lim.knee.value = 8; lim.ratio.value = 12; lim.attack.value = .005; lim.release.value = .25;
    AMB.master.connect(makeup); makeup.connect(lim); lim.connect(AMB.ctx.destination);
  }
  if (AMB.ctx.state === 'suspended') AMB.ctx.resume();
  return AMB.ctx;
}
function noiseBuf(ctx, type) {
  ctx._nb = ctx._nb || {};
  if (ctx._nb[type]) return ctx._nb[type];
  const len = ctx.sampleRate * 8, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0, peak = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'pink') { // Paul Kellet's refined pink filter
        b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
        b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
        d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362; b6 = w * .115926;
      } else { last = (last + .02 * w) / 1.02; d[i] = last; } // brown
      peak = Math.max(peak, Math.abs(d[i]));
    }
    for (let i = 0; i < len; i++) d[i] /= peak; // normalise
    // crossfade the loop seam
    const f = 2048; for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[len - f + i] * (1 - a); }
  }
  return (ctx._nb[type] = buf);
}
/* a "bag" owns every node & timer a sound creates, so stop() cleans up completely */
function mkBag(ctx) {
  const nodes = [], timers = []; let dead = false;
  const b = {
    ctx,
    noise(type) { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, type); s.loop = true; s.start(0, Math.random() * 7); nodes.push(s); return s; },
    osc(type, f) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); nodes.push(o); return o; },
    shot(type, dur, t) { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, type); s.start(t, Math.random() * 7, dur + .05); s.onended = () => s.disconnect(); return s; },
    filt(type, f, q = .7) { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; },
    gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; },
    pan(v) { if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = v; return p; } return ctx.createGain(); },
    chain(...ns) { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); return ns[ns.length - 1]; },
    env(g, t, peak, attack, decay) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay); },
    every(fn, ms) { timers.push(setInterval(() => { if (!dead) fn(); }, ms)); },
    /* schedule events on the audio clock with ~1.6s look-ahead, so throttled background tabs still sound right */
    sched(gap, fire, delay = .1) {
      let next = ctx.currentTime + delay;
      const pump = () => { if (dead) return; if (next < ctx.currentTime) next = ctx.currentTime + .02; const h = ctx.currentTime + 1.6; while (next < h) { fire(next); next += gap(); } };
      pump(); timers.push(setInterval(pump, 350));
    },
    stop() { dead = true; timers.forEach(t => { clearInterval(t); clearTimeout(t); }); nodes.forEach(n => { try { n.stop(); } catch (e) { } try { n.disconnect(); } catch (e) { } }); },
  };
  return b;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const SOUNDS = [
  { id: 'rain', lv: 1, name: 'Rain', icon: '🌧️', build(b, out) {
    b.chain(b.noise('pink'), b.filt('highpass', 300), b.filt('lowpass', 6500), b.gain(.75), out);
    const hiss = b.chain(b.noise('white'), b.filt('bandpass', 4200, .5), b.gain(.16)); hiss.connect(out);
    b.every(() => hiss.gain.setTargetAtTime(rnd(.09, .22), b.ctx.currentTime, .06), 110);
    b.sched(() => rnd(.012, .07), t => { // droplets
      const e = b.gain(0); b.chain(b.shot('white', .06, t), b.filt('bandpass', rnd(1400, 6500), rnd(3, 10)), e, out);
      b.env(e, t, rnd(.05, .35), .002, rnd(.02, .07));
    });
  } },
  { id: 'thunder', lv: 1.6, name: 'Thunder', icon: '⛈️', build(b, out) {
    b.chain(b.noise('brown'), b.filt('lowpass', 110), b.gain(.35), out); // distant rumble bed
    b.sched(() => rnd(14, 38), t => {
      const lp = b.filt('lowpass', 900), e = b.gain(0);
      b.chain(b.shot('brown', 9, t), lp, e, out);
      lp.frequency.setValueAtTime(rnd(600, 1100), t); lp.frequency.exponentialRampToValueAtTime(rnd(90, 160), t + rnd(2.5, 4));
      b.env(e, t, rnd(.6, 1), rnd(.08, .7), rnd(4.5, 8));
      if (Math.random() < .45) { const c = b.gain(0); b.chain(b.shot('white', .5, t), b.filt('lowpass', 1800), c, out); b.env(c, t, .35, .01, .35); }
    }, rnd(3, 8));
  } },
  { id: 'wind', lv: 2, name: 'Wind', icon: '🌬️', build(b, out) {
    const bp = b.filt('bandpass', 520, .9), g = b.gain(.55);
    b.chain(b.noise('pink'), bp, g, out);
    b.chain(b.osc('sine', .06), b.gain(360), bp.frequency);
    b.chain(b.osc('sine', .093), b.gain(.32), g.gain);
    const hi = b.filt('bandpass', 1500, 2.5), hg = b.gain(.05); b.chain(b.noise('white'), hi, hg, out);
    b.chain(b.osc('sine', .045), b.gain(600), hi.frequency);
  } },
  { id: 'ocean', lv: 0.6, name: 'Ocean waves', icon: '🌊', build(b, out) {
    const lp = b.filt('lowpass', 520), g = b.gain(.42), lfo = b.osc('sine', .075);
    b.chain(b.noise('brown'), lp, g, out);
    b.chain(lfo, b.gain(.38), g.gain); b.chain(lfo, b.gain(380), lp.frequency);
    const wash = b.gain(.035); b.chain(b.noise('white'), b.filt('highpass', 1600), wash, out); b.chain(lfo, b.gain(.034), wash.gain);
  } },
  { id: 'stream', lv: 1.26, name: 'Stream', icon: '💧', build(b, out) {
    const g1 = b.gain(.32), g2 = b.gain(.14);
    b.chain(b.noise('white'), b.filt('bandpass', 1100, .7), g1, out);
    b.chain(b.noise('white'), b.filt('bandpass', 2700, 1.3), g2, out);
    b.chain(b.noise('pink'), b.filt('lowpass', 320), b.gain(.28), out);
    b.every(() => { const t = b.ctx.currentTime; g1.gain.setTargetAtTime(rnd(.22, .4), t, .05); g2.gain.setTargetAtTime(rnd(.07, .2), t, .04); }, 80);
    b.sched(() => rnd(.05, .25), t => { const o = b.ctx.createOscillator(), e = b.gain(0); o.frequency.setValueAtTime(rnd(500, 1300), t); o.frequency.exponentialRampToValueAtTime(rnd(1400, 2600), t + .05); b.chain(o, e, out); b.env(e, t, rnd(.01, .04), .004, .05); o.start(t); o.stop(t + .08); });
  } },
  { id: 'fire', lv: 0.85, name: 'Fireplace', icon: '🔥', build(b, out) {
    const roar = b.gain(.55); b.chain(b.noise('brown'), b.filt('lowpass', 360), roar, out);
    b.every(() => roar.gain.setTargetAtTime(rnd(.4, .7), b.ctx.currentTime, .3), 450);
    b.sched(() => rnd(.02, .2), t => {
      const e = b.gain(0); b.chain(b.shot('white', .03, t), b.filt('highpass', rnd(1200, 4200)), e, out); b.env(e, t, rnd(.08, .55), .001, rnd(.006, .03));
      if (Math.random() < .05) { const p = b.gain(0); b.chain(b.shot('brown', .12, t), b.filt('lowpass', 700), p, out); b.env(p, t, .6, .003, .09); }
    });
  } },
  { id: 'forest', lv: 4, name: 'Forest birds', icon: '🐦', build(b, out) {
    b.chain(b.noise('pink'), b.filt('bandpass', 1300, .5), b.gain(.06), out);
    b.sched(() => rnd(1.1, 4.2), t => {
      const base = rnd(2200, 4400), notes = Math.random() < .25 ? 8 : Math.round(rnd(2, 6)), trill = notes === 8, pan = b.pan(rnd(-.8, .8));
      pan.connect(out);
      let tt = t;
      for (let i = 0; i < notes; i++) {
        const o = b.ctx.createOscillator(), e = b.gain(0), d = trill ? .035 : rnd(.05, .13);
        o.type = 'sine'; o.frequency.setValueAtTime(base * rnd(.92, 1.08), tt); o.frequency.exponentialRampToValueAtTime(base * rnd(1.1, 1.55), tt + d);
        b.chain(o, e, pan); b.env(e, tt, rnd(.05, .14), .008, d); o.start(tt); o.stop(tt + d + .05);
        tt += d + (trill ? .02 : rnd(.04, .12));
      }
    }, rnd(.3, 1.5));
  } },
  { id: 'crickets', lv: 6, name: 'Night crickets', icon: '🦗', build(b, out) {
    b.chain(b.noise('pink'), b.filt('lowpass', 400), b.gain(.05), out);
    [-.6, .55].forEach((p, k) => {
      const pan = b.pan(p), f = k ? 4650 : 4300; pan.connect(out);
      b.sched(() => rnd(.8, 1.6), t => {
        for (let i = 0; i < 3 + (Math.random() < .5); i++) {
          const o = b.ctx.createOscillator(), e = b.gain(0), tt = t + i * .055;
          o.frequency.value = f + rnd(-40, 40); b.chain(o, e, pan); b.env(e, tt, .045, .004, .035); o.start(tt); o.stop(tt + .05);
        }
      }, k * .4);
    });
  } },
  { id: 'clock', lv: 4, name: 'Clock', icon: '🕰️', build(b, out) {
    let tock = false;
    b.sched(() => 1, t => { const e = b.gain(0); b.chain(b.shot('white', .02, t), b.filt('bandpass', (tock = !tock) ? 2600 : 3300, 9), e, out); b.env(e, t, .9, .001, .025); }, 1 - (b.ctx.currentTime % 1));
  } },
  { id: 'pad', lv: 1.26, name: 'Ambient pad', icon: '🎹', build(b, out) {
    const lp = b.filt('lowpass', 850, .4), g = b.gain(.9); b.chain(lp, g, out);
    b.chain(b.osc('sine', .045), b.gain(380), lp.frequency);
    b.chain(b.osc('sine', .11), b.gain(.12), g.gain);
    [110, 164.81, 220, 261.63, 329.63, 392, 493.88].forEach((f, i) => [-5, 5].forEach(det => {
      const o = b.osc(i < 3 ? 'triangle' : 'sine', f); o.detune.value = det; b.chain(o, b.pan(det < 0 ? -.4 : .4), b.gain(.035), lp);
    }));
  } },
  { id: 'white', lv: 1.8, name: 'White noise', icon: '⚪', build(b, out) { b.chain(b.noise('white'), b.filt('lowpass', 9000), b.gain(.18), out); } },
  { id: 'pink', lv: 1.1, name: 'Pink noise', icon: '🌸', build(b, out) { b.chain(b.noise('pink'), b.gain(.45), out); } },
  { id: 'brown', lv: 0.6, name: 'Brown noise', icon: '🟤', build(b, out) { b.chain(b.noise('brown'), b.filt('lowpass', 900), b.gain(.85), out); } },
  { id: 'binaural', lv: 0.4, name: 'Focus beats', icon: '🧠', hint: 'Use headphones · 14 Hz beta', build(b, out) {
    b.chain(b.osc('sine', 180), b.pan(-1), b.gain(.22), out);
    b.chain(b.osc('sine', 194), b.pan(1), b.gain(.22), out);
  } },
];
const SOUND_BY = Object.fromEntries(SOUNDS.map(s => [s.id, s]));
const PRESETS = [
  ['🌧️', 'Rainy day', { rain: .75, thunder: .45 }],
  ['🔥', 'Cozy cabin', { rain: .45, fire: .75, clock: .2 }],
  ['🌊', 'Seaside', { ocean: .85, wind: .25 }],
  ['🌲', 'Forest', { forest: .7, stream: .5, wind: .2 }],
  ['🌙', 'Summer night', { crickets: .6, stream: .3, wind: .15 }],
  ['🧠', 'Deep focus', { brown: .6, binaural: .3 }],
  ['🎧', 'Dreamy', { pad: .6, rain: .3 }],
];
const isPlaying = id => !!AMB.playing[id];
function soundOn(id) {
  if (AMB.playing[id] || !SOUND_BY[id]) return;
  const ctx = ambCtx(), g = ctx.createGain(), lv = ctx.createGain();
  g.gain.value = 0; g.connect(AMB.master);
  lv.gain.value = SOUND_BY[id].lv || 1; lv.connect(g); // per-sound loudness balance
  const bag = mkBag(ctx);
  SOUND_BY[id].build(bag, lv);
  AMB.playing[id] = { g, bag };
  g.gain.setTargetAtTime(S.pomo.mix[id] ?? .5, ctx.currentTime, .5);
  if (!S.pomo.on.includes(id)) S.pomo.on.push(id);
  save(); syncSoundUI();
}
function soundOff(id, keepInMix) {
  const p = AMB.playing[id]; if (!p) return;
  p.g.gain.setTargetAtTime(0, AMB.ctx.currentTime, .3);
  delete AMB.playing[id];
  setTimeout(() => { p.bag.stop(); p.g.disconnect(); }, 1800);
  if (!keepInMix) S.pomo.on = S.pomo.on.filter(x => x !== id);
  save(); syncSoundUI();
}
function stopAllSounds(keepInMix) { Object.keys(AMB.playing).forEach(id => soundOff(id, keepInMix)); }
function playMix() { S.pomo.on.forEach(soundOn); }
function setVol(id, v) {
  S.pomo.mix[id] = v; save();
  const p = AMB.playing[id]; if (p) p.g.gain.setTargetAtTime(v, AMB.ctx.currentTime, .1);
}
function setMaster(v) { S.pomo.master = v; save(); if (AMB.master) AMB.master.gain.setTargetAtTime(v, AMB.ctx.currentTime, .1); }
function duckForBreak(on) { if (AMB.master) AMB.master.gain.setTargetAtTime(on ? S.pomo.master * .25 : S.pomo.master, AMB.ctx.currentTime, .8); }
function applyPreset(i) {
  const [, , mix] = PRESETS[i];
  Object.keys(AMB.playing).filter(id => !(id in mix)).forEach(id => soundOff(id));
  Object.entries(mix).forEach(([id, v]) => { setVol(id, v); soundOn(id); });
  S.pomo.on = Object.keys(mix); save(); syncSoundUI();
}
function syncSoundUI() {
  $$('[data-snd]').forEach(el => {
    const id = el.dataset.snd; el.classList.toggle('on', isPlaying(id));
    const r = $('input', el); if (r && document.activeElement !== r) r.value = S.pomo.mix[id] ?? .5;
  });
  const n = Object.keys(AMB.playing).length;
  $$('[data-sndcount]').forEach(el => el.textContent = n ? `${n} playing` : 'off');
  $$('[data-preset]').forEach(el => { const mix = PRESETS[+el.dataset.preset][2]; const ids = Object.keys(mix); el.classList.toggle('on', n === ids.length && ids.every(isPlaying)); });
  updatePill();
}

/* =========================================================
   TIMER ENGINE (timestamp based: survives reloads & tab switches)
   ========================================================= */
const PMODES = { focus: { name: 'Focus', color: 'var(--accent)' }, short: { name: 'Short break', color: '#199e70' }, long: { name: 'Long break', color: '#3987e5' } };
const BREAK_IDEAS = ['Stand up and stretch 🧘', 'Drink a glass of water 💧', 'Look at something 20 ft away for 20 seconds 👀', 'Walk around for a minute 🚶', 'Roll your shoulders and neck 🙆', 'Step outside for fresh air 🌿', 'Tidy one small thing 🧹', 'Close your eyes and breathe 🌬️'];
MIGRATIONS.push(s => {
  const def = { cfg: { focus: 25, short: 5, long: 15, every: 4, goal: 8, autoBreak: true, autoFocus: false, autoSound: true, duck: true }, sessions: [], mix: { rain: .7, thunder: .4 }, on: ['rain'], master: .7 };
  const fresh = !s.pomo;
  s.pomo = { ...def, ...(s.pomo || {}), cfg: { ...def.cfg, ...((s.pomo || {}).cfg || {}) } };
  if (fresh && s.trackerDemo) seedPomo(s);
  if (!s.pomoRun) s.pomoRun = { mode: 'focus', running: false, endAt: 0, total: s.pomo.cfg.focus * 60000, left: s.pomo.cfg.focus * 60000, cycle: 0, startedAt: 0, task: '' };
});
function seedPomo(s) {
  const t = todayStr(), tasks = ['Deep work — main project', 'Study session', 'Read 20 pages', 'Outline the plan for this week', ''];
  for (let d = 1; d <= 30; d++) {
    const date = addDays(t, -d), n = Math.round(rnd(0, 7) * (parse(date).getDay() % 6 ? 1 : .4));
    let h = rnd(8, 10);
    for (let i = 0; i < n; i++) {
      const start = parse(date).getTime() + h * 36e5, task = tasks[Math.floor(Math.random() * tasks.length)];
      s.pomo.sessions.push({ id: uid(), date, start, end: start + 25 * 60000, min: 25, task: '', taskText: task, demo: true });
      h += rnd(.5, 1.8); if (h > 22) break;
    }
  }
}
const PR = () => S.pomoRun;
const modeLen = m => S.pomo.cfg[m === 'focus' ? 'focus' : m] * 60000;
const pLeft = () => PR().running ? Math.max(0, PR().endAt - Date.now()) : PR().left;
function pStart() {
  const R = PR();
  if (R.running) return;
  ambCtx(); // user gesture: unlock audio
  R.running = true; R.endAt = Date.now() + R.left; if (!R.startedAt) R.startedAt = Date.now();
  if (S.pomo.cfg.autoSound && R.mode === 'focus' && !Object.keys(AMB.playing).length) playMix();
  duckForBreak(S.pomo.cfg.duck && R.mode !== 'focus');
  save(); refreshPomo();
}
function pPause() { const R = PR(); if (!R.running) return; R.left = Math.max(0, R.endAt - Date.now()); R.running = false; save(); refreshPomo(); }
function pToggle() { PR().running ? pPause() : pStart(); }
function pSetMode(m, keepRunning) {
  const R = PR();
  Object.assign(R, { mode: m, running: false, total: modeLen(m), left: modeLen(m), startedAt: 0 });
  save();
  if (keepRunning) pStart(); else refreshPomo(true);
}
function pReset() { pSetMode(PR().mode); }
function pAdd(min) { const R = PR(); R.total += min * 60000; if (R.running) R.endAt += min * 60000; else R.left += min * 60000; save(); refreshPomo(); }
function pComplete(natural) {
  const R = PR(), c = S.pomo.cfg, wasFocus = R.mode === 'focus';
  const spent = R.total - (natural ? 0 : pLeft());
  if (wasFocus && spent >= 60000) {
    const todo = R.task ? getTodo(R.task) : null;
    S.pomo.sessions.push({ id: uid(), date: todayStr(), start: R.startedAt || Date.now() - spent, end: Date.now(), min: Math.round(spent / 60000), task: R.task || '', taskText: todo ? todo.text : '' });
    if (todo) todo.pomos = (todo.pomos || 0) + 1;
    R.cycle++;
  }
  const next = wasFocus ? (R.cycle % c.every === 0 && R.cycle > 0 ? 'long' : 'short') : 'focus';
  if (natural) {
    chime();
    const todayN = S.pomo.sessions.filter(s => s.date === todayStr()).length;
    const msg = wasFocus ? `🍅 Focus session done! ${todayN}/${c.goal} today. Time for a ${next === 'long' ? 'long' : 'short'} break.` : '⏰ Break over. Ready to focus?';
    const todo = R.task ? getTodo(R.task) : null;
    toast(msg, wasFocus && todo && !todo.done ? { label: 'Task done ✓', fn: () => { todo.done = true; todo.doneAt = todayStr(); R.task = ''; save(); render(); } } : null);
    if (S.settings.notify && 'Notification' in window && Notification.permission === 'granted') { try { new Notification(wasFocus ? 'Focus session complete 🍅' : 'Break is over', { body: msg }); } catch (e) { } }
  }
  const auto = next === 'focus' ? c.autoFocus : c.autoBreak;
  pSetMode(next, natural && auto);
  if (ui.view === 'pomodoro') render();
}

/* =========================================================
   STATS
   ========================================================= */
const focusSessions = () => S.pomo.sessions;
function pomoStats() {
  const t = todayStr(), list = focusSessions(), today = list.filter(s => s.date === t);
  const days = new Set(list.map(s => s.date));
  let streak = 0, d = days.has(t) ? t : addDays(t, -1);
  while (days.has(d)) { streak++; d = addDays(d, -1); }
  const wk = list.filter(s => s.date > addDays(t, -7));
  return { todayN: today.length, todayMin: today.reduce((a, s) => a + s.min, 0), streak, totalH: list.reduce((a, s) => a + s.min, 0) / 60, weekMin: wk.reduce((a, s) => a + s.min, 0) };
}
defChart('pomoDays', ['bar', 'line', 'area', 'dot', 'step'], (w, _, type) => {
  const t = todayStr(), goal = S.pomo.cfg.goal * S.pomo.cfg.focus;
  const pts = Array.from({ length: 14 }, (_, i) => { const d = addDays(t, i - 13), ss = focusSessions().filter(s => s.date === d), m = ss.reduce((a, s) => a + s.min, 0); return { v: m, ok: m >= goal, label: parse(d).getDate(), tip: `<b>${niceDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}</b><br>${durStr(m)} focused · ${ss.length} 🍅` }; });
  const mx = Math.max(goal, ...pts.map(p => p.v)) * 1.1;
  return xySVG(w, type, { pts, height: 220, yMax: mx, ticks: [0, Math.round(mx / 2), Math.round(mx)], fmtY: v => durStr(Math.round(v)), padL: 52, goal, goalLabel: `goal ${durStr(goal)}`, hueFn: p => p.ok ? 'var(--accent)' : MUTED });
});
defChart('pomoHours', ['bar', 'area', 'line', 'dot'], (w, _, type) => {
  const from = addDays(todayStr(), -29), acc = Array(24).fill(0);
  focusSessions().filter(s => s.date >= from).forEach(s => { acc[new Date(s.start).getHours()] += s.min; });
  const lo = Math.min(6, ...acc.map((v, h) => v ? h : 24)), hi = Math.max(22, ...acc.map((v, h) => v ? h : 0));
  const best = Math.max(...acc);
  const pts = []; for (let h = lo; h <= hi; h++) pts.push({ v: acc[h], best: acc[h] === best && best > 0, label: tStr(h * 60).replace(':00', ''), tip: `<b>${tStr(h * 60)} – ${tStr((h + 1) * 60)}</b><br>${durStr(acc[h])} focused · last 30 days` });
  return xySVG(w, type, { pts, height: 200, yMax: Math.max(60, best * 1.1), ticks: [0, Math.round(Math.max(60, best * 1.1))], fmtY: v => durStr(Math.round(v)), padL: 52, labelW: 44, hueFn: p => p.best ? 'var(--accent)' : MUTED });
});
defChart('pomoTasks', ['donut', 'hbar', 'bar'], (w, _, type) => {
  const from = addDays(todayStr(), -29), acc = {};
  focusSessions().filter(s => s.date >= from).forEach(s => { const k = s.taskText || 'No task'; acc[k] = (acc[k] || 0) + s.min; });
  let rows = Object.entries(acc).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return emptyChart('Finish a focus session to see where your time goes.');
  if (rows.length > 6) rows = [...rows.slice(0, 5), ['Other', rows.slice(5).reduce((a, r) => a + r[1], 0)]];
  let ci = 0; // fixed categorical order; neutral grey for "No task"/"Other"
  const data = rows.map(([k, v]) => ({ label: k, v, color: k === 'No task' || k === 'Other' ? 'var(--faint)' : HABIT_COLORS[ci++ % HABIT_COLORS.length], tip: `<b>${esc(k)}</b><br>${durStr(v)} · last 30 days` }));
  if (type === 'donut') return donutSVG(w, { slices: data, center: durStr(data.reduce((a, r) => a + r.v, 0)).replace(' ', ''), sub: '30 days' });
  if (type === 'hbar') return hbarSVG(w, { rows: data, fmt: v => durStr(v) });
  return xySVG(w, 'bar', { pts: data.map(r => ({ ...r, label: r.label.length > 8 ? r.label.slice(0, 7) + '…' : esc(r.label) })), height: 210, fmtY: v => durStr(Math.round(v)), padL: 52, hueFn: p => p.color });
});

/* =========================================================
   VIEW
   ========================================================= */
const fmtClock = ms => { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return `${pad(m)}:${pad(s % 60)}`; };
function soundTile(s) {
  return `<div class="snd ${isPlaying(s.id) ? 'on' : ''}" data-snd="${s.id}" title="${s.hint || s.name}">
    <button class="snd-top" data-sndtog><span class="snd-ico">${s.icon}</span><span class="snd-n">${s.name}</span><span class="eq"><i></i><i></i><i></i><i></i></span></button>
    <input type="range" min="0" max="1" step="0.01" value="${S.pomo.mix[s.id] ?? .5}" aria-label="${s.name} volume" data-sndvol>
  </div>`;
}
function mixerHTML(compact) {
  return `<div class="card-h"><span class="card-t">${icon('headphones')} Soundscape <span class="chip" data-sndcount>${Object.keys(AMB.playing).length ? Object.keys(AMB.playing).length + ' playing' : 'off'}</span></span>
      <div class="row" style="gap:6px"><span class="vol">${icon('volume')}<input type="range" min="0" max="1" step="0.01" value="${S.pomo.master}" id="pmMaster" aria-label="Master volume"></span><button class="icon-btn sm" id="pmStopAll" title="Stop all sounds">${icon('mute')}</button></div></div>
    <div class="presets">${PRESETS.map(([e, n], i) => `<button class="chip" data-preset="${i}">${e} ${n}</button>`).join('')}</div>
    <div class="snd-grid ${compact ? 'compact' : ''}">${SOUNDS.map(soundTile).join('')}</div>`;
}
function renderPomo() {
  const R = PR(), c = S.pomo.cfg, st = pomoStats(), left = pLeft(), mode = PMODES[R.mode];
  const size = 300, r = 132, C = 2 * Math.PI * r, frac = 1 - left / R.total;
  const ticks = Array.from({ length: 60 }, (_, i) => { const a = i / 60 * Math.PI * 2 - Math.PI / 2, long = i % 5 === 0, r1 = 146, r2 = long ? 139 : 142; return `<line x1="${150 + r1 * Math.cos(a)}" y1="${150 + r1 * Math.sin(a)}" x2="${150 + r2 * Math.cos(a)}" y2="${150 + r2 * Math.sin(a)}" stroke="var(--${long ? 'muted' : 'faint'})" stroke-width="${long ? 1.6 : 1}" opacity="${long ? .7 : .45}"/>`; }).join('');
  const inSet = R.cycle % c.every, dots = Array.from({ length: c.every }, (_, i) => `<i class="${i < inSet ? 'done' : i === inSet && R.mode === 'focus' ? 'cur' : ''}"></i>`).join('');
  const openTodos = S.todos.filter(x => !x.done);
  const recent = [...focusSessions()].sort((a, b) => b.end - a.end).slice(0, 8);
  const water = (S.habits || []).find(h => !h.archived && /water/i.test(h.name) && h.type !== 'check');
  const idea = BREAK_IDEAS[(R.cycle + new Date().getHours()) % BREAK_IDEAS.length];
  return `
  <div class="view-head">
    <div><div class="eyebrow">Pomodoro · ${c.focus}/${c.short}/${c.long} min · long break every ${c.every}</div><h1 class="title">Focus <em>timer</em></h1></div>
    <div class="toolbar"><button class="btn" id="pmZen">${icon('expand')} Zen mode</button><button class="icon-btn" id="pmCfg" title="Timer settings">${icon('gear')}</button></div>
  </div>
  <div class="dash">
    <div class="card span-7 pm-card" style="--mc:${mode.color}">
      <div class="seg pm-modes">${Object.entries(PMODES).map(([k, m]) => `<button data-pmode="${k}" class="${R.mode === k ? 'on' : ''}">${m.name}</button>`).join('')}</div>
      <div class="pm-ring ${R.running ? 'running' : ''}">
        <svg viewBox="0 0 ${size} ${size}" width="100%" height="100%">${ticks}
          <circle cx="150" cy="150" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
          <circle id="pmArc" cx="150" cy="150" r="${r}" fill="none" stroke="${mode.color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 150 150)" style="transition:stroke-dashoffset 1s linear;filter:drop-shadow(0 0 10px ${mode.color})"/>
        </svg>
        <div class="pm-center">
          ${R.mode !== 'focus' ? `<div class="breath" style="animation-delay:-${(Date.now() / 1000) % 16}s"></div>` : ''}
          <div class="pm-mode">${mode.name}</div>
          <div class="pm-time" id="pmTime">${fmtClock(left)}</div>
          <div class="pm-sub" id="pmSub">${R.mode === 'focus' ? (R.running ? 'stay with it' : left < R.total ? 'paused' : 'ready when you are') : `<span id="pmBreath">breathe</span>`}</div>
        </div>
      </div>
      <div class="pm-dots" title="Sessions in this set">${dots}</div>
      <div class="pm-ctrls">
        <button class="icon-btn" id="pmReset" title="Reset (R)">${icon('reset')}</button>
        <button class="pm-play" id="pmPlay" title="Start / pause (Space)">${icon(R.running ? 'pause' : 'play')}</button>
        <button class="icon-btn" id="pmSkip" title="Skip to next (S)">${icon('skip')}</button>
      </div>
      <div class="row" style="justify-content:center;gap:6px;margin-top:4px"><button class="chip" data-padd="1">+1 min</button><button class="chip" data-padd="5">+5 min</button><button class="chip" data-padd="10">+10 min</button></div>
      ${R.mode === 'focus' ? `
        <div class="pm-task"><span class="lbl-sm">Working on</span><select id="pmTask"><option value="">— no task —</option>${openTodos.map(x => `<option value="${x.id}" ${x.id === R.task ? 'selected' : ''}>${esc(x.text.slice(0, 60))}${x.pomos ? ` · 🍅${x.pomos}` : ''}</option>`).join('')}</select></div>` : `
        <div class="pm-break"><span>💡 ${idea}</span>${water ? `<button class="btn" id="pmWater">${water.icon} Log ${esc(water.unit || 'a glass').replace(/s$/, '')}</button>` : ''}</div>`}
      <div class="pm-goal"><div class="row" style="justify-content:space-between;font-size:12.5px"><span class="muted">Daily goal</span><span><b>${st.todayN}</b> / ${c.goal} 🍅</span></div><div class="pm-goal-row">${Array.from({ length: Math.max(c.goal, st.todayN) }, (_, i) => `<i class="${i < st.todayN ? 'on' : ''}"></i>`).join('')}</div></div>
    </div>
    <div class="card span-5 mixer">${mixerHTML()}</div>

    <div class="span-12 s-tiles">
      <div class="card"><span class="stat-k">Focused today</span><div class="stat-v">${durStr(st.todayMin)}</div><span class="faint">${st.todayN} session${st.todayN === 1 ? '' : 's'}</span></div>
      <div class="card"><span class="stat-k">This week</span><div class="stat-v">${durStr(st.weekMin)}</div><span class="faint">last 7 days</span></div>
      <div class="card"><span class="stat-k">Focus streak</span><div class="stat-v">${st.streak}<small> days</small></div><span class="faint">at least one 🍅 a day</span></div>
      <div class="card"><span class="stat-k">All-time</span><div class="stat-v">${Math.round(st.totalH)}<small> h</small></div><span class="faint">${focusSessions().length} sessions</span></div>
    </div>
    <div class="card span-7">${chartHead('pomoDays', 'Focus time · 14 days', 'chart')}<div data-chart="pomoDays"></div></div>
    <div class="card span-5">${chartHead('pomoTasks', 'Where focus goes', 'target', '30 days')}<div data-chart="pomoTasks"></div></div>
    <div class="card span-7">${chartHead('pomoHours', 'Your peak hours', 'clock', '30 days')}<div data-chart="pomoHours"></div></div>
    <div class="card span-5"><div class="card-h"><span class="card-t">${icon('note')} Recent sessions</span></div>
      ${recent.length ? recent.map(s => `<div class="pm-log"><span class="faint">${relDate(s.date)} · ${tStr(new Date(s.start).getHours() * 60 + new Date(s.start).getMinutes())}</span><span class="grow">${esc(s.taskText || 'Focus')}</span><b>${s.min}m</b></div>`).join('') : '<div class="empty">No sessions yet. Press play to start your first 🍅</div>'}
    </div>
  </div>`;
}
AFTER.pomodoro = () => {
  $$('[data-pmode]').forEach(b => b.onclick = async () => { if (PR().running && !(await confirmBox('Switch mode? The current timer will reset.', 'Switch'))) return; pSetMode(b.dataset.pmode); render(); });
  $('#pmPlay').onclick = pToggle;
  $('#pmReset').onclick = () => { pReset(); render(); };
  $('#pmSkip').onclick = () => pComplete(false);
  $$('[data-padd]').forEach(b => b.onclick = () => pAdd(+b.dataset.padd));
  const task = $('#pmTask'); if (task) task.onchange = () => { PR().task = task.value; save(); };
  const w = $('#pmWater'); if (w) w.onclick = () => { const h = S.habits.find(x => !x.archived && /water/i.test(x.name)); hStep(h, todayStr(), 1); toast(`${h.icon} Logged · ${hNum(h, todayStr())}/${h.target}`); };
  $('#pmCfg').onclick = openPomoCfg;
  $('#pmZen').onclick = openZen;
  bindMixer($('#main'));
  drawCharts($('#main'));
};
function bindMixer(root) {
  $$('[data-snd]', root).forEach(el => {
    const id = el.dataset.snd;
    $('[data-sndtog]', el).onclick = () => isPlaying(id) ? soundOff(id) : soundOn(id);
    $('[data-sndvol]', el).oninput = e => { setVol(id, +e.target.value); if (+e.target.value > 0 && !isPlaying(id)) soundOn(id); };
  });
  $$('[data-preset]', root).forEach(b => b.onclick = () => applyPreset(+b.dataset.preset));
  const m = $('#pmMaster', root); if (m) m.oninput = e => setMaster(+e.target.value);
  const st = $('#pmStopAll', root); if (st) st.onclick = () => stopAllSounds();
  syncSoundUI();
}
function refreshPomo(full) {
  if (ui.view === 'pomodoro') { if (full) render(); else updatePomoLive(); }
  updatePill(); updateZen(true);
}
function updatePomoLive() {
  const R = PR(), left = pLeft(), el = $('#pmTime'); if (!el) return;
  el.textContent = fmtClock(left);
  const arc = $('#pmArc'); if (arc) { const C = 2 * Math.PI * 132; arc.setAttribute('stroke-dashoffset', C * (left / R.total)); }
  const play = $('#pmPlay'); if (play && play.dataset.state !== String(R.running)) { play.dataset.state = R.running; play.innerHTML = icon(R.running ? 'pause' : 'play'); $('.pm-ring')?.classList.toggle('running', R.running); }
  const sub = $('#pmSub');
  if (sub && R.mode === 'focus') sub.textContent = R.running ? 'stay with it' : left < R.total ? 'paused' : 'ready when you are';
  const br = $('#pmBreath'); if (br) br.textContent = ['breathe in', 'hold', 'breathe out', 'hold'][Math.floor((Date.now() / 1000) % 16 / 4)];
}
function openPomoCfg() {
  const c = S.pomo.cfg;
  const num = (id, v, min, max, lbl) => `<div class="field"><label>${lbl}</label><input type="number" id="${id}" min="${min}" max="${max}" value="${v}"></div>`;
  const chk = (id, v, lbl) => `<label class="row"><input type="checkbox" class="chk" id="${id}" ${v ? 'checked' : ''}> ${lbl}</label>`;
  openModal('Timer settings', `
    <div class="field-row three">${num('pcF', c.focus, 1, 180, 'Focus (min)')}${num('pcS', c.short, 1, 60, 'Short break')}${num('pcL', c.long, 1, 90, 'Long break')}</div>
    <div class="dur-chips" style="margin:-6px 0 14px">${[[25, 5, 15], [50, 10, 20], [90, 15, 30], [15, 3, 10]].map(([f, s, l]) => `<button class="chip" data-pc="${f},${s},${l}">${f}/${s}/${l}</button>`).join('')}</div>
    <div class="field-row">${num('pcE', c.every, 2, 8, 'Long break every')}${num('pcG', c.goal, 1, 20, 'Daily goal (sessions)')}</div>
    <div class="field" style="gap:8px">${chk('pcAB', c.autoBreak, 'Auto-start breaks')}${chk('pcAF', c.autoFocus, 'Auto-start next focus session')}${chk('pcAS', c.autoSound, 'Start my soundscape when focus starts')}${chk('pcDK', c.duck, 'Lower sounds during breaks')}</div>
    <div class="modal-foot"><span></span><button class="btn primary" id="pcSave">Save</button></div>`, (m, close) => {
    $$('[data-pc]', m).forEach(b => b.onclick = () => { const [f, s, l] = b.dataset.pc.split(','); $('#pcF', m).value = f; $('#pcS', m).value = s; $('#pcL', m).value = l; });
    $('#pcSave', m).onclick = () => {
      const R = PR(), idle = !R.running && R.left === R.total;
      Object.assign(c, { focus: clamp(+$('#pcF', m).value || 25, 1, 180), short: clamp(+$('#pcS', m).value || 5, 1, 60), long: clamp(+$('#pcL', m).value || 15, 1, 90), every: clamp(+$('#pcE', m).value || 4, 2, 8), goal: clamp(+$('#pcG', m).value || 8, 1, 20), autoBreak: $('#pcAB', m).checked, autoFocus: $('#pcAF', m).checked, autoSound: $('#pcAS', m).checked, duck: $('#pcDK', m).checked });
      if (idle) Object.assign(R, { total: modeLen(R.mode), left: modeLen(R.mode) });
      save(); close(); render();
    };
  });
}

/* ---------- zen mode (fullscreen) ---------- */
function openZen() {
  let z = $('#zen');
  if (!z) { z = document.createElement('div'); z.id = 'zen'; z.className = 'zen'; document.body.appendChild(z); }
  z.hidden = false;
  z.innerHTML = `<button class="icon-btn zen-x" id="zenX" title="Exit (Esc)">${icon('x')}</button>
    <div class="zen-in"><div class="eyebrow" id="zenMode"></div><div class="zen-time" id="zenTime"></div><div class="zen-task" id="zenTask"></div>
    <div class="pm-ctrls"><button class="icon-btn" id="zenSkip">${icon('skip')}</button><button class="pm-play" id="zenPlay"></button><button class="icon-btn" id="zenSnd" title="Sounds">${icon('headphones')}</button></div>
    <div class="zen-mix" id="zenMix" hidden>${mixerHTML(true)}</div></div>`;
  $('#zenX').onclick = closeZen;
  $('#zenPlay').onclick = pToggle;
  $('#zenSkip').onclick = () => pComplete(false);
  $('#zenSnd').onclick = () => { const mx = $('#zenMix'); mx.hidden = !mx.hidden; };
  bindMixer(z);
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { }
  updateZen(true);
}
function closeZen() { const z = $('#zen'); if (z) z.hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); if (ui.view === 'pomodoro') render(); }
function updateZen(full) {
  const z = $('#zen'); if (!z || z.hidden) return;
  const R = PR();
  z.style.setProperty('--mc', PMODES[R.mode].color);
  $('#zenTime').textContent = fmtClock(pLeft());
  if (full) {
    $('#zenMode').textContent = `${PMODES[R.mode].name} · ${R.cycle % S.pomo.cfg.every + (R.mode === 'focus' ? 1 : 0)} of ${S.pomo.cfg.every}`;
    const t = R.task && getTodo(R.task); $('#zenTask').textContent = R.mode === 'focus' ? (t ? t.text : '') : BREAK_IDEAS[R.cycle % BREAK_IDEAS.length];
    $('#zenPlay').innerHTML = icon(R.running ? 'pause' : 'play');
  }
}

/* ---------- mini timer pill on other pages + tab title ---------- */
function updatePill() {
  let p = $('#pomoPill');
  if (!p) { p = document.createElement('button'); p.id = 'pomoPill'; p.className = 'pomo-pill'; p.onclick = () => go('pomodoro'); document.body.appendChild(p); }
  const R = PR(), active = R.running || R.left < R.total, snd = Object.keys(AMB.playing).length;
  const show = (active || snd) && ui.view !== 'pomodoro';
  p.hidden = !show;
  if (show) p.innerHTML = `<span class="pp-dot" style="background:${PMODES[R.mode].color}"></span><b>${fmtClock(pLeft())}</b><span class="muted">${R.running ? PMODES[R.mode].name : active ? 'Paused' : 'Sounds'}</span>${snd ? '<span class="eq on"><i></i><i></i><i></i></span>' : ''}`;
  document.title = R.running ? `${fmtClock(pLeft())} · ${PMODES[R.mode].name} — Lumen` : 'Lumen — Daily Dashboard';
}

/* ---------- dashboard card ---------- */
function pomoDash() {
  const st = pomoStats(), R = PR(), c = S.pomo.cfg;
  return `<div class="card span-12 pm-dash"><span class="pm-dash-ico">🍅</span><div class="grow"><div class="card-t" style="margin-bottom:2px">Pomodoro</div><div><b>${st.todayN}</b>/${c.goal} sessions · ${durStr(st.todayMin)} focused today${st.streak > 1 ? ` · 🔥 ${st.streak}-day streak` : ''}</div></div>
    <div class="pm-goal-row" style="max-width:260px;flex:1">${Array.from({ length: c.goal }, (_, i) => `<i class="${i < st.todayN ? 'on' : ''}"></i>`).join('')}</div>
    <button class="btn primary" id="pmDashGo">${icon(R.running ? 'timer' : 'play')} ${R.running ? fmtClock(pLeft()) + ' left' : 'Start focus'}</button></div>`;
}
function pomoDashBind() { const b = $('#pmDashGo'); if (b) b.onclick = () => { if (!PR().running) pStart(); go('pomodoro'); }; }

/* ---------- ticking & keys ---------- */
setInterval(() => {
  const R = PR(); if (!R) return;
  if (R.running && Date.now() >= R.endAt) { pComplete(true); return; }
  updatePill();
  if (R.running) { updatePomoLive(); updateZen(); }
  else if (ui.view === 'pomodoro') { const br = $('#pmBreath'); if (br) br.textContent = ['breathe in', 'hold', 'breathe out', 'hold'][Math.floor((Date.now() / 1000) % 16 / 4)]; }
}, 500);
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.metaKey || e.ctrlKey || e.altKey || $('#modalRoot').innerHTML) return;
  const zen = $('#zen') && !$('#zen').hidden;
  if (e.key === 'Escape' && zen) return closeZen();
  if (ui.view !== 'pomodoro' && !zen) return;
  if (e.key === ' ') { e.preventDefault(); document.activeElement?.blur(); pToggle(); if (zen) updateZen(true); }
  else if (e.key.toLowerCase() === 's') pComplete(false);
  else if (e.key.toLowerCase() === 'r' && !zen) { pReset(); render(); }
});
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && $('#zen') && !$('#zen').hidden) closeZen(); });
VIEWS.pomodoro = renderPomo;
