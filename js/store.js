// Everything saved in the browser. Wrapped in try/catch because private
// windows and some browsers block localStorage.

const get = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
  catch (e) { return fallback; }
};
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

export const settings = Object.assign(
  { length: "race", content: "words", daily: false, muted: false, car: "starter", theme: null },
  get("tr_settings", {})
);
export const saveSettings = () => set("tr_settings", settings);

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const profile = Object.assign(
  { id: null, name: "", pb: {}, unlocked: ["starter"], maxNitros: 0, perfect: 0, marathons: 0 },
  get("tr_profile", {})
);
if (!profile.id) profile.id = newId();
// carry over the personal best from the first version of the site
const oldPb = get("tr_pb", 0);
if (oldPb && !profile.pb["words-race"]) profile.pb["words-race"] = +oldPb;
export const saveProfile = () => set("tr_profile", profile);
saveProfile();

export const runs = get("tr_history", []);
export function addRun(entry) {
  runs.push(entry);
  if (runs.length > 500) runs.splice(0, runs.length - 500);
  set("tr_history", runs);
}

const dayKey = d => d.toLocaleDateString("en-CA");

// How many days in a row (ending today or yesterday) the player has raced.
export function dayStreak() {
  const days = new Set(runs.map(r => dayKey(new Date(r.t))));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
