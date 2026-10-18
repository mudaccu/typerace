// Server-side anti-cheat. Files starting with "_" in /api are not public routes on Vercel.
// The client sends the text it raced and the time (ms) each character was typed;
// we recompute the WPM ourselves and reject anything that doesn't look human.
import { WORDS, LENGTHS, dailyText } from "../js/words.js";

const WORDSET = new Set(WORDS);
const NAME_RE = /^[\p{L}\p{N}_ .-]{1,16}$/u;
const CAR_RE = /^[a-z]{2,16}$/;
const MODES = ["sprint", "race", "marathon", "daily"];
export const MAX_WPM = 250;

export const utcDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);
const fail = error => ({ ok: false, error });

export function validateRun(b) {
  if (!b || typeof b !== "object") return fail("bad request");

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!NAME_RE.test(name)) return fail("bad name");
  if (!MODES.includes(b.mode)) return fail("bad mode");
  const text = b.text;
  if (typeof text !== "string" || text.length > 1000) return fail("bad text");

  // The text must be something the game could actually have given you.
  let day = utcDay();
  if (b.mode === "daily") {
    if (![utcDay(), utcDay(-1)].includes(b.day)) return fail("that daily is over");
    if (text !== dailyText(b.day)) return fail("text mismatch");
    day = b.day;
  } else {
    const words = text.split(" ");
    if (words.length !== LENGTHS[b.mode] || !words.every(w => WORDSET.has(w))) return fail("text mismatch");
  }

  const t = b.times;
  if (!Array.isArray(t) || t.length !== text.length) return fail("bad timeline");
  for (let i = 0; i < t.length; i++) {
    if (!Number.isInteger(t[i]) || t[i] < 0 || (i > 0 && t[i] < t[i - 1])) return fail("bad timeline");
  }
  const ms = t[t.length - 1];
  if (ms < 1000 || ms > 10 * 60 * 1000) return fail("bad time");

  const wpm = Math.round((text.length / 5) / (ms / 60000));
  if (wpm > MAX_WPM) return fail("too fast to be real 🤨");

  // Humans type in bursts; scripts and pasted text are evenly spaced or instant.
  const gaps = t.slice(1).map((v, i) => v - t[i]);
  const instant = gaps.filter(g => g < 8).length / gaps.length;
  if (instant > 0.3) return fail("looks scripted");
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length);
  if (sd < 0.15 * mean) return fail("looks scripted");

  const acc = Math.max(0, Math.min(100, Math.round(Number(b.acc) || 0)));
  const car = typeof b.car === "string" && CAR_RE.test(b.car) ? b.car : "starter";
  return { ok: true, row: { name, mode: b.mode, wpm, acc, time_ms: ms, day, timeline: t, car } };
}
