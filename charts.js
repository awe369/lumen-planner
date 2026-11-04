'use strict';
/* =========================================================
   Lumen chart kit. Every chart can be drawn several ways —
   the picker in its header switches type, remembered per chart.
   Charts render at the container's real pixel width.
   ========================================================= */

const CHARTS = {}, CHART_TYPES = {};
const defChart = (key, types, fn) => { CHARTS[key] = fn; CHART_TYPES[key] = types; };
const CT_NAMES = { bar: 'Bars', line: 'Line', area: 'Area', step: 'Step line', dot: 'Lollipop', radial: 'Radial', donut: 'Donut', heatmap: 'Heatmap', range: 'Range bars', lines: 'Multi-line', small: 'Small multiples', grouped: 'Grouped bars', diverge: 'Diverging bars', hbar: 'Horizontal bars', dumbbell: 'Dumbbell' };
const CT_ICONS = {
  bar: '<path d="M5 20v-7M10 20V6M15 20v-9M20 20V9"/>',
  line: '<path d="M3 17l5-6 4 3 8-9"/>',
  area: '<path d="M3 19l5-7 4 3 8-9v13z" fill="currentColor" fill-opacity=".3" stroke="none"/><path d="M3 19l5-7 4 3 8-9"/>',
  step: '<path d="M3 18h5v-6h5v3h3V7h5"/>',
  dot: '<path d="M5 20v-7M10 20V8M15 20v-5M20 20V10"/><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="10" cy="7" r="1.6" fill="currentColor"/><circle cx="15" cy="14" r="1.6" fill="currentColor"/><circle cx="20" cy="9" r="1.6" fill="currentColor"/>',
  radial: '<path d="M12 3a9 9 0 1 1-9 9"/><path d="M12 7.5A4.5 4.5 0 1 1 7.5 12"/>',
  donut: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 4v4.5M18.6 16.5l-3.5-2.4"/>',
  heatmap: '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1" fill="currentColor"/><rect x="17" y="3" width="4" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1" fill="currentColor"/><rect x="10" y="10" width="5" height="5" rx="1"/><rect x="17" y="10" width="4" height="5" rx="1" fill="currentColor"/><rect x="3" y="17" width="5" height="4" rx="1"/><rect x="10" y="17" width="5" height="4" rx="1" fill="currentColor"/><rect x="17" y="17" width="4" height="4" rx="1"/>',
  range: '<path d="M6 5v10M12 8v12M18 3v12" stroke-width="3.5"/>',
  dumbbell: '<path d="M6 5v12M12 8v11M18 4v10"/><circle cx="6" cy="5" r="2" fill="currentColor"/><circle cx="6" cy="17" r="2"/><circle cx="12" cy="8" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2"/><circle cx="18" cy="4" r="2" fill="currentColor"/><circle cx="18" cy="14" r="2"/>',
  lines: '<path d="M3 15l5-5 4 3 8-8"/><path d="M3 20l6-4 5 1 7-5" opacity=".5"/>',
  small: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  grouped: '<path d="M4 20v-8M7 20v-5M12 20V6M15 20v-9M19 20v-6"/>',
  diverge: '<path d="M12 3v18M12 6h7M12 10H6M12 14h5M12 18H8"/>',
  hbar: '<path d="M4 6h14M4 12h9M4 18h16"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
};
const ctIcon = t => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CT_ICONS[t] || ''}</svg>`;
ui.ctypes = ui.ctypes || {};
const hiddenSeries = new Set();
function ctype(key) { const t = ui.ctypes[key], ok = CHART_TYPES[key] || []; return ok.includes(t) ? t : ok[0]; }
function chartPicker(key) {
  const types = CHART_TYPES[key] || [];
  if (types.length < 2) return '';
  const cur = ctype(key);
  return `<div class="ctype" data-ctkey="${key}" role="group" aria-label="Chart type">${types.map(t => `<button class="${t === cur ? 'on' : ''}" data-ct="${t}" title="${CT_NAMES[t]}" aria-label="${CT_NAMES[t]}">${ctIcon(t)}</button>`).join('')}<button class="ct-sh" data-ctshuffle title="Shuffle chart type" aria-label="Shuffle chart type">${ctIcon('shuffle')}</button></div>`;
}
function chartHead(key, title, ic, note = '') {
  return `<div class="card-h"><span class="card-t">${icon(ic)} ${title}</span><div class="ct-wrap">${note ? `<span class="ct-note">${note}</span>` : ''}${chartPicker(key)}</div></div>`;
}
let lastDrawView = null;
function drawOne(el, animate) {
  const key = el.dataset.chart, fn = CHARTS[key]; if (!fn) return;
  try { el.innerHTML = `<div class="viz-in ${animate ? 'anim' : ''}">${fn(Math.max(240, el.clientWidth), el.dataset.arg, ctype(key))}</div>`; }
  catch (e) { console.error(e); el.innerHTML = '<div class="empty">Could not draw this chart.</div>'; }
}
function drawCharts(root = document, animate) {
  if (animate === undefined) animate = lastDrawView !== ui.view || root !== $('#main'); // animate on navigation & in modals, not on the minute refresh
  if (root === $('#main')) lastDrawView = ui.view;
  $$('[data-chart]', root).forEach(el => drawOne(el, animate));
}
let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => drawCharts(document, false), 150); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ct], [data-ctshuffle]');
  if (b) {
    const key = b.closest('[data-ctkey]').dataset.ctkey, types = CHART_TYPES[key];
    let t = b.dataset.ct;
    if (!t) { const others = types.filter(x => x !== ctype(key)); t = others[Math.floor(Math.random() * others.length)]; }
    ui.ctypes[key] = t; saveUI();
    $$(`[data-ctkey="${key}"] [data-ct]`).forEach(x => x.classList.toggle('on', x.dataset.ct === t));
    $$(`[data-chart="${key}"]`).forEach(el => drawOne(el, true));
    return;
  }
  const lg = e.target.closest('[data-legend]');
  if (lg) {
    const n = lg.dataset.legend;
    if (hiddenSeries.has(n)) hiddenSeries.delete(n); else hiddenSeries.add(n);
    const el = lg.closest('[data-chart]'); if (el) drawOne(el, false);
  }
});

/* ---------- primitives ---------- */
const svgWrap = (w, h, inner) => `<svg class="viz" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${inner}</svg>`;
const tipAttr = html => `data-tip="${esc(html)}"`;
/* sequential: one hue (accent), light → dark via mix with the surface */
const seq = (v, hue = 'var(--accent)') => v == null ? 'var(--surface-2)' : `color-mix(in srgb, ${hue} ${Math.round(18 + v * 82)}%, var(--surface-2))`;
const MUTED = 'color-mix(in srgb, var(--accent) 42%, var(--surface-2))';
const pct = v => Math.round(v * 100) + '%';
const emptyChart = (msg = 'Not enough data yet.') => `<div class="empty">${msg}</div>`;
const legendHTML = (series, toggle) => `<div class="clegend">${series.map(s => toggle ? `<button data-legend="${esc(s.name)}" class="${hiddenSeries.has(s.name) ? 'off' : ''}" title="Show / hide"><i style="background:${s.color}"></i>${esc(s.name)}</button>` : `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
function roundedBar(cx, bw, top, base, r) {
  const h = base - top; if (h <= .5) return '';
  r = Math.min(r, bw / 2, h);
  return `M${cx - bw / 2},${base}V${top + r}Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top}H${cx + bw / 2 - r}Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r}V${base}Z`;
}
/* shared x/y frame: band-centred x so switching bar ↔ line keeps points aligned */
function frame(w, s) {
  const height = s.height || 200, padL = s.padL ?? 40, padR = 14, padT = 16, padB = 24;
  const cw = w - padL - padR, ch = height - padT - padB, n = s.pts.length;
  const yMin = s.yMin ?? 0, yMax = s.yMax ?? Math.max(1, ...s.pts.map(p => p.v || 0));
  const y = v => padT + ch - ((clamp(v, yMin, yMax) - yMin) / ((yMax - yMin) || 1)) * ch;
  const slot = cw / Math.max(1, n), xc = i => padL + slot * i + slot / 2, base = padT + ch;
  const fmtY = s.fmtY || (v => Math.round(v));
  const ticks = s.ticks || [yMin, (yMin + yMax) / 2, yMax];
  let grid = ticks.map(t => `<line class="g" x1="${padL}" x2="${padL + cw}" y1="${y(t)}" y2="${y(t)}"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${fmtY(t)}</text>`).join('');
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(cw / (s.labelW || 38)))));
  grid += s.pts.map((p, i) => i % step === 0 ? `<text x="${xc(i)}" y="${height - 6}" text-anchor="middle">${p.label}</text>` : '').join('');
  const goal = s.goal != null ? `<line class="goal" x1="${padL}" x2="${padL + cw}" y1="${y(s.goal)}" y2="${y(s.goal)}"/><text class="dl" x="${padL + 4}" y="${y(s.goal) - 5}">${s.goalLabel || ''}</text>` : '';
  return { height, padL, padT, cw, ch, n, y, xc, slot, base, grid, goal, fmtY };
}
const hitCol = (f, i, tip, extra = '') => `<g class="hitg" ${tipAttr(tip || '')}><rect class="hit" x="${f.padL + f.slot * i}" y="${f.padT}" width="${f.slot}" height="${f.ch}"/><line class="xh" x1="${f.xc(i)}" x2="${f.xc(i)}" y1="${f.padT}" y2="${f.base}"/>${extra}</g>`;
function pathWithGaps(vals, X, Y, step) {
  let d = '', prev = false;
  vals.forEach((v, i) => {
    if (v == null) { prev = false; return; }
    d += !prev ? `M${X(i).toFixed(1)},${Y(v).toFixed(1)}` : step ? `H${X(i).toFixed(1)}V${Y(v).toFixed(1)}` : `L${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
    prev = true;
  });
  return d;
}

