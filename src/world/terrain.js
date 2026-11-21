// 地形网格、植被、大卫城民房与城墙、米罗、基训泉
import * as THREE from 'three';
import { BOUNDS, KIDRON, distToPolyline, fbm, nfast } from '../core/terrain-fn.js';
import { Builder } from './geom.js';
import { registry } from '../app/registry.js';
import { m2c } from '../app/state.js';

const CX = 40, CZ = 150;

function warp(u, lo, hi, c, k = 3.1) {
  const A = u < 0 ? c - lo : hi - c;
  return c + A * Math.sinh(k * u) / Math.sinh(k);
}

// 城墙走向（示意）：从大院西南角绕大卫城到大院东南角
export const CITY_WALL = [[-40, 486], [-60, 640], [-50, 820], [-18, 1020], [28, 1240], [74, 1460], [128, 1660], [196, 1640], [246, 1430], [252, 1220], [250, 1010], [244, 820], [232, 640], [176, 486]];
export const ROADS = [
  [[60, 486], [70, 640], [90, 900], [110, 1150], [140, 1400], [150, 1620]],         // 城中南北大道
  [[226, 0], [330, 30], [450, 70], [600, 60], [760, 20], [1000, -10], [1300, -30], [1650, -40]], // 东门下汲沦谷、上橄榄山
  [[128, 1660], [200, 1760], [330, 1820]],
];

export function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function buildTerrain(T, M, quality, platforms) {
  const N = quality === 'high' ? 380 : quality === 'mid' ? 300 : 210;
  const g = new THREE.PlaneGeometry(1, 1, N, N);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const rock = new THREE.Color('#d2c6aa'), soil = new THREE.Color('#9a7550'), scrub = new THREE.Color('#646b38'), dry = new THREE.Color('#c2a96c'), green = new THREE.Color('#58672f'), path = new THREE.Color('#cdb894'), worn = new THREE.Color('#b29a74'), shade = new THREE.Color('#5d4a36');
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2, v = pos.getZ(i) * 2;
    const x = warp(u, BOUNDS.x0, BOUNDS.x1, CX), z = warp(v, BOUNDS.z0, BOUNDS.z1, CZ);
    pos.setXYZ(i, x, T.heightAt(x, z), z);
  }
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const slope = 1 - nrm.getY(i);
    const n1 = nfast(x / 120, z / 120), n2 = nfast(x / 30 + 7, z / 30 + 2.5);
    c.copy(soil).lerp(dry, 0.5 + n1 * 0.6);
    c.lerp(scrub, Math.max(0, Math.min(1, 0.35 + n2 * 0.8 - slope * 1.5)));
    c.lerp(rock, Math.max(0, Math.min(1, slope * 5 - 0.35 + n2 * 0.3)));
    // 谷底与背阴处略暗，显出地势
    c.lerp(shade, Math.max(0, Math.min(0.35, (-y - 120) / 260)));
    // 梯田条纹（西山岗与橄榄山）
    if (x < -420 || x > 760) c.lerp(green, Math.max(0, Math.sin(y / 3.2) * 0.5 - 0.15) * (1 - slope * 3));
    // 汲沦谷底稍绿
    const k = distToPolyline(x, z, KIDRON).d;
    if (k < 70) c.lerp(green, (1 - k / 70) * 0.5);
    // 城内踩实的土
    if (inPoly(x, z, CITY_WALL)) c.lerp(worn, 0.45);
    for (const r of ROADS) { const d = distToPolyline(x, z, r).d; if (d < 7) c.lerp(path, (1 - d / 7) * 0.8); }
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(g, M.terrain);
  mesh.receiveShadow = true;
  mesh.userData.terrain = true;
  mesh.name = 'terrain';
  return mesh;
}

