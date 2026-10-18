import { makeText, dailyText, todayKey } from "./words.js";
import { settings, saveSettings, profile, saveProfile, runs, addRun, dayStreak } from "./store.js";
import * as audio from "./audio.js";
import { CARS, carSVG, carById, carDot, checkUnlocks } from "./cars.js";
import { icon, markSVG } from "./icons.js";
import * as kb from "./keyboard.js";
import { renderStats } from "./stats.js";
import { shareCard } from "./share.js";
import { online, leaderboard, topGhost, submit, rankToday } from "./online.js";
import * as mp from "./multiplayer.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const inp = $("#inp"), textEl = $("#text"), track = $("#track"), typebox = $("#typebox");

const BOTS = [
  { name: "grandma.exe", wpm: 28, car: { shape: "retro", color: "var(--c1)" } },
  { name: "npc", wpm: 46, car: { shape: "gt", color: "var(--c2)" } },
  { name: "tryhard", wpm: 74, car: { shape: "hyper", color: "var(--c3)", wing: true } },
];
const BOT_DOT = { "var(--c1)": "#A99BFF", "var(--c2)": "#5BB8FF", "var(--c3)": "#3DD68C" };
const VIBES = [
  [20, "touch keyboard, then grass"],
  [35, "warming up era"],
  [50, "mid, but make it cute"],
  [65, "kinda fast ngl"],
  [80, "main character energy"],
  [100, "keyboard demon unlocked"],
  [130, "are you even human?"],
  [Infinity, "literally a speedrun"],
];
const CONTENT_LABEL = { words: "words", quotes: "quotes", slang: "slang", code: "code", punct: "punctuation" };
const NITRO_EVERY = 10;   // clean words in a row
const NITRO_MS = 2500;
const GAUGE_MAX = 160;
const NAME_RE = /^[\p{L}\p{N}_ .-]{1,16}$/u;

let race = null, chars = [], base = [];
let shownWpm = 0, lastStat = 0, roadOff = 0, lastFrame = 0, lastKey = 0, lastSend = 0;
let lastPhysical = 0, lastErrorAt = 0;
let lastResult = null, mpLength = "race", afterName = null;
let boardMode = "race", boardPeriod = "today";
const ghostCache = {};

/* ---------- small helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ordinal = n => n + ({ 1: "st", 2: "nd", 3: "rd" }[n] || "th");
const correctLen = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
const modalOpen = () => !!$(".modal.show");
const resultsOpen = () => $("#results").classList.contains("show");

function toast(msg, ms = 2200) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), ms);
}

function progress() {
  return {
    best: runs.length ? Math.max(...runs.map(r => r.wpm)) : 0,
    races: runs.length,
    maxNitros: profile.maxNitros,
    streak: dayStreak(),
    marathons: profile.marathons,
    perfect: profile.perfect,
  };
}

/* ---------- theme + sound ---------- */
function applyTheme() {
  if (settings.theme) document.documentElement.dataset.theme = settings.theme;
  else delete document.documentElement.dataset.theme;
}
$("#theme").onclick = () => {
  const cur = settings.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  settings.theme = cur === "dark" ? "light" : "dark";
  saveSettings(); applyTheme(); focusInput();
};

function applySound() {
  audio.setMuted(settings.muted);
  $("#sound").innerHTML = icon(settings.muted ? "mute" : "sound");
}
$("#sound").onclick = () => { settings.muted = !settings.muted; saveSettings(); applySound(); focusInput(); };

/* ---------- mode controls ---------- */
function syncControls() {
  $$("#contentPills button").forEach(p => p.classList.toggle("on", p.dataset.content === settings.content));
  $$("#lengthPills button").forEach(p => p.classList.toggle("on", p.dataset.length === settings.length));
  $("#daily").classList.toggle("on", settings.daily);
  $("#controls").classList.toggle("is-daily", settings.daily);
}
$$("#contentPills button").forEach(p => p.onclick = () => {
  settings.content = p.dataset.content; settings.daily = false; saveSettings(); newRace();
});
$$("#lengthPills button").forEach(p => p.onclick = () => {
  settings.length = p.dataset.length; settings.daily = false; saveSettings(); newRace();
});
$("#daily").onclick = () => { settings.daily = !settings.daily; saveSettings(); newRace(); };

function updateHint() {
  const el = $("#hintRank");
  if (race.kind === "mp") el.textContent = "live race";
  else if (race.daily) el.textContent = `daily challenge · ${race.day}`;
  else if (online) el.textContent = race.eligible ? "counts for the leaderboard" : "practice mode";
  else el.textContent = "";
}

