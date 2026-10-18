// Draws a 1080x1350 result card (good for Instagram/TikTok) and shares or downloads it.
import { carSVG } from "./cars.js";
import { MARK_PATHS } from "./icons.js";

const W = 1080, H = 1350;
const BG = "#15151A", PAPER = "#F3F1EC", MUTED = "#8E8B84", LINE = "#2C2C34", ACCENT = "#FF5A2A", ASPHALT = "#24242B";

const loadImg = src => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = src;
});

function font(x, style) {
  x.font = style;
  if ("fontStretch" in x) x.fontStretch = style.includes("italic") ? "expanded" : "normal";
}

function drawMark(x, px, py, size) {
  x.save();
  x.translate(px, py);
  x.scale(size / 32, size / 32);
  x.fillStyle = "#2C2C35"; x.fill(new Path2D(MARK_PATHS.base));
  x.fillStyle = "#3B3B46"; x.fill(new Path2D(MARK_PATHS.face));
  x.strokeStyle = "rgba(243,241,236,.55)"; x.lineWidth = 1.6; x.lineCap = "round"; x.stroke(new Path2D(MARK_PATHS.speed));
  x.fillStyle = ACCENT; x.fill(new Path2D(MARK_PATHS.t));
  x.fillStyle = PAPER; x.fill(new Path2D(MARK_PATHS.checker));
  x.restore();
}

export async function makeCard(r) {
  await Promise.all([
    document.fonts.load('italic 900 100px "Archivo"'),
    document.fonts.load('700 40px "Archivo"'),
  ]).catch(() => {});

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = BG;
  x.fillRect(0, 0, W, H);
  x.textBaseline = "alphabetic";

  // brand
  drawMark(x, 80, 76, 64);
  font(x, 'italic 800 52px "Archivo", sans-serif');
  x.fillStyle = PAPER;
  x.fillText("type", 164, 126);
  const tw = x.measureText("type").width;
  x.fillStyle = ACCENT;
  x.fillText("race", 164 + tw, 126);
  font(x, '700 26px "Archivo", sans-serif');
  x.fillStyle = MUTED;
  x.textAlign = "right";
  x.fillText(r.label.toUpperCase(), W - 80, 120);
  x.textAlign = "left";

  // position + speed
  font(x, 'italic 900 190px "Archivo", sans-serif');
  x.fillStyle = ACCENT;
  x.fillText("P" + r.place, 72, 380);
  const pw = x.measureText("P" + r.place).width;
  font(x, '700 40px "Archivo", sans-serif');
  x.fillStyle = PAPER;
  x.fillText(r.place === 1 ? "won the race" : r.placeText, 72 + pw + 30, 300);
  x.fillStyle = MUTED;
  font(x, '600 32px "Archivo", sans-serif');
  x.fillText("typing speed", 72 + pw + 30, 350);

  font(x, 'italic 900 300px "Archivo", sans-serif');
  x.fillStyle = PAPER;
  x.fillText(String(r.wpm), 64, 680);
  const ww = x.measureText(String(r.wpm)).width;
  font(x, 'italic 800 64px "Archivo", sans-serif');
  x.fillStyle = MUTED;
  x.fillText("WPM", 64 + ww + 24, 680);

  // vibe
  font(x, 'italic 800 42px "Archivo", sans-serif');
  const vw = x.measureText(r.vibe).width + 56;
  x.fillStyle = "rgba(255,90,42,.16)";
  x.beginPath(); x.roundRect(72, 730, vw, 76, 14); x.fill();
  x.fillStyle = ACCENT;
  x.fillText(r.vibe, 100, 782);

  // stat boxes
  const boxes = [[r.acc + "%", "ACCURACY"], [r.secs.toFixed(1) + "s", "TIME"], [String(r.nitros), "NITROS"]];
  const bw = (W - 144 - 32) / 3;
  boxes.forEach(([v, l], i) => {
    const X = 72 + i * (bw + 16);
    x.fillStyle = "#1E1E25";
    x.beginPath(); x.roundRect(X, 850, bw, 150, 22); x.fill();
    font(x, 'italic 800 58px "Archivo", sans-serif');
    x.fillStyle = PAPER;
    x.fillText(v, X + 30, 935);
    font(x, '700 22px "Archivo", sans-serif');
    x.fillStyle = MUTED;
    x.fillText(l, X + 30, 975);
  });

  // road with curbs, finish line and the car
  const RY = 1050, RH = 170;
  x.fillStyle = ASPHALT;
  x.fillRect(0, RY, W, RH);
  for (let X = 0; X < W; X += 48) {
    x.fillStyle = (X / 48) % 2 ? PAPER : "#E5383B";
    x.fillRect(X, RY, 48, 12);
    x.fillRect(X, RY + RH - 12, 48, 12);
  }
  x.fillStyle = "rgba(255,255,255,.22)";
  for (let X = 0; X < W; X += 80) x.fillRect(X, RY + RH / 2 - 2, 44, 4);
  for (let row = 0; row < 7; row++) for (let col = 0; col < 2; col++) {
    x.fillStyle = (row + col) % 2 ? "#15151A" : PAPER;
    x.fillRect(W - 120 + col * 21, RY + 12 + row * 21, 21, 21);
  }
  try {
    const img = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(carSVG(r.car, { xmlns: true }).replace("<svg ", '<svg width="420" height="138" ')));
    x.drawImage(img, W - 560, RY + 22, 420, 138);
  } catch (e) { /* the card still works without the car */ }

  font(x, '600 32px "Archivo", sans-serif');
  x.fillStyle = MUTED;
  x.textAlign = "center";
  x.fillText(`think you can beat me?  ${location.host || "typerace"}`, W / 2, 1290);

  return new Promise(res => c.toBlob(res, "image/png"));
}

export async function shareCard(r) {
  const blob = await makeCard(r);
  const file = new File([blob], `typerace-${r.wpm}wpm.png`, { type: "image/png" });
  const text = `I just hit ${r.wpm} WPM on typerace. Think you can beat me? ${location.href.split("?")[0]}`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return "shared";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return "downloaded";
}
