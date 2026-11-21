// 院落与铜器：内院、大院、院墙、院门、铜坛与坡道、铜海与十二铜牛、盆座、铜台、雅斤与波阿斯
import * as THREE from 'three';
import { Builder, lathe, tube, merge, transformed, mat4 } from './geom.js';
import { INNER, GREAT, GATES, GATE, GREAT_GATES, TERRACES, ALTAR, SEA, STANDS, PLATFORM, PILLARS, Y, ASCENT } from '../core/layout.js';
import { registry } from '../app/registry.js';
import { state } from '../app/state.js';
import { canvas } from './motifs.js';

const F = Y.floor;

function minNatural(T, x0, x1, z0, z1) {
  let m = Infinity;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) m = Math.min(m, T.natural(x0 + (x1 - x0) * i / 8, z0 + (z1 - z0) * j / 8));
  return m;
}

// 平台：顶面铺石，侧面是大石头砌的护墙（王上7:10 根基是宝贵的大石头）
function platform(B, world, T, id, x0, x1, z0, z1, y, top = 'pavement') {
  const bottom = Math.min(y - 3, minNatural(T, x0 - 4, x1 + 4, z0 - 4, z1 + 4) - 4);
  B.box(id, 'stoneBig', x0, bottom, z0, x1, y - 0.3, z1, { uvOrigin: [0, bottom, 0] });
  B.box(id, top, x0, y - 0.3, z0, x1, y, z1);
  world.addBox(x0, bottom, z0, x1, y, z1, 'platform');
}

// 院墙：三层凿成的石头、一层香柏木（王上6:36、7:12）。gaps: 沿墙方向的开口 [a0,a1]
function courtWall(B, world, id, axis, a0, a1, t0, t1, y, h = 5.6, gaps = []) {
  const segs = [];
  let s = a0;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > s) segs.push([s, g0]); s = Math.max(s, g1); }
  if (a1 > s) segs.push([s, a1]);
  const stoneH = h * 6 / 7;
  for (const [p, q] of segs) {
    const box = (mat, ya, yb, e = 0) => axis === 'x' ? B.box(id, mat, p, ya, t0 - e, q, yb, t1 + e, { uvOrigin: [0, y, 0] }) : B.box(id, mat, t0 - e, ya, p, t1 + e, yb, q, { uvOrigin: [0, y, 0] });
    box('courtStone', y, y + stoneH);
    box('cedar', y + stoneH, y + h, 0.08);
    if (axis === 'x') world.addBox(p, y, t0, q, y + h, t1, 'wall'); else world.addBox(t0, y, p, t1, y + h, q, 'wall');
  }
}

// 台阶：从 (u, w0) 起，沿 dir 方向（'+x','-x','+z','-z'）每级下降 rise
function stairs(B, world, id, dir, along0, along1, start, yTop, yBottom, rise = 0.5, run = 1, mat = 'stone') {
  const n = Math.max(1, Math.round((yTop - yBottom) / rise));
  const r = (yTop - yBottom) / n;
  for (let i = 0; i < n; i++) {
    const top = yTop - (i + 1) * r;
    const w0 = start + (dir[0] === '+' ? i * run : -(i + 1) * run), w1 = w0 + run;
    if (dir[1] === 'x') { B.box(id, mat, w0, yBottom - 1, along0, w1, top, along1); world.addBox(w0, yBottom - 1, along0, w1, top, along1, 'stairs'); }
    else { B.box(id, mat, along0, yBottom - 1, w0, along1, top, w1); world.addBox(along0, yBottom - 1, w0, along1, top, w1, 'stairs'); }
  }
  return n * run;
}