/* ---------- speedometer ---------- */
function buildGauge() {
  let s = "";
  for (let v = 0; v <= GAUGE_MAX; v += 10) {
    const a = ((-120 + (v / GAUGE_MAX) * 240) * Math.PI) / 180, major = v % 40 === 0;
    const r1 = major ? 52 : 55.5, r2 = 59.5;
    s += `<line class="tk${major ? " major" : ""}" x1="${(80 + r1 * Math.sin(a)).toFixed(1)}" y1="${(80 - r1 * Math.cos(a)).toFixed(1)}" x2="${(80 + r2 * Math.sin(a)).toFixed(1)}" y2="${(80 - r2 * Math.cos(a)).toFixed(1)}"/>`;
    if (major) s += `<text class="g-lbl" x="${(80 + 42 * Math.sin(a)).toFixed(1)}" y="${(80 - 42 * Math.cos(a) + 3).toFixed(1)}">${v}</text>`;
  }
  $("#gTicks").innerHTML = s;
}

function setGauge(wpm) {
  const p = Math.min(wpm, GAUGE_MAX) / GAUGE_MAX;
  $("#gNeedle").style.transform = `rotate(${-120 + p * 240}deg)`;
  $("#gFill").style.strokeDashoffset = String(100 - p * 100);
}

/* ---------- building a race ---------- */
function makeRace(text, opts) {
  const ends = [];
  for (let i = 0; i < text.length; i++) if (text[i] === " ") ends.push(i + 1);
  ends.push(text.length);
  return {
    kind: "solo", text, typed: "", live: true, started: false, done: false, t0: 0,
    errors: 0, keys: 0, times: [], maxCorrect: 0, ends, words: 0, errAtWord: 0,
    combo: 0, bestCombo: 0, nitros: 0, nitroUntil: 0, boost: 0, flagged: false, racers: [],
    ...opts,
  };
}

const meRacer = () => ({ you: true, id: profile.id, car: carById(settings.car), p: 0 });

function setFinishTime(r) {
  if (r.replay) r.finT = r.replay[r.replay.length - 1] / 1000;
  else if (!r.you && !r.remote && r.wpm) r.finT = (race.text.length / (r.wpm * 5)) * 60;
}

function newRace(sameText) {
  closeResults();
  audio.engineStop();
  const daily = settings.daily;
  const text = sameText || (daily ? dailyText(todayKey()) : makeText(settings.content, settings.length));
  race = makeRace(text, {
    kind: "solo",
    length: daily ? "race" : settings.length,
    content: daily ? "words" : settings.content,
    daily,
    day: daily ? todayKey() : null,
    board: daily ? "daily" : settings.length,
    eligible: daily || settings.content === "words",
    pbKey: daily ? "daily" : `${settings.content}-${settings.length}`,
  });
  race.racers = [meRacer(), ...BOTS.map(b => ({ ...b, wpm: Math.round(b.wpm * (0.9 + Math.random() * 0.2)), p: 0 }))];
  const pb = profile.pb[race.pbKey];
  if (pb) race.racers.push({ name: "your best", icon: "ghost", wpm: pb, car: carById(settings.car), ghost: true, p: 0 });
  race.racers.forEach(setFinishTime);
  setupScreen();
  addTopGhost(race);
}

function setupScreen() {
  shownWpm = 0;
  buildTrack(); renderText(); resetStats(); syncControls(); updateHint();
  track.classList.remove("moving", "boosting");
  typebox.classList.toggle("waiting", !race.live);
  inp.value = "";
  focusInput();
}

// Adds the world #1 run as a ghost, if the leaderboard is connected.
async function addTopGhost(r) {
  if (!online || !r.eligible) return;
  if (!(r.board in ghostCache)) {
    try { ghostCache[r.board] = await topGhost(r.board); } catch (e) { ghostCache[r.board] = null; }
  }
  const g = ghostCache[r.board];
  if (!g || !Array.isArray(g.timeline) || g.timeline.length < 2 || race !== r || r.started) return;
  const ghost = { name: `#1 ${g.name}`, icon: "globe", wpm: g.wpm, car: carById(g.car), ghost: true, replay: g.timeline, ri: 0, p: 0 };
  setFinishTime(ghost);
  r.racers.push(ghost);
  buildTrack();
}

