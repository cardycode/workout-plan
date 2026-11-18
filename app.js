// Gym plan app. Reads the plan from plan.js, keeps all logs on this phone (localStorage).
'use strict';

/* ---------- Dates ---------- */
const now = () => (window.__NOW ? new Date(window.__NOW) : new Date());
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = (s) => { const [y, mo, d] = s.split('-').map(Number); return new Date(y, mo - 1, d, 12); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const today = () => iso(now());
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const nice = (s) => { const d = parse(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
const short = (s) => { const d = parse(s); return DAYS[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); };

/* ---------- State ---------- */
const KEY = 'gym-plan-v1';
const fresh = () => ({ v: 1, start: PLAN.defaultStart, baseline: 0, weeks: {}, logs: {}, knee: {}, sledPref: { leg1: false, leg2: true }, layout: 'satsun', active: null });
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* start fresh */ }
let saveFailed = false;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); saveFailed = false; } catch (e) { saveFailed = true; } };

const ui = { tab: 'week', view: null, sel: null, rest: null, confirmSwap: false };
const wk = (c) => (S.weeks[c] = S.weeks[c] || {});
const curWeek = () => Math.floor(dayDiff(S.start, today()) / 7);

/* ---------- Schedule ---------- */
const doneInWeek = (c) => Object.values(S.logs).some((l) => l.c === c && l.done);
function isOff(c) {
  const w = S.weeks[c];
  if (w && w.off === true) return true;
  if (w && w.off === false) return false;
  return c >= 0 && c < curWeek() && !doneInWeek(c); // a fully missed week extends the plan
}
function planWeek(c) {
  if (c < 0) return 0;
  let n = c + 1;
  for (let i = 0; i < c; i++) if (isOff(i)) n--;
  return n;
}
const LAYOUTS = { satsun: 'Legs Sat, swim Sun', sunsat: 'Swim Sat, legs Sun', sat: 'Both on Saturday', sun: 'Both on Sunday' };
const PATTERNS = { normal: 'Normal week', skip: 'Skip weekend', shift: 'Missed Monday' };

function items(c) {
  const days = [[], [], [], [], [], [], []];
  if (c < 0 || isOff(c) || planWeek(c) > PLAN.weeks) return days;
  const w = S.weeks[c] || {};
  const put = (d, id) => days[d].push({ id, d, c, key: c + ':' + id });
  const pattern = w.pattern || 'normal';
  if (pattern === 'skip') { put(0, 'upper'); put(2, 'leg1'); put(4, 'leg2'); }
  else if (pattern === 'shift') { put(2, 'leg1'); put(4, 'upper'); put(5, 'swim'); put(6, 'leg2'); }
  else {
    put(0, 'upper'); put(2, 'leg1');
    const lay = w.layout || S.layout;
    if (lay === 'satsun') { put(5, 'leg2'); put(6, 'swim'); }
    else if (lay === 'sunsat') { put(5, 'swim'); put(6, 'leg2'); }
    else if (lay === 'sat') { put(5, 'leg2'); put(5, 'swim'); }
    else { put(6, 'leg2'); put(6, 'swim'); }
  }
  Object.keys(w.extra || {}).forEach((k) => {
    const [d, id] = k.split(':');
    days[+d].push({ id, d: +d, c, key: c + ':x' + d + ':' + id, extra: true, xk: k });
  });
  return days;
}
const dateOf = (c, d) => addDays(S.start, c * 7 + d);
function status(it) {
  const log = S.logs[it.key];
  if (log && log.done) return 'done';
  if ((S.weeks[it.c] || {}).pass && S.weeks[it.c].pass[it.key]) return 'passed';
  if (log) return 'started';
  const dt = dateOf(it.c, it.d), t = today();
  return dt < t ? 'missed' : dt === t ? 'today' : 'upcoming';
}
function legOn(abs) { // is there leg work on this absolute day number?
  const c = Math.floor(abs / 7), d = ((abs % 7) + 7) % 7;
  return items(c)[d].some((it) => SESSIONS[it.id].leg);
}
const cuffAllowed = (c, d) => planWeek(c) >= PLAN.cuffFromWeek && ![-1, 0, 1].some((o) => legOn(c * 7 + d + o));
function sledFor(c, id) {
  const w = S.weeks[c] || {};
  if (w.sled && id in w.sled) return w.sled[id];
  if (id === 'leg2' && w.pattern === 'skip') return false;
  return !!S.sledPref[id];
}