/* ---------- single-series XY: bar · line · area · step · dot · radial ---------- */
function xySVG(w, type, s) {
  if (!s.pts.length || s.pts.every(p => p.v == null)) return emptyChart();
  if (type === 'radial') return radialSVG(w, s);
  const f = frame(w, s), hue = s.hue || 'var(--accent)', col = p => s.hueFn ? s.hueFn(p) : hue;
  let body = '', hits = '';
  if (type === 'bar') {
    const bw = Math.max(3, Math.min(28, f.slot - Math.max(2, f.slot * .35)));
    s.pts.forEach((p, i) => {
      body += `<path class="grow" style="animation-delay:${Math.min(i * 14, 400)}ms" d="${roundedBar(f.xc(i), bw, f.y(p.v || 0), f.base, 4)}" fill="${col(p)}"/>`;
      hits += hitCol(f, i, p.tip);
    });
  } else if (type === 'dot') {
    const r = f.slot > 16 ? 5.5 : 4;
    s.pts.forEach((p, i) => {
      if (p.v != null) body += `<line x1="${f.xc(i)}" x2="${f.xc(i)}" y1="${f.base}" y2="${f.y(p.v)}" stroke="${col(p)}" stroke-width="2" stroke-linecap="round" opacity=".5"/><circle class="pop" style="animation-delay:${Math.min(i * 14, 400)}ms" cx="${f.xc(i)}" cy="${f.y(p.v)}" r="${r}" fill="${col(p)}" stroke="var(--surface-solid)" stroke-width="2"/>`;
      hits += hitCol(f, i, p.tip);
    });
  } else { // line · area · step
    const vals = s.pts.map(p => p.v), d = pathWithGaps(vals, f.xc, f.y, type === 'step');
    if (type === 'area') {
      const gid = 'ag' + uid();
      // close each gap-free run down to the baseline
      const runs = d.split('M').filter(Boolean).map(r => 'M' + r);
      body += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hue}" stop-opacity=".32"/><stop offset="1" stop-color="${hue}" stop-opacity="0"/></linearGradient></defs>`;
      runs.forEach(r => { const x0 = r.slice(1).split(',')[0]; body += `<path class="fade" d="${r}V${f.base}H${x0}Z" fill="url(#${gid})"/>`; });
    }
    body += `<path class="draw" pathLength="1" d="${d}" fill="none" stroke="${hue}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (type !== 'area' && f.n <= 45) s.pts.forEach((p, i) => { if (p.v != null) body += `<circle class="pop" cx="${f.xc(i)}" cy="${f.y(p.v)}" r="3" fill="${col(p)}" stroke="var(--surface-solid)" stroke-width="1.5"/>`; });
    s.pts.forEach((p, i) => { hits += hitCol(f, i, p.tip, p.v == null ? '' : `<circle class="xd" cx="${f.xc(i)}" cy="${f.y(p.v)}" r="5" fill="${hue}"/>`); });
    let li = vals.length - 1; while (li > 0 && vals[li] == null) li--;
    if (vals[li] != null) body += `<text class="dl" x="${f.xc(li) - 6}" y="${f.y(vals[li]) - 10}" text-anchor="end">${f.fmtY(vals[li])}</text>`;
  }
  return svgWrap(w, f.height, f.grid + f.goal + body + hits);
}
function radialSVG(w, s) {
  const pts = s.pts, n = pts.length, H = Math.round(clamp(w * .62, 200, 300)), cx = w / 2, cy = H / 2 + 4;
  const R = H / 2 - 8, inner = R * .26, ring = (R - inner) / n;
  const yMax = s.yMax ?? Math.max(1e-9, ...pts.map(p => p.v || 0));
  const col = p => s.hueFn ? s.hueFn(p) : (s.hue || 'var(--accent)');
  const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  const arc = (r, a0, a1) => `M${pt(r, a0)}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(r, a1)}`;
  const A0 = -Math.PI / 2, SPAN = Math.PI * 1.5; // 270° sweep from 12 o'clock; labels sit in the open quarter
  let g = '';
  pts.forEach((p, i) => {
    const r = R - ring * i - ring / 2, sw = Math.max(4, ring - 4), frac = clamp((p.v || 0) / yMax, 0, 1);
    g += `<g class="hitg" ${tipAttr(p.tip || '')}><path d="${arc(r, A0, A0 + SPAN)}" stroke="var(--surface-2)" stroke-width="${sw}" fill="none" stroke-linecap="round"/>${frac > .004 ? `<path class="draw" style="animation-delay:${i * 60}ms" pathLength="1" d="${arc(r, A0, A0 + SPAN * frac)}" stroke="${col(p)}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>` : ''}<text class="lbl" x="${cx - 8}" y="${cy - r + 4}" text-anchor="end">${p.label}</text></g>`;
  });
  return svgWrap(w, H, g);
}

/* ---------- composition: donut · horizontal bars ---------- */
function donutSVG(w, { slices, center = '', sub = '' }) {
  const tot = slices.reduce((a, x) => a + x.v, 0);
  if (!tot) return emptyChart();
  const H = 220, R = 96, r = R * .62, side = w >= 430, sw = side ? 2 * R + 24 : w, cx = sw / 2, cy = H / 2;
  const p = (rad, ang) => `${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`;
  let a = -Math.PI / 2, g = '';
  slices.forEach((sl, i) => {
    if (!sl.v) return;
    const frac = sl.v / tot;
    if (frac > .9999) { g += `<circle class="pop" cx="${cx}" cy="${cy}" r="${(R + r) / 2}" stroke="${sl.color}" stroke-width="${R - r}" fill="none" ${tipAttr(sl.tip)}/>`; return; }
    const a1 = a + frac * Math.PI * 2, large = a1 - a > Math.PI ? 1 : 0;
    g += `<path class="pop slice" style="animation-delay:${i * 50}ms" d="M${p(R, a)}A${R},${R} 0 ${large} 1 ${p(R, a1)}L${p(r, a1)}A${r},${r} 0 ${large} 0 ${p(r, a)}Z" fill="${sl.color}" stroke="var(--surface-solid)" stroke-width="2" ${tipAttr(sl.tip)}/>`;
    a = a1;
  });
  g += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="d-big">${center}</text><text x="${cx}" y="${cy + 24}" text-anchor="middle">${sub}</text>`;
  const legend = `<div class="dlegend">${slices.map(sl => `<div ${tipAttr(sl.tip)}><i style="background:${sl.color}"></i><span>${esc(sl.label)}</span><b>${sl.v}</b><em>${Math.round(sl.v / tot * 100)}%</em></div>`).join('')}</div>`;
  return `<div class="donut-wrap ${side ? 'side' : ''}">${svgWrap(sw, H, g)}${legend}</div>`;
}
function hbarSVG(w, { rows, max, fmt = v => v }) {
  if (!rows.length) return emptyChart();
  const rowH = 32, padL = Math.min(150, w * .36), padR = 48, H = rows.length * rowH + 4, cw = w - padL - padR;
  max = max ?? Math.max(1e-9, ...rows.map(r => r.v));
  return svgWrap(w, H, rows.map((r, i) => {
    const y = 2 + i * rowH, len = Math.max(2, r.v / max * cw);
    return `<g class="hitg" ${tipAttr(r.tip || '')}><rect class="hit" x="0" y="${y}" width="${w}" height="${rowH - 2}"/><text class="lbl" x="${padL - 10}" y="${y + rowH / 2 + 3}" text-anchor="end">${esc(r.label.length > 18 ? r.label.slice(0, 17) + '…' : r.label)}</text><rect x="${padL}" y="${y + 8}" width="${cw}" height="${rowH - 18}" rx="4" fill="var(--surface-2)"/><rect class="grow-x" style="animation-delay:${i * 40}ms" x="${padL}" y="${y + 8}" width="${len}" height="${rowH - 18}" rx="4" fill="${r.color}"/><text class="dl" x="${padL + cw + 8}" y="${y + rowH / 2 + 3}">${fmt(r.v)}</text></g>`;
  }).join(''));
}
function divergeSVG(w, type, { rows, fmt }) {
  if (!rows.length) return emptyChart();
  const rowH = 30, padL = 100, padR = 10, H = rows.length * rowH + 8, cw = w - padL - padR, mid = padL + cw / 2;
  const mx = Math.max(8, ...rows.map(x => Math.abs(x.v)));
  const g = rows.map((x, i) => {
    const y = 4 + i * rowH, len = Math.abs(x.v) / mx * (cw / 2 - 34), pos = x.v >= 0, c = pos ? POS : NEG, end = pos ? mid + len : mid - len; // 34px keeps value labels clear of names
    const mark = type === 'dot'
      ? `<line x1="${mid}" x2="${end}" y1="${y + rowH / 2 - 1}" y2="${y + rowH / 2 - 1}" stroke="${c}" stroke-width="2" opacity=".6"/><circle class="pop" cx="${end}" cy="${y + rowH / 2 - 1}" r="6" fill="${c}" stroke="var(--surface-solid)" stroke-width="2"/>`
      : `<rect class="grow-x" style="transform-origin:${pos ? 'left' : 'right'} center" x="${pos ? mid + 1 : mid - len - 1}" y="${y + 6}" width="${Math.max(2, len)}" height="${rowH - 16}" rx="4" fill="${c}"/>`;
    return `<g class="hitg" ${tipAttr(x.tip)}><rect class="hit" x="0" y="${y}" width="${w}" height="${rowH - 4}"/><text x="${padL - 10}" y="${y + rowH / 2 + 2}" text-anchor="end" class="lbl">${esc(x.label)}</text>${mark}<text class="dl" x="${pos ? end + (type === 'dot' ? 11 : 6) : end - (type === 'dot' ? 11 : 6)}" y="${y + rowH / 2 + 2}" text-anchor="${pos ? 'start' : 'end'}">${fmt(x.v)}</text></g>`;
  }).join('');
  return svgWrap(w, H, `<line x1="${mid}" x2="${mid}" y1="0" y2="${H}" stroke="var(--border-strong)"/>${g}`);
}