function buildTrack() {
  track.querySelectorAll(".lane").forEach(l => l.remove());
  for (const r of race.racers) {
    const lane = document.createElement("div");
    lane.className = "lane";
    const marker = r.icon ? icon(r.icon) : `<i class="d" style="background:${BOT_DOT[r.car.color] || carDot(r.car)}"></i>`;
    const name = r.you ? (race.kind === "mp" ? `${esc(profile.name)} (you)` : "you") : esc(r.name);
    const speed = !r.you && r.wpm ? `<span class="w">${r.wpm}</span>` : "";
    lane.innerHTML = `<span class="tag${r.you ? " me" : ""}">${marker}${name}${speed}</span>
      <div class="car${r.ghost ? " ghost" : ""}${r.you ? " me" : ""}">${carSVG(r.car)}</div>`;
    track.appendChild(lane);
    r.lane = lane;
    r.carEl = lane.querySelector(".car");
    r.x = 0;
  }
}

function renderText() {
  const words = race.text.split(" ");
  textEl.innerHTML = words.map((w, i) =>
    `<span class="w">${[...w].map(ch => `<span class="c">${esc(ch)}</span>`).join("")}</span>` +
    (i < words.length - 1 ? '<span class="c sp"> </span>' : "")
  ).join("");
  chars = [...textEl.querySelectorAll(".c")];
  base = chars.map(c => c.className);
  textEl.scrollTop = 0;
  paint();
}

function paint() {
  const { typed, text } = race;
  for (let i = 0; i < chars.length; i++) {
    let cls = base[i];
    if (i < typed.length) cls += typed[i] === text[i] ? " ok" : " bad";
    if (i === typed.length) cls += " cur";
    if (chars[i].className !== cls) chars[i].className = cls;
  }
  const cur = chars[Math.min(typed.length, chars.length - 1)];
  if (cur) {
    const lineH = parseFloat(getComputedStyle(textEl).lineHeight);
    textEl.scrollTop = Math.max(0, cur.offsetTop - textEl.offsetTop - lineH);
  }
  if (race.done || !race.live) kb.setNext(null);
  else if (correctLen(typed, text) < typed.length) kb.setNext("bksp");
  else kb.setNext(text[typed.length] ?? null);
}

function setStats(wpm, acc, secs) {
  $("#wpm").textContent = Math.round(wpm);
  $("#acc").textContent = Math.round(acc);
  $("#time").textContent = secs.toFixed(1);
  setGauge(wpm);
}

function setCombo() {
  const boosting = race.nitroUntil > performance.now();
  const filled = race.combo % NITRO_EVERY;
  $("#combo").textContent = race.combo ? `x${race.combo}` : "";
  $("#meter").classList.toggle("hot", boosting);
  [...$("#meter").children].forEach((b, i) => b.classList.toggle("on", i < filled));
}

function resetStats() {
  setStats(0, 100, 0);
  setCombo();
  $("#pb").textContent = profile.pb[race.pbKey] || "—";
}

function focusInput() {
  if (!modalOpen() && !resultsOpen()) inp.focus();
}

/* ---------- typing ---------- */
inp.addEventListener("beforeinput", e => {
  if (e.inputType === "insertFromPaste" || e.inputType === "insertFromDrop") {
    e.preventDefault();
    toast("No pasting. Nice try.");
  }
});
inp.addEventListener("paste", e => e.preventDefault());
inp.addEventListener("drop", e => e.preventDefault());

inp.addEventListener("input", () => {
  const r = race;
  if (!r || r.done || !r.live) { inp.value = r ? r.typed : ""; return; }
  let v = inp.value.replace(/\n/g, "");
  if (v.length - r.typed.length > 2) r.flagged = true;   // a chunk appeared at once: autofill or paste
  const cl0 = correctLen(r.typed, r.text);
  if (v.length > cl0 + 12) v = v.slice(0, cl0 + 12);    // don't let typos run away
  if (v.length > r.text.length) v = v.slice(0, r.text.length);

  if (!r.started && v.length) startClock();

  let wrongChar = null;
  for (let i = r.typed.length; i < v.length; i++) {
    r.keys++;
    if (v[i] !== r.text[i]) { r.errors++; wrongChar = v[i]; }
  }
  const added = v.length > r.typed.length;
  const physical = performance.now() - lastPhysical < 80;
  if (added && !physical) kb.tap(kb.keyFor(v[v.length - 1]).k);  // phones: no key events, so flash the key
  r.typed = v;
  inp.value = v;

  // when each character was first typed correctly (used for ghosts + anti-cheat)
  const now = Math.round(performance.now() - r.t0);
  const cl = correctLen(v, r.text);
  while (r.maxCorrect < cl) r.times[r.maxCorrect++] = now;

  if (wrongChar != null) {
    r.combo = 0;
    r.errAtWord = r.errors;
    lastErrorAt = performance.now();
    kb.wrong(kb.keyFor(wrongChar).k);
    audio.sfx.error();
  } else if (added) audio.sfx.key();

  // a word counts as "clean" if no typo happened while typing it
  while (r.words < r.ends.length && cl >= r.ends[r.words]) {
    r.words++;
    if (r.errors === r.errAtWord) {
      r.combo++;
      r.bestCombo = Math.max(r.bestCombo, r.combo);
      if (r.combo % NITRO_EVERY === 0) nitro();
    }
    r.errAtWord = r.errors;
  }
  setCombo();

  lastKey = performance.now();
  typebox.classList.add("typing");
  paint();
  if (v === r.text) finish();
});