/* ---------- Building a session ---------- */
function build(id, week, sled) {
  const def = SESSIONS[id], ph = PLAN.phase(week);
  if (def.simple) return { def, warm: [], main: [], cool: [], ph };
  const main = def.main(sled).map((s) => {
    const o = Object.assign({}, s);
    if (!o.fixed && o.ex !== 'sled') o.sets = Math.min(o.sets, ph.maxSets);
    if (o.ex === 'sled' && ph.maxSets < 3) o.sets = 3;
    if (ph.heavy && o.heavy) { o.lo = 6; o.hi = 10; }
    return o;
  });
  return { def, warm: def.warm(sled), main, cool: def.cool(sled), ph };
}
function minutes(b) {
  if (!b.main.length) return 25;
  const work = b.main.reduce((t, s) => t + s.sets * (s.rest + (EX[s.ex].side ? 75 : 45)), 0) / 60;
  return Math.round((work + b.warm.length * 2 + b.cool.length * 1.7) / 5) * 5;
}
function range(slot, exId) { // rep range, adjusted when a swap changes reps to seconds or back
  const was = EX[slot.ex].kind === 'time', is = EX[exId].kind === 'time';
  if (is && !was) return [30, 40];
  if (!is && was) return [10, 10];
  return [slot.lo, slot.hi];
}
function doseText(slot, exId) {
  const e = EX[exId], [lo, hi] = range(slot, exId);
  if (slot.fixed) return slot.fixed.join(', ') + ' reps' + (e.side ? ' each side' : '');
  if (e.kind === 'sled') return slot.sets + ' × 20 m';
  const txt = hi > lo ? lo + '–' + hi : '' + lo;
  return slot.sets + ' × ' + txt + (e.kind === 'time' ? ' s' : '') + (e.side ? ' each side' : '');
}

/* ---------- Progression ---------- */
function lastLog(exId, notKey) {
  let best = null;
  Object.values(S.logs).forEach((l) => {
    if (l.key === notKey || !l.moves) return;
    l.moves.forEach((mv) => {
      if (mv.ex !== exId || !mv.sets) return;
      const sets = mv.sets.filter((s) => s.done);
      if (sets.length && (!best || l.startedAt > best.at)) best = { at: l.startedAt, date: l.date, sets, effort: mv.effort };
    });
  });
  return best;
}
function kneeRaise() { // how far the latest scored leg session sat above normal
  let last = null;
  Object.values(S.logs).forEach((l) => {
    if (l.done && SESSIONS[l.id].leg && typeof S.knee[l.key] === 'number' && (!last || l.startedAt > last.startedAt)) last = l;
  });
  return last ? S.knee[last.key] - S.baseline : 0;
}
const roundTo = (v, step) => Math.max(0, Math.round(v / step) * step);
function target(exId, slot, leg, notKey) {
  const e = EX[exId], h = lastLog(exId, notKey);
  const [lo, hi] = range(slot, exId);
  const weighted = e.kind === 'load' || e.kind === 'sled';
  if (!h) return { w: weighted ? e.start : null, r: e.kind === 'sled' ? 1 : lo, note: weighted ? 'First time. This weight is a cautious guess: change it to what feels right.' : 'First time. Start at the low end.' };
  const w = weighted ? Math.max.apply(null, h.sets.map((s) => s.w || 0)) : null;
  const minR = Math.min.apply(null, h.sets.map((s) => s.r));
  const clamp = (r) => Math.min(hi, Math.max(lo, r));
  if (slot.fixed || e.kind === 'sled') {
    const up = e.kind === 'sled' && h.effort === 'easy';
    return { w: up ? w + e.step : w, r: 1, note: up ? 'Last time felt easy: a little more load.' : 'Same as last time.' };
  }
  const raise = leg ? kneeRaise() : 0;
  if (raise >= 3) return { w: weighted ? roundTo(w * 0.9, e.step) : null, r: lo, note: 'Your knee score was well above normal, so the weight is about 10% lower today.' };
  if (raise >= 1) return { w, r: clamp(minR), note: 'Your knee score was above normal, so hold here today.' };
  if (minR >= hi && h.effort !== 'hard') {
    if (weighted) return { w: w + e.step, r: lo, note: 'You reached the top of the range, so the weight goes up.' };
    return { w: null, r: hi, note: 'Top of the range. Slow it down or add a pause to make it harder.' };
  }
  if (minR < lo) return { w, r: lo, note: 'Same weight. Build up to ' + lo + (e.kind === 'time' ? ' seconds.' : ' reps.') };
  return { w, r: clamp(minR + (e.kind === 'time' ? 5 : 1)), note: e.kind === 'time' ? 'Aim for five more seconds.' : 'Same weight. Aim for one more rep.' };
}
function initSets(log, i, b) {
  const mv = log.moves[i], slot = b.main[i];
  if (mv.sets) return;
  const t = target(mv.ex, slot, !!b.def.leg, log.key);
  mv.note = t.note;
  mv.sets = Array.from({ length: slot.sets }, (_, k) => ({ w: t.w, r: slot.fixed ? slot.fixed[k] : t.r, done: false }));
}

/* ---------- Small HTML helpers ---------- */
const IC = {
  check: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8.5"/></svg>',
  left: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4l-6 6 6 6"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 4l6 6-6 6"/></svg>',
  play: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>',
  swap: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11l-3-3M15 12H4l3 3"/></svg>',
};
const kg = (w) => (Math.round(w * 100) / 100) + ' kg';
const BLOCK = { upper: 'Upper', leg1: 'Legs 1', leg2: 'Legs 2', swim: 'Swim', cuff: 'Cuff' };
const mmss = (sec) => Math.floor(sec / 60) + ':' + pad(Math.max(0, sec % 60));