// 门楼：local 坐标 u（沿墙）、w（向外为正）、y
function gatehouse(B, world, M, group, { id, x, z, side, yIn, yOut, towerH = GATE.h, open = GATE.open }) {
  const ax = side === 'e' || side === 'w' ? 'z' : 'x';
  const sgn = side === 'e' || side === 's' ? 1 : -1;
  const toW = (u, w) => ax === 'z' ? [x + sgn * w, z + u] : [x + u, z + sgn * w];
  const box = (mat, u0, u1, w0, w1, y0, y1, collide = true) => {
    const [ax0, az0] = toW(u0, w0), [ax1, az1] = toW(u1, w1);
    B.box(id, mat, Math.min(ax0, ax1), y0, Math.min(az0, az1), Math.max(ax0, ax1), y1, Math.max(az0, az1), { uvOrigin: [0, yIn, 0] });
    if (collide) world.addBox(Math.min(ax0, ax1), y0, Math.min(az0, az1), Math.max(ax0, ax1), y1, Math.max(az0, az1), 'gate');
  };
  const half = open / 2, tw = GATE.towerW, d = GATE.depth / 2;
  for (const s of [-1, 1]) {
    const u0 = s * half, u1 = s * (half + tw);
    box('stone', Math.min(u0, u1), Math.max(u0, u1), -d, d, yOut - 1, yIn + towerH);
    box('cedar', Math.min(u0, u1) - 0.2, Math.max(u0, u1) + 0.2, -d - 0.2, d + 0.2, yIn + towerH - 0.8, yIn + towerH - 0.1, false);
    // 垛口
    for (let k = 0; k < 2; k++) for (const ww of [-d + 0.6, d - 0.6]) {
      const uc = s * (half + 1.2 + k * 3.6);
      box('stone', uc - 0.8, uc + 0.8, ww - 0.5, ww + 0.5, yIn + towerH, yIn + towerH + 1.4, false);
    }
  }
  box('stone', -half, half, -d, d, yIn + 10.5, yIn + towerH - 0.8, false);
  box('cedar', -half - 0.3, half + 0.3, d - 0.4, d + 0.25, yIn + 9.9, yIn + 10.6, false);
  // 门洞地面（伸出平台的部分）
  box('pavement', -half, half, 0, d, yOut - 1, yIn, true);
  // 铜包的门扇（代下4:9），开着贴在门洞两侧
  for (const s of [-1, 1]) {
    const [hx, hz] = toW(s * half, -d + 0.4);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(half - 0.1, 9.6, 0.2).translate((half - 0.1) / 2, 4.8, 0), M.bronze);
    const g = new THREE.Group(); g.position.set(hx, yIn, hz);
    // 开启：叶片朝院内贴墙
    const along = ax === 'z' ? new THREE.Vector3(0, 0, -s) : new THREE.Vector3(-s, 0, 0);
    const inward = ax === 'z' ? new THREE.Vector3(-sgn, 0, 0) : new THREE.Vector3(0, 0, -sgn);
    const dir = along.clone().lerp(inward, 0.92).normalize();
    g.rotation.y = Math.atan2(-dir.z, dir.x);
    leaf.castShadow = leaf.receiveShadow = true;
    g.add(leaf); group.add(g);
    registry.add(id, leaf);
    for (let k = 0; k < 4; k++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(half - 0.2, 0.14, 0.32).translate((half - 0.1) / 2, 1.2 + k * 2.4, 0), M.bronzeDark);
      g.add(st);
    }
  }
  return { toW, ax, sgn, half, d };
}

function standUV(g) { return g; }