// —— 橄榄树 ——
export class Trees {
  constructor(T, M, quality, platforms) {
    this.T = T;
    const count = quality === 'high' ? 1100 : quality === 'mid' ? 700 : 360;
    const trunk = new THREE.CylinderGeometry(0.12, 0.2, 1, 5).translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 1);
    const p = crown.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const s = 1 + fbm(x * 2 + 3, z * 2 + y, 2) * 0.35;
      p.setXYZ(i, x * s * 1.2, y * s * 0.7, z * s * 1.2);
    }
    crown.computeVertexNormals();
    const cc = new Float32Array(p.count * 3).fill(1);
    crown.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    this.trunks = new THREE.InstancedMesh(trunk, M.bark, count);
    this.crowns = new THREE.InstancedMesh(crown, M.leaf, count);
    this.trunks.castShadow = this.crowns.castShadow = true;
    this.trunks.receiveShadow = this.crowns.receiveShadow = true;
    this.items = [];
    let tries = 0;
    const blocked = (x, z) => platforms.some((f) => x > f.x0 - 20 && x < f.x1 + 20 && z > f.z0 - 20 && z < f.z1 + 20) || inPoly(x, z, CITY_WALL);
    while (this.items.length < count && tries++ < count * 30) {
      // 多数在橄榄山与汲沦谷两侧，少量在西山岗与王园
      const r = Math.random();
      let x, z;
      if (r < 0.55) { x = 500 + Math.random() * 1500; z = -1500 + Math.random() * 3200; }
      else if (r < 0.75) { x = -1500 + Math.random() * 1100; z = -900 + Math.random() * 2500; }
      else if (r < 0.85) { x = 100 + Math.random() * 320; z = 1500 + Math.random() * 450; }
      else { x = -500 + Math.random() * 900; z = -1500 + Math.random() * 1300; }
      if (blocked(x, z)) continue;
      // 成簇
      if (nfast(x / 160 + 3.3, z / 160 + 8.1) < -0.05) continue;
      const y = T.heightAt(x, z);
      const e = 0.002;
      const sl = Math.abs(T.heightAt(x + 4, z) - y) / 4 + Math.abs(T.heightAt(x, z + 4) - y) / 4;
      if (sl > 0.9 + e) continue;
      this.items.push({ x, z, y, h: 4 + Math.random() * 3.5, w: 0.8 + Math.random() * 0.5, rot: Math.random() * 6.28, tint: Math.random() });
    }
    this.trunks.count = this.crowns.count = this.items.length;
    const color = new THREE.Color();
    this.items.forEach((t, i) => {
      color.setHSL(0.16 + t.tint * 0.06, 0.2 + t.tint * 0.12, 0.16 + t.tint * 0.07);
      this.crowns.setColorAt(i, color);
    });
    this.rescale();
    registry.add('olive_trees', this.crowns);
  }

  rescale() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    this.items.forEach((t, i) => {
      const H = m2c(t.h), W = H * 0.42 * t.w;
      q.setFromAxisAngle(up, t.rot);
      m.compose(p.set(t.x, t.y - 0.3, t.z), q, s.set(H * 0.12, H * 0.55, H * 0.12));
      this.trunks.setMatrixAt(i, m);
      m.compose(p.set(t.x, t.y + H * 0.62, t.z), q, s.set(W, W, W));
      this.crowns.setMatrixAt(i, m);
    });
    this.trunks.instanceMatrix.needsUpdate = this.crowns.instanceMatrix.needsUpdate = true;
    this.trunks.computeBoundingSphere(); this.crowns.computeBoundingSphere();
  }
}

// —— 大卫城民房 ——
export class Houses {
  constructor(T, M, quality, platforms) {
    this.T = T;
    const target = quality === 'high' ? 900 : quality === 'mid' ? 620 : 360;
    const body = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    // 平顶加矮栏杆（申22:8）
    const roof = new THREE.BoxGeometry(1, 0.06, 1).translate(0, 1.03, 0);
    this.bodies = new THREE.InstancedMesh(body, M.plaster, target);
    this.roofs = new THREE.InstancedMesh(roof, M.roofEarth, target);
    this.bodies.castShadow = this.bodies.receiveShadow = true;
    this.roofs.receiveShadow = true;
    this.items = [];
    const blocked = (x, z) => platforms.some((f) => x > f.x0 - 8 && x < f.x1 + 8 && z > f.z0 - 8 && z < f.z1 + 8);
    let tries = 0;
    const inner = CITY_WALL.map(([x, z]) => [x, z]);
    while (this.items.length < target && tries++ < target * 40) {
      const x = -70 + Math.random() * 330, z = 500 + Math.random() * 1180;
      if (!inPoly(x, z, inner) || blocked(x, z)) continue;
      // 离城墙留空
      let near = false;
      for (let i = 0; i < inner.length; i++) {
        const a = inner[i], b = inner[(i + 1) % inner.length];
        if (distToPolyline(x, z, [a, b]).d < 14) { near = true; break; }
      }
      if (near) continue;
      if (distToPolyline(x, z, ROADS[0]).d < 7) continue;
      if (x > 140 && x < 240 && z > 540 && z < 680) continue; // 米罗
      const w = 7 + Math.random() * 8, d = 6 + Math.random() * 6;
      // 不与已有房屋重叠
      let overlap = false;
      for (const h of this.items) {
        if (Math.abs(h.x - x) < (h.wc + m2c(w)) * 0.55 && Math.abs(h.z - z) < (h.dc + m2c(d)) * 0.55) { overlap = true; break; }
      }
      if (overlap) continue;
      const gx = T.heightAt(x + 3, z) - T.heightAt(x - 3, z), gz = T.heightAt(x, z + 3) - T.heightAt(x, z - 3);
      this.items.push({ x, z, w, d, h: 3 + Math.random() * (Math.random() < 0.2 ? 4 : 1.8), rot: Math.atan2(gz, gx), wc: m2c(w), dc: m2c(d), shade: 0.85 + Math.random() * 0.15 });
    }
    this.bodies.count = this.roofs.count = this.items.length;
    const c = new THREE.Color();
    this.items.forEach((h, i) => { c.setRGB(h.shade, h.shade * 0.97, h.shade * 0.92); this.bodies.setColorAt(i, c); });
    this.rescale();
    registry.add('houses', this.bodies);
    registry.add('houses', this.roofs);
  }