/* ---------- Week view ---------- */
function kneePrompt() {
  const t = today();
  const due = Object.values(S.logs)
    .filter((l) => l.done && SESSIONS[l.id].leg && l.date < t && dayDiff(l.date, t) <= 3 && S.knee[l.key] === undefined)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!due) return '';
  let b = '';
  for (let n = 0; n <= 10; n++) b += `<button class="score" data-a="knee" data-k="${due.key}" data-n="${n}" aria-label="${n} out of 10">${n}</button>`;
  return `<section class="knee"><h2>How is your knee today?</h2>
    <p>After ${SESSIONS[due.id].title} on ${short(due.date)}. 0 is no symptoms, 10 is the worst. Your normal is ${S.baseline}.</p>
    <div class="scores">${b}</div><button class="text-btn" data-a="knee" data-k="${due.key}" data-n="skip">Skip this one</button></section>`;
}

function renderWeek() {
  const cw = curWeek();
  if (ui.view === null) ui.view = Math.max(0, cw);
  const c = ui.view, days = items(c), t = today(), pw = planWeek(c), off = isOff(c), over = pw > PLAN.weeks;
  if (!ui.sel || ui.sel.c !== c) {
    const td = c === cw ? (parse(t).getDay() + 6) % 7 : days.findIndex((d) => d.length);
    ui.sel = { c, d: td < 0 ? 0 : td };
  }
  const d = ui.sel.d;
  const title = over ? 'Plan complete' : off ? 'Week off' : `Week ${pw} of ${PLAN.weeks}`;
  let grid = '';
  for (let i = 0; i < 7; i++) {
    const dt = dateOf(c, i), its = days[i];
    const col = its.length ? SESSIONS[its[0].id].color : 'rest';
    let blocks = its.map((it) => {
      const st = status(it);
      const lg = S.logs[it.key], sled = SESSIONS[it.id].sledSwitch && (lg ? lg.sled : sledFor(c, it.id));
      return `<span class="blk ${SESSIONS[it.id].color} ${st}">${st === 'done' ? IC.check : ''}<span>${BLOCK[it.id]}${st === 'passed' ? '<br>passed' : sled ? '<br>sled' : ''}</span></span>`;
    }).join('');
    if (!blocks) blocks = '<span class="free">Rest</span>';
    grid += `<button class="col ${i === d ? 'sel c-' + col : ''} ${dt === t ? 'is-today' : ''}" data-a="day" data-d="${i}" aria-pressed="${i === d}" aria-label="${DAYS_LONG[i]} ${nice(dt)}${dt === t ? ', today' : ''}">
      <span class="d">${DAYS[i]}</span><span class="n">${parse(dt).getDate()}</span>${blocks}</button>`;
  }
  const its = days[d];
  const col = its.length ? SESSIONS[its[0].id].color : 'rest';
  let card = its.map((it) => itemCard(it)).join('<hr>');
  const dt = dateOf(c, d), isToday = dt === t;
  if (!its.length) {
    card = `<h2>${off ? 'Week off' : over ? 'All 12 weeks done' : 'Rest day'}</h2><p class="meta">${DAYS_LONG[d]}${isToday ? ', today' : ''} · ${
      off ? 'The plan picks up next week and ends a week later.' : over ? 'Save a backup in More and bring the file back to plan the next 12 weeks.' : 'Recovery is part of the plan.'}</p>`;
  }
  let adds = '';
  if (!off && !over && c >= 0) {
    if (!its.some((it) => it.id === 'swim')) adds += `<button class="ghost" data-a="add" data-id="swim">Add a swim</button>`;
    if (!its.some((it) => it.id === 'cuff') && cuffAllowed(c, d)) adds += `<button class="ghost" data-a="add" data-id="cuff">Add home cuff session</button>`;
  }
  const w = S.weeks[c] || {};
  const pattern = w.pattern || 'normal';
  const opt = (map, cur) => Object.keys(map).map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${map[k]}</option>`).join('');
  const controls = over ? '' : `<section class="list" aria-label="This week">
      ${off ? '' : `<label class="c"><span>Week pattern<small>${pattern === 'skip' ? 'Mon, Wed, Fri. No swim.' : pattern === 'shift' ? 'Legs Wed, upper Fri, legs Sun' : 'Mon, Wed, and the weekend'}</small></span><select data-c="pattern">${opt(PATTERNS, pattern)}</select></label>
      ${pattern === 'normal' ? `<label class="c"><span>Weekend</span><select data-c="layout">${opt(LAYOUTS, w.layout || S.layout)}</select></label>` : ''}`}
      <label class="c"><span>Away this week<small>The plan extends by a week</small></span><input type="checkbox" class="sw" data-c="off" ${off ? 'checked' : ''}></label>
    </section>`;
  const range = nice(dateOf(c, 0)).split(' ')[0] + ' to ' + nice(dateOf(c, 6));
  return `<header class="top">
      <button class="nav-btn" data-a="week" data-n="-1" aria-label="Previous week" ${c <= 0 ? 'disabled' : ''}>${IC.left}</button>
      <div><h1>${title}</h1><p>${range}${!off && !over ? ' · ' + PLAN.phase(pw).name : ''}</p></div>
      <button class="nav-btn" data-a="week" data-n="1" aria-label="Next week">${IC.right}</button>
    </header>
    ${cw < 0 && c === 0 ? `<p class="banner">The plan starts on ${short(S.start)}.</p>` : ''}
    ${saveFailed ? '<p class="banner warn">Your phone refused to save. Free some storage, then save a backup in More.</p>' : ''}
    ${kneePrompt()}
    <div class="grid">${grid}</div>
    <div class="link c-${col}" style="--d:${ui.fromD === undefined ? d : ui.fromD}" data-d="${d}" aria-hidden="true"></div>
    <section class="card c-${col}">${card}${adds ? `<div class="adds">${adds}</div>` : ''}</section>
    ${controls}`;
}

function itemCard(it) {
  const def = SESSIONS[it.id], st = status(it), dt = dateOf(it.c, it.d), isToday = dt === today();
  const when = DAYS_LONG[it.d] + (isToday ? ', today' : '');
  const log = S.logs[it.key];
  const remove = it.extra && st !== 'done' ? `<button class="text-btn" data-a="remove" data-xk="${it.xk}">Remove</button>` : '';
  if (def.simple) {
    return `<h2>${def.title}</h2><p class="meta">${when} · ${def.sub}</p>
      <ul class="notes">${PLAN.swimNotes.map((n) => `<li>${n}</li>`).join('')}</ul>
      ${st === 'done' ? `<p class="done-line">${IC.check} Done</p><button class="text-btn" data-a="undo" data-k="${it.key}">Undo</button>`
        : `<button class="start" data-a="simple" data-k="${it.key}" data-id="${it.id}" data-c="${it.c}">Mark swim as done</button>`}${remove}`;
  }
  const sled = log ? log.sled : sledFor(it.c, it.id);
  const b = build(it.id, log ? log.week : planWeek(it.c), sled);
  const locked = st === 'done' || st === 'started';
  const seg = def.sledSwitch ? `<div class="seg" role="group" aria-label="Sled">
      <button data-a="sled" data-id="${it.id}" data-v="1" aria-pressed="${sled}" ${locked ? 'disabled' : ''}>Sled</button>
      <button data-a="sled" data-id="${it.id}" data-v="0" aria-pressed="${!sled}" ${locked ? 'disabled' : ''}>No sled</button></div>` : '';
  let action;
  if (st === 'done') {
    const mins = log.finishedAt ? Math.max(1, Math.round((log.finishedAt - log.startedAt) / 6e4)) : null;
    action = `<p class="done-line">${IC.check} Done${mins ? ' in ' + mins + ' min' : ''}</p>`;
  } else if (st === 'passed') {
    action = `<p class="done-line">Passed</p><button class="text-btn" data-a="pass" data-k="${it.key}">Undo pass</button>`;
  } else {
    const canShift = it.id === 'upper' && st === 'missed' && it.c === curWeek() && ((S.weeks[it.c] || {}).pattern || 'normal') === 'normal' && ui.tab === 'week';
    action = `${canShift ? '<button class="ghost full" data-a="shift">Move the week: legs Wed, upper Fri, legs Sun</button>' : ''}<button class="start" data-a="start" data-id="${it.id}" data-c="${it.c}" data-k="${it.key}">${st === 'started' ? 'Continue session' : 'Start session'}</button>
      ${st === 'started' ? '' : `<button class="text-btn" data-a="pass" data-k="${it.key}">Pass this session</button>`}`;
  }
  return `<h2>${def.title}</h2>
    <p class="meta">${when} · ${def.sub}<br>${b.main.length} moves · about ${minutes(b)} min${def.home ? ' · at home' : ''}</p>
    <p class="phase">${it.id === 'cuff' ? 'Cuff pressure this week: ' + PLAN.cuffPressure(planWeek(it.c)) + '% of the measured limit.' : b.ph.note}</p>
    <div class="row">${seg}${def.bands ? '<span class="pill">Bring your bands</span>' : ''}</div>
    ${action}${remove}`;
}

/* ---------- Session run ---------- */
function renderToday() {
  const log = S.active && S.logs[S.active];
  if (log && !log.done) return renderRun(log);
  if (log && log.done && ui.summary) return renderSummary(log);
  const c = curWeek(), t = today();
  const d = (parse(t).getDay() + 6) % 7;
  const its = c >= 0 ? items(c)[d] : [];
  const head = `<header class="top plain"><div><h1>Today</h1><p>${DAYS_LONG[d]} ${nice(t)}</p></div></header>`;
  if (!its.length) return head + `<section class="card gap c-rest"><h2>Nothing planned today</h2><p class="meta">Rest, or open the Week tab to move a session.</p><button class="ghost" data-a="tab" data-t="week">Open the week</button></section>`;
  return head + its.map((it) => `<section class="card c-${SESSIONS[it.id].color} gap">${itemCard(it)}</section>`).join('');
}

function prepList(ids, done, which) {
  return `<ul class="checks">${ids.map((id, i) => {
    const p = PREP[id];
    return `<li><button class="tick" data-a="tick" data-w="${which}" data-i="${i}" aria-pressed="${!!done[i]}" aria-label="${p.name}">${done[i] ? IC.check : ''}</button>
      <div><strong>${p.name}</strong><span>${p.dose}</span></div>
      ${p.video ? `<a class="watch" href="${p.video}" target="_blank" rel="noopener" aria-label="Watch ${p.name}">${IC.play}</a>` : ''}</li>`;
  }).join('')}</ul>`;
}

function renderRun(log) {
  const b = build(log.id, log.week, log.sled), n = b.main.length, step = log.step;
  const segs = Array.from({ length: n + 2 }, (_, i) => `<i class="${i < step ? 'past' : i === step ? 'now' : ''}"></i>`).join('');
  const isMove = step > 0 && step <= n;
  const bar = `<div class="run-head"><header class="run-top c-${b.def.color}"><button class="nav-btn" data-a="close" aria-label="Close session and keep progress">${IC.left}</button>
    <div><h1>${b.def.title}${step > 0 && step <= n ? ' · move ' + step + ' of ' + n : ''}</h1><div class="steps" aria-label="Step ${step + 1} of ${n + 2}">${segs}</div></div></header>
    ${isMove ? '<div class="rest" id="rest" role="timer"><span id="rest-l"></span><button class="text-btn" data-a="skiprest" id="rest-s" hidden>Skip</button></div>' : ''}</div>`;
  const foot = (back, next) => `<footer class="run-foot">${back ? `<button class="ghost" data-a="step" data-n="-1">Back</button>` : '<span></span>'}
    <button class="start c-${b.def.color}" data-a="step" data-n="1">${next}</button></footer>`;
  if (step === 0) {
    const extra = log.id === 'cuff'
      ? `<ul class="notes">${PLAN.cuffNotes.map((x) => `<li>${x}</li>`).join('')}</ul><h3>Stop straight away if you get</h3><ul class="notes">${PLAN.cuffStop.map((x) => `<li>${x}</li>`).join('')}</ul>`
      : `<p class="meta">${b.ph.note}</p>`;
    return bar + `<main class="run"><h2>${log.id === 'cuff' ? 'Set up' : 'Warm-up'}</h2>${extra}${prepList(b.warm, log.warm, 'warm')}</main>` + foot(false, 'Start main work');
  }
  if (step === n + 1) {
    return bar + `<main class="run"><h2>Cool-down</h2><p class="meta">About five minutes. Ease into each stretch.</p>${prepList(b.cool, log.cool, 'cool')}</main>` + foot(true, 'Finish session');
  }
  const i = step - 1, slot = b.main[i], mv = log.moves[i], e = EX[mv.ex];
  initSets(log, i, b);
  const h = lastLog(mv.ex, log.key);
  const weighted = e.kind === 'load' || e.kind === 'sled', unit = e.kind === 'time' ? 's' : 'reps';
  const lastTxt = h ? 'Last time: ' + (weighted ? kg(Math.max.apply(null, h.sets.map((s) => s.w || 0))) + (e.kind === 'sled' ? ', ' + h.sets.length + ' lengths' : ' × ' + h.sets.map((s) => s.r).join(', ')) : h.sets.map((s) => s.r).join(', ') + ' ' + unit) : '';
  let cue = e.cue;
  if (slot.halfRange && mv.ex === 'legext') cue += log.week < 7 ? ' Top half only for now: from a 90° bend to 45°. Set the range limiter if the machine has one.' : ' Full range is fine from this week if your knee scores are steady.';
  const shape = weighted ? '' : 'no-w';
  const head = `<div class="set head ${shape}" aria-hidden="true">${weighted ? '<span>Weight, kg</span>' : ''}<span>${e.kind === 'sled' ? 'Distance' : e.kind === 'time' ? 'Seconds' : 'Reps'}</span><span></span></div>`;
  const rows = head + mv.sets.map((s, k) => `<div class="set ${shape} ${s.done ? 'is-done' : ''}">
      ${weighted ? `<div class="stp"><button data-a="adj" data-k="${k}" data-f="w" data-n="-1" aria-label="Less weight">−</button><output>${Math.round(s.w * 100) / 100}</output><button data-a="adj" data-k="${k}" data-f="w" data-n="1" aria-label="More weight">+</button></div>` : ''}
      ${e.kind === 'sled' ? '<span class="fixed">20 m</span>' : `<div class="stp"><button data-a="adj" data-k="${k}" data-f="r" data-n="-1" aria-label="Fewer">−</button><output>${s.r}</output><button data-a="adj" data-k="${k}" data-f="r" data-n="1" aria-label="More">+</button></div>`}
      <button class="done-btn" data-a="set" data-k="${k}" aria-pressed="${s.done}" aria-label="Set ${k + 1} done">${s.done ? IC.check : 'Done'}</button>
    </div>`).join('');
  const eff = ['easy', 'right', 'hard'].map((v) => `<button data-a="effort" data-v="${v}" aria-pressed="${mv.effort === v}">${v === 'right' ? 'About right' : v[0].toUpperCase() + v.slice(1)}</button>`).join('');
  const alts = ALTS[slot.ex];
  const swapped = mv.ex !== slot.ex;
  return bar + `<main class="run">
      <h2 class="move">${e.name}</h2>
      <p class="dose">${weighted && !slot.fixed ? '<b>' + kg((mv.sets.find((s) => !s.done) || mv.sets[mv.sets.length - 1]).w) + '</b> · ' : ''}${doseText(slot, mv.ex)}</p>
      <p class="cue">${cue}${swapped ? ' Swapped from ' + EX[slot.ex].name.toLowerCase() + '.' : ''}</p>
      <div class="row">
        <a class="ghost" href="${e.video}" target="_blank" rel="noopener">${IC.play} Watch how</a>
        ${alts ? `<button class="ghost" data-a="swap">${IC.swap} ${ui.confirmSwap ? 'Tap again to swap' : 'Swap move'}</button>` : ''}
      </div>
      <div class="target c-${b.def.color}">${lastTxt ? `<span>${lastTxt}</span>` : ''}<strong>${mv.note}</strong></div>
      <div class="sets">${rows}</div>
      <div class="effort"><span id="eff-l">How did it feel?</span><div class="seg wide" role="group" aria-labelledby="eff-l">${eff}</div></div>
    </main>` + foot(true, i === n - 1 ? 'Cool-down' : 'Next move');
}

function renderSummary(log) {
  const b = build(log.id, log.week, log.sled);
  const sets = log.moves.reduce((t, mv) => t + (mv.sets ? mv.sets.filter((s) => s.done).length : 0), 0);
  const mins = Math.max(1, Math.round((log.finishedAt - log.startedAt) / 6e4));
  return `<header class="top plain"><div><h1>Session done</h1><p>${b.def.title} · ${short(log.date)}</p></div></header>
    <section class="card gap c-${b.def.color}"><h2>${mins} min</h2><p class="meta">${sets} sets logged across ${b.main.length} moves.</p>
    ${b.def.leg ? '<p class="phase">Tomorrow morning the app asks for your knee score. It uses the answer to set the next leg weights.</p>' : ''}
    <button class="start" data-a="closeSummary">Back to the week</button></section>`;
}

/* ---------- Progress ---------- */
function chart(points, yMax, x0, x1, base) {
  const W = 320, H = 110, px = (d) => 8 + (W - 16) * Math.min(1, Math.max(0, dayDiff(x0, d) / Math.max(1, dayDiff(x0, x1)))), py = (v) => H - 14 - (H - 28) * (v / yMax);
  const path = points.map((p, i) => (i ? 'L' : 'M') + px(p.d).toFixed(1) + ' ' + py(p.v).toFixed(1)).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${points.length} sessions, from ${points[0].v} to ${points[points.length - 1].v}">
    <line x1="8" x2="${W - 8}" y1="${H - 14}" y2="${H - 14}" class="axis"/><line x1="8" x2="${W - 8}" y1="14" y2="14" class="axis faint"/>
    ${base !== undefined ? `<line x1="8" x2="${W - 8}" y1="${py(base)}" y2="${py(base)}" class="axis base"/>` : ''}
    <path d="${path}" class="line"/>${points.map((p) => `<circle cx="${px(p.d).toFixed(1)}" cy="${py(p.v).toFixed(1)}" r="4" class="dot"/>`).join('')}
    <text x="8" y="10" class="tick-t">${yMax}</text></svg>`;
}
function renderProgress() {
  const x0 = S.start, x1 = addDays(S.start, (PLAN.weeks + Object.keys(S.weeks).filter((c) => isOff(+c)).length) * 7);
  const logs = Object.values(S.logs).filter((l) => l.done).sort((a, b) => a.startedAt - b.startedAt);
  const by = {};
  logs.forEach((l) => (l.moves || []).forEach((mv) => {
    const sets = (mv.sets || []).filter((s) => s.done);
    if (!sets.length) return;
    const e = EX[mv.ex], weighted = e.kind === 'load' || e.kind === 'sled';
    const v = Math.max.apply(null, sets.map((s) => (weighted ? s.w : s.r)));
    (by[mv.ex] = by[mv.ex] || []).push({ d: l.date, v, unit: weighted ? 'kg' : e.kind === 'time' ? 's' : 'reps' });
  }));
  const gym = logs.filter((l) => !SESSIONS[l.id].simple).length, swims = logs.filter((l) => l.id === 'swim').length;
  const kp = logs.filter((l) => typeof S.knee[l.key] === 'number').map((l) => ({ d: l.date, v: S.knee[l.key] }));
  let out = `<header class="top plain"><div><h1>Progress</h1><p>${gym} gym sessions · ${swims} swims</p></div></header>`;
  if (!gym) return out + `<section class="card gap c-rest"><h2>No sessions yet</h2><p class="meta">Each move gets a chart here after you log it once. The scale of each chart stays fixed, so week 1 and week 12 compare fairly.</p></section>`;
  if (kp.length) out += `<section class="pc"><h2>Knee score, morning after</h2><p>Latest ${kp[kp.length - 1].v} · your normal is ${S.baseline}</p>${chart(kp, 10, x0, x1, S.baseline)}</section>`;
  Object.keys(EX).filter((id) => by[id]).forEach((id) => {
    const p = by[id], first = p[0].v, last = p[p.length - 1].v, u = p[0].unit;
    const top = Math.max.apply(null, p.map((q) => q.v));
    const yMax = u === 'kg' ? Math.max(10, Math.ceil(top * 1.5 / 10) * 10) : Math.max(10, Math.ceil(top * 1.3 / 5) * 5);
    out += `<section class="pc"><h2>${EX[id].name}</h2><p>${first === last ? first + ' ' + u : first + ' → ' + last + ' ' + u} · ${p.length} session${p.length > 1 ? 's' : ''}</p>${chart(p, yMax, x0, x1)}</section>`;
  });
  return out;
}