export function buildCourts(M, world, scene, T) {
  const group = new THREE.Group(); group.name = 'courts';
  scene.add(group);
  const B = new Builder(M);

  // —— 平台 ——
  platform(B, world, T, 'inner_court', INNER.x0, INNER.x1, INNER.z0, INNER.z1, Y.inner, 'pavement');
  platform(B, world, T, 'great_court', GREAT.x0, GREAT.x1, GREAT.z0, GREAT.z1, Y.great, 'pavementCoarse');
  for (const t of TERRACES) platform(B, world, T, 'palace', t.x0, t.x1, t.z0, t.z1, t.y, 'pavementCoarse');

  // —— 内院墙与门 ——
  const wt = INNER.wallT;
  const gapAt = (side) => GATES.filter((g) => g.side === side).map((g) => [(side === 'e' ? g.z : g.x) - GATE.open / 2 - GATE.towerW, (side === 'e' ? g.z : g.x) + GATE.open / 2 + GATE.towerW]);
  courtWall(B, world, 'court_wall', 'x', INNER.x0, INNER.x1, INNER.z0, INNER.z0 + wt, Y.inner, INNER.wallH, gapAt('n'));
  courtWall(B, world, 'court_wall', 'x', INNER.x0, INNER.x1, INNER.z1 - wt, INNER.z1, Y.inner, INNER.wallH, gapAt('s'));
  courtWall(B, world, 'court_wall', 'z', INNER.z0 + wt, INNER.z1 - wt, INNER.x0, INNER.x0 + wt, Y.inner, INNER.wallH);
  courtWall(B, world, 'court_wall', 'z', INNER.z0 + wt, INNER.z1 - wt, INNER.x1 - wt, INNER.x1, Y.inner, INNER.wallH, gapAt('e'));
  for (const g of GATES) {
    gatehouse(B, world, M, group, { id: g.id, x: g.x, z: g.z, side: g.side, yIn: Y.inner, yOut: Y.great });
    const d = GATE.depth / 2;
    if (g.side === 'e') stairs(B, world, g.id, '+x', -6, 6, g.x + d, Y.inner, Y.great);
    if (g.side === 'n') stairs(B, world, g.id, '-z', g.x - 6, g.x + 6, g.z - d, Y.inner, Y.great);
    if (g.side === 's') stairs(B, world, g.id, '+z', g.x - 6, g.x + 6, g.z + d, Y.inner, Y.great);
  }
  registry.setFocus('gate_east', [INNER.x1, 6, 0], 60, [1, 0.35, 0.5]);
  registry.setFocus('gate_north', [120, 6, INNER.z0], 55, [0.5, 0.35, -1]);
  registry.setFocus('gate_south', [120, 6, INNER.z1], 55, [0.5, 0.35, 1]);
  registry.setFocus('inner_court', [60, 0, 0], 190, [0.8, 0.9, 0.7]);
  registry.setFocus('great_court', [50, -6, 10], 330, [0.7, 0.8, 0.9]);
  registry.setFocus('court_wall', [-20, 3, INNER.z1], 40, [0.3, 0.3, 1]);

  // —— 大院墙与门 ——
  const gw = GREAT.wallT;
  courtWall(B, world, 'great_court', 'x', GREAT.x0, GREAT.x1, GREAT.z0, GREAT.z0 + gw, Y.great, GREAT.wallH, [[40 - GATE.open / 2 - GATE.towerW, 40 + GATE.open / 2 + GATE.towerW]]);
  courtWall(B, world, 'great_court', 'z', GREAT.z0 + gw, GREAT.z1, GREAT.x0, GREAT.x0 + gw, Y.great, GREAT.wallH);
  courtWall(B, world, 'great_court', 'z', GREAT.z0 + gw, GREAT.z1, GREAT.x1 - gw, GREAT.x1, Y.great, GREAT.wallH, [[-GATE.open / 2 - GATE.towerW, GATE.open / 2 + GATE.towerW]]);
  courtWall(B, world, 'great_court', 'x', GREAT.x0, GREAT.x1, GREAT.z1 - gw, GREAT.z1, Y.great, GREAT.wallH, [[ASCENT.x - ASCENT.w / 2, ASCENT.x + ASCENT.w / 2]]);
  for (const g of GREAT_GATES) {
    gatehouse(B, world, M, group, { id: 'great_court', x: g.x, z: g.z, side: g.side, yIn: Y.great, yOut: Y.great - 1, towerH: 16 });
    const d = GATE.depth / 2;
    if (g.side === 'e') {
      const ground = T.natural(g.x + 24, 0);
      const run = stairs(B, world, 'road', '+x', -6, 6, g.x + d, Y.great, Math.min(Y.great - 0.5, ground + 0.4), 0.5, 1.1);
      for (const s of [-1, 1]) B.box('road', 'stoneBig', g.x + d, ground - 4, s * 6, g.x + d + run, Y.great - 0.4, s * 7.2);
    }
    if (g.side === 'n') {
      const ground = T.natural(g.x, g.z - 18);
      if (ground < Y.great) stairs(B, world, 'road', '-z', g.x - 6, g.x + 6, g.z - d, Y.great, ground + 0.4);
      else { const n = Math.round((ground + 0.4 - Y.great) / 0.5); stairs(B, world, 'road', '+z', g.x - 6, g.x + 6, g.z - d - n, ground + 0.4, Y.great); }
    }
  }

  // —— 宫室台地的墙与台阶 ——
  const [p1, p2, p3] = TERRACES;
  for (const t of TERRACES) {
    courtWall(B, world, 'palace', 'z', t.z0, t.z1, t.x0, t.x0 + gw, t.y, GREAT.wallH);
    courtWall(B, world, 'palace', 'z', t.z0, t.z1, t.x1 - gw, t.x1, t.y, GREAT.wallH);
  }
  // 上耶和华殿的台阶（王上10:5）：从王宫台地上到大院
  stairs(B, world, 'royal_ascent', '+z', ASCENT.x - ASCENT.w / 2, ASCENT.x + ASCENT.w / 2, GREAT.z1, Y.great, p1.y, 0.5, 1);
  for (const s of [-1, 1]) B.box('royal_ascent', 'cedar', ASCENT.x + s * (ASCENT.w / 2 + 0.2) - 0.2, p1.y, GREAT.z1, ASCENT.x + s * (ASCENT.w / 2 + 0.2) + 0.2, Y.great + 1.2, GREAT.z1 + 16);
  registry.setFocus('royal_ascent', [ASCENT.x, (Y.great + p1.y) / 2, GREAT.z1 + 8], 46, [1, 0.5, 0.6]);
  // p1 → p2，p2 → p3（王上7:6 廊外有柱子和台阶）
  const parapet = (t, gaps) => {
    const segs = []; let s = t.x0;
    for (const [a, b] of gaps) { segs.push([s, a]); s = b; }
    segs.push([s, t.x1]);
    for (const [a, b] of segs) { B.box('palace', 'courtStone', a, t.y, t.z1 - 1.2, b, t.y + 1.6, t.z1, { uvOrigin: [0, t.y, 0] }); world.addBox(a, t.y, t.z1 - 1.2, b, t.y + 1.6, t.z1, 'wall'); }
  };
  parapet(p1, [[100, 114]]);
  stairs(B, world, 'palace', '+z', 100, 114, p1.z1, p1.y, p2.y, 0.5, 1);
  parapet(p2, [[58, 72]]);
  stairs(B, world, 'hall_pillars', '+z', 58, 72, p2.z1, p2.y, p3.y, 0.5, 1);
  // 南门（往大卫城）
  courtWall(B, world, 'palace', 'x', p3.x0, p3.x1, p3.z1 - gw, p3.z1, p3.y, GREAT.wallH, [[60 - GATE.open / 2 - GATE.towerW, 60 + GATE.open / 2 + GATE.towerW]]);
  gatehouse(B, world, M, group, { id: 'palace', x: 60, z: p3.z1, side: 's', yIn: p3.y, yOut: p3.y - 1, towerH: 16 });
  {
    const ground = T.natural(60, p3.z1 + 20);
    const d = GATE.depth / 2;
    if (ground < p3.y) stairs(B, world, 'road', '+z', 54, 66, p3.z1 + d, p3.y, ground + 0.4, 0.5, 1.1);
  }

  // —— 铜坛（代下4:1）——
  const A = ALTAR, a0x = A.cx - A.size / 2, a1x = A.cx + A.size / 2, a0z = A.cz - A.size / 2, a1z = A.cz + A.size / 2;
  B.box('altar', 'stoneBig', a0x - 0.8, Y.inner, a0z - 0.8, a1x + 0.8, Y.inner + 1.2, a1z + 0.8);
  B.box('altar', 'bronze', a0x, Y.inner + 1.2, a0z, a1x, Y.inner + 7.6, a1z);
  B.box('altar', 'bronzeDark', a0x - 0.5, Y.inner + 7.6, a0z - 0.5, a1x + 0.5, Y.inner + 8.4, a1z + 0.5);
  B.box('altar', 'bronze', a0x, Y.inner + 8.4, a0z, a1x, Y.inner + A.h, a1z);
  // 侧面的铜板缝
  for (let k = 1; k < 5; k++) {
    const x = a0x + k * 4;
    for (const z of [a0z - 0.04, a1z]) B.box('altar', 'bronzeDark', x - 0.08, Y.inner + 1.2, z, x + 0.08, Y.inner + 7.6, z + 0.04);
    const zz = a0z + k * 4;
    for (const xx of [a0x - 0.04, a1x]) B.box('altar', 'bronzeDark', xx, Y.inner + 1.2, zz - 0.08, xx + 0.04, Y.inner + 7.6, zz + 0.08);
  }
  // 四角（出27:2）
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const hx = A.cx + sx * (A.size / 2 - 1.6), hz = A.cz + sz * (A.size / 2 - 1.6);
    B.add('altar', 'bronze', lathe([[0.9, 0], [0.9, 0.7], [0.7, 1.2], [0.35, 1.6], [0.01, 1.75]], 12).translate(hx, Y.inner + A.h, hz));
  }
  // 坛上的柴（火与烟在 fx）
  for (let i = 0; i < 18; i++) {
    const g = new THREE.CylinderGeometry(0.22, 0.22, 4 + (i % 3), 6).rotateZ(Math.PI / 2).rotateY((i * 0.7) % Math.PI);
    g.translate(A.cx + Math.cos(i * 1.7) * 2.2, Y.inner + A.h + 0.25 + (i % 3) * 0.32, A.cz + Math.sin(i * 1.3) * 2.2);
    B.add('altar_fire', 'dark', g);
  }
  B.box('altar_fire', 'ember', A.cx - 3.2, Y.inner + A.h, A.cz - 3.2, A.cx + 3.2, Y.inner + A.h + 0.12, A.cz + 3.2);
  world.addBox(a0x, Y.inner, a0z, a1x, Y.inner + A.h, a1z, 'altar');
  world.addBox(a0x - 0.8, Y.inner, a0z - 0.8, a1x + 0.8, Y.inner + 1.2, a1z + 0.8, 'altar');
  world.addBox(A.cx - 4, Y.inner + A.h, A.cz - 4, A.cx + 4, Y.inner + A.h + 3, A.cz + 4, 'altar');
  // 坡道（出20:26）
  const R = A.ramp;
  const rg = new THREE.BufferGeometry();
  {
    const x0 = R.x0, x1 = R.x1, z0 = R.z0, z1 = R.z1, yT = Y.inner + A.h, yB = Y.inner;
    const v = [
      x0, yT, z0, x1, yT, z0, x1, yB, z1, x0, yB, z1, // 顶斜面
      x0, yB - 0.5, z0, x0, yT, z0, x0, yB, z1, x0, yB - 0.5, z1, // 西侧
      x1, yT, z0, x1, yB - 0.5, z0, x1, yB - 0.5, z1, x1, yB, z1, // 东侧
    ];
    rg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    rg.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6, 8, 10, 9, 8, 11, 10]);
    rg.computeVertexNormals();
    const uv = [];
    for (let i = 0; i < v.length; i += 3) uv.push(i < 12 ? v[i] : v[i + 2], i < 12 ? v[i + 2] : v[i + 1]);
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  }
  B.add('altar_ramp', 'stoneBig', rg);
  for (const x of [R.x0 - 0.5, R.x1]) {
    const cg = new THREE.BufferGeometry();
    const yT = Y.inner + A.h + 0.8, yB = Y.inner + 0.8;
    cg.setAttribute('position', new THREE.Float32BufferAttribute([x, yT, R.z0, x + 0.5, yT, R.z0, x + 0.5, yB, R.z1, x, yB, R.z1, x, Y.inner, R.z1, x + 0.5, Y.inner, R.z1], 3));
    cg.setIndex([0, 3, 1, 1, 3, 2, 3, 4, 5, 3, 5, 2]);
    cg.computeVertexNormals();
    cg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1], 2));
    B.add('altar_ramp', 'stoneBig', cg);
  }
  world.addRamp(R.x0, R.z0, R.x1, R.z1, Y.inner + A.h, Y.inner, 'z', 'ramp');
  world.addBox(R.x0 - 0.6, Y.inner, R.z0, R.x0, Y.inner + 40, R.z1 - 2, 'ramp');
  world.addBox(R.x1, Y.inner, R.z0, R.x1 + 0.6, Y.inner + 40, R.z1 - 2, 'ramp');
  registry.setFocus('altar', [A.cx, 6, A.cz], 55, [0.9, 0.6, 0.8]);
  registry.setFocus('altar_ramp', [A.cx, 5, (R.z0 + R.z1) / 2], 45, [1, 0.45, 0.6]);
  registry.setFocus('altar_fire', [A.cx, A.h + 2, A.cz], 26, [0.8, 0.7, 0.6]);

  // —— 铜台（代下6:13）——
  const PL = PLATFORM;
  B.box('platform', 'bronze', PL.cx - PL.size / 2, Y.inner, PL.cz - PL.size / 2, PL.cx + PL.size / 2, Y.inner + PL.h - 0.25, PL.cz + PL.size / 2);
  B.box('platform', 'bronzeDark', PL.cx - PL.size / 2 - 0.15, Y.inner + PL.h - 0.25, PL.cz - PL.size / 2 - 0.15, PL.cx + PL.size / 2 + 0.15, Y.inner + PL.h, PL.cz + PL.size / 2 + 0.15);
  world.addBox(PL.cx - PL.size / 2, Y.inner, PL.cz - PL.size / 2, PL.cx + PL.size / 2, Y.inner + PL.h, PL.cz + PL.size / 2, 'platform');
  stairs(B, world, 'platform', '+x', PL.cz - 1.4, PL.cz + 1.4, PL.cx + PL.size / 2, Y.inner + PL.h, Y.inner, 0.5, 0.7, 'bronzeDark');
  registry.setFocus('platform', [PL.cx, 2, PL.cz], 20, [0.9, 0.6, 0.7]);

  B.build(group);

  // —— 铜海与十二铜牛（王上7:23-26）——
  const seaG = new THREE.Group(); seaG.position.set(SEA.cx, Y.inner, SEA.cz); group.add(seaG);
  const ox = oxGeometry();
  const dirs = [[0, -1], [-1, 0], [0, 1], [1, 0]]; // 北、西、南、东
  for (const [dx, dz] of dirs) {
    for (const lat of [-1.9, 0, 1.9]) {
      const lx = -dz, lz = dx;
      const r = 4.6;
      const m = new THREE.Mesh(ox, M.bronze);
      m.position.set(dx * r + lx * lat, 0, dz * r + lz * lat);
      m.rotation.y = Math.atan2(-dz, dx);
      m.castShadow = m.receiveShadow = true;
      seaG.add(m);
      registry.add('oxen', m);
    }
  }
  const b = SEA.oxBack;
  const prof = [[0.01, b], [3.0, b], [3.7, b + 0.3], [4.25, b + 0.95], [4.6, b + 1.9], [4.78, b + 2.9], [4.86, b + 3.7], [4.92, b + 4.3], [5.1, b + 4.7], [5.45, b + 5.0], [5.38, b + 5.06], [5.0, b + 4.82], [4.76, b + 4.4], [4.7, b + 3.7], [4.62, b + 2.9], [4.44, b + 1.95], [4.08, b + 1.0], [3.5, b + 0.45], [0.01, b + 0.18]];
  const bowl = new THREE.Mesh(lathe(prof, 64), M.bronze);
  bowl.castShadow = bowl.receiveShadow = true;
  seaG.add(bowl); registry.add('sea', bowl);
  const water = new THREE.Mesh(new THREE.CircleGeometry(4.66, 48).rotateX(-Math.PI / 2), M.water);
  water.position.y = b + 4.1; seaG.add(water); registry.add('sea', water);
  // 海边下两行野瓜，每肘十个（王上7:24）
  const nG = 300;
  const gourdG = new THREE.SphereGeometry(0.075, 6, 4).scale(1, 1.5, 1);
  const gourds = new THREE.InstancedMesh(gourdG, M.bronze, nG * 2);
  const mm = new THREE.Matrix4();
  for (let row = 0; row < 2; row++) for (let i = 0; i < nG; i++) {
    const a = (i + row * 0.5) / nG * Math.PI * 2, y = b + 4.25 - row * 0.3, r = 4.9 - row * 0.02 + 0.06;
    mm.compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), new THREE.Vector3(1, 1, 1));
    gourds.setMatrixAt(row * nG + i, mm);
  }
  seaG.add(gourds); registry.add('sea', gourds);
  world.addBox(SEA.cx - 7.6, Y.inner, SEA.cz - 7.6, SEA.cx + 7.6, Y.inner + b + 5, SEA.cz + 7.6, 'sea');
  registry.setFocus('sea', [SEA.cx, 4, SEA.cz], 26, [0.6, 0.55, 1]);
  registry.setFocus('oxen', [SEA.cx, 1.8, SEA.cz], 18, [1, 0.25, 0.9]);

  // —— 十个盆座与盆（王上7:27-39）——
  const panelTex = M.bronzePanel.map.clone(); panelTex.repeat.set(1, 1); panelTex.needsUpdate = true;
  const panelN = M.bronzePanel.normalMap.clone(); panelN.repeat.set(1, 1); panelN.needsUpdate = true;
  const standMat = M.bronzePanel.clone(); standMat.map = panelTex; standMat.normalMap = panelN;
  M.standPanel = standMat;
  M.extraBronze = [standMat];
  const stand = standGeometry();
  const basin = lathe([[0.01, 0], [0.9, 0.02], [1.5, 0.22], [1.85, 0.62], [2.0, 1.05], [2.08, 1.2], [2.02, 1.22], [1.88, 1.05], [1.74, 0.66], [1.4, 0.3], [0.01, 0.12]], 40);
  for (const s of [-1, 1]) for (const x of STANDS.xs) {
    const g = new THREE.Group(); g.position.set(x, Y.inner, s * STANDS.z); group.add(g);
    const panels = new THREE.Mesh(stand.panels, standMat);
    const frame = new THREE.Mesh(stand.frame, M.bronze);
    const wheels = new THREE.Mesh(stand.wheels, M.bronzeDark);
    for (const m of [panels, frame, wheels]) { m.castShadow = m.receiveShadow = true; g.add(m); registry.add('stands', m); }
    const bm = new THREE.Mesh(basin, M.bronze); bm.position.y = 3.0; bm.castShadow = bm.receiveShadow = true;
    const wm = new THREE.Mesh(new THREE.CircleGeometry(1.84, 32).rotateX(-Math.PI / 2), M.water); wm.position.y = 3.0 + 0.95;
    g.add(bm, wm); registry.add('basins', bm); registry.add('basins', wm);
    world.addBox(x - 2.2, Y.inner, s * STANDS.z - 2.2, x + 2.2, Y.inner + 4.2, s * STANDS.z + 2.2, 'stand');
  }
  registry.setFocus('stands', [STANDS.xs[2], 2, STANDS.z], 16, [0.7, 0.45, 1]);
  registry.setFocus('basins', [STANDS.xs[2], 4, STANDS.z], 12, [0.5, 0.8, 1]);

  // —— 雅斤与波阿斯 ——
  const pillars = new THREE.Group(); pillars.name = 'pillars'; group.add(pillars);
  const netMat = M.bronze.clone();
  netMat.alphaMap = latticeTex(); netMat.alphaTest = 0.5; netMat.side = THREE.DoubleSide; netMat.transparent = false;
  const petalMat = M.bronze.clone(); petalMat.side = THREE.DoubleSide;
  M.extraBronze.push(netMat, petalMat);
  const buildPillars = () => {
    for (const c of [...pillars.children]) { pillars.remove(c); c.traverse?.((o) => { if (o.isMesh) registry.remove(o); }); }
    world.removeTag('pillar');
    const Hs = state.get('pillar') === 'a' ? PILLARS.heights.a : PILLARS.heights.b;
    for (const [id, z] of [['jachin', PILLARS.z], ['boaz', -PILLARS.z]]) {
      const pg = pillarGroup(M, netMat, petalMat, Hs);
      pg.position.set(PILLARS.x, F, z);
      pg.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { registry.add(id, o); o.castShadow = true; o.receiveShadow = true; } });
      pillars.add(pg);
      world.addBox(PILLARS.x - PILLARS.r, F, z - PILLARS.r, PILLARS.x + PILLARS.r, F + Hs + 5, z + PILLARS.r, 'pillar');
      registry.setFocus(id, [PILLARS.x, F + Hs * 0.6, z], Hs * 1.9 + 10, [1, 0.2, Math.sign(z) * 0.55]);
    }
  };
  buildPillars();
  state.on('pillar', buildPillars);

  return { group };
}