/* ---------- multi-series: lines · small multiples · grouped bars ---------- */
function linesSVG(w, { series, labels, yMax = 1, ticks = [0, .5, 1], fmtY = pct, height = 220, tipHead = i => labels[i] }) {
  const vis = series.filter(s => !hiddenSeries.has(s.name));
  const f = frame(w, { pts: labels.map(l => ({ label: l, v: 0 })), yMax, ticks, fmtY, height, labelW: 66 });
  let body = '', hits = '';
  vis.forEach((s, k) => { body += `<path class="draw" style="animation-delay:${k * 80}ms" pathLength="1" d="${pathWithGaps(s.vals, f.xc, f.y)}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`; });
  if (vis.length <= 4) vis.forEach(s => { // direct labels for small series counts
    let li = s.vals.length - 1; while (li > 0 && s.vals[li] == null) li--;
    if (s.vals[li] != null) body += `<circle cx="${f.xc(li)}" cy="${f.y(s.vals[li])}" r="3.5" fill="${s.color}" stroke="var(--surface-solid)" stroke-width="1.5"/><text class="dl" x="${f.xc(li) - 8}" y="${f.y(s.vals[li]) - 8}" text-anchor="end">${esc(s.short || s.name)}</text>`;
  });
  labels.forEach((_, i) => {
    const rows = vis.filter(s => s.vals[i] != null).sort((a, b) => b.vals[i] - a.vals[i]);
    const tip = `<b>${tipHead(i)}</b>` + rows.map(s => `<br><span class="tdot" style="background:${s.color}"></span>${esc(s.name)} <b>${fmtY(s.vals[i])}</b>`).join('');
    hits += hitCol(f, i, tip, rows.map(s => `<circle class="xd" cx="${f.xc(i)}" cy="${f.y(s.vals[i])}" r="4.5" fill="${s.color}"/>`).join(''));
  });
  return svgWrap(w, f.height, f.grid + body + hits) + legendHTML(series, true);
}
function smallMultiples(w, { series, fmtY = pct, yMax = 1 }) {
  if (!series.length) return emptyChart();
  const cols = clamp(Math.floor(w / 190), 1, series.length), cwid = (w - (cols - 1) * 10) / cols, sw = Math.floor(cwid - 26), sh = 56;
  return `<div class="smalls" style="grid-template-columns:repeat(${cols}, minmax(0, 1fr))">${series.map(s => {
    const vals = s.vals.map(v => v ?? null), first = vals.findIndex(v => v != null), real = vals.filter(v => v != null);
    if (!real.length) return '';
    const n = vals.length, X = i => (i / Math.max(1, n - 1)) * sw, Y = v => sh - 3 - (v / yMax) * (sh - 8);
    const d = pathWithGaps(vals, X, Y), last = real[real.length - 1], delta = last - real[0];
    return `<div class="sm" ${tipAttr(`<b>${esc(s.name)}</b><br>now ${fmtY(last)} · low ${fmtY(Math.min(...real))} · high ${fmtY(Math.max(...real))}`)}><div class="sm-h"><span><i style="background:${s.color}"></i>${esc(s.name)}</span><b>${fmtY(last)}</b></div><svg class="viz" width="${sw}" height="${sh}"><path class="fade" d="${d}V${sh}H${X(first)}Z" fill="${s.color}" opacity=".16"/><path class="draw" pathLength="1" d="${d}" fill="none" stroke="${s.color}" stroke-width="2"/></svg><div class="sm-f">${delta >= 0 ? '▲' : '▼'} ${fmtY(Math.abs(delta))} over period</div></div>`;
  }).join('')}</div>`;
}
function groupedSVG(w, { groups, series, yMax, ticks, fmtY, height = 190 }) {
  const f = frame(w, { pts: groups.map(g => ({ label: g.label, v: 0 })), yMax, ticks, fmtY, height });
  const k = series.length, gw = Math.min(f.slot * .78, 20 * k + 4), bw = (gw - 2 * (k - 1)) / k;
  let body = '', hits = '';
  groups.forEach((g, i) => {
    g.vals.forEach((v, j) => { body += `<path class="grow" style="animation-delay:${i * 30}ms" d="${roundedBar(f.xc(i) - gw / 2 + j * (bw + 2) + bw / 2, bw, f.y(v || 0), f.base, 3)}" fill="${series[j].color}"/>`; });
    hits += hitCol(f, i, g.tip);
  });
  return svgWrap(w, f.height, f.grid + body + hits) + legendHTML(series, false);
}

