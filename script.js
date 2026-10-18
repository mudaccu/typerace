const WORDS = ("the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is was are been has had did said each tell does set three air play small end put home read hand port large spell add land here must big high such follow act why ask men change went light kind off need house picture try again animal point mother world near build self earth father head stand own page should country found answer school grow study still learn plant cover food sun four between state keep eye never last let thought city tree cross farm hard start might story saw far sea draw left late run while press close night real life few north open seem together next white children begin got walk example ease paper group always music those both mark often letter until mile river car feet care second book carry took science eat room friend began idea fish mountain stop once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure door product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass since top whole king space heard best hour better true during hundred five remember step early hold west ground interest reach fast verb sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map rain rule govern pull cold notice voice unit power town fine certain fly fall lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop ocean warm free minute strong special mind behind clear tail produce fact street inch multiply nothing course stay wheel full force blue object decide surface deep moon island foot system busy test record boat common gold possible plane stead dry wonder laugh thousand ago ran check game shape equate miss brought heat snow tire bring yes distant fill east paint language among").split(" ");

const MODES = { sprint: 15, race: 30, marathon: 55 };
const BOTS = [
  { name: "grandma.exe", emoji: "🐢", wpm: 28, color: "var(--c1)" },
  { name: "npc", emoji: "🤖", wpm: 46, color: "var(--c2)" },
  { name: "tryhard", emoji: "💀", wpm: 74, color: "var(--c3)" },
];

const $ = s => document.querySelector(s);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

const inp = $("#inp"), textEl = $("#text"), track = $("#track"), typebox = $("#typebox");
let mode = store.get("tr_mode") || "race";
let target = "", typed = "", chars = [], base = [];
let started = false, done = false, t0 = 0, errors = 0, keys = 0;
let racers = [], pb = +(store.get("tr_pb") || 0);
let shownWpm = 0, lastStat = 0, roadOff = 0, lastFrame = 0, lastKey = 0;

/* ---------- theme ---------- */
const savedTheme = store.get("tr_theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$("#theme").onclick = () => {
  const cur = document.documentElement.dataset.theme
    || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  store.set("tr_theme", next);
  inp.focus();
};

/* ---------- modes ---------- */
document.querySelectorAll(".pill").forEach(p => {
  p.classList.toggle("on", p.dataset.mode === mode);
  p.onclick = () => {
    mode = p.dataset.mode; store.set("tr_mode", mode);
    document.querySelectorAll(".pill").forEach(x => x.classList.toggle("on", x === p));
    newRace();
  };
});

/* ---------- race setup ---------- */
const carSVG = `<svg viewBox="0 0 64 28" aria-hidden="true">
  <path d="M6 22 Q4 22 4 19 V15 Q4 12 8 11.5 L18 10 L25 4 Q26.5 3 29 3 H41 Q44 3 46 5 L51 10 L57 11 Q61 12 61 16 V19 Q61 22 58 22 Z" fill="currentColor"/>
  <path d="M27 6 H34 V10 H22.5 Z M37 6 H42 Q43.5 6 44.5 7.5 L47 10 H37 Z" fill="var(--surface)" opacity=".75"/>
  <circle cx="17" cy="22" r="5" fill="var(--ink)"/><circle cx="17" cy="22" r="2" fill="var(--surface)"/>
  <circle cx="48" cy="22" r="5" fill="var(--ink)"/><circle cx="48" cy="22" r="2" fill="var(--surface)"/>
</svg>`;

function pickWords(n) {
  const out = [];
  while (out.length < n) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (w && w !== out[out.length - 1]) out.push(w);
  }
  return out.join(" ");
}

