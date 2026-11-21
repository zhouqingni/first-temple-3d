// 碰撞世界：轴对齐盒体与坡道，供漫步者与人群使用。纯函数逻辑，不依赖 three。

export class CollisionWorld {
  constructor(cell = 16) {
    this.cell = cell;
    this.items = [];
    this.grid = new Map();
    this.terrain = () => -Infinity;
    this._stamp = 0;
  }

  setTerrain(fn) { this.terrain = fn; }

  _key(ix, iz) { return (ix + 32768) * 65536 + (iz + 32768); }

  _insert(it) {
    const c = this.cell;
    for (let ix = Math.floor(it.x0 / c); ix <= Math.floor(it.x1 / c); ix++) {
      for (let iz = Math.floor(it.z0 / c); iz <= Math.floor(it.z1 / c); iz++) {
        const k = this._key(ix, iz);
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(it);
      }
    }
    this.items.push(it);
    return it;
  }

  addBox(x0, y0, z0, x1, y1, z1, tag = '') {
    return this._insert({
      type: 'box', tag, alive: true, seen: 0,
      x0: Math.min(x0, x1), x1: Math.max(x0, x1),
      y0: Math.min(y0, y1), y1: Math.max(y0, y1),
      z0: Math.min(z0, z1), z1: Math.max(z0, z1),
    });
  }

  // 坡道：顶面沿 axis 从 ya（在最小端）线性变到 yb（在最大端）
  addRamp(x0, z0, x1, z1, ya, yb, axis = 'z', tag = '') {
    return this._insert({
      type: 'ramp', tag, alive: true, seen: 0, axis, ya, yb,
      x0: Math.min(x0, x1), x1: Math.max(x0, x1),
      z0: Math.min(z0, z1), z1: Math.max(z0, z1),
      y0: Math.min(ya, yb) - 4, y1: Math.max(ya, yb),
    });
  }

  removeTag(tag) {
    for (const it of this.items) if (it.tag === tag) it.alive = false;
    this.items = this.items.filter((it) => it.alive);
    for (const [k, arr] of this.grid) {
      const f = arr.filter((it) => it.alive);
      if (f.length) this.grid.set(k, f); else this.grid.delete(k);
    }
  }

  top(it, x, z) {
    if (it.type === 'box') return it.y1;
    let t = it.axis === 'z' ? (z - it.z0) / (it.z1 - it.z0) : (x - it.x0) / (it.x1 - it.x0);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return it.ya + (it.yb - it.ya) * t;
  }

  query(x0, z0, x1, z1, fn) {
    const c = this.cell;
    const stamp = ++this._stamp;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) {
      for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
        const arr = this.grid.get(this._key(ix, iz));
        if (!arr) continue;
        for (const it of arr) {
          if (it.seen === stamp) continue;
          it.seen = stamp;
          if (it.x1 < x0 || it.x0 > x1 || it.z1 < z0 || it.z0 > z1) continue;
          fn(it);
        }
      }
    }
  }

  groundAt(x, z, y, step = 1.1) {
    let g = this.terrain(x, z);
    this.query(x, z, x, z, (it) => {
      const t = this.top(it, x, z);
      if (t <= y + step && t > g && (it.type !== 'box' || it.y0 < y + step)) g = t;
    });
    return g;
  }

  blocked(x, z, y, r = 0.6, h = 3.2, step = 1.1) {
    if (this.terrain(x, z) > y + step) return true;
    let hit = false;
    this.query(x - r, z - r, x + r, z + r, (it) => {
      if (hit) return;
      const cx = x < it.x0 ? it.x0 : x > it.x1 ? it.x1 : x;
      const cz = z < it.z0 ? it.z0 : z > it.z1 ? it.z1 : z;
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz >= r * r) return;
      const t = this.top(it, cx, cz);
      if (t > y + step && it.y0 < y + h) hit = true;
    });
    return hit;
  }

  // 平移并贴地；被挡时沿墙滑动。返回是否完整移动
  move(p, dx, dz, r = 0.6, h = 3.2, step = 1.1) {
    let full = true;
    if (!this.blocked(p.x + dx, p.z + dz, p.y, r, h, step)) { p.x += dx; p.z += dz; }
    else if (dx && !this.blocked(p.x + dx, p.z, p.y, r, h, step)) { p.x += dx; full = false; }
    else if (dz && !this.blocked(p.x, p.z + dz, p.y, r, h, step)) { p.z += dz; full = false; }
    else full = false;
    p.y = this.groundAt(p.x, p.z, p.y, step);
    return full;
  }
}