function startClock() {
  race.started = true;
  race.t0 = performance.now();
  track.classList.add("moving");
  audio.engineStart();
}

function nitro() {
  race.nitros++;
  race.nitroUntil = performance.now() + NITRO_MS;
  race.boost = 52;
  audio.sfx.nitro();
  const b = $("#boost");
  b.classList.remove("show");
  void b.offsetWidth;
  b.classList.add("show");
  race.racers[0].carEl.classList.add("nitro");
  track.classList.add("boosting");
}

/* ---------- animation loop ---------- */
function markDone(r) {
  if (r.lane.classList.contains("done")) return;
  const place = race.racers.filter(x => x.lane.classList.contains("done")).length + 1;
  r.lane.querySelector(".tag").dataset.place = "P" + place;
  r.lane.classList.add("done");
  r.carEl.classList.add("parked");
}

function moodFor(r, now) {
  if (r.nitroUntil > now) return "nitro";
  if (now - lastErrorAt < 700) return "oops";
  if (r.done) return "happy";
  if (r.started) return now - lastKey < 1500 && r.combo >= 3 ? "happy" : "idle";
  return now - lastKey > 9000 ? "sleep" : "idle";
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  if (now - lastKey > 500) typebox.classList.remove("typing");
  const r = race;
  if (!r) return;

  const boosting = r.nitroUntil > now;
  if (!boosting && r.nitroUntil) {
    r.nitroUntil = 0;
    r.racers[0].carEl.classList.remove("nitro");
    track.classList.remove("boosting");
    setCombo();
  }
  kb.setMood(moodFor(r, now));

  if (r.started && !r.done) {
    const ms = now - r.t0, secs = ms / 1000;
    const cl = correctLen(r.typed, r.text);
    const wpm = secs > 0.4 ? (cl / 5) / (secs / 60) : 0;
    shownWpm += (wpm - shownWpm) * (1 - Math.exp(-(now - (r.lastSmooth || now)) / 120));
    r.lastSmooth = now;
    for (const x of r.racers) {
      if (x.you) x.p = cl / r.text.length;
      else if (x.remote) continue;
      else if (x.replay) {
        while (x.ri < x.replay.length && x.replay[x.ri] <= ms) x.ri++;
        x.p = x.ri / x.replay.length;
      } else if (x.finT) x.p = Math.min(1, secs / x.finT);
      if (!x.you && x.p >= 1) markDone(x);
    }
    audio.engineSet(shownWpm, boosting);
    if (now - lastStat > 90) {
      lastStat = now;
      setStats(shownWpm, r.keys ? ((r.keys - r.errors) / r.keys) * 100 : 100, secs);
    }
    if (r.kind === "mp" && now - lastSend > 200) {
      lastSend = now;
      mp.send("progress", { id: profile.id, p: r.racers[0].p });
    }
    roadOff -= shownWpm * (boosting ? 3 : 1) * dt * 4;
    track.style.setProperty("--off", roadOff + "px");
  }

  if (!boosting) r.boost *= 0.93;
  for (const x of r.racers) {
    if (!x.carEl) continue;
    const max = x.lane.clientWidth - x.carEl.offsetWidth;
    const bonus = x.you && !r.done ? Math.min(r.boost, max * (1 - x.p)) : 0;
    x.x += (x.p * max + bonus - x.x) * 0.25;
    x.carEl.style.transform = `translateX(${x.x}px)`;
  }
}