function newRace() {
  target = pickWords(MODES[mode]);
  typed = ""; inp.value = "";
  started = false; done = false; errors = 0; keys = 0; shownWpm = 0;

  racers = [{ name: "you", emoji: "", color: "var(--c-you)", you: true, p: 0 }];
  BOTS.forEach(b => racers.push({ ...b, wpm: Math.round(b.wpm * (0.9 + Math.random() * 0.2)), p: 0 }));
  if (pb) racers.push({ name: "your pb", emoji: "👻", wpm: pb, color: "var(--c-you)", ghost: true, p: 0 });
  racers.forEach(r => { if (!r.you) r.finT = (target.length / (r.wpm * 5)) * 60; });

  track.querySelectorAll(".lane").forEach(l => l.remove());
  racers.forEach(r => {
    const lane = document.createElement("div");
    lane.className = "lane";
    lane.innerHTML = `<span class="tag">${r.emoji ? r.emoji + " " : ""}${r.name}${r.wpm ? ` <span class="w">${r.wpm}</span>` : ""}</span>
      <div class="car${r.ghost ? " ghost" : ""}" style="--c:${r.color}">${carSVG}</div>`;
    track.appendChild(lane);
    r.lane = lane; r.car = lane.querySelector(".car");
  });

  renderText();
  setStats(0, 100, 0);
  $("#pb").textContent = pb ? pb : "—";
  $("#results").classList.remove("show");
  track.classList.remove("moving");
  inp.focus();
}

function renderText() {
  let html = "", i = 0;
  const words = target.split(" ");
  words.forEach((w, wi) => {
    html += '<span class="w">';
    for (const ch of w) { html += `<span class="c">${ch}</span>`; i++; }
    html += "</span>";
    if (wi < words.length - 1) { html += '<span class="c sp"> </span>'; i++; }
  });
  textEl.innerHTML = html;
  chars = [...textEl.querySelectorAll(".c")];
  base = chars.map(c => c.className);
  textEl.scrollTop = 0;
  paint();
}

function paint() {
  for (let i = 0; i < chars.length; i++) {
    let cls = base[i];
    if (i < typed.length) cls += typed[i] === target[i] ? " ok" : " bad";
    if (i === typed.length) cls += " cur";
    if (chars[i].className !== cls) chars[i].className = cls;
  }
  const cur = chars[Math.min(typed.length, chars.length - 1)];
  if (cur) {
    const lineH = parseFloat(getComputedStyle(textEl).lineHeight);
    textEl.scrollTop = Math.max(0, cur.offsetTop - textEl.offsetTop - lineH);
  }
}

function correctLen() {
  let i = 0;
  while (i < typed.length && typed[i] === target[i]) i++;
  return i;
}

/* ---------- input ---------- */
inp.addEventListener("input", () => {
  if (done) { inp.value = typed; return; }
  let v = inp.value.replace(/\n/g, "");
  // don't let typos run away too far past the last correct letter
  const cl = correctLen();
  if (v.length > cl + 12) v = v.slice(0, cl + 12);
  if (v.length > target.length) v = v.slice(0, target.length);

  if (!started && v.length) { started = true; t0 = performance.now(); track.classList.add("moving"); }
  for (let i = typed.length; i < v.length; i++) { keys++; if (v[i] !== target[i]) errors++; }

  typed = v; inp.value = v;
  lastKey = performance.now();
  typebox.classList.add("typing");
  paint();
  if (typed === target) finish();
});

document.addEventListener("keydown", e => {
  if (e.key === "Tab") { e.preventDefault(); newRace(); return; }
  if (e.key === "Escape") { e.preventDefault(); restartSame(); return; }
  if (e.key === "Enter" && $("#results").classList.contains("show")) { e.preventDefault(); newRace(); return; }
  if (document.activeElement !== inp && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1 && !done) inp.focus();
});

function restartSame() {
  const t = target; newRace();
  target = t; racers.forEach(r => { if (!r.you) r.finT = (target.length / (r.wpm * 5)) * 60; });
  renderText();
}