// 牛：朝 +x，原点在身体下方地面（单位：肘）
function oxGeometry() {
  const parts = [];
  const S = (r, sx, sy, sz, x, y, z, rz = 0) => parts.push(transformed(new THREE.SphereGeometry(r, 14, 10), [x, y, z], [0, 0, rz], [sx, sy, sz]));
  S(1, 1.75, 0.72, 0.62, -0.05, 2.06, 0);
  S(1, 0.95, 0.86, 0.66, 1.0, 1.98, 0);
  S(1, 0.55, 0.36, 0.45, 0.95, 2.62, 0);
  S(1, 0.7, 0.6, 0.6, -1.25, 2.12, 0);
  S(1, 0.58, 0.4, 0.34, 2.22, 1.78, 0, -0.55);
  S(1, 0.3, 0.24, 0.29, 2.66, 1.46, 0, -0.4);
  S(1, 0.48, 0.34, 0.14, 1.75, 1.5, 0, 0.3);
  parts.push(tube([[1.35, 2.25, 0], [1.7, 2.12, 0], [2.0, 1.95, 0]], 0.44, 6, 10));
  for (const s of [-1, 1]) {
    parts.push(tube([[2.15, 2.1, s * 0.25], [2.2, 2.32, s * 0.62], [2.42, 2.55, s * 0.78], [2.62, 2.62, s * 0.62]], 0.07, 10, 6));
    parts.push(transformed(new THREE.ConeGeometry(0.12, 0.36, 6), [2.0, 2.12, s * 0.42], [s * 1.2, 0, 0.3]));
  }
  for (const [x, z] of [[1.15, 0.36], [1.15, -0.36], [-1.25, 0.34], [-1.25, -0.34]]) {
    parts.push(lathe([[0.2, 0], [0.19, 0.25], [0.13, 0.42], [0.15, 0.9], [0.2, 1.35], [0.3, 1.75]], 8).translate(x, 0, z));
  }
  parts.push(tube([[-1.75, 2.45, 0], [-1.92, 1.9, 0], [-1.95, 1.2, 0.05]], 0.06, 8, 5));
  S(0.12, 1, 2, 1, -1.95, 1.05, 0.05);
  return merge(parts);
}

