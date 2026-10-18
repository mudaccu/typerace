// The garage: every car, how to unlock it, and how to draw it.
// `test` gets the player's progress: { best, races, maxNitros, streak, marathons, perfect }.

export const CARS = [
  { id: "starter", name: "starter", color: "#c6ff3d", how: "free", test: () => true },
  { id: "bubblegum", name: "bubblegum", color: "#ff8fd8", how: "hit 40 wpm", test: p => p.best >= 40 },
  { id: "sky", name: "sky high", color: "#6cc4ff", how: "finish 10 races", test: p => p.races >= 10 },
  { id: "midnight", name: "midnight", color: "#6a5cff", stripe: "#c6ff3d", how: "hit 60 wpm", test: p => p.best >= 60 },
  { id: "afterburner", name: "afterburner", color: "#ff7a3d", spoiler: true, how: "3 nitros in one race", test: p => p.maxNitros >= 3 },
  { id: "daily", name: "daily driver", color: "#ffd23d", stripe: "#121212", how: "race 7 days in a row", test: p => p.streak >= 7 },
  { id: "chrome", name: "chrome", color: "chrome", how: "hit 80 wpm", test: p => p.best >= 80 },
  { id: "hauler", name: "long hauler", color: "#3dffb0", spoiler: true, how: "finish 5 marathons", test: p => p.marathons >= 5 },
  { id: "flawless", name: "flawless", color: "#f5f5f0", stripe: "#ff4d6d", how: "100% accuracy (race or marathon)", test: p => p.perfect >= 1 },
  { id: "lava", name: "lava", color: "#ff2d55", stripe: "#ffd23d", spoiler: true, how: "hit 100 wpm", test: p => p.best >= 100 },
];

export const carById = id => CARS.find(c => c.id === id) || CARS[0];

export const checkUnlocks = (progress, unlocked) =>
  CARS.filter(c => !unlocked.includes(c.id) && c.test(progress));

let gid = 0;
// Colors default to CSS variables so cars follow the theme; the share card passes real colors.
export function carSVG(car, { ink = "var(--ink)", hub = "var(--surface)", glass = "var(--surface)" } = {}) {
  const id = "chrome" + gid++;
  const body = car.color === "chrome" ? `url(#${id})` : car.color;
  return `<svg viewBox="0 0 64 28" overflow="visible" aria-hidden="true">${
    car.color === "chrome" ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#9aa0a8"/><stop offset="1" stop-color="#e6e8ec"/></linearGradient></defs>` : ""
  }${car.spoiler ? `<path d="M1 6 H11 V8.5 H8.5 L9.5 12 H6.5 L5.5 8.5 H1 Z" fill="${ink}"/>` : ""
  }<path d="M6 22 Q4 22 4 19 V15 Q4 12 8 11.5 L18 10 L25 4 Q26.5 3 29 3 H41 Q44 3 46 5 L51 10 L57 11 Q61 12 61 16 V19 Q61 22 58 22 Z" fill="${body}"/>${
    car.stripe ? `<rect x="6" y="14" width="53" height="2.6" rx="1.3" fill="${car.stripe}"/>` : ""
  }<path d="M27 6 H34 V10 H22.5 Z M37 6 H42 Q43.5 6 44.5 7.5 L47 10 H37 Z" fill="${glass}" opacity=".75"/>
<circle cx="17" cy="22" r="5" fill="${ink}"/><circle cx="17" cy="22" r="2" fill="${hub}"/>
<circle cx="48" cy="22" r="5" fill="${ink}"/><circle cx="48" cy="22" r="2" fill="${hub}"/></svg>`;
}
