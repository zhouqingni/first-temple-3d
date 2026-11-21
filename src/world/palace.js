// 所罗门的宫室（王上7:1-12）：黎巴嫩林宫、柱廊、审判廊与象牙宝座、王的宫室、法老女儿的宫
import * as THREE from 'three';
import { Builder, lathe, merge } from './geom.js';
import { wallWithOpenings } from './temple.js';
import { PALACE, TERRACES, Y } from '../core/layout.js';
import { registry } from '../app/registry.js';

// 方形殿宇：四面墙（可开门、窗），平顶，女儿墙。返回内部范围
function hall(B, world, id, b, y, h, { t = 2.5, doors = [], windows = [], mat = 'stone', roof = true, interior = null, collide = true } = {}) {
  const uvo = { uvOrigin: [0, y, 0] };
  const sides = { s: ['x', b.x0, b.x1, b.z1 - t, b.z1], n: ['x', b.x0, b.x1, b.z0, b.z0 + t], w: ['z', b.z0 + t, b.z1 - t, b.x0, b.x0 + t], e: ['z', b.z0 + t, b.z1 - t, b.x1 - t, b.x1] };
  for (const [k, [ax, a0, a1, t0, t1]] of Object.entries(sides)) {
    const holes = [...doors.filter((d) => d.side === k).map((d) => ({ a0: d.at - d.w / 2, a1: d.at + d.w / 2, y0: y, y1: y + d.h })), ...windows.filter((w) => w.side === k).map((w) => ({ a0: w.at - w.w / 2, a1: w.at + w.w / 2, y0: y + w.y0, y1: y + w.y1 }))];
    wallWithOpenings(B, id, mat, ax, a0, a1, t0, t1, y, y + h, holes, uvo);
    if (interior) wallWithOpenings(B, id, interior, ax, a0, a1, ax === 'x' ? (k === 's' ? t0 - 0.1 : t1) : (k === 'e' ? t0 - 0.1 : t1), ax === 'x' ? (k === 's' ? t0 : t1 + 0.1) : (k === 'e' ? t0 : t1 + 0.1), y, y + h - 0.2, holes, uvo);
    if (collide) {
      const ds = doors.filter((d) => d.side === k).map((d) => [d.at - d.w / 2, d.at + d.w / 2]).sort((p, q) => p[0] - q[0]);
      let s = a0;
      for (const [p, q] of [...ds, [a1, a1]]) {
        if (p > s) { if (ax === 'x') world.addBox(s, y, t0, p, y + h, t1, 'palace'); else world.addBox(t0, y, s, t1, y + h, p, 'palace'); }
        s = Math.max(s, q);
      }
    }
  }
  if (roof) {
    B.box(id, 'cedar', b.x0, y + h - 0.6, b.z0, b.x1, y + h, b.z1);
    B.box(id, 'plaster', b.x0, y + h, b.z0, b.x1, y + h + 0.4, b.z1);
    for (const [x0, z0, x1, z1] of [[b.x0, b.z0, b.x1, b.z0 + 0.8], [b.x0, b.z1 - 0.8, b.x1, b.z1], [b.x0, b.z0, b.x0 + 0.8, b.z1], [b.x1 - 0.8, b.z0, b.x1, b.z1]]) B.box(id, mat, x0, y + h + 0.4, z0, x1, y + h + 1.6, z1, uvo);
  }
  B.box(id, 'cedar', b.x0 - 0.15, y + h - 2.2, b.z0 - 0.15, b.x1 + 0.15, y + h - 1.4, b.z1 + 0.15);
}

function lionGeo() {
  // 站立的狮子（朝 +x），长约 1.3 肘
  const s = (r, sx, sy, sz, x, y, z) => new THREE.SphereGeometry(r, 10, 8).scale(sx, sy, sz).translate(x, y, z);
  const parts = [s(1, 0.55, 0.26, 0.22, 0, 0.72, 0), s(1, 0.3, 0.32, 0.3, 0.42, 0.85, 0), s(1, 0.17, 0.15, 0.15, 0.66, 0.92, 0)];
  for (const [x, z] of [[0.32, 0.13], [0.32, -0.13], [-0.36, 0.13], [-0.36, -0.13]]) parts.push(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6).translate(x, 0.3, z));
  parts.push(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5).rotateZ(1.0).translate(-0.72, 0.85, 0));
  return merge(parts);
}