// 盆座：心子（侧板）、边子与支子、轮子（王上7:28-36）
function standGeometry() {
  const panels = [], frame = [], wheels = [];
  const s = 2, yb = 1.05, yt = 2.55;
  // 四面心子：用单独 UV 0..1
  for (let k = 0; k < 4; k++) {
    const g = new THREE.PlaneGeometry(3.7, yt - yb);
    g.translate(0, (yb + yt) / 2, s);
    g.rotateY(k * Math.PI / 2);
    panels.push(g);
  }
  const P = (x0, y0, z0, x1, y1, z1) => frame.push(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(x * s - 0.22 * (x > 0 ? 1 : 0), 0.7, z * s - 0.22 * (z > 0 ? 1 : 0), x * s + 0.22 * (x < 0 ? 1 : 0), 2.75, z * s + 0.22 * (z < 0 ? 1 : 0));
  P(-s - 0.05, yt, -s - 0.05, s + 0.05, yt + 0.2, s + 0.05);
  P(-s - 0.05, yb - 0.18, -s - 0.05, s + 0.05, yb, s + 0.05);
  frame.push(new THREE.CylinderGeometry(0.85, 0.95, 0.5, 24).translate(0, yt + 0.45, 0)); // 小座，口圆（7:31）
  frame.push(new THREE.TorusGeometry(0.8, 0.08, 6, 24).rotateX(Math.PI / 2).translate(0, yt + 0.72, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frame.push(tube([[x * 1.9, 2.75, z * 1.9], [x * 1.75, 3.25, z * 1.75], [x * 1.45, 3.95, z * 1.45]], 0.1, 8, 6)); // 盆架
  // 轮子：高一肘半，轴、辋、辐、毂都是铸的（7:32-33）
  for (const x of [-1.35, 1.35]) {
    frame.push(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8).rotateX(Math.PI / 2).translate(x, 0.75, 0));
    for (const z of [-2.12, 2.12]) {
      wheels.push(new THREE.TorusGeometry(0.68, 0.07, 6, 24).translate(x, 0.75, z));
      wheels.push(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 10).rotateX(Math.PI / 2).translate(x, 0.75, z));
      for (let i = 0; i < 6; i++) wheels.push(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 5).rotateZ(i * Math.PI / 6).translate(x, 0.75, z));
    }
  }
  return { panels: merge(panels), frame: merge(frame), wheels: merge(wheels) };
}