/* ---------- finishing ---------- */
function modeLabel(r) {
  if (r.kind === "mp") return `live · ${r.length}`;
  if (r.daily) return `daily · ${r.day}`;
  return `${CONTENT_LABEL[r.content]} · ${r.length}`;
}

function finish() {
  const r = race;
  r.done = true;
  const ms = r.times[r.times.length - 1] || performance.now() - r.t0;
  const secs = Math.max(ms, 1) / 1000;
  const wpm = Math.round((r.text.length / 5) / (secs / 60));
  const acc = r.keys ? Math.round(((r.keys - r.errors) / r.keys) * 100) : 100;

  const you = r.racers[0];
  you.p = 1;
  markDone(you);
  track.classList.remove("moving");
  audio.engineStop();
  audio.sfx.finish();
  setStats(wpm, acc, secs);
  kb.setNext(null);
  if (r.kind === "mp") mp.send("finish", { id: profile.id, time: secs, wpm });

  const place = 1 + r.racers.filter(x => !x.you && x.finT != null && x.finT < secs).length;
  let isPb = false, fresh = [];
  if (!r.flagged) {
    isPb = wpm > (profile.pb[r.pbKey] || 0);
    if (isPb) profile.pb[r.pbKey] = wpm;
    profile.maxNitros = Math.max(profile.maxNitros, r.nitros);
    if (acc === 100 && r.length !== "sprint") profile.perfect++;
    if (r.length === "marathon") profile.marathons++;
    addRun({ t: Date.now(), wpm, acc, chars: r.text.length, length: r.length, content: r.content, daily: r.daily, kind: r.kind, place, of: r.racers.length, nitros: r.nitros });
    fresh = checkUnlocks(progress(), profile.unlocked);
    fresh.forEach(c => profile.unlocked.push(c.id));
    saveProfile();
    $("#pb").textContent = profile.pb[r.pbKey] || "—";
  }

  const vibe = VIBES.find(v => wpm < v[0])[1];
  const placeText = `${ordinal(place)} of ${r.racers.length}`;
  lastResult = { wpm, acc, secs, nitros: r.nitros, place, placeText, vibe, car: carById(settings.car), label: modeLabel(r) };

  $("#r-pos").textContent = "P" + place;
  $("#r-place").textContent = place === 1 ? "You won the race" : `You finished ${placeText}`;
  $("#r-mode").textContent = modeLabel(r);
  $("#r-wpm").textContent = wpm;
  $("#r-pb").innerHTML = isPb ? `${icon("sparkle")}new personal best` : "";
  $("#r-vibe").textContent = vibe;
  $("#r-acc").textContent = acc + "%";
  $("#r-time").textContent = secs.toFixed(1) + "s";
  $("#r-err").textContent = r.errors;
  $("#r-extra").innerHTML = `${icon("flame")}${r.nitros} nitro${r.nitros === 1 ? "" : "s"} · best combo ${r.bestCombo} words`;
  $("#r-unlocks").innerHTML = fresh.map(c => `<div class="unlock">${carSVG(c)}<span>Unlocked <b>${esc(c.name)}</b>. Check the garage.</span></div>`).join("");
  if (fresh.length) setTimeout(audio.sfx.unlock, 700);
  $("#again span").textContent = r.kind === "mp" ? "back to lobby" : "run it back";
  $("#share span").textContent = "share card";
  onlineLine(r, wpm, acc);
  inp.blur();
  setTimeout(() => { if (race === r) $("#results").classList.add("show"); }, 500);
}

function onlineLine(r, wpm, acc) {
  const el = $("#r-online");
  el.textContent = "";
  if (r.flagged) { el.textContent = "Paste detected, so this run doesn't count."; return; }
  if (!online || r.kind === "mp") return;
  if (!r.eligible) { el.textContent = "Practice mode. The leaderboard counts words and daily only."; return; }
  if (!profile.name) {
    el.innerHTML = `<button class="link" id="postBtn">${icon("globe")}post this to the leaderboard</button>`;
    $("#postBtn").onclick = () => askName(() => { $("#results").classList.add("show"); postScore(r, wpm, acc); });
    return;
  }
  postScore(r, wpm, acc);
}

async function postScore(r, wpm, acc) {
  const el = $("#r-online");
  el.textContent = "Posting to the leaderboard…";
  try {
    await submit({ name: profile.name, mode: r.board, text: r.text, times: r.times, acc, car: settings.car, day: r.day });
    delete ghostCache[r.board];
    const rank = await rankToday(r.board, wpm);
    el.innerHTML = `${icon("globe")}You're #${rank} today on the ${r.board} board`;
  } catch (e) {
    el.textContent = `Couldn't post: ${e.message}`;
  }
}

