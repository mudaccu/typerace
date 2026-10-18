// The garage: every car, how to unlock it, and how to draw it.
// `test` gets the player's progress: { best, races, maxNitros, streak, marathons, perfect }.

export const CARS = [
  { id: "starter", name: "rookie", shape: "gt", color: "#FF5A2A", how: "free", test: () => true },
  { id: "bubblegum", name: "bubblegum", shape: "retro", color: "#FF8CC6", how: "hit 40 wpm", test: p => p.best >= 40 },
  { id: "sky", name: "sky high", shape: "gt", color: "#4DA8FF", how: "finish 10 races", test: p => p.races >= 10 },
  { id: "midnight", name: "midnight", shape: "hyper", color: "#3B3F9E", stripe: "#FFC23D", how: "hit 60 wpm", test: p => p.best >= 60 },
  { id: "afterburner", name: "afterburner", shape: "hyper", color: "#FF8A1A", wing: true, how: "3 nitros in one race", test: p => p.maxNitros >= 3 },
  { id: "daily", name: "daily driver", shape: "retro", color: "#F5C518", stripe: "#15151A", how: "race 7 days in a row", test: p => p.streak >= 7 },
  { id: "chrome", name: "chrome", shape: "gt", color: "chrome", how: "hit 80 wpm", test: p => p.best >= 80 },
  { id: "hauler", name: "long hauler", shape: "gt", color: "#2FBF8F", wing: true, how: "finish 5 marathons", test: p => p.marathons >= 5 },
  { id: "flawless", name: "flawless", shape: "retro", color: "#F4F2EC", stripe: "#E5383B", how: "100% accuracy, race or marathon", test: p => p.perfect >= 1 },
  { id: "lava", name: "lava", shape: "hyper", color: "#E01E37", stripe: "#FFC23D", wing: true, rim: "#2B2D35", how: "hit 100 wpm", test: p => p.best >= 100 },
];

export const carById = id => CARS.find(c => c.id === id) || CARS[0];

export const checkUnlocks = (progress, unlocked) =>
  CARS.filter(c => !unlocked.includes(c.id) && c.test(progress));

// A solid colour that represents the car (for little dots and labels).
export const carDot = car => (car.color === "chrome" ? "#C9CCD3" : car.color);

// Side profiles, facing right, in a 128 x 42 box. Wheels sit at x=30 and x=98.
const SHAPES = {
  gt: {
    body: "M8 30L8 24Q8 20 14 19L34 17C42 16 48 9 58 8L72 8C80 8 86 13 92 16L114 20Q122 21 122 26L122 29Q122 31 119 31L108 31A10 10 0 0 0 88 31L40 31A10 10 0 0 0 20 31L12 31Q8 31 8 30Z",
    glass: "M44 17C50 14 53 10.5 59 10.3L71 10.3C77 10.4 82 13 88 16.6Z", pillar: 66,
    intake: "M50 22.5L61 21.5L59 26L48.5 26.2Z", line: "M14 22.6L117 24.6",
    head: "M112 20.6L120.5 22.2L119.6 23.8L111.4 22.6Z", tail: "M8.4 21.2L13.5 20.4L13.5 22.4L8.4 22.9Z",
    mirror: "M85.5 14.2l3.2-.9.9 2-3.4.6Z", wing: "M11 19L11.6 13.8L4 12.6L4 10.8L21 10.8L21 12.6L15.4 13.8L15 19Z",
  },
  retro: {
    body: "M10 30L10 25Q10 19 18 18L30 17C38 16 44 8 56 7.5L66 7.5C76 8 82 13 88 16L110 18.5Q120 20 120 26L120 29Q120 31 117 31L108 31A10 10 0 0 0 88 31L40 31A10 10 0 0 0 20 31L13 31Q10 31 10 30Z",
    glass: "M34 16.6C40 13 46 9.6 56 9.3L65 9.3C73 9.6 79 12.6 85 16.2Z", pillar: 60,
    intake: null, line: "M14 23.2L116 24.6",
    head: "M111.6 21.6a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0Z", tail: "M10.3 21L14 20.4L14 22.6L10.3 23Z",
    mirror: "M83 13.8l3-.8.8 1.8-3 .6Z", wing: "M13 18.4L13.6 13.6L6 12.4L6 10.6L23 10.6L23 12.4L17.4 13.6L17 18.4Z",
  },
  hyper: {
    body: "M6 30L6 23L12 19.5L36 17.5L56 9L74 8.6L96 16L120 21L124 25L124 29L120 31L108 31A10 10 0 0 0 88 31L40 31A10 10 0 0 0 20 31L9 31Z",
    glass: "M44 17L57 10.8L73 10.6L90 16.6Z", pillar: 67,
    intake: "M46 21.5L62 20.5L57 27L44 27Z", line: "M12 22.2L120 23.6",
    head: "M114 20.4L122.5 22.4L121.6 23.6L113.2 22Z", tail: "M6.4 22.4L12.5 21.4L12.5 23.2L6.4 24Z",
    mirror: "M88 14.6l3-1 1 2-3.2.6Z", wing: "M9 19.5L10 12.4L2 10.8L2 8.6L22 8.6L22 10.8L15 12.4L14 19.5Z",
  },
};

