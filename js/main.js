import { makeText, dailyText, todayKey } from "./words.js";
import { settings, saveSettings, profile, saveProfile, runs, addRun, dayStreak } from "./store.js";
import * as audio from "./audio.js";
import { CARS, carSVG, carById, checkUnlocks } from "./cars.js";
import { renderStats } from "./stats.js";
import { shareCard } from "./share.js";
import { online, leaderboard, topGhost, submit, rankToday } from "./online.js";
import * as mp from "./multiplayer.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const inp = $("#inp"), textEl = $("#text"), track = $("#track"), typebox = $("#typebox");

const BOTS = [
  { name: "grandma.exe", emoji: "🐢", wpm: 28, color: "var(--c1)" },
  { name: "npc", emoji: "🤖", wpm: 46, color: "var(--c2)" },
  { name: "tryhard", emoji: "💀", wpm: 74, color: "var(--c3)" },
];
const VIBES = [
  [20, "touch keyboard. then grass. 🌱"],
  [35, "warming up era ☕"],
  [50, "mid but make it cute ✨"],
  [65, "kinda fast ngl 👀"],
  [80, "main character energy 💅"],
  [100, "keyboard demon unlocked 😈"],
  [130, "are you even human?? 🤖"],
  [Infinity, "literally a speedrun 🏆"],
];
const CONTENT_LABEL = { words: "words", quotes: "quotes", slang: "slang", code: "code", punct: "punctuation" };
const NITRO_EVERY = 10;   // clean words in a row
const NITRO_MS = 2500;
const NAME_RE = /^[\p{L}\p{N}_ .-]{1,16}$/u;

let race = null, chars = [], base = [];
let shownWpm = 0, lastStat = 0, roadOff = 0, lastFrame = 0, lastKey = 0, lastSend = 0;
let lastResult = null, mpLength = "race", afterName = null;
let boardMode = "race", boardPeriod = "today";
const ghostCache = {};

/* ---------- small helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ordinal = n => n + ({ 1: "st", 2: "nd", 3: "rd" }[n] || "th");
const correctLen = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
const modalOpen = () => !!$(".modal.show");

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
  $("#sound").textContent = settings.muted ? "🔇" : "🔊";
}
$("#sound").onclick = () => { settings.muted = !settings.muted; saveSettings(); applySound(); focusInput(); };

/* ---------- mode controls ---------- */
function syncControls() {
  $$("#contentPills .pill").forEach(p => p.classList.toggle("on", p.dataset.content === settings.content));
  $$("#lengthPills .pill").forEach(p => p.classList.toggle("on", p.dataset.length === settings.length));
  $("#daily").classList.toggle("on", settings.daily);
  $("#controls").classList.toggle("is-daily", settings.daily);
}
$$("#contentPills .pill").forEach(p => p.onclick = () => {
  settings.content = p.dataset.content; settings.daily = false; saveSettings(); newRace();
});
$$("#lengthPills .pill").forEach(p => p.onclick = () => {
  settings.length = p.dataset.length; settings.daily = false; saveSettings(); newRace();
});
$("#daily").onclick = () => { settings.daily = !settings.daily; saveSettings(); newRace(); };

function updateHint() {
  const el = $("#hintRank");
  if (race.kind === "mp") el.textContent = "👥 live race";
  else if (race.daily) el.textContent = `📅 daily challenge · ${race.day}`;
  else if (online) el.textContent = race.eligible ? "🌍 counts for the leaderboard" : "practice mode";
  else el.textContent = "";
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
  if (pb) race.racers.push({ name: "your pb", emoji: "👻", wpm: pb, car: carById(settings.car), ghost: true, p: 0 });
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
  const ghost = { name: `#1 ${g.name}`, emoji: "🌍", wpm: g.wpm, car: carById(g.car), ghost: true, replay: g.timeline, ri: 0, p: 0 };
  setFinishTime(ghost);
  r.racers.push(ghost);
  buildTrack();
}