function latticeTex() {
  const S = 128, c = canvas(S, S), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  x.strokeStyle = '#fff'; x.lineWidth = 9;
  x.beginPath(); x.moveTo(0, 0); x.lineTo(S, S); x.moveTo(S, 0); x.lineTo(0, S); x.stroke();
  x.beginPath(); x.moveTo(-S / 2, S / 2); x.lineTo(S / 2, -S / 2); x.moveTo(S / 2, S * 1.5); x.lineTo(S * 1.5, S / 2); x.stroke();
  x.beginPath(); x.moveTo(S / 2, -S / 2); x.lineTo(S * 1.5, S / 2); x.moveTo(-S / 2, S / 2); x.lineTo(S / 2, S * 1.5); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 5);
  return t;
}

// 一根铜柱（原点在柱脚）：柱身空心（耶52:21），柱顶有网子、链索、两行石榴、百合花（王上7:16-22）
function pillarGroup(M, netMat, petalMat, Hs) {
  const g = new THREE.Group();
  const r = PILLARS.r;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.01, Hs, 48, 1, true).translate(0, Hs / 2, 0), M.bronze);
  const rim = new THREE.Mesh(new THREE.RingGeometry(r - 0.17, r, 48).rotateX(-Math.PI / 2).translate(0, Hs + 0.001, 0), M.bronzeDark);
  g.add(shaft, rim);
  const cap = new THREE.Group(); cap.position.y = Hs; g.add(cap);
  // 柱顶：下半鼓肚（如球），上半百合花（径四肘）
  const prof = [[r, 0], [r + 0.12, 0.08], [r + 0.12, 0.26], [r + 0.03, 0.32], [2.05, 0.45], [2.32, 0.85], [2.45, 1.3], [2.38, 1.78], [2.12, 2.1], [1.86, 2.28], [1.78, 2.5], [1.8, 3.2], [1.9, 3.9], [2.0, 4.4], [2.02, 4.85], [1.96, 5.0], [0.01, 5.0]];
  const capM = new THREE.Mesh(lathe(prof, 48), M.bronze);
  cap.add(capM);
  // 网子
  const netProf = [[2.1, 0.5], [2.37, 0.86], [2.5, 1.3], [2.43, 1.78], [2.18, 2.08]];
  const net = new THREE.Mesh(lathe(netProf, 48), netMat);
  cap.add(net);
  // 两行石榴，共二百（王上7:20）
  const pom = merge([new THREE.SphereGeometry(0.075, 7, 5), new THREE.ConeGeometry(0.035, 0.07, 5).translate(0, 0.085, 0)]);
  const pm = new THREE.InstancedMesh(pom, M.bronze, 200);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let row = 0; row < 2; row++) for (let i = 0; i < 100; i++) {
    const a = (i + row * 0.5) / 100 * Math.PI * 2;
    const y = row ? 2.2 : 0.42, rr = row ? 2.06 : 2.14;
    m4.compose(new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI), new THREE.Vector3(1, 1, 1));
    pm.setMatrixAt(row * 100 + i, m4);
  }
  cap.add(pm);
  // 七条拧成的链索（王上7:17）
  const links = [];
  for (let k = 0; k < 7; k++) {
    const a0 = k / 7 * Math.PI * 2, a1 = (k + 1) / 7 * Math.PI * 2;
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = a0 + (a1 - a0) * t;
      const sag = 0.55 * Math.sin(Math.PI * t);
      const rr = 2.42 + 0.15 * Math.sin(Math.PI * t) - 0.12;
      links.push({ p: new THREE.Vector3(Math.cos(a) * (rr + 0.1), 1.95 - sag, Math.sin(a) * (rr + 0.1)), a, odd: i % 2 });
    }
  }
  const lm = new THREE.InstancedMesh(new THREE.TorusGeometry(0.07, 0.022, 4, 8), M.bronze, links.length);
  links.forEach((l, i) => {
    q.setFromEuler(new THREE.Euler(l.odd ? Math.PI / 2 : 0, -l.a + Math.PI / 2, 0, 'YXZ'));
    m4.compose(l.p, q, new THREE.Vector3(1, 1, 1));
    lm.setMatrixAt(i, m4);
  });
  cap.add(lm);
  // 百合花瓣（王上7:19、22）
  const petal = new THREE.PlaneGeometry(0.9, 1.5, 4, 8);
  const pp = petal.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), y = pp.getY(i) + 0.75; // 0..1.5
    const t = y / 1.5;
    const w = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.7 * (1 - t * 0.35);
    pp.setXYZ(i, x * w * 1.6, y, (t * t) * 0.75 - Math.abs(x) * 0.25);
  }
  petal.computeVertexNormals();
  const petals = [];
  for (let k = 0; k < 2; k++) for (let i = 0; i < 12; i++) {
    const a = (i + k * 0.5) / 12 * Math.PI * 2;
    const p = petal.clone();
    p.applyMatrix4(mat4([0, 0, 1.95 - k * 0.15], [0, 0, 0], [1, 1 - k * 0.15, 1]));
    p.applyMatrix4(new THREE.Matrix4().makeRotationY(-a + Math.PI / 2));
    p.translate(0, 3.55 + k * 0.05, 0);
    petals.push(p);
  }
  const pet = new THREE.Mesh(merge(petals), petalMat);
  cap.add(pet);
  return g;
}