/* ---------- calendar heatmap + weekly roll-up for its line/bar views ---------- */
function heatmapSVG(width, { weeks, end = todayStr(), val, hue, tip, cell = 13 }) {
  const gap = 3, padL = 26, padT = 16;
  const cs = Math.max(6, Math.min(cell, Math.floor((width - padL) / weeks) - gap));
  weeks = Math.min(weeks, Math.floor((width - padL) / (cs + gap)));
  const start = addDays(weekStart(end), -(weeks - 1) * 7);
  let cells = '', months = '', lastM = -1;
  for (let w = 0; w < weeks; w++) {
    const ws = addDays(start, w * 7), m = parse(ws).getMonth();
    if (m !== lastM) { months += `<text x="${padL + w * (cs + gap)}" y="10">${MONTHS[m].slice(0, 3)}</text>`; lastM = m; }
    for (let r = 0; r < 7; r++) {
      const d = addDays(ws, r); if (d > end) continue;
      const v = val(d);
      cells += `<rect class="hm" style="animation-delay:${w * 8}ms" x="${padL + w * (cs + gap)}" y="${padT + r * (cs + gap)}" width="${cs}" height="${cs}" rx="${Math.min(3, cs / 3)}" fill="${seq(v, hue)}" ${v == null ? 'opacity=".55"' : ''} ${tipAttr(tip(d, v))}/>`;
    }
  }
  const dl = ['Mon', '', 'Wed', '', 'Fri', '', ''].map((t, r) => t ? `<text x="0" y="${padT + r * (cs + gap) + cs - 2}">${t}</text>` : '').join('');
  return svgWrap(width, padT + 7 * (cs + gap), months + dl + cells) +
    `<div class="hm-legend"><span>Less</span>${[0, .25, .5, .75, 1].map(v => `<i style="background:${seq(v, hue)}"></i>`).join('')}<span>More</span></div>`;
}
function weeklyPts(weeks, valFn, fmtV) {
  const t = todayStr(), start = addDays(weekStart(t), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, k) => {
    const ws = addDays(start, k * 7), vals = [];
    for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d > t) break; const v = valFn(d); if (v != null) vals.push(v); }
    const v = vals.length ? avg(vals) : null;
    return { label: niceDate(ws, { month: 'short', day: 'numeric' }), v, tip: `<b>Week of ${niceDate(ws, { month: 'short', day: 'numeric' })}</b><br>${v == null ? 'No data' : `${fmtV(v)} average · ${vals.length} day${vals.length === 1 ? '' : 's'}`}` };
  });
}