function closeResults() { $("#results").classList.remove("show"); }

function again() {
  if (race && race.kind === "mp") { closeResults(); openModal("mp"); }
  else newRace();
}
$("#again").onclick = again;

$("#share").onclick = async () => {
  if (!lastResult) return;
  const label = $("#share span");
  label.textContent = "making card…";
  try {
    const how = await shareCard(lastResult);
    label.textContent = how === "downloaded" ? "saved" : "shared";
  } catch (e) {
    label.textContent = "share card";
  }
};

/* ---------- modals ---------- */
const RENDER = { garage: renderGarage, stats: () => renderStats($("#statsBody")), board: renderBoard, mp: renderLobby };

function openModal(id) {
  closeModals();
  $("#m-" + id).classList.add("show");
  inp.blur();
  kb.releaseAll();
  if (RENDER[id]) RENDER[id]();
}
function closeModals() { $$(".modal.show").forEach(m => m.classList.remove("show")); }

$$("[data-open]").forEach(b => b.onclick = () => openModal(b.dataset.open));
$$("[data-close]").forEach(b => b.onclick = () => { closeModals(); focusInput(); });
$$(".modal").forEach(m => m.addEventListener("mousedown", e => {
  if (e.target === m) { closeModals(); focusInput(); }
}));

/* name */
function askName(then) {
  afterName = then;
  openModal("name");
  const f = $("#nameInput");
  f.value = profile.name;
  setTimeout(() => f.focus(), 50);
}
function saveName() {
  const v = $("#nameInput").value.trim();
  if (!NAME_RE.test(v)) { toast("Letters, numbers, spaces, _ . - only (max 16)"); return; }
  profile.name = v;
  saveProfile();
  mp.updateMe({ name: v });
  closeModals();
  const cb = afterName;
  afterName = null;
  if (cb) cb(); else focusInput();
}
$("#nameSave").onclick = saveName;
$("#nameInput").addEventListener("keydown", e => { if (e.key === "Enter") saveName(); });
const withName = fn => (profile.name ? fn() : askName(fn));

/* garage */
function renderGarage() {
  $("#garageGrid").innerHTML = CARS.map(c => {
    const has = profile.unlocked.includes(c.id), on = settings.car === c.id;
    const status = !has ? `${icon("lock")}${esc(c.how)}` : on ? `${icon("check")}driving` : "tap to drive";
    return `<button class="slot${has ? "" : " locked"}${on ? " on" : ""}" data-car="${c.id}"${has ? "" : " disabled"}>
      <div class="stage">${carSVG(c)}</div><b>${esc(c.name)}</b><span>${status}</span></button>`;
  }).join("");
  $$("#garageGrid .slot:not(.locked)").forEach(s => s.onclick = () => {
    settings.car = s.dataset.car;
    saveSettings();
    mp.updateMe({ car: settings.car });
    renderGarage();
    if (race && !race.started) {
      race.racers[0].car = carById(settings.car);
      race.racers.filter(x => x.icon === "ghost").forEach(x => (x.car = race.racers[0].car));
      buildTrack();
    }
  });
}

/* leaderboard */
function syncBoardTabs() {
  $$("#boardMode button").forEach(p => p.classList.toggle("on", p.dataset.v === boardMode));
  $$("#boardPeriod button").forEach(p => p.classList.toggle("on", p.dataset.v === boardPeriod));
  $("#boardPeriod").hidden = boardMode === "daily";
}
$$("#boardMode button").forEach(p => p.onclick = () => { boardMode = p.dataset.v; renderBoard(); });
$$("#boardPeriod button").forEach(p => p.onclick = () => { boardPeriod = p.dataset.v; renderBoard(); });