  rescale() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    this.items.forEach((h, i) => {
      const W = m2c(h.w), D = m2c(h.d), H = m2c(h.h);
      const cs = Math.cos(h.rot), sn = Math.sin(h.rot);
      let lo = Infinity, hi = -Infinity;
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const y = this.T.heightAt(h.x + (a * W * cs - b * D * sn) / 2, h.z + (a * W * sn + b * D * cs) / 2);
        lo = Math.min(lo, y); hi = Math.max(hi, y);
      }
      const base = lo - 1, top = hi + H;
      q.setFromAxisAngle(up, -h.rot);
      m.compose(p.set(h.x, base, h.z), q, s.set(W, top - base, D));
      this.bodies.setMatrixAt(i, m);
      this.roofs.setMatrixAt(i, m);
    });
    this.bodies.instanceMatrix.needsUpdate = this.roofs.instanceMatrix.needsUpdate = true;
    this.bodies.computeBoundingSphere(); this.roofs.computeBoundingSphere();
  }
}

// —— 城墙、米罗、基训泉 ——
export function buildCityWorks(T, M, group) {
  const B = new Builder(M);
  const wall = CITY_WALL;
  const H = 16, Tk = 6;
  for (let i = 0; i < wall.length - 1; i++) {
    const [ax, az] = wall[i], [bx, bz] = wall[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(L / 24);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const gy = Math.min(T.heightAt(x0, z0), T.heightAt(x1, z1), T.heightAt(mx, mz));
      const seg = new THREE.BoxGeometry(Math.hypot(x1 - x0, z1 - z0) + 0.6, H + 14, Tk);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(mx, gy - 14 + (H + 14) / 2, mz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(z1 - z0, x1 - x0)), new THREE.Vector3(1, 1, 1));
      seg.applyMatrix4(m);
      B.add('citywall', 'stone', seg);
      // 垛口
      for (let j = 0; j < 4; j++) {
        const t = (j + 0.5) / 4;
        const cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t;
        const mer = new THREE.BoxGeometry(2.4, 2, Tk * 0.4);
        mer.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(cx, gy + H + 1, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(z1 - z0, x1 - x0)), new THREE.Vector3(1, 1, 1)));
        mer.translate(0, 0, 0);
        B.add('citywall', 'stone', mer);
      }
    }
    // 城楼
    const ty = T.heightAt(ax, az);
    B.box('citywall', 'stone', ax - 8, ty - 14, az - 8, ax + 8, ty + H + 6, az + 8);
  }
  for (const m of B.build(group)) m.geometry.computeBoundingBox();

  // 米罗：大卫城北端东坡的阶梯形石台（推测）
  const B2 = new Builder(M);
  for (let s = 0; s < 9; s++) {
    const x0 = 150 + s * 9, x1 = x0 + 12;
    const z0 = 560 + s * 2, z1 = 680 - s * 3;
    const y = T.heightAt(x0 + 6, (z0 + z1) / 2);
    B2.box('millo', 'stoneBig', x0, y - 20, z0, x1, y + 3, z1);
  }
  B2.build(group);

  // 基训泉：谷底的泉眼与水池
  const gx = 300, gz = 1062, gy = T.heightAt(gx, gz);
  const B3 = new Builder(M);
  B3.box('gihon', 'stoneBig', gx - 10, gy - 6, gz - 8, gx + 10, gy + 1.4, gz - 6);
  B3.box('gihon', 'stoneBig', gx - 10, gy - 6, gz + 6, gx + 10, gy + 1.4, gz + 8);
  B3.box('gihon', 'stoneBig', gx - 12, gy - 6, gz - 8, gx - 10, gy + 1.4, gz + 8);
  B3.box('gihon', 'stoneBig', gx + 10, gy - 6, gz - 8, gx + 12, gy + 1.4, gz + 8);
  B3.box('gihon', 'stoneBig', gx - 14, gy - 2, gz - 10, gx - 12, gy + 6, gz + 10);
  B3.box('gihon', 'water', gx - 10, gy - 2, gz - 6, gx + 10, gy + 0.6, gz + 6);
  B3.build(group);
  registry.setFocus('gihon', [gx, gy, gz], 90);
  registry.setFocus('millo', [190, T.heightAt(190, 620), 620], 220);
  registry.setFocus('citywall', [120, -80, 1000], 900);
}
