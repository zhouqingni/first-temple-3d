// 平面图：画出院落与殿宇，标出当前位置与视向；点按前往
import { HOUSE, PORCH, INNER, GREAT, TERRACES, PALACE, ALTAR, SEA, STANDS, PLATFORM, PILLARS, Y } from '../core/layout.js';

const AREA = { x0: -170, x1: 260, z0: -112, z1: 500 };

export class Minimap {
  constructor(canvas, controls, camera) {
    this.c = canvas; this.controls = controls; this.camera = camera;
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.resize();
    addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const r = canvas.getBoundingClientRect();
      const [x, z] = this.toWorld((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      if (controls.mode === 'walk') {
        const y = controls.world.groundAt(x, z, 60, 200);
        if (y > -60 && !controls.world.blocked(x, z, y, controls.radius, controls.height, 0.2)) { controls.p.set(x, y, z); }
      } else {
        const t = controls.orbit.target;
        const dx = x - t.x, dz = z - t.z;
        const pos = camera.position.clone(); pos.x += dx; pos.z += dz;
        controls.flyTo({ pos: pos.toArray(), target: [x, t.y, z], duration: 1.2, arc: false });
      }
    });
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    if (!r.width) return;
    this.c.width = Math.round(r.width * this.dpr); this.c.height = Math.round(r.height * this.dpr);
    this.base = null;
  }

  toWorld(u, v) { return [AREA.x0 + u * (AREA.x1 - AREA.x0), AREA.z0 + v * (AREA.z1 - AREA.z0)]; }

  drawBase() {
    const W = this.c.width, H = this.c.height;
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const g = off.getContext('2d');
    const cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue('--ink').trim() || '#221c15', gold = cs.getPropertyValue('--gold').trim() || '#9a6f1f';
    const sx = W / (AREA.x1 - AREA.x0), sz = H / (AREA.z1 - AREA.z0);
    const R = (x0, z0, x1, z1, fill, stroke, lw = 1) => {
      const X = (x0 - AREA.x0) * sx, Z = (z0 - AREA.z0) * sz, w = (x1 - x0) * sx, h = (z1 - z0) * sz;
      if (fill) { g.fillStyle = fill; g.fillRect(X, Z, w, h); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw * this.dpr; g.strokeRect(X, Z, w, h); }
    };
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(128,110,80,0.10)'; g.fillRect(0, 0, W, H);
    R(GREAT.x0, GREAT.z0, GREAT.x1, GREAT.z1, 'rgba(160,140,100,0.25)', ink, 1);
    for (const t of TERRACES) R(t.x0, t.z0, t.x1, t.z1, 'rgba(160,140,100,0.18)', ink, 0.8);
    R(INNER.x0, INNER.z0, INNER.x1, INNER.z1, 'rgba(200,170,110,0.35)', ink, 1.2);
    R(HOUSE.chamberOuterX, -HOUSE.chamberOuterZ, HOUSE.eastOuter, HOUSE.chamberOuterZ, ink, null);
    R(PORCH.x0, -PORCH.halfW - PORCH.sideT, PORCH.front, PORCH.halfW + PORCH.sideT, ink, null);
    R(HOUSE.x0, -HOUSE.halfW, HOUSE.x1, HOUSE.halfW, gold, null);
    R(ALTAR.cx - 10, -10, ALTAR.cx + 10, 10, gold, null);
    R(ALTAR.ramp.x0, ALTAR.ramp.z0, ALTAR.ramp.x1, ALTAR.ramp.z1, 'rgba(150,120,80,0.8)', null);
    g.fillStyle = gold; g.beginPath(); g.arc((SEA.cx - AREA.x0) * sx, (SEA.cz - AREA.z0) * sz, 6 * sx, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) for (const x of STANDS.xs) R(x - 2, s * STANDS.z - 2, x + 2, s * STANDS.z + 2, gold, null);
    for (const s of [-1, 1]) { g.beginPath(); g.arc((PILLARS.x - AREA.x0) * sx, (s * PILLARS.z - AREA.z0) * sz, 2.4 * sx, 0, Math.PI * 2); g.fill(); }
    R(PLATFORM.cx - 2.5, -2.5, PLATFORM.cx + 2.5, 2.5, gold, null);
    for (const b of Object.values(PALACE)) R(b.x0, b.z0, b.x1, b.z1, 'rgba(90,70,50,0.55)', ink, 0.6);
    g.fillStyle = ink; g.font = `${11 * this.dpr}px "Noto Serif SC", "Songti SC", serif`; g.textAlign = 'center';
    const T = (t, x, z) => g.fillText(t, (x - AREA.x0) * sx, (z - AREA.z0) * sz);
    T('殿', 10, -32); T('内院', 20, 44); T('大院', 160, -88); T('宫室', 65, 250); T('北', 250 - 160, -100);
    this.base = off;
  }

  draw() {
    if (this.c.hidden) return;
    if (!this.base) this.drawBase();
    const g = this.c.getContext('2d');
    const W = this.c.width, H = this.c.height;
    g.clearRect(0, 0, W, H);
    g.drawImage(this.base, 0, 0);
    const c = this.controls;
    const p = c.mode === 'walk' ? c.p : this.camera.position;
    const t = c.mode === 'walk' ? null : c.orbit.target;
    const sx = W / (AREA.x1 - AREA.x0), sz = H / (AREA.z1 - AREA.z0);
    const X = (p.x - AREA.x0) * sx, Z = (p.z - AREA.z0) * sz;
    const dir = this.camera.getWorldDirection(this._d ??= this.camera.position.clone());
    const a = Math.atan2(dir.z, dir.x);
    const inside = X > 0 && X < W && Z > 0 && Z < H;
    g.save();
    if (inside) {
      g.translate(X, Z); g.rotate(a);
      g.fillStyle = 'rgba(242,190,80,0.35)';
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 26 * this.dpr, -0.5, 0.5); g.closePath(); g.fill();
      g.fillStyle = '#c0392b'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * this.dpr;
      g.beginPath(); g.moveTo(7 * this.dpr, 0); g.lineTo(-5 * this.dpr, 4.5 * this.dpr); g.lineTo(-5 * this.dpr, -4.5 * this.dpr); g.closePath(); g.fill(); g.stroke();
    } else if (t) {
      const TX = (t.x - AREA.x0) * sx, TZ = (t.z - AREA.z0) * sz;
      g.strokeStyle = '#c0392b'; g.lineWidth = 2 * this.dpr;
      g.beginPath(); g.arc(TX, TZ, 5 * this.dpr, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
}