async function renderBoard() {
  syncBoardTabs();
  const body = $("#boardBody");
  if (!online) {
    body.innerHTML = `<p class="empty">The leaderboard isn't switched on yet.<br>Follow step 2 in the README to connect Supabase.</p>`;
    return;
  }
  body.innerHTML = `<p class="empty">Loading…</p>`;
  const want = boardMode + boardPeriod;
  try {
    const rows = await leaderboard(boardMode, boardMode === "daily" ? "today" : boardPeriod);
    if (want !== boardMode + boardPeriod) return;
    if (!rows.length) { body.innerHTML = `<p class="empty">No scores yet. Be the first.</p>`; return; }
    const me = profile.name.toLowerCase();
    body.innerHTML = `<ol class="board">${rows.map((r, i) => `
      <li class="${me && r.name.toLowerCase() === me ? "me" : ""}">
        <span class="rk">${i + 1}</span><span class="mini">${carSVG(carById(r.car))}</span>
        <span class="nm">${esc(r.name)}</span><span class="wp">${r.wpm}<small>WPM</small></span><span class="ac">${r.acc}%</span>
      </li>`).join("")}</ol>`;
  } catch (e) {
    body.innerHTML = `<p class="empty">Couldn't load the leaderboard.</p>`;
  }
}

/* ---------- multiplayer ---------- */
function roomUI() {
  const code = mp.room();
  $("#roomChip").hidden = !code;
  $("#roomCode").textContent = code || "";
  $("#roomDot").classList.toggle("on", !!code);
}
$("#roomChip").onclick = () => openModal("mp");

function renderLobby() {
  const body = $("#mpBody");
  if (!online) {
    body.innerHTML = `<p class="empty">Live rooms need the free Supabase setup first.<br>See step 2 in the README.</p>`;
    return;
  }
  if (!mp.room()) {
    body.innerHTML = `
      <p class="sub">Make a room, send the link, race your friends live.</p>
      <button class="btn accent full" id="mpCreate">${icon("flag")}create a room</button>
      <div class="or">or join one</div>
      <div class="joinrow"><input class="field" id="mpCode" maxlength="4" placeholder="CODE" autocomplete="off"><button class="btn small" id="mpJoin">join</button></div>`;
    $("#mpCreate").onclick = () => withName(() => enterRoom(mp.newCode()));
    const join = () => {
      const c = $("#mpCode").value.trim().toUpperCase();
      if (/^[A-Z]{4}$/.test(c)) withName(() => enterRoom(c));
      else toast("Room codes are 4 letters");
    };
    $("#mpJoin").onclick = join;
    $("#mpCode").addEventListener("keydown", e => { if (e.key === "Enter") join(); });
    return;
  }
  const list = mp.players(), host = mp.isHost();
  body.innerHTML = `
    <div class="roomcode"><div><span>room code</span><br><b>${mp.room()}</b></div><button class="btn small" id="mpCopy">${icon("link")}copy invite</button></div>
    <ul class="players">${list.map((p, i) => `<li><span class="mini">${carSVG(carById(p.car))}</span><span>${esc(p.name)}${p.id === profile.id ? " (you)" : ""}</span>${i === 0 ? `<em>${icon("crown")}host</em>` : ""}</li>`).join("")}</ul>
    ${host
      ? `<div class="lobby-len"><div class="seg small" id="mpLen">${["sprint", "race", "marathon"].map(l => `<button class="${l === mpLength ? "on" : ""}" data-l="${l}">${l}</button>`).join("")}</div></div>
         <button class="btn accent full" id="mpStart">${icon("flag")}start race</button>`
      : `<p class="sub" style="text-align:center">Waiting for the host to start…</p>`}
    <div class="center"><button class="link" id="mpLeave">leave room</button></div>`;
  $("#mpCopy").onclick = async () => {
    const url = `${location.origin}${location.pathname}?room=${mp.room()}`;
    try { await navigator.clipboard.writeText(url); toast("Invite link copied"); } catch (e) { toast(url, 5000); }
  };
  $$("#mpLen button").forEach(p => p.onclick = () => { mpLength = p.dataset.l; renderLobby(); });
  if (host) $("#mpStart").onclick = () => mp.send("start", { text: makeText("words", mpLength), length: mpLength });
  $("#mpLeave").onclick = leaveRoom;
}

async function enterRoom(code) {
  openModal("mp");
  $("#mpBody").innerHTML = `<p class="empty">Joining ${code}…</p>`;
  try {
    await mp.joinRoom(code, { id: profile.id, name: profile.name, car: settings.car }, {
      players: () => { if ($("#m-mp").classList.contains("show")) renderLobby(); },
      start: startMpRace,
      progress: ({ id, p }) => {
        const x = race && race.kind === "mp" && race.racers.find(r => r.id === id && !r.you);
        if (x && !x.lane.classList.contains("done")) x.p = Math.min(1, p);
      },
      finish: ({ id, time, wpm }) => {
        const x = race && race.kind === "mp" && race.racers.find(r => r.id === id && !r.you);
        if (!x) return;
        x.p = 1; x.finT = time; x.wpm = wpm;
        x.lane.querySelector(".tag").insertAdjacentHTML("beforeend", `<span class="w">${wpm}</span>`);
        markDone(x);
      },
    });
    const u = new URL(location.href);
    u.searchParams.set("room", code);
    history.replaceState(null, "", u);
  } catch (e) {
    await mp.leaveRoom();
    toast("Couldn't join that room");
  }
  roomUI();
  renderLobby();
}

