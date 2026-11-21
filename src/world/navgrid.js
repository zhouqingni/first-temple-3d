// 人群寻路网格：按碰撞世界逐格取地面高度与可走性，A* 求路，视线平滑
import { HOUSE, Y } from '../core/layout.js';

export class NavGrid {
  constructor(world, { x0 = -110, x1 = 212, z0 = -102, z1 = 126, cell = 2 } = {}) {
    this.x0 = x0; this.z0 = z0; this.cell = cell;
    this.nx = Math.ceil((x1 - x0) / cell); this.nz = Math.ceil((z1 - z0) / cell);
    const N = this.nx * this.nz;
    this.h = new Float32Array(N);
    this.zone = new Uint8Array(N); // 0 不可走 1 大院 2 内院 3 殿基/殿内 4 坛上
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const k = j * this.nx + i;
      const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell;
      const y = world.groundAt(x, z, 14, 0);
      this.h[k] = y;
      if (y < -40 || world.blocked(x, z, y, 0.75, 3, 0.6)) continue;
      const inHouse = x > HOUSE.x0 - 1 && x < HOUSE.eastOuter + 16 && Math.abs(z) < HOUSE.halfW + 0.1;
      if (inHouse && x < 1.5) continue; // 至圣所：不进
      if (y < -2) this.zone[k] = 1;
      else if (y < 2.4) this.zone[k] = 2;
      else if (y < 4) this.zone[k] = 3;
      else this.zone[k] = 4;
    }
    this.lists = {};
    this.g = new Float32Array(N); this.came = new Int32Array(N); this.closed = new Uint32Array(N); this.stamp = new Uint32Array(N); this.st = 0;
  }

  idx(x, z) {
    const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
    return j * this.nx + i;
  }
  center(k) { return [this.x0 + ((k % this.nx) + 0.5) * this.cell, this.z0 + (Math.floor(k / this.nx) + 0.5) * this.cell]; }
  allowed(k, mask) { return k >= 0 && ((mask >> this.zone[k]) & 1) === 1; }

  cells(mask) {
    if (!this.lists[mask]) {
      const out = [];
      for (let k = 0; k < this.zone.length; k++) if (this.allowed(k, mask)) out.push(k);
      this.lists[mask] = out;
    }
    return this.lists[mask];
  }

  randomPoint(mask, rnd = Math.random) {
    const c = this.cells(mask);
    const k = c[Math.floor(rnd() * c.length)];
    const [x, z] = this.center(k);
    return [x + (rnd() - 0.5) * this.cell * 0.8, z + (rnd() - 0.5) * this.cell * 0.8];
  }

  nearestAllowed(x, z, mask) {
    let k = this.idx(x, z);
    if (this.allowed(k, mask)) return k;
    for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const kk = this.idx(x + di * this.cell, z + dj * this.cell);
      if (this.allowed(kk, mask)) return kk;
    }
    return -1;
  }

  _link(a, b) { return Math.abs(this.h[a] - this.h[b]) <= 1.15; }

  // A*：返回 [[x,z], ...]
  find(sx, sz, tx, tz, mask) {
    const s = this.nearestAllowed(sx, sz, mask), t = this.nearestAllowed(tx, tz, mask);
    if (s < 0 || t < 0) return null;
    const nx = this.nx, st = ++this.st;
    const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const tiX = t % nx, tiZ = Math.floor(t / nx);
    const hfun = (k) => { const dx = Math.abs(k % nx - tiX), dz = Math.abs(Math.floor(k / nx) - tiZ); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    this.stamp[s] = st; this.g[s] = 0; this.came[s] = -1;
    push(s, hfun(s));
    let found = false, iter = 0;
    while (heap.length && iter++ < 30000) {
      const [, k] = pop();
      if (k === t) { found = true; break; }
      if (this.closed[k] === st) continue;
      this.closed[k] = st;
      const i = k % nx, j = Math.floor(k / nx);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= this.nz) continue;
        const n = jj * nx + ii;
        if (!this.allowed(n, mask) || !this._link(k, n)) continue;
        if (di && dj && (!this.allowed(j * nx + ii, mask) || !this.allowed(jj * nx + i, mask))) continue;
        const cost = this.g[k] + (di && dj ? 1.414 : 1);
        if (this.stamp[n] !== st || cost < this.g[n]) {
          this.stamp[n] = st; this.g[n] = cost; this.came[n] = k;
          push(n, cost + hfun(n));
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let k = t; k !== -1; k = this.came[k]) cells.push(k);
    cells.reverse();
    // 视线平滑
    const pts = [];
    let a = 0;
    pts.push(this.center(cells[0]));
    while (a < cells.length - 1) {
      let b = cells.length - 1;
      while (b > a + 1 && !this.los(cells[a], cells[b], mask)) b--;
      pts.push(this.center(cells[b]));
      a = b;
    }
    pts[pts.length - 1] = [tx, tz];
    return pts;
  }

  los(a, b, mask) {
    const [ax, az] = this.center(a), [bx, bz] = this.center(b);
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / (this.cell * 0.4));
    let prev = a;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      for (const off of [-0.6, 0.6]) {
        const ox = -(bz - az) / L * off, oz = (bx - ax) / L * off;
        const k = this.idx(ax + (bx - ax) * t + ox, az + (bz - az) * t + oz);
        if (!this.allowed(k, mask)) return false;
      }
      const k = this.idx(ax + (bx - ax) * t, az + (bz - az) * t);
      if (!this.allowed(k, mask) || !this._link(prev, k)) return false;
      prev = k;
    }
    return true;
  }
}

export const MASK = { lay: 1 << 1, priest: (1 << 2) | (1 << 3) | (1 << 4), levite: (1 << 1) | (1 << 2), all: (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) };
export const TEMPLE_Y = Y;
