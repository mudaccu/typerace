// One small line-icon set (24px grid, 1.8 stroke) used everywhere instead of emoji.
const P = {
  car: '<path d="M3.5 16.5v-3.2l2-5.1A2 2 0 0 1 7.4 7h9.2a2 2 0 0 1 1.9 1.2l2 5.1v3.2Z"/><path d="M5.5 16.5v2M18.5 16.5v2M3.5 12.5h17"/><circle cx="7.5" cy="14.6" r=".9" fill="currentColor"/><circle cx="16.5" cy="14.6" r=".9" fill="currentColor"/>',
  chart: '<path d="M4 20h16M7 16.5v-5M12 16.5V6M17 16.5v-8"/>',
  trophy: '<path d="M8 4h8v5.5a4 4 0 0 1-8 0Z"/><path d="M8 6H5.5v1.2A3.3 3.3 0 0 0 8 10.4M16 6h2.5v1.2a3.3 3.3 0 0 1-2.5 3.2M12 13.5V17M8.5 20h7M10 17h4"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.3a4.3 4.3 0 0 1 5 4.2"/>',
  sound: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>',
  mute: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  contrast: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  flame: '<path d="M12 3.5c.8 3.2 4.8 5 4.8 9.6a4.8 4.8 0 0 1-9.6 0c0-1.9.9-3.3 1.9-4.2.1 1.8.9 2.8 2 2.9-.3-2.9-.6-5.3.9-8.3Z"/>',
  ghost: '<path d="M5.5 20V11a6.5 6.5 0 0 1 13 0v9l-2.2-1.5-2.1 1.5-2.2-1.5-2.2 1.5-2.1-1.5Z"/><circle cx="9.6" cy="11" r=".9" fill="currentColor"/><circle cx="14.4" cy="11" r=".9" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  share: '<path d="M12 15V4M7.8 8.2 12 4l4.2 4.2M5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
  backspace: '<path d="M9 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12Z"/><path d="m11.8 9.6 4.8 4.8m0-4.8-4.8 4.8"/>',
  shift: '<path d="M12 4.5 4.5 12H9v6.5h6V12h4.5Z"/>',
  crown: '<path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10Z"/>',
  sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8Z"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9"/>',
};

export const icon = (name, cls = "") =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

// The logo mark: a keycap with a racing "T", speed lines and a checkered corner.
export const MARK_PATHS = {
  base: "M9 2h14a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8H9a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Z",
  face: "M9.5 2.5h13a6.5 6.5 0 0 1 6.5 6.5v11a6.5 6.5 0 0 1-6.5 6.5h-13A6.5 6.5 0 0 1 3 20V9a6.5 6.5 0 0 1 6.5-6.5Z",
  t: "M11 8.5h14.5l-1.2 4h-5.4l-2.8 10h-4.4l2.8-10H9.8Z",
  speed: "M4.8 15.5h5.4M5.8 19h4",
  checker: "M22.2 18.6h2.4V21h-2.4ZM24.6 21H27v2.4h-2.4Z",
};

export const markSVG = (cls = "mark") => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">
  <path class="m-base" d="${MARK_PATHS.base}"/><path class="m-face" d="${MARK_PATHS.face}"/>
  <path class="m-speed" d="${MARK_PATHS.speed}" fill="none" stroke-width="1.6" stroke-linecap="round"/>
  <path class="m-t" d="${MARK_PATHS.t}"/><path class="m-check" d="${MARK_PATHS.checker}"/></svg>`;