/* hover tooltip for every [data-tip] mark */
(() => {
  let tip;
  document.addEventListener('pointermove', e => {
    tip = tip || $('#tip');
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !tip || !t.getAttribute('data-tip')) { if (tip) tip.hidden = true; return; }
    tip.innerHTML = t.getAttribute('data-tip');
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  });
  document.addEventListener('pointerdown', e => { if (tip && !e.target.closest('[data-tip]')) tip.hidden = true; });
})();

/* =========================================================
   CHART DEFINITIONS
   ========================================================= */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayTip = d => niceDate(d, { weekday: 'short', month: 'short', day: 'numeric' });

/* ----- dashboard ----- */
defChart('focusWeek', ['grouped', 'lines', 'bar'], (w, _, type) => {
  const t = todayStr(), days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)).map(d => ({ d, ...dayStats(d) }));
  const mx = Math.max(1, Math.ceil(Math.max(...days.map(x => x.planned)) / 60));
  const fmtY = v => (Math.round(v * 10) / 10) + 'h', ticks = [0, mx / 2, mx], lab = d => DOW[parse(d).getDay()];
  const tip = x => `<b>${niceDate(x.d, { weekday: 'long', month: 'short', day: 'numeric' })}</b><br>${durStr(x.done)} done of ${durStr(x.planned)} planned`;
  const series = [{ name: 'Planned', color: MUTED }, { name: 'Done', color: 'var(--accent)' }];
  if (type === 'grouped') return groupedSVG(w, { groups: days.map(x => ({ label: lab(x.d), vals: [x.planned / 60, x.done / 60], tip: tip(x) })), series, yMax: mx, ticks, fmtY, height: 170 });
  if (type === 'lines') return linesSVG(w, { series: [{ ...series[0], color: 'color-mix(in srgb, var(--accent) 50%, var(--muted))', vals: days.map(x => x.planned / 60) }, { ...series[1], vals: days.map(x => x.done / 60) }], labels: days.map(x => lab(x.d)), yMax: mx, ticks, fmtY, height: 170, tipHead: i => niceDate(days[i].d, { weekday: 'long' }) });
  return xySVG(w, 'bar', { pts: days.map(x => ({ label: lab(x.d), v: x.done / 60, tip: tip(x) })), yMax: mx, ticks, fmtY, height: 170 });
});

