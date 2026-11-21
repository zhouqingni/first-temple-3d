// 殿的主体：殿墙（逐层退坎）、三层旁屋、窗棂、屋顶、廊、殿门、内殿门、幔子、金链子
import * as THREE from 'three';
import { Builder, boxGeo, worldUV } from './geom.js';
const worldUVg = (g) => worldUV(g, [0, Y.floor, 0]);
import { HOUSE, PORCH, DOORS, PODIUM, Y } from '../core/layout.js';
import { registry } from '../app/registry.js';
import { state } from '../app/state.js';

const F = Y.floor;
const H = HOUSE;
export const WINDOW_XS = [3.5, 10, 16.5, 23, 29.5, 36];
const WIN = { w: 1.8, y0: F + 18.5, y1: F + 25 };

// 沿某轴的一段墙，扣掉若干开口。axis='x'：墙沿 x 方向延伸，厚度在 z（z0..z1）
export function wallWithOpenings(B, id, mat, axis, a0, a1, t0, t1, y0, y1, openings = [], opts) {
  const cuts = [a0, a1];
  for (const o of openings) cuts.push(Math.max(a0, Math.min(a1, o.a0)), Math.max(a0, Math.min(a1, o.a1)));
  const xs = [...new Set(cuts)].sort((p, q) => p - q);
  for (let i = 0; i < xs.length - 1; i++) {
    const s0 = xs[i], s1 = xs[i + 1];
    if (s1 - s0 < 1e-6) continue;
    const mid = (s0 + s1) / 2;
    const holes = openings.filter((o) => mid > o.a0 && mid < o.a1).sort((p, q) => p.y0 - q.y0);
    let y = y0;
    const put = (ya, yb) => {
      if (yb - ya < 1e-6) return;
      if (axis === 'x') B.box(id, mat, s0, ya, t0, s1, yb, t1, opts);
      else B.box(id, mat, t0, ya, s0, t1, yb, s1, opts);
    };
    for (const hle of holes) { put(y, Math.max(y, hle.y0)); y = Math.max(y, hle.y1); }
    put(y, y1);
  }
}