/* ---------- More ---------- */
function renderMore() {
  const li = (a) => a.map((x) => `<li>${x}</li>`).join('');
  return `<header class="top plain"><div><h1>More</h1><p>Backup, settings, and the rules</p></div></header>
    <section class="list">
      <div class="c"><span>Save backup<small>One file with every log. Keep it safe.</small></span><button class="ghost" data-a="backup">Save</button></div>
      <div class="c"><span>Restore from backup<small>Replaces what is on this phone</small></span><label class="ghost">Choose file<input type="file" accept="application/json,.json" data-c="restore" class="vh"></label></div>
      <label class="c"><span>Plan start<small>Monday of week 1</small></span><input type="date" data-c="start" value="${S.start}"></label>
      <div class="c"><span>Normal knee<small>A usual morning, 0 to 10</small></span>
        <div class="stp"><button data-a="base" data-n="-1" aria-label="Lower">−</button><output>${S.baseline}</output><button data-a="base" data-n="1" aria-label="Higher">+</button></div></div>
    </section>
    <section class="pc"><h2>Stop and see a clinician if you notice</h2><ul class="notes">${li(PLAN.redFlags)}</ul></section>
    <section class="pc"><h2>How the plan progresses</h2><ul class="notes">${li(PLAN.rules)}</ul></section>
    <section class="pc"><h2>Swimming</h2><ul class="notes">${li(PLAN.swimNotes)}</ul></section>
    <section class="pc"><h2>Home cuff session, from week ${PLAN.cuffFromWeek}</h2><ul class="notes">${li(PLAN.cuffNotes)}</ul><h3>Stop straight away if you get</h3><ul class="notes">${li(PLAN.cuffStop)}</ul></section>
    <section class="list"><div class="c"><span>Erase everything<small>Deletes all logs on this phone</small></span><button class="ghost danger" data-a="reset">${ui.confirmReset ? 'Tap again to erase' : 'Erase'}</button></div></section>
    <p class="fine">This app is a training log, not medical advice. Videos open on YouTube and need a connection.</p>`;
}