function buildTrack() {
  track.querySelectorAll(".lane").forEach(l => l.remove());
  for (const r of race.racers) {
    const lane = document.createElement("div");
    lane.className = "lane";
    const label = r.you
      ? (race.kind === "mp" ? `${esc(profile.name)} (you)` : "you")
      : `${r.emoji ? r.emoji + " " : ""}${esc(r.name)}${r.wpm ? ` <span class="w">${r.wpm}</span>` : ""}`;
    lane.innerHTML = `<span class="tag">${label}</span><div class="car${r.ghost ? " ghost" : ""}${r.you ? " me" : ""}">${carSVG(r.car || { color: r.color })}</div>`;
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
}

function setStats(wpm, acc, secs) {
  $("#wpm").textContent = Math.round(wpm);
  $("#acc").textContent = Math.round(acc);
  $("#time").textContent = secs.toFixed(1);
}

function setCombo() {
  const boosting = race.nitroUntil > performance.now();
  $("#combo").textContent = race.combo;
  $("#combo").classList.toggle("hot", boosting);
  $("#meter").style.width = boosting ? "100%" : ((race.combo % NITRO_EVERY) / NITRO_EVERY) * 100 + "%";
}

function resetStats() {
  setStats(0, 100, 0);
  setCombo();
  $("#pb").textContent = profile.pb[race.pbKey] || "—";
}

function focusInput() {
  if (!modalOpen() && !$("#results").classList.contains("show")) inp.focus();
}

/* ---------- typing ---------- */
inp.addEventListener("beforeinput", e => {
  if (e.inputType === "insertFromPaste" || e.inputType === "insertFromDrop") {
    e.preventDefault();
    toast("no pasting, nice try 😭");
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

  let gotError = false;
  for (let i = r.typed.length; i < v.length; i++) {
    r.keys++;
    if (v[i] !== r.text[i]) { r.errors++; gotError = true; }
  }
  const added = v.length > r.typed.length;
  r.typed = v;
  inp.value = v;

  // when each character was first typed correctly (used for ghosts + anti-cheat)
  const now = Math.round(performance.now() - r.t0);
  const cl = correctLen(v, r.text);
  while (r.maxCorrect < cl) r.times[r.maxCorrect++] = now;

  if (gotError) { r.combo = 0; r.errAtWord = r.errors; audio.sfx.error(); }
  else if (added) audio.sfx.key();

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
  race.boost = 48;
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
  r.lane.dataset.place = ordinal(place);
  r.lane.classList.add("done");
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

  if (r.started && !r.done) {
    const ms = now - r.t0, secs = ms / 1000;
    const cl = correctLen(r.typed, r.text);
    const wpm = secs > 0.4 ? (cl / 5) / (secs / 60) : 0;
    shownWpm += (wpm - shownWpm) * 0.15;
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
    const max = x.lane.clientWidth - x.carEl.offsetWidth - 14;
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
  const placeText = place === 1 ? "you placed 1st 🏆" : `you placed ${ordinal(place)} of ${r.racers.length}`;
  lastResult = { wpm, acc, secs, nitros: r.nitros, placeText, vibe, car: carById(settings.car), label: modeLabel(r) };

  $("#r-place").textContent = placeText;
  $("#r-wpm").textContent = wpm;
  $("#r-pb").textContent = isPb ? "✦ new personal best ✦" : "";
  $("#r-vibe").textContent = vibe;
  $("#r-acc").textContent = acc + "%";
  $("#r-time").textContent = secs.toFixed(1) + "s";
  $("#r-err").textContent = r.errors;
  $("#r-extra").textContent = `🔥 ${r.nitros} nitro${r.nitros === 1 ? "" : "s"} · best combo ${r.bestCombo} words`;
  $("#r-unlocks").innerHTML = fresh.map(c => `<div class="unlock">${carSVG(c)}<span>🔓 unlocked <b>${esc(c.name)}</b>, check the garage</span></div>`).join("");
  if (fresh.length) setTimeout(audio.sfx.unlock, 700);
  $("#again").textContent = r.kind === "mp" ? "back to lobby ↵" : "run it back ↵";
  $("#share").textContent = "share card";
  onlineLine(r, wpm, acc);
  inp.blur();
  setTimeout(() => { if (race === r) $("#results").classList.add("show"); }, 450);
}

function onlineLine(r, wpm, acc) {
  const el = $("#r-online");
  el.textContent = "";
  if (r.flagged) { el.textContent = "paste detected, this run doesn't count 🚫"; return; }
  if (!online || r.kind === "mp") return;
  if (!r.eligible) { el.textContent = "practice mode · leaderboard is words + daily only"; return; }
  if (!profile.name) {
    el.innerHTML = `<button class="link" id="postBtn">🌍 post this to the leaderboard</button>`;
    $("#postBtn").onclick = () => askName(() => { $("#results").classList.add("show"); postScore(r, wpm, acc); });
    return;
  }
  postScore(r, wpm, acc);
}

async function postScore(r, wpm, acc) {
  const el = $("#r-online");
  el.textContent = "posting to the leaderboard…";
  try {
    await submit({ name: profile.name, mode: r.board, text: r.text, times: r.times, acc, car: settings.car, day: r.day });
    delete ghostCache[r.board];
    const rank = await rankToday(r.board, wpm);
    el.textContent = `🌍 you're #${rank} today on the ${r.board} board`;
  } catch (e) {
    el.textContent = `couldn't post: ${e.message}`;
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
  const b = $("#share");
  b.textContent = "making card…";
  try {
    const how = await shareCard(lastResult);
    b.textContent = how === "downloaded" ? "saved ✓" : "shared ✓";
  } catch (e) {
    b.textContent = "share card";
  }
};

/* ---------- modals ---------- */
const RENDER = { garage: renderGarage, stats: () => renderStats($("#statsBody")), board: renderBoard, mp: renderLobby };

function openModal(id) {
  closeModals();
  $("#m-" + id).classList.add("show");
  inp.blur();
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
  if (!NAME_RE.test(v)) { toast("letters, numbers, spaces, _ . - only (max 16)"); return; }
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
    return `<button class="slot${has ? "" : " locked"}${on ? " on" : ""}" data-car="${c.id}"${has ? "" : " disabled"}>
      ${carSVG(c)}<b>${esc(c.name)}</b><span>${has ? (on ? "driving ✓" : "tap to drive") : "🔒 " + esc(c.how)}</span></button>`;
  }).join("");
  $$("#garageGrid .slot:not(.locked)").forEach(s => s.onclick = () => {
    settings.car = s.dataset.car;
    saveSettings();
    mp.updateMe({ car: settings.car });
    renderGarage();
    if (race && !race.started) {
      race.racers[0].car = carById(settings.car);
      race.racers.filter(x => x.name === "your pb").forEach(x => x.car = race.racers[0].car);
      buildTrack();
    }
  });
}

/* leaderboard */
function syncBoardTabs() {
  $$("#boardMode .pill").forEach(p => p.classList.toggle("on", p.dataset.v === boardMode));
  $$("#boardPeriod .pill").forEach(p => p.classList.toggle("on", p.dataset.v === boardPeriod));
  $("#boardPeriod").hidden = boardMode === "daily";
}
$$("#boardMode .pill").forEach(p => p.onclick = () => { boardMode = p.dataset.v; renderBoard(); });
$$("#boardPeriod .pill").forEach(p => p.onclick = () => { boardPeriod = p.dataset.v; renderBoard(); });

async function renderBoard() {
  syncBoardTabs();
  const body = $("#boardBody");
  if (!online) {
    body.innerHTML = `<p class="empty">the leaderboard isn't switched on yet.<br>follow step 2 in the README to connect supabase (free, ~10 min).</p>`;
    return;
  }
  body.innerHTML = `<p class="empty">loading…</p>`;
  const want = boardMode + boardPeriod;
  try {
    const rows = await leaderboard(boardMode, boardMode === "daily" ? "today" : boardPeriod);
    if (want !== boardMode + boardPeriod) return;
    if (!rows.length) { body.innerHTML = `<p class="empty">no scores yet. be the first 👀</p>`; return; }
    const me = profile.name.toLowerCase();
    body.innerHTML = `<ol class="board">${rows.map((r, i) => `
      <li class="${me && r.name.toLowerCase() === me ? "me" : ""}">
        <span class="rk">${i + 1}</span><span class="mini">${carSVG(carById(r.car))}</span>
        <span class="nm">${esc(r.name)}</span><span class="wp">${r.wpm}<small>wpm</small></span><span class="ac">${r.acc}%</span>
      </li>`).join("")}</ol>`;
  } catch (e) {
    body.innerHTML = `<p class="empty">couldn't load the leaderboard 😵</p>`;
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
    body.innerHTML = `<p class="empty">live rooms need the free supabase setup first.<br>see step 2 in the README.</p>`;
    return;
  }
  if (!mp.room()) {
    body.innerHTML = `
      <p class="sub">make a room, send the link, race your friends live.</p>
      <button class="btn primary full" id="mpCreate">create a room</button>
      <div class="or">or join one</div>
      <div class="joinrow"><input class="field" id="mpCode" maxlength="4" placeholder="CODE" autocomplete="off"><button class="btn small" id="mpJoin">join</button></div>`;
    $("#mpCreate").onclick = () => withName(() => enterRoom(mp.newCode()));
    const join = () => {
      const c = $("#mpCode").value.trim().toUpperCase();
      if (/^[A-Z]{4}$/.test(c)) withName(() => enterRoom(c));
      else toast("room codes are 4 letters");
    };
    $("#mpJoin").onclick = join;
    $("#mpCode").addEventListener("keydown", e => { if (e.key === "Enter") join(); });
    return;
  }
  const list = mp.players(), host = mp.isHost();
  body.innerHTML = `
    <div class="roomcode"><span>room</span><b>${mp.room()}</b><button class="btn small" id="mpCopy">copy invite link</button></div>
    <ul class="players">${list.map((p, i) => `<li><span class="mini">${carSVG(carById(p.car))}</span><span>${esc(p.name)}${p.id === profile.id ? " (you)" : ""}</span>${i === 0 ? "<em>host</em>" : ""}</li>`).join("")}</ul>
    ${host
      ? `<div class="pills center" id="mpLen">${["sprint", "race", "marathon"].map(l => `<button class="pill${l === mpLength ? " on" : ""}" data-l="${l}">${l}</button>`).join("")}</div>
         <button class="btn primary full" id="mpStart">start race 🏁</button>`
      : `<p class="sub">waiting for the host to start…</p>`}
    <button class="link" id="mpLeave">leave room</button>`;
  $("#mpCopy").onclick = async () => {
    const url = `${location.origin}${location.pathname}?room=${mp.room()}`;
    try { await navigator.clipboard.writeText(url); toast("invite link copied 🔗"); } catch (e) { toast(url, 5000); }
  };
  $$("#mpLen .pill").forEach(p => p.onclick = () => { mpLength = p.dataset.l; renderLobby(); });
  if (host) $("#mpStart").onclick = () => mp.send("start", { text: makeText("words", mpLength), length: mpLength });
  $("#mpLeave").onclick = leaveRoom;
}

async function enterRoom(code) {
  openModal("mp");
  $("#mpBody").innerHTML = `<p class="empty">joining ${code}…</p>`;
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
        x.lane.querySelector(".tag").insertAdjacentHTML("beforeend", ` <span class="w">${wpm}</span>`);
        markDone(x);
      },
    });
    const u = new URL(location.href);
    u.searchParams.set("room", code);
    history.replaceState(null, "", u);
  } catch (e) {
    await mp.leaveRoom();
    toast("couldn't join that room 😵");
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
  countdown(() => {
    if (race !== r) return;
    r.live = true;
    typebox.classList.remove("waiting");
    startClock();
    focusInput();
  });
}

