// Draws a 1080x1350 result card (good for Instagram/TikTok) and shares or downloads it.
import { carSVG } from "./cars.js";

const W = 1080, H = 1350;
const BG = "#0e0e10", INK = "#f2f2ec", MUTED = "#7a7a82", LINE = "#2a2a30", LIME = "#c6ff3d";

const loadImg = src => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = src;
});

function pill(x, cx, cy, text, font, bg, fg, padX = 40, h = 90) {
  x.font = font;
  const w = x.measureText(text).width + padX * 2;
  x.fillStyle = bg;
  x.beginPath();
  x.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  x.fill();
  x.fillStyle = fg;
  x.fillText(text, cx, cy + 2);
}

export async function makeCard(r) {
  await Promise.all([
    document.fonts.load('700 64px "Space Grotesk"'),
    document.fonts.load('600 300px "JetBrains Mono"'),
  ]).catch(() => {});

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = BG;
  x.fillRect(0, 0, W, H);
  x.textBaseline = "middle";

  // logo
  x.font = '700 64px "Space Grotesk", sans-serif';
  x.fillStyle = INK;
  x.fillText("type", 80, 122);
  const tw = x.measureText("type").width, rw = x.measureText("race").width;
  x.fillStyle = LIME;
  x.beginPath();
  x.roundRect(80 + tw + 8, 82, rw + 28, 82, 16);
  x.fill();
  x.fillStyle = "#121212";
  x.fillText("race", 80 + tw + 22, 124);

  x.textAlign = "right";
  x.font = '500 36px "Space Grotesk", sans-serif';
  x.fillStyle = MUTED;
  x.fillText(r.label, W - 80, 124);

  x.textAlign = "center";
  x.font = '500 48px "Space Grotesk", sans-serif';
  x.fillText(r.placeText, W / 2, 300);

  x.font = '600 300px "JetBrains Mono", monospace';
  x.fillStyle = INK;
  x.fillText(String(r.wpm), W / 2, 480);
  x.font = '500 52px "JetBrains Mono", monospace';
  x.fillStyle = MUTED;
  x.fillText("wpm", W / 2, 650);

  pill(x, W / 2, 770, r.vibe, '700 46px "Space Grotesk", sans-serif', LIME, "#121212");

  const boxes = [[r.acc + "%", "accuracy"], [r.secs.toFixed(1) + "s", "time"], [String(r.nitros), "nitros"]];
  const bw = 280, gap = 30, bx = (W - (bw * 3 + gap * 2)) / 2;
  boxes.forEach(([v, l], i) => {
    const X = bx + i * (bw + gap);
    x.strokeStyle = LINE;
    x.lineWidth = 3;
    x.beginPath();
    x.roundRect(X, 880, bw, 150, 28);
    x.stroke();
    x.fillStyle = INK;
    x.font = '600 54px "JetBrains Mono", monospace';
    x.fillText(v, X + bw / 2, 940);
    x.fillStyle = MUTED;
    x.font = '500 28px "Space Grotesk", sans-serif';
    x.fillText(l, X + bw / 2, 992);
  });

  // road, finish line and your car
  x.fillStyle = LINE;
  for (let X = 80; X < W - 120; X += 64) x.fillRect(X, 1192, 34, 6);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 2; col++) {
    if ((row + col) % 2) continue;
    x.fillStyle = INK;
    x.fillRect(W - 110 + col * 14, 1080 + row * 14, 14, 14);
  }
  const svg = carSVG(r.car, { ink: INK, hub: BG, glass: BG })
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="140" ');
  try {
    const img = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
    x.drawImage(img, W - 480, 1050, 320, 140);
  } catch (e) { /* card still works without the car */ }

  x.font = '500 36px "Space Grotesk", sans-serif';
  x.fillStyle = MUTED;
  x.fillText(`think you can beat me? → ${location.host || "typerace"}`, W / 2, 1275);

  return new Promise(res => c.toBlob(res, "image/png"));
}

export async function shareCard(r) {
  const blob = await makeCard(r);
  const file = new File([blob], `typerace-${r.wpm}wpm.png`, { type: "image/png" });
  const text = `just hit ${r.wpm} wpm on typerace 🏎️💨 think u can beat me? ${location.href.split("?")[0]}`;
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