/* ---------- Render ---------- */
const app = document.getElementById('app');
function render(keepScroll) {
  const y = window.scrollY;
  const running = ui.tab === 'today' && S.active && S.logs[S.active] && !S.logs[S.active].done;
  app.innerHTML = (ui.tab === 'week' ? renderWeek() : ui.tab === 'today' ? renderToday() : ui.tab === 'progress' ? renderProgress() : renderMore());
  document.body.classList.toggle('running', !!running);
  document.querySelectorAll('nav.tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.t === ui.tab ? 'page' : 'false'));
  window.scrollTo(0, keepScroll ? y : 0);
  const link = app.querySelector('.link');
  if (link && ui.fromD !== undefined) requestAnimationFrame(() => requestAnimationFrame(() => link.style.setProperty('--d', link.dataset.d)));
  ui.fromD = undefined;
  paintRest();
}

/* ---------- Rest timer ---------- */
function paintRest() {
  const el = document.getElementById('rest');
  if (!el) return;
  const label = document.getElementById('rest-l'), skip = document.getElementById('rest-s');
  if (ui.rest) {
    const left = Math.ceil((ui.rest - Date.now()) / 1000);
    if (left > 0) { el.className = 'rest on'; label.innerHTML = 'Rest <b>' + mmss(left) + '</b>'; skip.hidden = false; return; }
    ui.rest = null; ui.over = true;
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) { /* no vibration */ }
  }
  el.className = ui.over ? 'rest over' : 'rest';
  label.textContent = ui.over ? 'Rest over. Start your next set.' : 'The rest timer starts when you tap Done.';
  skip.hidden = true;
}
setInterval(paintRest, 250);