export function buildPalace(M, world, scene, T) {
  const group = new THREE.Group(); group.name = 'palace'; scene.add(group);
  const B = new Builder(M);
  const [p1, p2, p3] = TERRACES;

  // —— 黎巴嫩林宫：长一百、宽五十、高三十，香柏木柱三行，每行十五根（王上7:2-3）——
  const fo = PALACE.forest, fy = p3.y;
  const winds = [];
  for (const side of ['n', 's']) for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
    const at = fo.x0 + 6 + i * 8.1;
    if (Math.abs(at - 65) < 5 && r === 0) continue;
    winds.push({ side, at, w: 1.8, y0: 6 + r * 8, y1: 10 + r * 8 }); // 窗户三层，窗与窗相对（7:4）
  }
  hall(B, world, 'forest_house', fo, fy, fo.h, { t: 3, doors: [{ side: 'n', at: 65, w: 7, h: 11 }, { side: 's', at: 65, w: 7, h: 11 }], windows: winds, mat: 'porchStone', interior: 'cedar' });
  B.box('forest_house', 'pavement', fo.x0 + 3, fy, fo.z0 + 3, fo.x1 - 3, fy + 0.05, fo.z1 - 3);
  const rows = [fo.z0 + 12.5, fo.z0 + 25, fo.z0 + 37.5];
  const colGeo = lathe([[0.95, 0], [0.9, 0.6], [0.82, 1.0], [0.78, 26.5], [0.9, 27.1], [1.05, 27.5]], 12);
  for (const z of rows) {
    for (let i = 0; i < 15; i++) {
      const x = fo.x0 + (i + 0.5) * (100 / 15);
      B.add('forest_house', 'cedar', colGeo.clone().translate(x, fy, z));
      world.addBox(x - 0.9, fy, z - 0.9, x + 0.9, fy + 27, z + 0.9, 'palace');
    }
    B.box('forest_house', 'cedar', fo.x0 + 3, fy + 27.5, z - 0.8, fo.x1 - 3, fy + 29.4, z + 0.8); // 柁梁
  }
  for (let x = fo.x0 + 4; x < fo.x1 - 3; x += 3.4) B.box('forest_house', 'cedar', x, fy + 28.6, fo.z0 + 3, x + 0.7, fy + 29.4, fo.z1 - 3);
  // 墙上的金挡牌二百、金盾牌三百（王上10:16-17）
  const big = new THREE.InstancedMesh(lathe([[0.01, 0.18], [0.5, 0.12], [0.62, 0.0]], 16).scale(1, 1, 1.55).rotateX(Math.PI / 2), M.gold, 200);
  const small = new THREE.InstancedMesh(lathe([[0.01, 0.12], [0.42, 0.06], [0.5, 0.0]], 16).rotateX(Math.PI / 2), M.gold, 300);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let bi = 0, si = 0;
  for (const s of [-1, 1]) {
    const zw = s < 0 ? fo.z0 + 3.05 : fo.z1 - 3.05;
    q.setFromAxisAngle(up, s < 0 ? 0 : Math.PI);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 40; i++) {
      const x = fo.x0 + 5 + i * 2.3, y = fy + 3.6 + r * 2.15;
      if (Math.abs(x - 65) < 5 && r < 4) continue;
      if (r % 2 === 0 && bi < 200) { mm.compose(new THREE.Vector3(x, y + 0.6, zw), q, new THREE.Vector3(1, 1, 1)); big.setMatrixAt(bi++, mm); }
      else if (si < 300) { mm.compose(new THREE.Vector3(x, y + 0.4, zw), q, new THREE.Vector3(1, 1, 1)); small.setMatrixAt(si++, mm); }
    }
    q.setFromAxisAngle(up, s < 0 ? Math.PI / 2 : -Math.PI / 2);
    const xw = s < 0 ? fo.x0 + 3.05 : fo.x1 - 3.05;
    for (let r = 0; r < 6; r++) for (let i = 0; i < 18; i++) {
      const z = fo.z0 + 5 + i * 2.3, y = fy + 3.6 + r * 2.15;
      if (si < 300) { mm.compose(new THREE.Vector3(xw, y + 0.4, z), q, new THREE.Vector3(1, 1, 1)); small.setMatrixAt(si++, mm); }
      else if (bi < 200) { mm.compose(new THREE.Vector3(xw, y + 0.6, z), q, new THREE.Vector3(1, 1, 1)); big.setMatrixAt(bi++, mm); }
    }
  }
  big.count = bi; small.count = si;
  for (const m of [big, small]) { m.castShadow = false; m.receiveShadow = true; group.add(m); registry.add('gold_shields', m); }
  registry.setFocus('forest_house', [65, fy + 15, 409], 150, [0.7, 0.55, 1]);
  registry.setFocus('gold_shields', [65, fy + 8, fo.z0 + 8], 26, [0.1, 0.15, 1]);

  // —— 柱廊：长五十、宽三十，廊前又有廊，廊外有柱子和台阶（王上7:6）——
  const hp = PALACE.pillars, hy = p2.y;
  B.box('hall_pillars', 'pavement', hp.x0, hy, hp.z0, hp.x1, hy + 0.3, hp.z1 + hp.porch);
  const cg = lathe([[0.7, 0], [0.62, 0.5], [0.55, 0.8], [0.52, hp.h - 1.2], [0.66, hp.h - 0.6], [0.8, hp.h - 0.3]], 12);
  const colAt = (x, z, h = hp.h) => { B.add('hall_pillars', 'cedar', cg.clone().scale(1, h / hp.h, 1).translate(x, hy + 0.3, z)); world.addBox(x - 0.6, hy, z - 0.6, x + 0.6, hy + h, z + 0.6, 'palace'); };
  for (let i = 0; i <= 8; i++) { colAt(hp.x0 + 1 + i * 6, hp.z0 + 1); colAt(hp.x0 + 1 + i * 6, hp.z1 - 1); }
  for (let j = 1; j < 5; j++) { colAt(hp.x0 + 1, hp.z0 + 1 + j * 5.6); colAt(hp.x1 - 1, hp.z0 + 1 + j * 5.6); }
  for (let i = 0; i < 6; i++) colAt(hp.x0 + 5 + i * 8, hp.z1 + hp.porch - 1, hp.h - 4);
  B.box('hall_pillars', 'cedar', hp.x0, hy + hp.h, hp.z0, hp.x1, hy + hp.h + 0.8, hp.z1);
  B.box('hall_pillars', 'plaster', hp.x0 - 0.4, hy + hp.h + 0.8, hp.z0 - 0.4, hp.x1 + 0.4, hy + hp.h + 1.3, hp.z1 + 0.4);
  B.box('hall_pillars', 'cedar', hp.x0 + 2, hy + hp.h - 4, hp.z1, hp.x1 - 2, hy + hp.h - 3.2, hp.z1 + hp.porch);
  B.box('hall_pillars', 'plaster', hp.x0 + 1.6, hy + hp.h - 3.2, hp.z1, hp.x1 - 1.6, hy + hp.h - 2.8, hp.z1 + hp.porch + 0.4);
  registry.setFocus('hall_pillars', [65, hy + 8, 318], 80, [0.6, 0.5, 1]);

  // —— 审判廊：从地到顶都用香柏木遮蔽（王上7:7）；象牙宝座（王上10:18-20）——
  const th = PALACE.throne, ty = p2.y;
  hall(B, world, 'throne_hall', th, ty, th.h, { t: 2.5, doors: [{ side: 's', at: 65, w: 16, h: 16 }], mat: 'stone', interior: 'cedar' });
  B.box('throne_hall', 'pavement', th.x0 + 2.5, ty, th.z0 + 2.5, th.x1 - 2.5, ty + 0.05, th.z1 - 2.5);
  for (const x of [59, 71]) { B.add('throne_hall', 'cedar', cg.clone().scale(1.2, 15.5 / hp.h, 1.2).translate(x, ty, th.z1 - 1.2)); world.addBox(x - 0.8, ty, th.z1 - 2, x + 0.8, ty + 16, th.z1, 'palace'); }
  // 宝座：六层台阶，每层左右各一个狮子；扶手旁两个狮子；座背是圆的
  const tx = 65, tz0 = th.z0 + 6, stepD = 0.9, stepH = 0.4;
  for (let i = 0; i < 6; i++) {
    const z1 = tz0 + 6 * stepD - i * stepD;
    B.box('throne', 'ivory', tx - 3.2 + i * 0.15, ty, tz0 - 1, tx + 3.2 - i * 0.15, ty + (i + 1) * stepH, z1);
    B.box('throne', 'gold', tx - 3.25 + i * 0.15, ty + (i + 1) * stepH - 0.06, z1 - 0.06, tx + 3.25 - i * 0.15, ty + (i + 1) * stepH + 0.02, z1 + 0.02);
  }
  const seatY = ty + 6 * stepH;
  B.box('throne', 'ivory', tx - 1.1, seatY, tz0 - 0.8, tx + 1.1, seatY + 1.0, tz0 + 0.6);
  B.box('throne', 'gold', tx - 1.15, seatY + 0.95, tz0 - 0.85, tx + 1.15, seatY + 1.08, tz0 + 0.65);
  B.add('throne', 'ivory', new THREE.CylinderGeometry(1.15, 1.15, 0.35, 24, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 1.6, 1).translate(tx, seatY + 2.4, tz0 - 0.75));
  B.add('throne', 'gold', new THREE.TorusGeometry(1.15, 0.07, 6, 24, Math.PI).scale(1, 1.6, 1).translate(tx, seatY + 2.4, tz0 - 0.6));
  for (const s of [-1, 1]) B.box('throne', 'gold', tx + s * 1.15 - 0.15, seatY + 1.0, tz0 - 0.8, tx + s * 1.15 + 0.15, seatY + 1.7, tz0 + 0.7);
  const lion = lionGeo();
  const lm = (x, y, z) => B.add('throne', 'gold', lion.clone().rotateY(-Math.PI / 2).scale(0.9, 0.9, 0.9).translate(x, y, z));
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) lm(tx + s * (2.9 - i * 0.15), ty + (i + 1) * stepH, tz0 + 6 * stepD - i * stepD - 0.45);
  for (const s of [-1, 1]) lm(tx + s * 1.6, seatY, tz0 + 0.2);
  world.addBox(tx - 3.3, ty, tz0 - 1, tx + 3.3, ty + 2.4, tz0 + 6 * stepD, 'palace');
  registry.setFocus('throne_hall', [65, ty + 12, 273], 75, [0.5, 0.6, 1]);
  registry.setFocus('throne', [tx, seatY + 1, tz0 + 2], 13, [0.2, 0.35, 1]);

  // —— 王的宫室、法老女儿的宫（王上7:8）：围着院子的宫室 ——
  const court = (id, b, y, h, gate) => {
    const t = 12;
    for (const [x0, z0, x1, z1] of [[b.x0, b.z0, b.x1, b.z0 + t], [b.x0, b.z1 - t, b.x1, b.z1], [b.x0, b.z0 + t, b.x0 + t, b.z1 - t], [b.x1 - t, b.z0 + t, b.x1, b.z1 - t]]) {
      const holes = [];
      const sides = [];
      if (gate && z1 === b.z1) holes.push(gate);
      hall(B, world, id, { x0, x1, z0, z1 }, y, h, { t: 1.6, doors: holes.length ? [{ side: 's', at: (b.x0 + b.x1) / 2, w: 5, h: 8 }] : [], windows: [...[0, 1, 2, 3].map((i) => ({ side: 'n', at: x0 + (i + 1) * (x1 - x0) / 5, w: 1.4, y0: h * 0.55, y1: h * 0.55 + 3 })), ...[0, 1, 2, 3].map((i) => ({ side: 's', at: x0 + (i + 1) * (x1 - x0) / 5, w: 1.4, y0: h * 0.55, y1: h * 0.55 + 3 }))], mat: 'stone', collide: !holes.length });
      sides.length = 0;
    }
    B.box(id, 'pavement', b.x0 + 12, y, b.z0 + 12, b.x1 - 12, y + 0.05, b.z1 - 12);
    world.addBox(b.x0, y, b.z0, b.x1, y + h, b.z0 + 12, 'palace');
    world.addBox(b.x0, y, b.z0, b.x0 + 12, y + h, b.z1, 'palace');
    world.addBox(b.x1 - 12, y, b.z0, b.x1, y + h, b.z1, 'palace');
  };
  court('kings_house', PALACE.king, p1.y, PALACE.king.h, true);
  court('pharaoh_house', PALACE.pharaoh, p1.y, PALACE.pharaoh.h, true);
  registry.setFocus('kings_house', [17, p1.y + 10, 188], 120, [0.6, 0.7, 1]);
  registry.setFocus('pharaoh_house', [126, p1.y + 8, 188], 110, [0.8, 0.7, 1]);
  registry.setFocus('palace', [65, -20, 300], 330, [1, 0.75, 0.6]);
  registry.setFocus('middle_court', [65, p1.y, 238], 110, [0.6, 0.8, 1]);

  B.build(group);
  // 殿内的灯：镜头进到殿里才点亮
  const lamps = [
    { L: new THREE.PointLight('#ffcf94', 140, 90, 1.2), pos: [65, fy + 16, 409], box: [fo.x0, fo.x1, fo.z0, fo.z1, fy, fy + fo.h] },
    { L: new THREE.PointLight('#ffcf94', 70, 50, 1.3), pos: [65, ty + 12, 270], box: [th.x0, th.x1, th.z0, th.z1 + 8, ty, ty + th.h] },
  ];
  for (const l of lamps) { l.L.position.set(...l.pos); l.L.visible = false; group.add(l.L); }
  return {
    group,
    update(cam) {
      for (const l of lamps) { const [x0, x1, z0, z1, y0, y1] = l.box; l.L.visible = cam.x > x0 && cam.x < x1 && cam.z > z0 && cam.z < z1 && cam.y > y0 && cam.y < y1; }
    },
  };
}