const f = n => n.toFixed(2);

function wheel(cx, cy, rim) {
  const dark = rim === "#2B2D35";
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 * Math.PI) / 180;
    return `M${f(cx + Math.sin(a) * 1.9)} ${f(cy - Math.cos(a) * 1.9)}L${f(cx + Math.sin(a) * 5.5)} ${f(cy - Math.cos(a) * 5.5)}`;
  }).join("");
  return `<circle cx="${cx}" cy="${cy}" r="8.6" fill="#121216"/>
<circle cx="${cx}" cy="${cy}" r="6.3" fill="${rim}"/>
<path d="M${cx - 4.6} ${cy - 1.6}A4.9 4.9 0 0 1 ${cx - 1.6} ${cy - 4.6}" stroke="#E5383B" stroke-width="2" fill="none" stroke-linecap="round"/>
<g class="spin"><path d="${spokes}" stroke="${dark ? "#8C909A" : "#3A3D46"}" stroke-width="1.8" stroke-linecap="round"/></g>
<circle cx="${cx}" cy="${cy}" r="1.6" fill="${dark ? "#8C909A" : "#3A3D46"}"/>`;
}

let gid = 0;
export function carSVG(car, { xmlns = false } = {}) {
  const s = SHAPES[car.shape] || SHAPES.gt;
  const id = "c" + gid++;
  const chrome = car.color === "chrome";
  const paint = chrome ? `url(#${id}m)` : car.color;
  const rim = car.rim || "#C9CCD3";
  return `<svg ${xmlns ? 'xmlns="http://www.w3.org/2000/svg" ' : ""}viewBox="0 0 128 42" overflow="visible" aria-hidden="true">
<defs>
<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B4258"/><stop offset="1" stop-color="#151821"/></linearGradient>
<linearGradient id="${id}f" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#FFE27A"/><stop offset=".35" stop-color="#FF8A1A"/><stop offset="1" stop-color="#FF3D1F" stop-opacity="0"/></linearGradient>
${chrome ? `<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#9AA0A8"/><stop offset=".62" stop-color="#C9CCD3"/><stop offset="1" stop-color="#E6E8EC"/></linearGradient>` : ""}
</defs>
<ellipse cx="64" cy="40" rx="58" ry="2.2" fill="#000" opacity=".3"/>
${xmlns ? "" : `<g class="flame"><path d="M8 26.4C-2 24.4-12 27-22 28.3C-12 29.6-2 32.2 8 30.2Z" fill="url(#${id}f)"/><path d="M8 27.6C2 26.9-4 28-9 28.4C-4 28.9 2 29.9 8 29.2Z" fill="#FFF6C2"/></g>`}
${car.wing ? `<path d="${s.wing}" fill="#1B1C22"/>` : ""}
<path d="${s.body}" style="fill:${paint}"/>
<path d="${s.body}" fill="url(#${id}s)"/>
${car.stripe ? `<path d="${s.line}" stroke="${car.stripe}" stroke-width="2.6" stroke-linecap="round"/>` : `<path d="${s.line}" stroke="#000" stroke-opacity=".18" stroke-width=".8"/>`}
<path d="${s.glass}" fill="url(#${id}g)"/>
<path d="M${s.pillar} 10.5V17" style="stroke:${paint}" stroke-width="1.8"/>
<path d="${s.glass}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".7"/>
${s.intake ? `<path d="${s.intake}" fill="#000" opacity=".35"/>` : ""}
<path d="${s.mirror}" fill="#1B1C22"/>
<path d="${s.head}" fill="#FFF8DC"/>
<path d="${s.tail}" fill="#FF3B30"/>
${wheel(30, 31, rim)}${wheel(98, 31, rim)}
</svg>`;
}
