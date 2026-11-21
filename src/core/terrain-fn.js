// 耶路撒冷地形（概略）：薄板样条插值控制点 + 细节噪声。单位：肘，y=0 约为海拔 744 米。
// 控制点按今天的高差换算（1 米 ≈ 1.9 肘），只求形势相近，不是精确测绘。

const P = [];
const add = (arr) => { for (const p of arr) P.push(p); };

// 东山脊：圣殿山 → 俄斐勒 → 大卫城
export const RIDGE = [[0, -1600, 28], [0, -1000, 14], [-10, -500, -2], [0, -250, -12], [0, 0, -1], [10, 150, -12], [25, 300, -30], [40, 450, -45], [60, 600, -60], [90, 900, -100], [120, 1200, -140], [150, 1500, -178], [180, 1750, -215]];
// 汲沦溪谷谷底
export const KIDRON = [[650, -1800, -10], [640, -1200, -45], [620, -600, -80], [600, 0, -108], [540, 400, -140], [420, 800, -180], [340, 1100, -208], [320, 1400, -228], [330, 1800, -255], [400, 2200, -275]];
// 城中山谷（中央谷）谷底
export const TYRO = [[-420, -1600, 10], [-360, -1000, -10], [-320, -500, -40], [-300, 0, -70], [-260, 400, -105], [-180, 800, -140], [-80, 1200, -175], [20, 1600, -215], [120, 1900, -245]];
// 欣嫩子谷谷底
export const HINNOM = [[-1500, -900, 20], [-1500, -300, 15], [-1450, 300, 0], [-1350, 900, -40], [-1200, 1400, -100], [-900, 1700, -160], [-500, 1850, -210], [0, 1950, -245], [330, 2000, -260]];
// 橄榄山脊
export const OLIVES = [[1650, -1400, 150], [1650, -500, 145], [1650, 100, 141], [1600, 700, 110], [1500, 1300, 50], [1400, 1900, -20]];

add(RIDGE); add(KIDRON); add(TYRO); add(HINNOM); add(OLIVES);
add([
  // 东山脊两侧坡面
  [200, -600, -6], [220, 0, -12], [380, 0, -45], [500, 0, -85], [200, 300, -40], [200, 600, -85], [350, 600, -130], [240, 1100, -185], [300, -300, -22],
  [-150, 0, -25], [-150, -600, -12], [-130, 600, -85], [-40, 1100, -158], [-140, 300, -55],
  // 西山岗
  [-900, -800, 40], [-1000, 0, 44], [-950, 600, 38], [-800, 1100, 10], [-600, 1350, -30], [-700, -300, 42], [-600, 300, 30], [-500, 800, -20], [-550, 0, 12], [-1150, -500, 38],
  // 橄榄山西坡
  [850, -600, -10], [850, 0, -30], [800, 600, -80], [700, 1100, -140], [1100, -800, 70], [1150, 0, 70], [1100, 700, 20], [1000, 1300, -60], [560, 1300, -150], [500, 1700, -200],
  // 北面
  [300, -1800, 30], [-300, -1900, 34], [900, -1900, 60], [1500, -2100, 130],
  // 远处
  [-2100, 0, 50], [-2000, 1200, 20], [-1400, 2300, -60], [-600, 2500, -80], [0, 2600, -150], [2400, -1000, 60], [2600, 0, 40], [2500, 1200, -20],
  [-2600, -2400, 60], [2900, -2400, 80], [-2600, 2800, -60], [2900, 2800, -120], [900, 2600, -170], [-2600, -1000, 55], [2900, 1000, -10],
]);

export const BOUNDS = { x0: -2600, x1: 2900, z0: -2400, z1: 2800 };

function solveTPS(pts, lambda) {
  const n = pts.length, m = n + 3;
  const A = Array.from({ length: m }, () => new Float64Array(m + 1));
  const U = (r2) => (r2 < 1e-9 ? 0 : 0.5 * r2 * Math.log(r2));
  const S = 1000; // 坐标缩放，改善数值
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = (pts[i][0] - pts[j][0]) / S, dz = (pts[i][1] - pts[j][1]) / S;
      A[i][j] = U(dx * dx + dz * dz) + (i === j ? lambda : 0);
    }
    A[i][n] = 1; A[i][n + 1] = pts[i][0] / S; A[i][n + 2] = pts[i][1] / S;
    A[n][i] = 1; A[n + 1][i] = pts[i][0] / S; A[n + 2][i] = pts[i][1] / S;
    A[i][m] = pts[i][2];
  }
  for (let c = 0; c < m; c++) {
    let piv = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c];
    for (let k = c; k <= m; k++) A[c][k] /= d;
    for (let r = 0; r < m; r++) {
      if (r === c) continue;
      const f = A[r][c];
      if (f) for (let k = c; k <= m; k++) A[r][k] -= f * A[c][k];
    }
  }
  const w = A.map((row) => row[m]);
  return (x, z) => {
    const X = x / S, Z = z / S;
    let s = w[n] + w[n + 1] * X + w[n + 2] * Z;
    for (let i = 0; i < n; i++) {
      const dx = X - pts[i][0] / S, dz = Z - pts[i][1] / S;
      s += w[i] * U(dx * dx + dz * dz);
    }
    return s;
  };
}

