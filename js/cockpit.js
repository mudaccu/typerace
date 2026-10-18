// The dashboard toys next to the keyboard: an H-pattern gear shifter that follows your speed,
// and pedals that press as you type (gas) or make mistakes (brake).

const GATE = { N: [50, 45], 1: [25, 17], 2: [25, 73], 3: [50, 17], 4: [50, 73], 5: [75, 17], 6: [75, 73] };
const BANDS = [20, 35, 50, 65, 85];   // wpm where you shift into gears 2..6

let knob = null, readout = null, gasEl = null, brakeEl = null, gear = "N";
let gasTimer = 0, brakeTimer = 0;

const pedal = (cls, w, h) => `
<svg class="pedal ${cls}" viewBox="0 0 ${w + 8} ${h + 14}" aria-hidden="true">
  <rect class="arm" x="${(w + 8) / 2 - 2.5}" y="${h - 2}" width="5" height="14" rx="2"/>
  <g class="pad"><rect x="4" y="2" width="${w}" height="${h}" rx="6"/>
  ${Array.from({ length: Math.floor((h - 10) / 6) }, (_, i) => `<rect class="grip" x="9" y="${8 + i * 6}" width="${w - 10}" height="2.2" rx="1.1"/>`).join("")}</g>
</svg>`;

export function build(el) {
  el.innerHTML = `
  <div class="shifter">
    <svg viewBox="0 0 100 92" aria-label="gear shifter">
      <defs>
        <radialGradient id="knobG" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#5A5A66"/><stop offset=".55" stop-color="#22222A"/><stop offset="1" stop-color="#0E0E12"/></radialGradient>
      </defs>
      <rect class="boot" x="2" y="2" width="96" height="88" rx="18"/>
      <rect class="stitch" x="7" y="7" width="86" height="78" rx="14"/>
      <path class="gate" d="M25 17V73M50 17V73M75 17V73M25 45H75"/>
      ${["1", "3", "5"].map((g, i) => `<text class="gn" x="${25 + i * 25}" y="11">${g}</text>`).join("")}
      ${["2", "4", "6"].map((g, i) => `<text class="gn" x="${25 + i * 25}" y="86">${g}</text>`).join("")}
      <g class="knob" id="knob"><circle r="10.5" fill="url(#knobG)"/><circle r="10.5" class="knob-ring"/><text class="kn" id="gearNow" y="3.4">N</text></g>
    </svg>
  </div>
  <div class="pedals">${pedal("brake", 30, 26)}${pedal("gas", 20, 36)}</div>`;
  knob = el.querySelector("#knob");
  readout = el.querySelector("#gearNow");
  brakeEl = el.querySelector(".brake");
  gasEl = el.querySelector(".gas");
  place("N");
}

function place(g) {
  const [x, y] = GATE[g];
  knob.style.transform = `translate(${x}px, ${y}px)`;
  readout.textContent = g;
  knob.classList.toggle("hot", g === "6");
}

export const gearFor = (wpm, racing) =>
  !racing ? "N" : String(1 + BANDS.filter(b => wpm >= b).length);

// Returns true when the gear actually changed (so the caller can play a sound).
export function setGear(g) {
  if (!knob || g === gear) return false;
  gear = g;
  place(g);
  return true;
}

function tapPedal(el, which) {
  el.classList.add("down");
  clearTimeout(which === "gas" ? gasTimer : brakeTimer);
  const t = setTimeout(() => el.classList.remove("down"), which === "gas" ? 140 : 260);
  if (which === "gas") gasTimer = t; else brakeTimer = t;
}
export const gas = () => gasEl && tapPedal(gasEl, "gas");
export const brake = () => brakeEl && tapPedal(brakeEl, "brake");