/* ----- habits ----- */
defChart('habitYear', ['heatmap', 'area', 'bar', 'line'], (w, _, type) => {
  const val = d => { const s = dayScore(d); return s ? s.v : null; };
  if (type === 'heatmap') return heatmapSVG(w, { weeks: 53, val, tip: (d, v) => `<b>${niceDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</b><br>${v == null ? 'No habits scheduled' : `${pct(v)} · ${dayScore(d).done}/${dayScore(d).n} done`}` });
  return xySVG(w, type, { pts: weeklyPts(26, val, pct), yMax: 1, ticks: [0, .5, 1], fmtY: pct, height: 200, labelW: 64 });
});
defChart('habitTrend', ['area', 'line', 'step', 'bar', 'dot'], (w, _, type) => {
  const t = todayStr(), raw = Array.from({ length: 66 }, (_, i) => { const d = addDays(t, i - 65), s = dayScore(d); return { d, v: s ? s.v : null }; });
  const pts = [];
  for (let i = 6; i < raw.length; i++) {
    const win = raw.slice(i - 6, i + 1).filter(x => x.v != null);
    const v = win.length ? avg(win.map(x => x.v)) : null;
    pts.push({ v, label: niceDate(raw[i].d, { month: 'short', day: 'numeric' }), tip: `<b>${dayTip(raw[i].d)}</b><br>7-day avg ${v == null ? '—' : pct(v)}${raw[i].v != null ? `<br>that day ${pct(raw[i].v)}` : ''}` });
  }
  return xySVG(w, type, { pts, yMax: 1, ticks: [0, .5, 1], fmtY: pct, height: 210, labelW: 70 });
});
defChart('habitDow', ['bar', 'radial', 'dot', 'line'], (w, _, type) => {
  const acc = Array.from({ length: 7 }, () => ({ s: 0, n: 0 })), t = todayStr();
  for (let i = 1; i <= 90; i++) { const d = addDays(t, -i), s = dayScore(d); if (s) { const k = (parse(d).getDay() + 6) % 7; acc[k].s += s.v; acc[k].n++; } }
  const vals = acc.map(a => a.n ? a.s / a.n : 0), best = Math.max(...vals);
  const pts = vals.map((v, i) => ({ v, label: WEEKDAYS[i], best: v === best, tip: `<b>${WEEKDAYS[i]}</b><br>${pct(v)} avg completion<br><span class="faint">last 90 days</span>` }));
  return xySVG(w, type, { pts, yMax: 1, ticks: [0, .5, 1], fmtY: pct, height: 210, hueFn: p => p.best ? 'var(--accent)' : MUTED });
});
function habitStrengthSeries(days) {
  const t = todayStr(), dates = Array.from({ length: days }, (_, i) => addDays(t, i - days + 1));
  return { dates, series: activeHabits().map(h => { const m = Object.fromEntries(hStrengthSeries(h).map(p => [p.d, p.s])); return { name: `${h.icon} ${h.name}`, short: h.name, color: h.color, vals: dates.map(d => m[d] ?? null), h }; }) };
}
defChart('habitCompare', ['lines', 'small', 'hbar'], (w, _, type) => {
  const { dates, series } = habitStrengthSeries(90);
  if (!series.length) return emptyChart('Create a habit to compare strength over time.');
  if (type === 'small') return smallMultiples(w, { series });
  if (type === 'hbar') return hbarSVG(w, { rows: series.map(s => ({ label: s.name, v: hStrength(s.h), color: s.color, tip: `<b>${esc(s.name)}</b><br>strength ${pct(hStrength(s.h))} · 🔥 ${hStreak(s.h)} streak` })).sort((a, b) => b.v - a.v), max: 1, fmt: pct });
  return linesSVG(w, { series, labels: dates.map(d => niceDate(d, { month: 'short', day: 'numeric' })), tipHead: i => dayTip(dates[i]) });
});
defChart('habitMix', ['donut', 'hbar', 'bar'], (w, _, type) => {
  const t = todayStr(), rows = activeHabits().map(h => { let n = 0; for (let i = 0; i < 30; i++) if (hDone(h, addDays(t, -i))) n++; return { h, n }; }).sort((a, b) => b.n - a.n);
  if (!rows.some(r => r.n)) return emptyChart('No check-ins in the last 30 days yet.');
  const tip = r => `<b>${r.h.icon} ${esc(r.h.name)}</b><br>${r.n} check-ins in 30 days`;
  if (type === 'donut') return donutSVG(w, { slices: rows.map(r => ({ label: `${r.h.icon} ${r.h.name}`, v: r.n, color: r.h.color, tip: tip(r) })), center: rows.reduce((a, r) => a + r.n, 0), sub: 'check-ins' });
  if (type === 'hbar') return hbarSVG(w, { rows: rows.map(r => ({ label: `${r.h.icon} ${r.h.name}`, v: r.n, color: r.h.color, tip: tip(r) })) });
  return xySVG(w, 'bar', { pts: rows.map(r => ({ v: r.n, label: r.h.icon, color: r.h.color, tip: tip(r) })), height: 210, hueFn: p => p.color, fmtY: v => Math.round(v) });
});
defChart('habitOneYear', ['heatmap', 'bar', 'line'], (w, id, type) => {
  const h = S.habits.find(x => x.id === id);
  const val = d => !hDue(h, d) || hSkip(h, d) ? null : hProg(h, d);
  if (type === 'heatmap') return heatmapSVG(w, { weeks: 26, hue: h.color, cell: 15, val, tip: (d, v) => `<b>${dayTip(d)}</b><br>${hSkip(h, d) ? 'Skipped' : !hDue(h, d) ? 'Not scheduled' : h.type === 'check' ? (v >= 1 ? 'Done ✓' : 'Missed') : `${hNum(h, d)} / ${h.target} ${esc(h.unit || 'min')}`}` });
  return xySVG(w, type, { pts: weeklyPts(26, val, pct), hue: h.color, yMax: 1, ticks: [0, .5, 1], fmtY: pct, height: 170, labelW: 64 });
});
defChart('habitStrength', ['area', 'line', 'step'], (w, id, type) => {
  const h = S.habits.find(x => x.id === id), ser = hStrengthSeries(h).slice(-120);
  return xySVG(w, type, { hue: h.color, height: 170, yMax: 1, ticks: [0, .5, 1], fmtY: pct, labelW: 70, pts: ser.map(p => ({ v: p.s, label: niceDate(p.d, { month: 'short', day: 'numeric' }), tip: `<b>${niceDate(p.d, { month: 'short', day: 'numeric' })}</b><br>strength ${pct(p.s)}` })) });
});
defChart('habitOneDow', ['bar', 'radial', 'dot'], (w, id, type) => {
  const h = S.habits.find(x => x.id === id), t = todayStr(), acc = Array.from({ length: 7 }, () => ({ d: 0, n: 0 }));
  for (let i = 1; i <= 120; i++) { const d = addDays(t, -i); if (d < h.created) break; if (!hDue(h, d) || hSkip(h, d)) continue; const k = (parse(d).getDay() + 6) % 7; acc[k].n++; if (hDone(h, d)) acc[k].d++; }
  return xySVG(w, type, { height: 170, yMax: 1, ticks: [0, .5, 1], fmtY: pct, hue: h.color, pts: acc.map((a, i) => ({ v: a.n ? a.d / a.n : 0, label: WEEKDAYS[i], tip: `<b>${WEEKDAYS[i]}</b><br>${a.d} of ${a.n} done` })) });
});

