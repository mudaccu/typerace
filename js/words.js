// Everything that produces race text. Shared with the server (api/_validate.js),
// so keep it free of browser-only code.

export const WORDS = ("the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is was are been has had did said each tell does set three air play small end put home read hand port large spell add land here must big high such follow act why ask men change went light kind off need house picture try again animal point mother world near build self earth father head stand own page should country found answer school grow study still learn plant cover food sun four between state keep eye never last let thought city tree cross farm hard start might story saw far sea draw left late run while press close night real life few north open seem together next white children begin got walk example ease paper group always music those both mark often letter until mile river car feet care second book carry took science eat room friend began idea fish mountain stop once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure door product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass since top whole king space heard best hour better true during hundred five remember step early hold west ground interest reach fast verb sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map rain rule govern pull cold notice voice unit power town fine certain fly fall lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop ocean warm free minute strong special mind behind clear tail produce fact street inch multiply nothing course stay wheel full force blue object decide surface deep moon island foot system busy test record boat common gold possible plane stead dry wonder laugh thousand ago ran check game shape equate miss brought heat snow tire bring yes distant fill east paint language among").split(" ");

export const LENGTHS = { sprint: 15, race: 30, marathon: 55 };

const QUOTES = [
  "the best time to start was yesterday and the next best time is right now.",
  "you do not have to be fast to win, you just have to keep showing up.",
  "every expert you look up to was once a beginner who refused to quit.",
  "stop comparing your chapter one to somebody else's chapter twenty.",
  "comfort zones are cozy but nothing new ever grows in there.",
  "small wins stacked every single day turn into big changes.",
  "discipline is picking what you want most over what you want right now.",
  "do it scared, do it tired, but do it anyway.",
  "the only race that matters is the one against who you were yesterday.",
  "good things take time and great things take a little longer.",
  "stay curious, stay humble, and never stop learning new things.",
  "rest when you need to, but do not quit on yourself.",
  "confidence is not a feeling, it is a skill you practice.",
  "your future self is cheering for every rep you put in today.",
  "being bad at something is the first step to being good at it.",
  "a messy start beats a perfect plan that never leaves your head.",
  "the person who keeps going usually beats the person who started fast.",
  "focus on progress, not perfection, and the rest will follow.",
];

const SLANG = [
  "no cap this keyboard is lowkey bussin right now.",
  "bro said he types fast and then got smoked by grandma.",
  "it's giving main character energy and i am here for it.",
  "my fingers are in their villain era and they will not be stopped.",
  "that race was so mid i am going to pretend it never happened.",
  "the vibes are immaculate and the wpm is even better.",
  "ate and left no crumbs, absolutely sent it.",
  "been grinding all week and it finally hit different.",
  "we are so back, the typos are gone fr fr.",
  "lowkey obsessed with my own score, highkey losing sleep over it.",
  "the guy who typed a hundred wpm lives rent free in my head.",
  "not me speedrunning this sentence at three in the morning.",
  "touch grass later, beat the tryhard bot first.",
  "this playlist slaps and my typing slaps even harder.",
  "caught in four k making the same typo twice.",
  "say less, i already queued up the next race.",
  "the group chat is not ready for my new personal best.",
  "delulu is the solulu when you are chasing two hundred wpm.",
];

const CODE = [
  "const speed = wpm * 5 / 60;",
  "if (typed === target) finish();",
  "for (let i = 0; i < 10; i++) count += i;",
  "function add(a, b) { return a + b; }",
  "const names = users.map(u => u.name);",
  "let total = items.reduce((s, x) => s + x, 0);",
  "if (!user) throw new Error(\"not found\");",
  "const [count, setCount] = useState(0);",
  "await fetch(\"/api/score\", { method: \"POST\" });",
  "while (queue.length > 0) run(queue.shift());",
  "print(f\"hello {name}\")",
  "def greet(name): return \"hi \" + name",
  "SELECT name, wpm FROM scores ORDER BY wpm DESC;",
  "git commit -m \"fix: faster cars\"",
  "npm install --save-dev vite",
  "x = [n * 2 for n in range(10)]",
  "const isFast = wpm >= 80 ? \"yes\" : \"no\";",
  "export default function App() { return null; }",
];

// Small seeded random generator, so the daily challenge is the same for everyone.
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWords(n, rand = Math.random) {
  const out = [];
  while (out.length < n) {
    const w = WORDS[Math.floor(rand() * WORDS.length)];
    if (w && w !== out[out.length - 1]) out.push(w);
  }
  return out.join(" ");
}

function fromSentences(list, n, rand) {
  const out = [], pool = [];
  let count = 0;
  while (count < n) {
    if (!pool.length) pool.push(...list.filter(s => !out.includes(s)));
    if (!pool.length) pool.push(...list);
    const s = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    out.push(s);
    count += s.split(" ").length;
  }
  return out.join(" ");
}

// Prose reads properly: capital at the start of every sentence, and "i" on its own is "I".
const sentenceCase = s => (s[0].toUpperCase() + s.slice(1)).replace(/\bi\b/g, "I");

function punctuated(n, rand) {
  let newSentence = true;
  return pickWords(n, rand).split(" ").map(w => {
    let x = w;
    const k = rand();
    if (k > 0.86) x = String(Math.floor(rand() * 1000));
    else if (newSentence || k < 0.14) x = x[0].toUpperCase() + x.slice(1);
    const p = rand();
    if (p < 0.1) x += ",";
    else if (p < 0.16) x += ".";
    else if (p < 0.19) x += "!";
    else if (p < 0.21) x += "?";
    else if (p < 0.24) x = `(${x})`;
    else if (p < 0.26) x = `"${x}"`;
    else if (p < 0.28) x += ";";
    newSentence = /[.!?]$/.test(x);
    return x;
  }).join(" ");
}

export function makeText(content, length, rand = Math.random) {
  const n = LENGTHS[length] || LENGTHS.race;
  switch (content) {
    case "quotes": return fromSentences(QUOTES.map(sentenceCase), n, rand);
    case "slang": return fromSentences(SLANG.map(sentenceCase), n, rand);
    case "code": return fromSentences(CODE, Math.round(n * 0.8), rand);
    case "punct": return punctuated(n, rand);
    default: return pickWords(n, rand);
  }
}

// Daily challenge resets at midnight UTC.
export const todayKey = () => new Date().toISOString().slice(0, 10);
export const dailyText = day => pickWords(LENGTHS.race, seeded(hashSeed("typerace:" + day)));