/* ---------- Actions ---------- */
function activeCtx() {
  const log = S.logs[S.active];
  const b = build(log.id, log.week, log.sled);
  return { log, b, i: log.step - 1, mv: log.moves[log.step - 1], slot: b.main[log.step - 1] };
}
const ACT = {
  tab(el) { ui.tab = el.dataset.t; ui.summary = false; ui.confirmReset = false; },
  week(el) { ui.view = Math.max(0, ui.view + +el.dataset.n); ui.sel = null; },
  day(el) { ui.fromD = ui.sel ? ui.sel.d : undefined; ui.sel = { c: ui.view, d: +el.dataset.d }; return true; },
  shift() { wk(ui.view).pattern = 'shift'; ui.sel = null; return true; },
  add(el) { const w = wk(ui.view); w.extra = w.extra || {}; w.extra[ui.sel.d + ':' + el.dataset.id] = 1; return true; },
  remove(el) { delete wk(ui.view).extra[el.dataset.xk]; return true; },
  pass(el) { const w = wk(+el.dataset.k.split(':')[0]); w.pass = w.pass || {}; if (w.pass[el.dataset.k]) delete w.pass[el.dataset.k]; else w.pass[el.dataset.k] = 1; return true; },
  sled(el) { const c = ui.tab === 'week' ? ui.view : curWeek(), w = wk(c), v = el.dataset.v === '1'; w.sled = w.sled || {}; w.sled[el.dataset.id] = v; if (w.pattern !== 'skip') S.sledPref[el.dataset.id] = v; return true; },
  simple(el) { S.logs[el.dataset.k] = { id: el.dataset.id, c: +el.dataset.c, key: el.dataset.k, date: today(), startedAt: Date.now(), finishedAt: Date.now(), done: true }; return true; },
  undo(el) { delete S.logs[el.dataset.k]; return true; },
  knee(el) { S.knee[el.dataset.k] = el.dataset.n === 'skip' ? null : +el.dataset.n; return true; },
  start(el) {
    const k = el.dataset.k, c = +el.dataset.c, id = el.dataset.id;
    if (!S.logs[k]) {
      const week = Math.max(1, planWeek(c)), sled = sledFor(c, id), b = build(id, week, sled);
      S.logs[k] = { id, c, key: k, week, sled, date: today(), startedAt: Date.now(), step: 0, warm: [], cool: [], moves: b.main.map((s) => ({ ex: s.ex, sets: null, effort: null })), done: false };
    }
    S.active = k; ui.tab = 'today'; ui.summary = false;
  },
  close() { ui.tab = 'week'; ui.rest = null; },
  closeSummary() { ui.summary = false; S.active = null; ui.tab = 'week'; },
  tick(el) { const log = S.logs[S.active]; const a = log[el.dataset.w]; a[+el.dataset.i] = !a[+el.dataset.i]; return true; },
  step(el) {
    const log = S.logs[S.active], b = build(log.id, log.week, log.sled), n = +el.dataset.n;
    ui.rest = null; ui.over = false; ui.confirmSwap = false;
    if (n > 0 && log.step === b.main.length + 1) { log.done = true; log.finishedAt = Date.now(); ui.summary = true; return; }
    log.step = Math.max(0, log.step + n);
  },
  adj(el) {
    const { mv, slot } = activeCtx(), e = EX[mv.ex], k = +el.dataset.k, s = mv.sets[k], dir = +el.dataset.n;
    if (el.dataset.f === 'w') { s.w = Math.max(0, Math.round(((s.w || 0) + dir * e.step) * 100) / 100); for (let j = k + 1; j < mv.sets.length; j++) if (!mv.sets[j].done) mv.sets[j].w = s.w; }
    else { s.r = Math.max(1, s.r + dir * (e.kind === 'time' ? 5 : 1)); if (!slot.fixed) for (let j = k + 1; j < mv.sets.length; j++) if (!mv.sets[j].done) mv.sets[j].r = s.r; }
    return true;
  },
  set(el) {
    const { mv, slot } = activeCtx(), k = +el.dataset.k, s = mv.sets[k];
    s.done = !s.done; ui.over = false;
    ui.rest = s.done && mv.sets.some((x) => !x.done) ? Date.now() + slot.rest * 1000 : null;
    return true;
  },
  effort(el) { const { mv } = activeCtx(); mv.effort = mv.effort === el.dataset.v ? null : el.dataset.v; return true; },
  skiprest() { ui.rest = null; ui.over = false; return true; },
  swap() {
    const { mv, slot } = activeCtx();
    if (mv.sets && mv.sets.some((s) => s.done) && !ui.confirmSwap) { ui.confirmSwap = true; return true; }
    const order = [slot.ex].concat(ALTS[slot.ex]);
    mv.ex = order[(order.indexOf(mv.ex) + 1) % order.length]; mv.sets = null; mv.effort = null; ui.confirmSwap = false; ui.rest = null;
    return true;
  },
  base(el) { S.baseline = Math.min(10, Math.max(0, S.baseline + +el.dataset.n)); return true; },
  backup() {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gym-plan-backup-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return true;
  },
  reset() { if (!ui.confirmReset) { ui.confirmReset = true; return true; } S = fresh(); ui.confirmReset = false; ui.view = null; ui.sel = null; },
};
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const keep = ACT[el.dataset.a](el);
  save(); render(keep === true);
});
document.addEventListener('change', (ev) => {
  const el = ev.target, c = el.dataset.c;
  if (!c) return;
  if (c === 'pattern') { wk(ui.view).pattern = el.value; ui.sel = null; }
  else if (c === 'layout') { wk(ui.view).layout = el.value; S.layout = el.value; ui.sel = null; }
  else if (c === 'off') wk(ui.view).off = el.checked;
  else if (c === 'start') { if (el.value) { S.start = el.value; ui.view = null; ui.sel = null; } }
  else if (c === 'restore') {
    const f = el.files[0]; if (!f) return;
    f.text().then((txt) => {
      try { const d = JSON.parse(txt); if (!d || d.v !== 1 || !d.logs) throw new Error('bad'); S = Object.assign(fresh(), d); ui.view = null; ui.sel = null; save(); ui.msg = 'Backup restored.'; }
      catch (e) { ui.msg = 'That file is not a gym plan backup. Nothing was changed.'; }
      render(); alertMsg();
    });
    return;
  }
  save(); render(true);
});
function alertMsg() {
  if (!ui.msg) return;
  const p = document.createElement('p'); p.className = 'banner'; p.setAttribute('role', 'status'); p.textContent = ui.msg; ui.msg = null;
  app.insertBefore(p, app.children[1] || null);
}

render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