/* ----- sleep ----- */
const nightsInRange = n => { const t = todayStr(), by = Object.fromEntries(S.sleep.map(e => [e.date, e])); return Array.from({ length: n }, (_, i) => { const d = addDays(t, i - n + 1); return { d, e: by[d] }; }); };
defChart('sleepWin', ['range', 'dumbbell', 'lines'], (w, _, type) => {
  const n = ui.sRange, days = nightsInRange(n), nights = days.filter(x => x.e).map(x => x.e);
  if (!nights.length) return emptyChart('Log a few nights to see your sleep windows.');
  const gB = relBed(S.sleepCfg.bed), gW = gB + ((S.sleepCfg.wake - S.sleepCfg.bed + 1440) % 1440);
  let lo = Math.min(gB, ...nights.map(e => relBed(e.bed))), hi = Math.max(gW, ...nights.map(e => relBed(e.bed) + inBedMin(e)));
  lo = Math.floor((lo - 30) / 60) * 60; hi = Math.ceil((hi + 30) / 60) * 60;
  const H = 290, padL = 52, padR = 12, padT = 12, padB = 26, cw = w - padL - padR, ch = H - padT - padB;
  const y = m => padT + (m - lo) / (hi - lo) * ch, slot = cw / n, xc = i => padL + slot * i + slot / 2, bw = Math.max(5, Math.min(22, slot * .55));
  const BED = HABIT_COLORS[0], WAKE = HABIT_COLORS[1];
  let g = `<rect x="${padL}" y="${y(gB)}" width="${cw}" height="${y(gW) - y(gB)}" fill="color-mix(in srgb, var(--accent) 8%, transparent)"/><line class="goal" x1="${padL}" x2="${padL + cw}" y1="${y(gB)}" y2="${y(gB)}"/><line class="goal" x1="${padL}" x2="${padL + cw}" y1="${y(gW)}" y2="${y(gW)}"/>`;
  for (let m = lo; m <= hi; m += (hi - lo) / 60 > 10 ? 120 : 60) g += `<line class="g" x1="${padL}" x2="${padL + cw}" y1="${y(m)}" y2="${y(m)}"/><text x="${padL - 8}" y="${y(m) + 4}" text-anchor="end">${timeOf(m)}</text>`;
  const lstep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(cw / 40))));
  let marks = '', hits = '';
  days.forEach(({ d, e }, i) => {
    if (i % lstep === 0) g += `<text x="${xc(i)}" y="${H - 6}" text-anchor="middle">${n <= 14 ? DOW[parse(d).getDay()].slice(0, 2) + ' ' : ''}${parse(d).getDate()}</text>`;
    if (!e) return;
    const b = relBed(e.bed), wk = b + inBedMin(e), sc = sleepScore(e), sl = b + (e.lat || 0), cx = xc(i);
    const tip = `<b>${dayTip(d)}</b><br>${tStr(e.bed)} → ${tStr(e.wake)}<br>${durStr(asleepMin(e))} asleep · ${durStr(inBedMin(e))} in bed<br>Score <b>${sc}</b> · ${scoreWord(sc)}`;
    if (type === 'range') marks += `<rect class="grow" x="${cx - bw / 2}" y="${y(b)}" width="${bw}" height="${Math.max(2, y(sl) - y(b))}" rx="${Math.min(4, bw / 2)}" fill="var(--surface-2)" stroke="var(--border-strong)"/><rect class="grow" style="animation-delay:${i * 12}ms" x="${cx - bw / 2}" y="${y(sl)}" width="${bw}" height="${Math.max(2, y(wk) - y(sl))}" rx="${Math.min(4, bw / 2)}" fill="${seq(sc / 100)}"/>`;
    if (type === 'dumbbell') marks += `<line x1="${cx}" x2="${cx}" y1="${y(b)}" y2="${y(wk)}" stroke="var(--border-strong)" stroke-width="3" stroke-linecap="round"/><circle class="pop" cx="${cx}" cy="${y(b)}" r="5.5" fill="${BED}" stroke="var(--surface-solid)" stroke-width="2"/><circle class="pop" cx="${cx}" cy="${y(wk)}" r="5.5" fill="${WAKE}" stroke="var(--surface-solid)" stroke-width="2"/>`;
    hits += `<g class="hitg" ${tipAttr(tip)}><rect class="hit" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${ch}"/>${type === 'lines' ? `<circle class="xd" cx="${cx}" cy="${y(b)}" r="5" fill="${BED}"/><circle class="xd" cx="${cx}" cy="${y(wk)}" r="5" fill="${WAKE}"/>` : ''}</g>`;
  });
  if (type === 'lines') {
    const X = i => xc(i), bedV = days.map(x => x.e ? relBed(x.e.bed) : null), wakeV = days.map(x => x.e ? relBed(x.e.bed) + inBedMin(x.e) : null);
    marks += `<path class="draw" pathLength="1" d="${pathWithGaps(bedV, X, y)}" fill="none" stroke="${BED}" stroke-width="2.2" stroke-linejoin="round"/><path class="draw" pathLength="1" d="${pathWithGaps(wakeV, X, y)}" fill="none" stroke="${WAKE}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (n <= 31) days.forEach((x, i) => { if (x.e) marks += `<circle cx="${X(i)}" cy="${y(bedV[i])}" r="3" fill="${BED}"/><circle cx="${X(i)}" cy="${y(wakeV[i])}" r="3" fill="${WAKE}"/>`; });
  }
  const legend = type === 'range'
    ? `<div class="clegend"><span><i class="lg-goal"></i>goal window</span><span><i class="lg-seq"></i>darker = better score</span><span><i style="background:var(--surface-2);border:1px solid var(--border-strong)"></i>falling asleep</span></div>`
    : legendHTML([{ name: 'Bedtime', color: BED }, { name: 'Wake-up', color: WAKE }, { name: 'Goal window', color: 'color-mix(in srgb, var(--accent) 22%, transparent)' }], false);
  return svgWrap(w, H, g + marks + hits) + legend;
});
defChart('sleepDur', ['bar', 'line', 'area', 'dot', 'step'], (w, _, type) => {
  const goal = S.sleepCfg.goal, days = nightsInRange(ui.sRange);
  const pts = days.map(({ d, e }) => { const v = e ? asleepMin(e) / 60 : null; return { v, ok: v != null && v >= goal - .25, label: parse(d).getDate(), tip: `<b>${dayTip(d)}</b><br>${e ? `${durStr(asleepMin(e))} asleep<br>${v >= goal ? 'met goal ✓' : `${durStr(Math.round((goal - v) * 60))} short`}` : 'Not logged'}` }; });
  const mx = Math.max(10, Math.ceil(Math.max(0, ...pts.map(p => p.v || 0))));
  return xySVG(w, type, { pts, height: 230, yMax: mx, ticks: [0, 2, 4, 6, 8, 10].filter(x => x <= mx), fmtY: v => Math.round(v * 10) / 10 + 'h', goal, goalLabel: `${goal}h goal`, hueFn: p => p.ok ? 'var(--accent)' : MUTED });
});
defChart('sleepScore', ['area', 'line', 'bar', 'dot'], (w, _, type) => {
  const days = nightsInRange(ui.sRange), scores = days.filter(x => x.e).map(x => sleepScore(x.e));
  const pts = days.map(({ d, e }) => { const v = e ? sleepScore(e) : null; return { v, label: parse(d).getDate(), tip: `<b>${dayTip(d)}</b><br>${e ? `Score <b>${v}</b> · ${scoreWord(v)}<br>${durStr(asleepMin(e))} asleep` : 'Not logged'}` }; });
  const a = Math.round(avg(scores));
  return xySVG(w, type, { pts, height: 220, yMax: 100, ticks: [0, 50, 100], fmtY: v => Math.round(v), goal: scores.length ? a : null, goalLabel: `avg ${a}`, hueFn: p => seq(p.v / 100) });
});
defChart('sleepFactors', ['diverge', 'dot'], (w, _, type) => {
  const f = factorImpact(sleepRange(Math.max(30, ui.sRange)));
  if (!f.length) return emptyChart('Tag your nights (caffeine, exercise, screens…) and Lumen will find what helps and what hurts.');
  return divergeSVG(w, type, { fmt: v => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v)), rows: f.map(x => ({ label: x.tag, v: x.diff, tip: `<b>${esc(x.tag)}</b> · ${x.n} nights<br>avg score ${Math.round(x.with)} vs ${Math.round(x.without)} without<br>sleep ${x.dur >= 0 ? '+' : '−'}${durStr(Math.abs(Math.round(x.dur)))}` })) });
});
defChart('sleepMix', ['donut', 'hbar', 'bar'], (w, _, type) => {
  const list = sleepRange(ui.sRange);
  if (!list.length) return emptyChart();
  const bands = [['Excellent', 85, 101, 1], ['Good', 70, 85, .7], ['Fair', 55, 70, .42], ['Poor', 0, 55, .18]].map(([label, lo, hi, shade]) => {
    const v = list.filter(e => { const s = sleepScore(e); return s >= lo && s < hi; }).length;
    return { label, v, color: seq(shade), tip: `<b>${label}</b> (${lo}${hi > 100 ? '+' : `–${hi - 1}`})<br>${v} of ${list.length} nights` };
  });
  if (type === 'donut') return donutSVG(w, { slices: bands, center: Math.round(avg(list.map(sleepScore))), sub: `avg · ${list.length} nights` });
  if (type === 'hbar') return hbarSVG(w, { rows: bands });
  return xySVG(w, 'bar', { pts: bands, height: 210, hueFn: p => p.color });
});
defChart('sleepDow', ['bar', 'radial', 'dot', 'line'], (w, _, type) => {
  const list = sleepRange(60), goal = S.sleepCfg.goal;
  const pts = WEEKDAYS.map((nm, i) => { const xs = list.filter(e => (parse(e.date).getDay() + 6) % 7 === i); const v = xs.length ? avg(xs.map(asleepMin)) / 60 : 0; return { v, ok: v >= goal - .25, label: nm, tip: `<b>${nm}</b> mornings<br>${xs.length ? `${durStr(Math.round(v * 60))} avg · ${xs.length} nights` : 'no data'}` }; });
  return xySVG(w, type, { pts, height: 210, yMax: 10, ticks: [0, 5, 10], fmtY: v => v + 'h', goal: type === 'radial' ? null : goal, goalLabel: `${goal}h`, hueFn: p => p.ok ? 'var(--accent)' : MUTED });
});
defChart('sleepCal', ['heatmap', 'area', 'bar'], (w, _, type) => {
  const by = Object.fromEntries(S.sleep.map(e => [e.date, e]));
  const val = d => by[d] ? sleepScore(by[d]) / 100 : null;
  if (type === 'heatmap') return heatmapSVG(w, { weeks: 26, cell: 16, val, tip: (d, v) => { const e = by[d]; return `<b>${dayTip(d)}</b><br>${e ? `Score ${sleepScore(e)} · ${durStr(asleepMin(e))}<br>${tStr(e.bed)} → ${tStr(e.wake)}` : 'Not logged'}`; } });
  return xySVG(w, type, { pts: weeklyPts(26, d => by[d] ? sleepScore(by[d]) : null, v => `score ${Math.round(v)}`), yMax: 100, ticks: [0, 50, 100], fmtY: v => Math.round(v), height: 200, labelW: 64, hueFn: p => seq((p.v || 0) / 100) });
});
