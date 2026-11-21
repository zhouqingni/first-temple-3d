// 设置与开关：可订阅变化；用户偏好记在 localStorage（失败时忽略）
const KEY = 'first-temple-settings-v1';

const DEFAULTS = {
  time: 'morning',     // morning | noon | dusk | night
  porch: 'a',          // a = 120 肘（代下3:4） b = 30 肘
  pillar: 'a',         // a = 18 肘（王上7:15） b = 35 肘（代下3:15）
  cubit: 0.525,        // 米/肘
  people: true,
  quality: 'auto',     // auto | low | mid | high
  roof: true,          // 屋顶在（false = 揭顶）
  dims: false,         // 尺寸标注
  names: true,         // 地名标注
  map: true,           // 小地图
  doors: true,         // 殿门开
  speech: false,       // 导览朗读
  scene: 'daily',      // daily | dedication
};

const PERSIST = ['time', 'porch', 'pillar', 'cubit', 'people', 'quality', 'names', 'map', 'speech'];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    const out = {};
    for (const k of PERSIST) if (k in obj) out[k] = obj[k];
    return out;
  } catch { return {}; }
}

class State {
  constructor() {
    this.v = { ...DEFAULTS, ...load() };
    this.subs = new Map();
  }
  get(k) { return this.v[k]; }
  set(k, val) {
    if (this.v[k] === val) return;
    this.v[k] = val;
    for (const fn of this.subs.get(k) ?? []) fn(val);
    for (const fn of this.subs.get('*') ?? []) fn(k, val);
    if (PERSIST.includes(k)) {
      try {
        const o = {};
        for (const p of PERSIST) o[p] = this.v[p];
        localStorage.setItem(KEY, JSON.stringify(o));
      } catch { /* 存不了就算了 */ }
    }
  }
  on(k, fn) {
    if (!this.subs.has(k)) this.subs.set(k, []);
    this.subs.get(k).push(fn);
    return () => this.subs.set(k, this.subs.get(k).filter((f) => f !== fn));
  }
}

export const state = new State();

// 米 → 肘
export const m2c = (m) => m / state.get('cubit');