export function buildTemple(M, world, scene) {
  const group = new THREE.Group(); group.name = 'temple';
  const roofGroup = new THREE.Group(); roofGroup.name = 'roof';
  scene.add(group, roofGroup);
  const B = new Builder(M);
  const R = new Builder(M);
  const uvo = { uvOrigin: [0, F, 0] };

  // —— 殿基与台阶（推测）——
  B.box('podium', 'stoneBig', PODIUM.x0, Y.inner - 1, PODIUM.z0, PODIUM.x1, F - 0.3, PODIUM.z1, { uvOrigin: [0, Y.inner - 1, 0] });
  B.box('podium', 'pavement', PODIUM.x0, F - 0.3, PODIUM.z0, PODIUM.x1, F, PODIUM.z1);
  world.addBox(PODIUM.x0, Y.inner - 1, PODIUM.z0, PODIUM.x1, F, PODIUM.z1, 'podium');
  const nSteps = Math.round((F - Y.inner) / PODIUM.stepRise);
  for (let i = 0; i < nSteps; i++) {
    const x0 = PODIUM.x1 + i * PODIUM.stepRun, top = F - (i + 1) * PODIUM.stepRise;
    B.box('podium', 'stone', x0, Y.inner - 0.5, -14, x0 + PODIUM.stepRun, top + 0.0001, 14);
    world.addBox(x0, Y.inner - 0.5, -14, x0 + PODIUM.stepRun, top, 14, 'podium');
  }

  // —— 殿墙：每层收进一肘，形成搁旁屋梁木的"墙坎"（王上6:6）——
  const levels = [[F, F + 5, H.wallT[0]], [F + 5, F + 10, H.wallT[1]], [F + 10, F + 30, H.wallT[2]]];
  const winOpen = WINDOW_XS.map((x) => ({ a0: x - WIN.w / 2, a1: x + WIN.w / 2, y0: WIN.y0, y1: WIN.y1 }));
  for (const [ya, yb, t] of levels) {
    for (const s of [-1, 1]) {
      const z0 = s * H.halfW, z1 = s * (H.halfW + t);
      wallWithOpenings(B, 'stone_wall', 'stone', 'x', H.x0 - t, H.eastOuter, Math.min(z0, z1), Math.max(z0, z1), ya, yb, ya >= F + 10 ? winOpen : [], uvo);
    }
    B.box('stone_wall', 'stone', H.x0 - t, ya, -H.halfW, H.x0, yb, H.halfW, uvo);
  }
  // 东墙（廊与圣所之间），中开殿门
  const dm = DOORS.main;
  wallWithOpenings(B, 'stone_wall', 'stone', 'z', -H.halfW, H.halfW, H.x1, H.eastOuter, F, F + H.h, [{ a0: -dm.w / 2, a1: dm.w / 2, y0: F, y1: F + dm.h }], uvo);
  world.addBox(H.x0 - H.wallT[0], F, -H.halfW - H.wallT[0], H.x0, F + 30, H.halfW + H.wallT[0], 'house');
  for (const s of [-1, 1]) world.addBox(H.x0 - 6, F, s * H.halfW, H.eastOuter, F + 30, s * (H.halfW + 6), 'house');
  world.addBox(H.x1, F, -H.halfW, H.eastOuter, F + 30, -dm.w / 2, 'house');
  world.addBox(H.x1, F, dm.w / 2, H.eastOuter, F + 30, H.halfW, 'house');

  // —— 三层旁屋（王上6:5-10）——
  const cw = H.chamberW, ot = H.outerT;
  const outerZ = H.chamberOuterZ, outerX = H.chamberOuterX;
  const chamberDoorX = (H.westOuter + H.eastOuter) / 2; // 南面正中（王上6:8）
  for (const s of [-1, 1]) {
    const zi = s * (outerZ - ot), zo = s * outerZ;
    const openings = s > 0 ? [{ a0: chamberDoorX - 1.6, a1: chamberDoorX + 1.6, y0: F, y1: F + 4.4 }] : [];
    wallWithOpenings(B, 'chambers', 'stone', 'x', outerX, H.eastOuter, Math.min(zi, zo), Math.max(zi, zo), F, F + 15, openings, uvo);
    // 东端墙
    B.box('chambers', 'stone', H.eastOuter - ot, F, Math.min(s * H.sideOuter, zi), H.eastOuter, F + 15, Math.max(s * H.sideOuter, zi), uvo);
    world.addBox(outerX, F, Math.min(s * H.sideOuter, zo), H.eastOuter, F + 15.6, Math.max(s * H.sideOuter, zo), 'house');
    // 楼板（香柏木梁），从外面看是一圈腰线
    for (const lv of [1, 2]) {
      B.box('chambers', 'cedar', outerX - 0.25, F + lv * 5 - 0.4, Math.min(zo, zo + s * 0.25), H.eastOuter + 0.25, F + lv * 5, Math.max(zo, zo + s * 0.25));
    }
  }
  B.box('chambers', 'stone', outerX, F, -outerZ + ot, outerX + ot, F + 15, outerZ - ot, uvo);
  world.addBox(outerX, F, -outerZ, H.westOuter, F + 15.6, outerZ, 'house');
  for (const lv of [1, 2]) B.box('chambers', 'cedar', outerX - 0.25, F + lv * 5 - 0.4, -outerZ - 0.25, outerX, F + lv * 5, outerZ + 0.25);
  // 旁屋内的隔墙与楼板（揭顶时看得见）
  for (let lv = 0; lv < 3; lv++) {
    const y0 = F + lv * 5, y1 = y0 + 5, wInner = H.sideOuter - lv; // 殿墙外皮随层收进
    for (const s of [-1, 1]) {
      const za = s * wInner, zb = s * (outerZ - ot);
      R.box('chambers', 'cedar', H.westOuter + lv, y1 - 0.5, Math.min(za, zb), H.eastOuter - ot, y1, Math.max(za, zb));
      for (let x = H.westOuter + 6; x < H.eastOuter - ot - 2; x += 7.2) {
        if (s > 0 && Math.abs(x - chamberDoorX) < 5) continue;
        B.box('chambers', 'plaster', x, y0, Math.min(za, zb), x + 0.5, y1 - 0.5, Math.max(za, zb));
      }
    }
    R.box('chambers', 'cedar', outerX + ot, y1 - 0.5, -outerZ + ot, H.westOuter + lv, y1, outerZ - ot);
  }
  // 旁屋屋顶与女儿墙
  R.box('roof', 'plaster', outerX, F + 15, -outerZ, H.eastOuter, F + 15.6, -H.sideOuter + 2);
  R.box('roof', 'plaster', outerX, F + 15, H.sideOuter - 2, H.eastOuter, F + 15.6, outerZ);
  R.box('roof', 'plaster', outerX, F + 15, -outerZ, H.westOuter + 2, F + 15.6, outerZ);
  for (const s of [-1, 1]) R.box('roof', 'stone', outerX, F + 15.6, Math.min(s * outerZ, s * (outerZ - 0.8)), H.eastOuter, F + 16.8, Math.max(s * outerZ, s * (outerZ - 0.8)));
  R.box('roof', 'stone', outerX, F + 15.6, -outerZ, outerX + 0.8, F + 16.8, outerZ);

  // 旋螺的楼梯（王上6:8）：在南面正中门内
  const stairC = [chamberDoorX, outerZ - ot - 2.5];
  B.add('chamber_door', 'stone', new THREE.CylinderGeometry(0.5, 0.5, 15, 10).translate(stairC[0], F + 7.5, stairC[1]));
  for (let i = 0; i < 36; i++) {
    const a = i * (Math.PI * 2 / 12), y = F + 0.35 + i * (14 / 36);
    const g = new THREE.BoxGeometry(2.1, 0.22, 0.9).translate(1.3, 0, 0);
    g.rotateY(-a); g.translate(stairC[0], y, stairC[1]);
    B.add('chamber_door', 'cedar', g);
  }
  B.box('chamber_door', 'goldDark', chamberDoorX - 1.9, F, outerZ - 0.1, chamberDoorX - 1.6, F + 4.8, outerZ + 0.2);
  B.box('chamber_door', 'goldDark', chamberDoorX + 1.6, F, outerZ - 0.1, chamberDoorX + 1.9, F + 4.8, outerZ + 0.2);
  B.box('chamber_door', 'goldDark', chamberDoorX - 1.9, F + 4.4, outerZ - 0.1, chamberDoorX + 1.9, F + 4.8, outerZ + 0.2);
  registry.setFocus('chamber_door', [chamberDoorX, F + 3, outerZ], 26, [0.3, 0.25, 1]);

  // —— 窗棂（王上6:4）——
  for (const x of WINDOW_XS) for (const s of [-1, 1]) {
    const zc = s * (H.halfW + 1.2);
    for (let j = 1; j < 6; j++) { const y = WIN.y0 + j * (WIN.y1 - WIN.y0) / 6; B.box('windows', 'cedar', x - WIN.w / 2, y - 0.08, zc - 0.09, x + WIN.w / 2, y + 0.08, zc + 0.09); }
    for (const dx of [-0.45, 0, 0.45]) B.box('windows', 'cedar', x + dx - 0.08, WIN.y0, zc - 0.09, x + dx + 0.08, WIN.y1, zc + 0.09);
  }

  // —— 殿内贴金：墙、地、天花（王上6:15-22、29-30）——
  const lining = (id, mat, axis, a0, a1, t0, t1, y0, y1, holes) => wallWithOpenings(B, id, mat, axis, a0, a1, t0, t1, y0, y1, holes, uvo);
  const winInner = WINDOW_XS.map((x) => ({ a0: x - WIN.w / 2, a1: x + WIN.w / 2, y0: WIN.y0, y1: WIN.y1 }));
  for (const s of [-1, 1]) {
    const z0 = s * H.halfW, z1 = s * (H.halfW - 0.12);
    lining('wall_carving', 'goldWall', 'x', 0.5, H.x1, Math.min(z0, z1), Math.max(z0, z1), F, F + 30, winInner);
    lining('wall_carving', 'goldWall', 'x', H.x0, -0.5, Math.min(z0, z1), Math.max(z0, z1), F, F + H.debirH, []);
  }
  lining('wall_carving', 'goldWall', 'z', -H.halfW, H.halfW, H.x1 - 0.12, H.x1, F, F + 30, [{ a0: -dm.w / 2, a1: dm.w / 2, y0: F, y1: F + dm.h }]);
  lining('wall_carving', 'goldWall', 'z', -H.halfW, H.halfW, H.x0, H.x0 + 0.12, F, F + H.debirH, []);
  // 隔开内外殿的香柏木板墙，开内殿门
  const dd = DOORS.debir;
  wallWithOpenings(B, 'debir_doors', 'goldWall', 'z', -H.halfW, H.halfW, -0.5, 0.5, F, F + 30, [{ a0: -dd.w / 2, a1: dd.w / 2, y0: F, y1: F + dd.h }], uvo);
  world.addBox(-0.5, F, -H.halfW, 0.5, F + 30, -dd.w / 2, 'house');
  world.addBox(-0.5, F, dd.w / 2, 0.5, F + 30, H.halfW, 'house');
  // 门框（橄榄木包金）
  for (const s of [-1, 1]) B.box('debir_doors', 'gold', 0.5, F, s * dd.w / 2, 0.8, F + dd.h + 0.4, s * (dd.w / 2 + 0.45));
  B.box('debir_doors', 'gold', 0.5, F + dd.h, -dd.w / 2 - 0.45, 0.8, F + dd.h + 0.5, dd.w / 2 + 0.45);
  // 地板
  B.box('gold_floor', 'goldFloor', 0.5, F - 0.25, -H.halfW, H.x1, F + 0.05, H.halfW);
  B.box('gold_floor', 'goldFloor', H.x0, F - 0.25, -H.halfW, -0.5, F + 0.05, H.halfW);
  B.box('gold_floor', 'goldFloor', H.x1, F - 0.25, -dm.w / 2, H.eastOuter, F + 0.05, dm.w / 2);
  world.addBox(H.x0, F - 1, -H.halfW, H.eastOuter, F, H.halfW, 'floor');
  // 天花与栋梁（代下3:7）
  R.box('roof', 'goldDark', 0.5, F + 29.6, -H.halfW, H.x1, F + 30, H.halfW);
  for (let x = 1.5; x < H.x1; x += 2.6) R.box('roof', 'gold', x, F + 28.9, -H.halfW, x + 0.7, F + 29.6, H.halfW);
  R.box('debir', 'goldDark', H.x0, F + H.debirH, -H.halfW, -0.5, F + H.debirH + 0.5, H.halfW);
  for (let x = H.x0 + 1; x < -1; x += 2.6) R.box('debir', 'gold', x, F + H.debirH - 0.6, -H.halfW, x + 0.6, F + H.debirH, H.halfW);
  // 至圣所上的楼房（代下3:9，推测）
  R.box('upper_rooms', 'goldDark', H.x0, F + H.debirH + 0.5, -H.halfW, -0.5, F + H.debirH + 0.6, H.halfW);
  for (const z of [-3.5, 3.5]) R.box('upper_rooms', 'cedar', H.x0, F + H.debirH + 0.6, z - 0.2, -0.5, F + 29.6, z + 0.2);
  // 屋顶（香柏木栋梁上覆盖，王上6:9）
  R.box('roof', 'cedar', H.x0 - 4, F + 30, -H.halfW - 4, H.eastOuter, F + 30.8, H.halfW + 4);
  R.box('roof', 'plaster', H.x0 - 4, F + 30.8, -H.halfW - 4, H.eastOuter, F + 31.4, H.halfW + 4);
  for (const s of [-1, 1]) R.box('roof', 'stone', H.x0 - 4, F + 31.4, Math.min(s * (H.halfW + 4), s * (H.halfW + 3.2)), H.eastOuter, F + 33, Math.max(s * (H.halfW + 4), s * (H.halfW + 3.2)), uvo);
  R.box('roof', 'stone', H.x0 - 4, F + 31.4, -H.halfW - 4, H.x0 - 3.2, F + 33, H.halfW + 4, uvo);
  // 顶部檐口
  for (const s of [-1, 1]) B.box('stone_wall', 'stone', H.x0 - 4.5, F + 29.2, Math.min(s * (H.halfW + 4.5), s * (H.halfW + 3)), H.eastOuter, F + 30, Math.max(s * (H.halfW + 4.5), s * (H.halfW + 3)));
  B.box('stone_wall', 'stone', H.x0 - 4.5, F + 29.2, -H.halfW - 4.5, H.x0 - 3, F + 30, H.halfW + 4.5);

  // 殿门框（橄榄木，王上6:33）
  for (const s of [-1, 1]) B.box('main_doors', 'gold', H.eastOuter, F, s * dm.w / 2, H.eastOuter + 0.4, F + dm.h + 0.6, s * (dm.w / 2 + 0.7));
  B.box('main_doors', 'gold', H.eastOuter, F + dm.h, -dm.w / 2 - 0.7, H.eastOuter + 0.4, F + dm.h + 0.8, dm.w / 2 + 0.7);

  B.build(group);
  const roofMeshes = R.build(roofGroup);
  for (const m of roofMeshes) m.castShadow = true;

  // —— 廊（高度可切换）——
  const porch = new THREE.Group(); porch.name = 'porch';
  scene.add(porch);
  function buildPorch() {
    for (const c of [...porch.children]) { registry.remove(c); c.geometry.dispose(); porch.remove(c); }
    world.removeTag('porch');
    const ph = state.get('porch') === 'a' ? PORCH.heights.a : PORCH.heights.b;
    const P = new Builder(M);
    const po = { uvOrigin: [0, F, 0] };
    // 两侧墙
    for (const s of [-1, 1]) {
      P.box('porch', 'porchStone', PORCH.x0, F, Math.min(s * PORCH.halfW, s * (PORCH.halfW + PORCH.sideT)), PORCH.front, F + ph, Math.max(s * PORCH.halfW, s * (PORCH.halfW + PORCH.sideT)), po);
      world.addBox(PORCH.x0, F, Math.min(s * PORCH.halfW, s * (PORCH.halfW + PORCH.sideT)), PORCH.front, F + ph, Math.max(s * PORCH.halfW, s * (PORCH.halfW + PORCH.sideT)), 'porch');
    }
    // 前墙与开口
    wallWithOpenings(P, 'porch', 'porchStone', 'z', -PORCH.halfW, PORCH.halfW, PORCH.x1, PORCH.front, F, F + ph, [{ a0: -PORCH.openHalf, a1: PORCH.openHalf, y0: F, y1: F + PORCH.openH }], po);
    for (const s of [-1, 1]) world.addBox(PORCH.x1, F, Math.min(s * PORCH.openHalf, s * PORCH.halfW), PORCH.front, F + ph, Math.max(s * PORCH.openHalf, s * PORCH.halfW), 'porch');
    // 东墙在 30 肘以上的部分（廊比殿高时）
    if (ph > 30) P.box('porch', 'porchStone', PORCH.x0 - 6, F + 30, -PORCH.halfW, PORCH.x0, F + ph, PORCH.halfW, po);
    // 廊内贴金（代下3:4）
    for (const s of [-1, 1]) P.box('porch', 'goldWallOut', PORCH.x0, F, Math.min(s * PORCH.halfW, s * (PORCH.halfW - 0.12)), PORCH.x1, F + PORCH.innerCeil, Math.max(s * PORCH.halfW, s * (PORCH.halfW - 0.12)), po);
    wallWithOpenings(P, 'porch', 'goldWallOut', 'z', -PORCH.halfW, PORCH.halfW, PORCH.x0, PORCH.x0 + 0.12, F, F + PORCH.innerCeil, [{ a0: -dm.w / 2 - 0.7, a1: dm.w / 2 + 0.7, y0: F, y1: F + dm.h + 0.8 }], po);
    wallWithOpenings(P, 'porch', 'goldWallOut', 'z', -PORCH.halfW, PORCH.halfW, PORCH.x1 - 0.12, PORCH.x1, F, F + PORCH.innerCeil, [{ a0: -PORCH.openHalf, a1: PORCH.openHalf, y0: F, y1: F + PORCH.openH }], po);
    P.box('porch', 'pavement', PORCH.x0, F - 0.25, -PORCH.halfW, PORCH.front, F + 0.03, PORCH.halfW);
    P.box('porch', 'goldDark', PORCH.x0, F + PORCH.innerCeil, -PORCH.halfW, PORCH.x1, F + PORCH.innerCeil + 0.6, PORCH.halfW);
    for (let z = -9; z <= 9; z += 3) P.box('porch', 'gold', PORCH.x0, F + PORCH.innerCeil - 0.6, z - 0.3, PORCH.x1, F + PORCH.innerCeil, z + 0.3);
    // 开口上的过梁
    P.box('porch', 'cedar', PORCH.x1 - 0.2, F + PORCH.openH, -PORCH.openHalf - 1, PORCH.front + 0.3, F + PORCH.openH + 1.2, PORCH.openHalf + 1);
    // 顶部檐口、阶梯形垛口（推测）
    const top = F + ph;
    P.box('porch', 'stone', PORCH.x0 - (ph > 30 ? 6.8 : 0), top - 1.6, -PORCH.halfW - PORCH.sideT - 0.8, PORCH.front + 0.8, top, PORCH.halfW + PORCH.sideT + 0.8);
    P.box('porch', 'plaster', PORCH.x0 - (ph > 30 ? 6 : 0), top, -PORCH.halfW - PORCH.sideT, PORCH.front, top + 0.4, PORCH.halfW + PORCH.sideT);
    const merl = (x, z, axis) => {
      const w = 2.2;
      for (let k = 0; k < 3; k++) {
        const e = w / 2 - k * 0.4;
        if (axis === 'x') P.box('porch', 'stone', x - e, top + 0.4 + k * 0.7, z - 0.5, x + e, top + 1.1 + k * 0.7, z + 0.5);
        else P.box('porch', 'stone', x - 0.5, top + 0.4 + k * 0.7, z - e, x + 0.5, top + 1.1 + k * 0.7, z + e);
      }
    };
    for (let z = -PORCH.halfW - PORCH.sideT + 1.5; z <= PORCH.halfW + PORCH.sideT - 1.4; z += 3.2) merl(PORCH.front - 0.5, z, 'z');
    for (const s of [-1, 1]) for (let x = PORCH.x0 - (ph > 30 ? 5 : -1); x <= PORCH.front - 1; x += 3.2) merl(x, s * (PORCH.halfW + PORCH.sideT - 0.5), 'x');
    if (ph > 30) {
      // 高塔立面（推测）：上部略向内收，几道香柏木腰线，少量窄窗
      for (let y = F + 31; y < top - 10; y += 22) {
        P.box('porch', 'cedar', PORCH.x0 - 6.3, y, -PORCH.halfW - PORCH.sideT - 0.3, PORCH.front + 0.3, y + 0.8, PORCH.halfW + PORCH.sideT + 0.3);
      }
      for (const y of [F + 48, F + 92]) for (const z of [-4, 4]) P.box('porch', 'dark', PORCH.front, y, z - 0.45, PORCH.front + 0.06, y + 6, z + 0.45);
      // 收分：外面贴一层下厚上薄的石壳
      const shell = (x0, x1, z0, z1, axis, sgn, y0) => {
        const g = new THREE.BoxGeometry(1, 1, 1);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const up = p.getY(i) > 0;
          let x = p.getX(i) > 0 ? x1 : x0, z = p.getZ(i) > 0 ? z1 : z0;
          const y = up ? top - 1.6 : y0;
          if (up) { if (axis === 'x' && (sgn > 0 ? p.getX(i) > 0 : p.getX(i) < 0)) x -= sgn * 1.4; if (axis === 'z' && (sgn > 0 ? p.getZ(i) > 0 : p.getZ(i) < 0)) z -= sgn * 1.4; }
          p.setXYZ(i, x, y, z);
        }
        g.computeVertexNormals();
        P.add('porch', 'porchStone', worldUVg(g));
      };
      shell(PORCH.front - 0.01, PORCH.front + 1.5, -PORCH.halfW - PORCH.sideT - 1.5, PORCH.halfW + PORCH.sideT + 1.5, 'x', 1, F + PORCH.openH + 1.2);
      for (const s of [-1, 1]) shell(PORCH.x0 - 6, PORCH.front + 1.5, s > 0 ? PORCH.halfW + PORCH.sideT - 0.01 : -PORCH.halfW - PORCH.sideT - 1.5, s > 0 ? PORCH.halfW + PORCH.sideT + 1.5 : -PORCH.halfW - PORCH.sideT + 0.01, 'z', s, F + 16);
    }
    P.build(porch);
    registry.setFocus('porch', [PORCH.x1, F + Math.min(ph, 60) / 2, 0], ph > 30 ? 170 : 90, [1, 0.25, 0.35]);
  }
  buildPorch();
  state.on('porch', buildPorch);

  // —— 殿门：松木两扇，每扇分两扇可折叠（王上6:34）——
  const doors = new THREE.Group(); doors.name = 'main_doors';
  group.add(doors);
  const leafGeo = (w, h, u0, u1) => {
    const g = new THREE.BoxGeometry(w, h, 0.22).translate(w / 2, h / 2, 0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
    return g;
  };
  const leaves = [];
  for (const s of [-1, 1]) {
    // 铰在门框（z = ±w/2）处，向圣所内（-x）开
    const hinge = new THREE.Group();
    hinge.position.set(H.x1 + 0.3, F, s * dm.w / 2);
    const lw = dm.w / 4;
    const a = new THREE.Mesh(leafGeo(lw, dm.h, s > 0 ? 0 : 0.5, s > 0 ? 0.5 : 1), M.goldDoor);
    const bPivot = new THREE.Group(); bPivot.position.set(lw, 0, 0.24);
    const b = new THREE.Mesh(leafGeo(lw, dm.h, s > 0 ? 0.5 : 0, s > 0 ? 1 : 0.5), M.goldDoor);
    bPivot.add(b); a.add(bPivot); hinge.add(a);
    hinge.rotation.y = s * Math.PI / 2; // 合上时叶片沿 z 排列
    hinge.userData.s = s;
    for (const m of [a, b]) { m.castShadow = true; m.receiveShadow = true; registry.add('main_doors', m); }
    doors.add(hinge);
    leaves.push({ hinge, a, bPivot, s });
  }
  // 内殿门：橄榄木两扇（王上6:31-32），向至圣所内开
  const dleaves = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(-0.5, F, s * dd.w / 2);
    const g = new THREE.BoxGeometry(dd.w / 2, dd.h, 0.2).translate(dd.w / 4, dd.h / 2, 0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s > 0 ? 0 : 0.5) + uv.getX(i) * 0.5, uv.getY(i) * 0.82);
    const m = new THREE.Mesh(g, M.goldDoor);
    m.castShadow = m.receiveShadow = true;
    hinge.add(m);
    registry.add('debir_doors', m);
    group.add(hinge);
    dleaves.push({ hinge, s });
  }
  let openT = state.get('doors') ? 1 : 0;
  const setDoors = (t) => {
    for (const { hinge, a, bPivot, s } of leaves) {
      hinge.rotation.y = s * (Math.PI / 2 + t * Math.PI / 2);
      bPivot.rotation.y = -t * Math.PI * 0.97;
    }
    for (const { hinge, s } of dleaves) hinge.rotation.y = s * (Math.PI / 2 + t * Math.PI * 0.55);
  };
  setDoors(openT);
  const syncDoorCollider = () => {
    world.removeTag('doors');
    if (!state.get('doors')) {
      world.addBox(H.x1, F, -dm.w / 2, H.eastOuter, F + dm.h, dm.w / 2, 'doors');
      world.addBox(-0.5, F, -dd.w / 2, 0.5, F + dd.h, dd.w / 2, 'doors');
    }
  };
  syncDoorCollider();
  state.on('doors', syncDoorCollider);

  // —— 幔子（代下3:14）：两半，走近时分开 ——
  const veil = new THREE.Group(); veil.name = 'veil';
  const halves = [];
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(2.6, 9, 24, 1);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setZ(i, Math.sin((x + 1.3) * 7.5) * 0.09);
      uv.setX(i, s < 0 ? uv.getX(i) * 0.52 : 0.48 + uv.getX(i) * 0.52);
    }
    g.computeVertexNormals();
    g.translate(1.3, 4.5, 0);
    const m = new THREE.Mesh(g, M.veil);
    m.rotation.y = s * Math.PI / 2;
    m.castShadow = true; m.receiveShadow = true;
    const pivot = new THREE.Group();
    pivot.position.set(0.9, F, s * 2.6);
    pivot.add(m);
    veil.add(pivot);
    registry.add('veil', m);
    halves.push({ pivot, m, s });
  }
  // 幔杆
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.2, 8).rotateX(Math.PI / 2), M.gold);
  rod.position.set(0.9, F + 9.05, 0);
  veil.add(rod);
  group.add(veil);
  let veilOpen = 0;

  // —— 金链子（王上6:21）：横挂在内殿门前 ——
  const link = new THREE.TorusGeometry(0.11, 0.035, 5, 10);
  const swags = [];
  const addSwag = (z0, z1, y, sag) => {
    const n = Math.round(Math.abs(z1 - z0) / 0.17);
    for (let i = 0; i <= n; i++) {
      const t = i / n, z = z0 + (z1 - z0) * t;
      const yy = y - sag * 4 * t * (1 - t);
      swags.push({ x: 0.75, y: yy, z, tilt: -Math.atan(-sag * 4 * (1 - 2 * t) / (z1 - z0)) });
    }
  };
  for (const y of [F + 12, F + 15.5, F + 19]) for (let z = -9.5; z < 9.4; z += 3.8) addSwag(z, z + 3.8, y, 0.8);
  for (const z of [-dd.w / 2 - 0.9, dd.w / 2 + 0.9]) for (let y = F + 11.6; y > F + 1; y -= 0.17) swags.push({ x: 0.75, y, z, vertical: true });
  const chain = new THREE.InstancedMesh(link, M.gold, swags.length);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0);
  const qa = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
  const qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const qv = new THREE.Quaternion();
  swags.forEach((s, i) => {
    if (s.vertical) q.copy(i % 2 ? qa : qv);
    else q.setFromAxisAngle(AX, s.tilt).multiply(i % 2 ? qa : qb);
    mm.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(1, 1, 1));
    chain.setMatrixAt(i, mm);
  });
  chain.castShadow = true;
  group.add(chain);
  registry.add('chains', chain);
  registry.setFocus('chains', [1, F + 12, 0], 22, [1, 0.1, 0.25]);
  registry.setFocus('veil', [1, F + 5, 0], 14, [1, 0.12, 0.2]);
  registry.setFocus('debir_doors', [1, F + 5, 0], 16, [1, 0.12, 0.35]);

  // 折叠门与幔子的动画
  const update = (dt, camPos) => {
    const want = state.get('doors') ? 1 : 0;
    if (Math.abs(openT - want) > 1e-3) { openT += Math.sign(want - openT) * Math.min(Math.abs(want - openT), dt * 0.5); setDoors(openT); }
    const near = camPos && camPos.x > -3 && camPos.x < 6 && Math.abs(camPos.z) < 4 && camPos.y < F + 9;
    const vw = near ? 1 : 0;
    veilOpen += (vw - veilOpen) * Math.min(1, dt * 3);
    for (const { pivot } of halves) pivot.scale.z = 1 - veilOpen * 0.72;
  };

  // 进入"幽暗"的至圣所
  registry.setFocus('debir', [-10, F + 8, 0], 26, [1, 0.35, 0.6]);
  registry.setFocus('hekhal', [20, F + 10, 0], 40, [1, 0.45, 0.5]);
  registry.setFocus('temple', [10, F + 20, 0], 210, [1, 0.5, 0.75]);
  registry.setFocus('chambers', [10, F + 8, 26], 80, [0.45, 0.35, 1]);
  registry.setFocus('windows', [20, F + 21, 14], 46, [0.2, 0.15, 1]);
  registry.setFocus('stone_wall', [-36, F + 12, 20], 70, [-0.8, 0.3, 0.7]);
  registry.setFocus('roof', [10, F + 31, 0], 120, [0.6, 1, 0.6]);
  registry.setFocus('main_doors', [41, F + 5, 0], 18, [1, 0.15, 0.3]);
  registry.setFocus('wall_carving', [20, F + 6, 9.5], 12, [0, 0.1, -1]);
  registry.setFocus('gold_floor', [20, F, 0], 30, [1, 1.2, 0.3]);
  registry.setFocus('upper_rooms', [-10, F + 25, 0], 60, [0.4, 1.2, 0.5]);
  registry.setFocus('podium', [70, F, 18], 60, [1, 0.4, 0.8]);

  return { group, roofGroup, porch, update, buildPorch };
}