async function leaveRoom() {
  await mp.leaveRoom();
  const u = new URL(location.href);
  u.searchParams.delete("room");
  history.replaceState(null, "", u);
  roomUI();
  closeModals();
  if (race && race.kind === "mp") newRace(); else focusInput();
}

function startMpRace({ text, length }) {
  closeModals();
  closeResults();
  audio.engineStop();
  race = makeRace(text, { kind: "mp", length, content: "words", daily: false, eligible: false, pbKey: `words-${length}`, live: false });
  race.racers = [
    meRacer(),
    ...mp.players().filter(p => p.id !== profile.id)
      .map(p => ({ id: p.id, name: p.name, car: carById(p.car), remote: true, p: 0 })),
  ];
  setupScreen();
  const r = race;
  startLights(() => {
    if (race !== r) return;
    r.live = true;
    typebox.classList.remove("waiting");
    startClock();
    paint();
    focusInput();
  });
}

// F1-style start: three red lights, then green.
function startLights(go) {
  const el = $("#lights"), bulbs = [...el.children];
  el.classList.remove("go");
  bulbs.forEach(b => b.classList.remove("red"));
  el.classList.add("show");
  let n = 0;
  const step = () => {
    if (n < bulbs.length) {
      bulbs[n++].classList.add("red");
      audio.sfx.beep(false);
      setTimeout(step, 800);
    } else {
      bulbs.forEach(b => b.classList.remove("red"));
      el.classList.add("go");
      audio.sfx.beep(true);
      go();
      setTimeout(() => el.classList.remove("show"), 450);
    }
  };
  setTimeout(step, 300);
}

/* ---------- keyboard + focus ---------- */
document.addEventListener("keydown", e => {
  audio.unlock();
  if (modalOpen()) {
    if (e.key === "Escape") { e.preventDefault(); closeModals(); focusInput(); }
    return;
  }
  const k = kb.keyFromEvent(e.key);
  if (k && !e.ctrlKey && !e.metaKey && !e.altKey) { kb.press(k); lastPhysical = performance.now(); }
  lastKey = performance.now();

  const inMpRace = race && race.kind === "mp" && !race.done;
  if (e.key === "Tab") {
    e.preventDefault();
    if (!inMpRace) again();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    if (race.kind === "mp") { if (race.done) again(); }
    else newRace(race.text);
    return;
  }
  if (e.key === "Enter" && resultsOpen()) { e.preventDefault(); again(); return; }
  if (!resultsOpen() && document.activeElement !== inp && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) focusInput();
});
document.addEventListener("keyup", e => {
  const k = kb.keyFromEvent(e.key);
  if (k) kb.release(k);
  if (e.key === "Shift") kb.release("shift");
});
window.addEventListener("blur", kb.releaseAll);
document.addEventListener("pointerdown", audio.unlock);

typebox.addEventListener("click", () => inp.focus());
inp.addEventListener("focus", () => typebox.classList.remove("blurred"));
inp.addEventListener("blur", () => setTimeout(() => {
  if (document.activeElement !== inp && race && !race.done) typebox.classList.add("blurred");
}, 120));

/* ---------- start ---------- */
$("#brandMark").outerHTML = markSVG();
$("#footMark").outerHTML = markSVG();
$$("[data-icon]").forEach(el => el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon)));
$("#meter").innerHTML = "<i></i>".repeat(NITRO_EVERY);
buildGauge();
kb.build($("#kb"));
applyTheme();
applySound();
const startUnlocks = checkUnlocks(progress(), profile.unlocked);
if (startUnlocks.length) { startUnlocks.forEach(c => profile.unlocked.push(c.id)); saveProfile(); }
if (!profile.unlocked.includes(settings.car)) settings.car = "starter";
newRace();
roomUI();
requestAnimationFrame(tick);

const invite = new URLSearchParams(location.search).get("room");
if (invite && online && /^[A-Za-z]{4}$/.test(invite)) withName(() => enterRoom(invite.toUpperCase()));