typebox.addEventListener("click", () => inp.focus());
inp.addEventListener("focus", () => typebox.classList.remove("blurred"));
inp.addEventListener("blur", () => setTimeout(() => {
  if (document.activeElement !== inp && !done) typebox.classList.add("blurred");
}, 120));

/* ---------- loop ---------- */
function setStats(wpm, acc, secs) {
  $("#wpm").textContent = Math.round(wpm);
  $("#acc").textContent = Math.round(acc);
  $("#time").textContent = secs.toFixed(1);
}

function tick(now) {
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  lastFrame = now;

  if (now - lastKey > 500) typebox.classList.remove("typing");

  if (started && !done) {
    const secs = (now - t0) / 1000;
    const cl = correctLen();
    const wpm = secs > 0.4 ? (cl / 5) / (secs / 60) : 0;
    shownWpm += (wpm - shownWpm) * 0.15;
    racers.forEach(r => {
      r.p = r.you ? cl / target.length : Math.min(1, secs / r.finT);
      if (!r.you && r.p >= 1 && !r.lane.classList.contains("done")) markDone(r);
    });
    roadOff -= shownWpm * dt * 4;
    track.style.setProperty("--off", roadOff + "px");
    if (now - lastStat > 90) {
      lastStat = now;
      setStats(shownWpm, keys ? ((keys - errors) / keys) * 100 : 100, secs);
    }
  }

  racers.forEach(r => {
    const max = r.lane.clientWidth - r.car.offsetWidth - 14;
    r.x = r.x == null ? 0 : r.x + (r.p * max - r.x) * 0.25; // ease toward target
    r.car.style.transform = `translateX(${r.x}px)`;
  });

  requestAnimationFrame(tick);
}

function ordinal(n) { return n + ({ 1: "st", 2: "nd", 3: "rd" }[n] || "th"); }

function markDone(r) {
  const finishedBefore = racers.filter(x => x.lane.classList.contains("done")).length;
  r.lane.dataset.place = ordinal(finishedBefore + 1);
  r.lane.classList.add("done");
}

/* ---------- finish ---------- */
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

function finish() {
  done = true;
  const secs = (performance.now() - t0) / 1000;
  const wpm = Math.round((target.length / 5) / (secs / 60));
  const acc = keys ? Math.round(((keys - errors) / keys) * 100) : 100;
  const you = racers[0];
  you.p = 1; markDone(you);
  track.classList.remove("moving");
  setStats(wpm, acc, secs);

  const place = 1 + racers.filter(r => !r.you && r.finT < secs).length;
  const isPb = wpm > pb;
  if (isPb) { pb = wpm; store.set("tr_pb", pb); $("#pb").textContent = pb; }

  $("#r-place").textContent = place === 1 ? "you placed 1st 🏆" : `you placed ${ordinal(place)} of ${racers.length}`;
  $("#r-wpm").textContent = wpm;
  $("#r-pb").textContent = isPb ? "✦ new personal best ✦" : "";
  $("#r-vibe").textContent = VIBES.find(v => wpm < v[0])[1];
  $("#r-acc").textContent = acc + "%";
  $("#r-time").textContent = secs.toFixed(1) + "s";
  $("#r-err").textContent = errors;
  lastResult = { wpm, acc, place };
  inp.blur();
  setTimeout(() => $("#results").classList.add("show"), 450);
}

let lastResult = null;
$("#again").onclick = newRace;
$("#share").onclick = async () => {
  if (!lastResult) return;
  const msg = `just hit ${lastResult.wpm} wpm (${lastResult.acc}% acc) and placed ${ordinal(lastResult.place)} on typerace 🏎️💨 think u can beat me? ${location.href}`;
  try {
    if (navigator.share) await navigator.share({ text: msg });
    else { await navigator.clipboard.writeText(msg); $("#share").textContent = "copied ✓"; setTimeout(() => $("#share").textContent = "share flex", 1500); }
  } catch (e) {}
};

newRace();
requestAnimationFrame(tick);
