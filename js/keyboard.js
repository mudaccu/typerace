// The little on-screen keyboard: lights up the keys you press, points at the next key,
// shakes the wrong one, and has a face on the spacebar that reacts to how you're doing.
import { icon } from "./icons.js";

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "bksp"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  ["space"],
];
const SHIFTED = { '"': "'", ":": ";", "?": "/", "<": ",", ">": "." };

const FACE = `<svg class="face" viewBox="0 0 60 20" aria-hidden="true">
  <ellipse class="cheek" cx="17.5" cy="12.4" rx="3.2" ry="1.9"/><ellipse class="cheek" cx="42.5" cy="12.4" rx="3.2" ry="1.9"/>
  <g class="m idle"><circle cx="24" cy="8" r="1.8"/><circle cx="36" cy="8" r="1.8"/><path class="st" d="M27.4 12.2Q30 14.8 32.6 12.2"/></g>
  <g class="m happy"><path class="st" d="M21.8 9.2Q24 5.6 26.2 9.2M33.8 9.2Q36 5.6 38.2 9.2"/><path d="M26.4 11.4Q30 18 33.6 11.4Z"/></g>
  <g class="m oops"><path class="st" d="M22.5 6.3l3 3M25.5 6.3l-3 3M34.5 6.3l3 3M37.5 6.3l-3 3"/><path class="st" d="M25.8 14q1-1.7 2.1 0t2.1 0 2.1 0 2.1 0"/></g>
  <g class="m nitro"><path class="st" d="M22.3 6l3.4 2.2-3.4 2.2M37.7 6l-3.4 2.2 3.4 2.2"/><path d="M25.2 11Q30 19 34.8 11Z"/></g>
  <g class="m sleep"><path class="st" d="M21.8 8.6h4.4M33.8 8.6h4.4M28.8 13.4h2.4"/><path class="st z" d="M45 2.5h3.2l-3.2 3.6h3.2"/></g>
</svg>`;

let root = null, led = null, mood = "";
const keys = {};
let nextOn = [];

export function keyFor(ch) {
  if (ch === " ") return { k: "space", shift: false };
  if (SHIFTED[ch]) return { k: SHIFTED[ch], shift: true };
  const lower = ch.toLowerCase();
  return { k: lower, shift: ch !== lower };
}

// Turn a KeyboardEvent.key into one of our key names.
export function keyFromEvent(key) {
  if (key === " ") return "space";
  if (key === "Backspace") return "bksp";
  if (key === "Shift") return "shift";
  if (key.length !== 1) return null;
  return keyFor(key).k;
}

const legend = k =>
  k === "bksp" ? icon("backspace") : k === "shift" ? icon("shift") : k === "space" ? FACE : `<span>${k}</span>`;

export function build(el) {
  root = el;
  el.innerHTML =
    `<div class="kb-top"><i class="led"></i><span>typerace mk-1</span><span class="kb-screws"><i></i><i></i></span></div>` +
    ROWS.map(row => `<div class="kb-row">${row.map(k => `<div class="key" data-k="${k}">${legend(k)}</div>`).join("")}</div>`).join("");
  el.querySelectorAll(".key").forEach(n => (keys[n.dataset.k] = n));
  led = el.querySelector(".led");
  setMood("idle");
}

export function press(k) {
  const n = keys[k];
  if (!n) return;
  n.classList.add("down");
  led.classList.remove("on");
  void led.offsetWidth;
  led.classList.add("on");
}
export function release(k) { keys[k]?.classList.remove("down"); }
export function releaseAll() { Object.values(keys).forEach(n => n.classList.remove("down")); }
export function tap(k) { press(k); setTimeout(() => release(k), 110); }

export function wrong(k) {
  const n = keys[k];
  if (!n) return;
  n.classList.remove("wrong");
  void n.offsetWidth;
  n.classList.add("wrong");
  clearTimeout(n.wrongTimer);
  n.wrongTimer = setTimeout(() => n.classList.remove("wrong"), 420);
}

// ch: the next character to type, "bksp" to point at backspace, or null for nothing.
export function setNext(ch) {
  nextOn.forEach(n => n.classList.remove("next"));
  nextOn = [];
  if (ch == null) return;
  const { k, shift } = ch === "bksp" ? { k: "bksp", shift: false } : keyFor(ch);
  if (keys[k]) nextOn.push(keys[k]);
  if (shift && keys.shift) nextOn.push(keys.shift);
  nextOn.forEach(n => n.classList.add("next"));
}

export function setMood(m) {
  if (m === mood || !root) return;
  mood = m;
  root.dataset.mood = m;
}
