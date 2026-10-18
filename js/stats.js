// The stats page: totals, a WPM chart of recent races, and bests per text type.
import { runs, dayStreak } from "./store.js";

const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const CONTENT_LABELS = { words: "words", quotes: "quotes", slang: "slang", code: "code", punct: "punct." };

function chart(list) {
  const W = 600, H = 190, L = 34, R = 14, T = 12, B = 22;
  const vals = list.map(r => r.wpm);
  const top = Math.max(40, Math.ceil((Math.max(...vals) * 1.15) / 40) * 40);
  const x = i => L + (list.length === 1 ? (W - L - R) / 2 : (i / (list.length - 1)) * (W - L - R));
  const y = v => T + (1 - v / top) * (H - T - B);
  const step = top / 4;
  let grid = "";
  for (let v = 0; v <= top; v += step) {
    grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`;
  }
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = vals.length - 1;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="wpm over your last ${vals.length} races">
    ${grid}
    <polyline class="ln" points="${pts}"/>
    ${vals.map((v, i) => `<circle class="dt${i === last ? " last" : ""}" cx="${x(i)}" cy="${y(v)}" r="${i === last ? 5 : 3}"><title>${v} wpm</title></circle>`).join("")}
    <text x="${x(last)}" y="${y(vals[last]) - 12}" text-anchor="${list.length > 1 ? "end" : "middle"}" class="lbl">${vals[last]}</text>
    <text x="${W - R}" y="${H - 4}" text-anchor="end">last ${vals.length} races →</text>
  </svg>`;
}

export function renderStats(el) {
  if (!runs.length) {
    el.innerHTML = `<p class="empty">no races yet. go type something 🏁</p>`;
    return;
  }
  const recent = runs.slice(-10);
  const best = Math.max(...runs.map(r => r.wpm));
  const words = Math.round(runs.reduce((s, r) => s + (r.chars || 0), 0) / 5);
  const streak = dayStreak();
  const tiles = [
    [runs.length, "races"],
    [best, "best wpm"],
    [Math.round(avg(recent.map(r => r.wpm))), "avg wpm (last 10)"],
    [Math.round(avg(recent.map(r => r.acc))) + "%", "avg accuracy"],
    [`${streak} 🔥`, "day streak"],
    [words.toLocaleString(), "words typed"],
  ];
  const bests = Object.entries(CONTENT_LABELS).map(([k, label]) => {
    const list = runs.filter(r => r.content === k);
    return [list.length ? Math.max(...list.map(r => r.wpm)) : "—", label];
  });
  el.innerHTML = `
    <div class="tiles">${tiles.map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join("")}</div>
    <div class="h3">wpm over time</div>
    ${chart(runs.slice(-30))}
    <div class="h3">best by text type</div>
    <div class="tiles five">${bests.map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join("")}</div>`;
}