function hash(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// 预先算好的可平铺噪声表：查表比逐点算 fbm 快一个数量级（载入更快）
const NN = 256, NC = 16;
let NT = null;
function vnoiseP(x, z, p) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const w = (i) => ((i % p) + p) % p;
  const a = hash(w(ix), w(iz)), b = hash(w(ix + 1), w(iz)), c = hash(w(ix), w(iz + 1)), d = hash(w(ix + 1), w(iz + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function table() {
  if (NT) return NT;
  NT = new Float32Array(NN * NN);
  for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let o = 0; o < 4; o++) { s += amp * (vnoiseP(i / NN * NC * f, j / NN * NC * f, NC * f) * 2 - 1); norm += amp; amp *= 0.5; f *= 2; }
    NT[j * NN + i] = s / norm;
  }
  return NT;
}
// 约等于 fbm(x, z, 4)，每 16 个单位重复一次
export function nfast(x, z) {
  const T = table();
  const u = x * (NN / NC), v = z * (NN / NC);
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const i0 = i & (NN - 1), j0 = j & (NN - 1), i1 = (i0 + 1) & (NN - 1), j1 = (j0 + 1) & (NN - 1);
  const a = T[j0 * NN + i0], b = T[j0 * NN + i1], c = T[j1 * NN + i0], d = T[j1 * NN + i1];
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}

export function fbm(x, z, oct = 4) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * (vnoise(x * f, z * f) * 2 - 1); norm += amp; amp *= 0.5; f *= 2.07; }
  return s / norm;
}

function distToPolyline(x, z, line) {
  let best = Infinity, bt = 0, acc = 0, total = 0;
  const segs = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    const L = Math.hypot(bx - ax, bz - az); segs.push(L); total += L;
  }
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / L2; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - ax - t * dx, z - az - t * dz);
    if (d < best) { best = d; bt = (acc + t * segs[i]) / total; }
    acc += segs[i];
  }
  return { d: best, t: bt };
}
export { distToPolyline };

// flatten: [{x0,x1,z0,z1,y}]，在这些平台范围内把地形压到平台面以下
export function makeTerrain({ flatten = [], gridStep = 20 } = {}) {
  const tps = solveTPS(P, 0.004);
  const { x0, x1, z0, z1 } = BOUNDS;
  const nx = Math.ceil((x1 - x0) / gridStep) + 1, nz = Math.ceil((z1 - z0) / gridStep) + 1;
  const grid = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) grid[j * nx + i] = tps(x0 + i * gridStep, z0 + j * gridStep);

  const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const g = (i, j) => grid[Math.max(0, Math.min(nz - 1, j)) * nx + Math.max(0, Math.min(nx - 1, i))];
  function smooth(x, z) {
    const fx = (x - x0) / gridStep, fz = (z - z0) / gridStep;
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const r = [];
    for (let k = -1; k <= 2; k++) r.push(cr(g(i - 1, j + k), g(i, j + k), g(i + 1, j + k), g(i + 2, j + k), tx));
    return cr(r[0], r[1], r[2], r[3], tz);
  }

  function natural(x, z) {
    let h = smooth(x, z);
    const dc = Math.hypot(x - 40, z - 150);
    const rough = Math.min(1, Math.max(0, (dc - 260) / 500));
    h += nfast(x / 260, z / 260) * (3 + 9 * rough) + nfast(x / 40 + 5.3, z / 40 + 1.7) * 1.2 * rough;
    // 汲沦溪谷底收窄成 V 形
    const k = distToPolyline(x, z, KIDRON);
    if (k.d < 90) h -= (1 - k.d / 90) ** 2 * 10;
    return h;
  }

  function heightAt(x, z) {
    let h = natural(x, z);
    for (const f of flatten) {
      if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) h = Math.min(h, f.y - 0.6);
    }
    return h;
  }

  function regionAt(x, z) {
    for (const f of flatten) if (f.region && x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) return f.region;
    if (z > 520 && z < 1800 && Math.abs(x - (60 + (z - 600) * 0.09)) < 210) return 'cityofdavid';
    const k = distToPolyline(x, z, KIDRON);
    if (k.d < 160) return 'kidron';
    if (x > 760) return 'olives';
    if (distToPolyline(x, z, HINNOM).d < 220) return 'hinnom';
    if (x < -420) return 'westhill';
    return 'moriah';
  }

  return { heightAt, natural, regionAt, bounds: BOUNDS };
}