function countdown(go) {
  const el = $("#countdown");
  let n = 3;
  const step = () => {
    el.className = "countdown";
    void el.offsetWidth;
    if (n > 0) {
      el.textContent = n;
      el.className = "countdown show pop";
      audio.sfx.beep(false);
      n--;
      setTimeout(step, 800);
    } else {
      el.textContent = "go!";
      el.className = "countdown show pop go";
      audio.sfx.beep(true);
      go();
      setTimeout(() => (el.className = "countdown"), 500);
    }
  };
  step();
}

/* ---------- keyboard + focus ---------- */
document.addEventListener("keydown", e => {
  audio.unlock();
  if (modalOpen()) {
    if (e.key === "Escape") { e.preventDefault(); closeModals(); focusInput(); }
    return;
  }
  const resultsUp = $("#results").classList.contains("show");
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
  if (e.key === "Enter" && resultsUp) { e.preventDefault(); again(); return; }
  if (!resultsUp && document.activeElement !== inp && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) focusInput();
});
document.addEventListener("pointerdown", audio.unlock);

typebox.addEventListener("click", () => inp.focus());
inp.addEventListener("focus", () => typebox.classList.remove("blurred"));
inp.addEventListener("blur", () => setTimeout(() => {
  if (document.activeElement !== inp && race && !race.done) typebox.classList.add("blurred");
}, 120));

/* ---------- start ---------- */
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
