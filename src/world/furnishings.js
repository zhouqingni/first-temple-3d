// 殿内陈设：十个金灯台、十张桌子与陈设饼、金香坛、两个基路伯、约柜与施恩座；殿内灯光
import * as THREE from 'three';
import { Builder, lathe, tube, merge, transformed } from './geom.js';
import { Y, HOUSE } from '../core/layout.js';
import { registry } from '../app/registry.js';

const F = Y.floor;

// —— 灯台：照出25:31-40，高约 3 肘（推测）——
function lampstandGeo() {
  const parts = [];
  const top = 3.0;
  // 座
  parts.push(lathe([[0.01, 0], [0.55, 0], [0.55, 0.06], [0.42, 0.1], [0.42, 0.16], [0.28, 0.22], [0.12, 0.3], [0.07, 0.36]], 20));
  // 干
  parts.push(new THREE.CylinderGeometry(0.055, 0.065, top - 0.3, 10).translate(0, 0.3 + (top - 0.3) / 2, 0));
  // 杯（像杏花）、球、花
  const cup = lathe([[0.03, 0], [0.09, 0.05], [0.07, 0.1], [0.11, 0.17], [0.085, 0.2]], 10);
  const knob = new THREE.SphereGeometry(0.1, 10, 8);
  for (const y of [0.55, 0.85, 1.15, 2.6]) parts.push(cup.clone().translate(0, y, 0));
  // 枝子：三对，半圆向上，杈处有球（出25:35）
  const arms = [1.1, 0.75, 0.4];
  for (const r of arms) {
    const y0 = top - r;
    parts.push(knob.clone().translate(0, y0, 0));
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI * 1.5 + s * (i / 14) * Math.PI / 2;
        pts.push([Math.cos(a) * r * s * s + 0, top + Math.sin(a) * r, 0]);
      }
      // 从干出来先水平再向上
      const curve = [];
      for (let i = 0; i <= 14; i++) {
        const th = (i / 14) * Math.PI / 2;
        curve.push([s * Math.sin(th) * r, top - Math.cos(th) * r, 0]);
      }
      parts.push(tube(curve, 0.045, 16, 6));
      // 每枝三个杯
      for (const t of [0.35, 0.65, 0.9]) {
        const th = t * Math.PI / 2;
        parts.push(cup.clone().scale(0.8, 0.8, 0.8).translate(s * Math.sin(th) * r, top - Math.cos(th) * r - 0.06, 0));
      }
    }
  }
  // 七个灯盏
  const lamp = lathe([[0.01, 0], [0.1, 0.01], [0.13, 0.05], [0.12, 0.08], [0.02, 0.06]], 12);
  for (const x of [-1.1, -0.75, -0.4, 0, 0.4, 0.75, 1.1]) {
    parts.push(lamp.clone().translate(x, top, 0));
    parts.push(new THREE.CylinderGeometry(0.03, 0.04, 0.08, 6).rotateZ(Math.PI / 2).translate(x + 0.13, top + 0.06, 0));
  }
  return merge(parts);
}
export const LAMP_XS = [-1.1, -0.75, -0.4, 0, 0.4, 0.75, 1.1];

// —— 桌子：照出25:23-30，长 2、宽 1、高 1.5 ——
function tableGeo() {
  const p = [];
  const B = (x0, y0, z0, x1, y1, z1) => p.push(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  B(-1, 1.42, -0.5, 1, 1.5, 0.5);
  B(-1.03, 1.5, -0.53, 1.03, 1.56, -0.47); B(-1.03, 1.5, 0.47, 1.03, 1.56, 0.53); // 金牙边
  B(-1.03, 1.5, -0.53, -0.97, 1.56, 0.53); B(0.97, 1.5, -0.53, 1.03, 1.56, 0.53);
  B(-0.95, 1.22, -0.45, 0.95, 1.42, 0.45); // 一掌宽的横梁
  for (const [x, z] of [[-0.88, -0.38], [0.88, -0.38], [-0.88, 0.38], [0.88, 0.38]]) {
    p.push(lathe([[0.07, 0], [0.06, 0.1], [0.05, 0.6], [0.07, 0.7], [0.05, 0.8], [0.06, 1.42]], 8).translate(x, 0, z));
    p.push(new THREE.TorusGeometry(0.07, 0.02, 5, 10).rotateY(Math.PI / 2).translate(x, 1.1, z + Math.sign(z) * 0.07));
  }
  return merge(p);
}

// —— 金香坛：照出30:1-3，长宽各 1、高 2，有角 ——
function incenseGeo() {
  const p = [];
  p.push(new THREE.BoxGeometry(1, 1.8, 1).translate(0, 0.9, 0));
  p.push(new THREE.BoxGeometry(1.08, 0.08, 1.08).translate(0, 1.82, 0));
  p.push(new THREE.BoxGeometry(1.08, 0.1, 1.08).translate(0, 0.05, 0));
  for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) p.push(lathe([[0.09, 0], [0.08, 0.1], [0.04, 0.18], [0.005, 0.22]], 8).translate(x, 1.86, z));
  for (const x of [-0.5, 0.5]) p.push(new THREE.TorusGeometry(0.07, 0.02, 5, 10).translate(x * 1.02, 1.55, 0).rotateY(0));
  return merge(p);
}

// —— 基路伯：站立，翅膀平展（王上6:23-27）。朝 +x，原点在脚下中心；h 为身高 ——
export function cherubGeo(h = 10, { spread = 'side', span = 10 } = {}) {
  const s = h / 10;
  const body = [], wings = [];
  // 长袍（横截面左右宽、前后窄）
  body.push(lathe([[1.05, 0], [1.12, 0.25], [1.0, 1.6], [0.88, 3.2], [0.8, 4.6], [0.82, 5.2], [0.92, 6.0], [1.02, 6.8], [1.04, 7.25], [0.85, 7.7], [0.42, 7.95], [0.28, 8.05]], 28).scale(0.72, 1, 1));
  // 腰带
  body.push(new THREE.TorusGeometry(0.8, 0.08, 6, 28).rotateX(Math.PI / 2).scale(0.72, 1, 1.02).translate(0, 5.05, 0));
  // 衣褶
  for (let i = -3; i <= 3; i++) body.push(new THREE.CylinderGeometry(0.05, 0.07, 4.6, 5).translate(0.62, 2.5, i * 0.28).rotateZ(0.02));
  // 头、发、鼻
  body.push(new THREE.SphereGeometry(0.6, 20, 16).scale(0.92, 1.12, 0.86).translate(0.04, 8.62, 0));
  body.push(new THREE.SphereGeometry(0.64, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.95, 1.1, 0.9).rotateZ(0.35).translate(-0.06, 8.7, 0));
  body.push(new THREE.ConeGeometry(0.1, 0.32, 6).rotateZ(-Math.PI / 2 + 0.25).translate(0.6, 8.55, 0));
  body.push(new THREE.BoxGeometry(0.1, 0.06, 0.5).translate(0.55, 8.82, 0));
  body.push(new THREE.CylinderGeometry(0.26, 0.3, 0.5, 12).translate(0, 7.95, 0));
  // 手臂：前臂向前
  for (const z of [-1, 1]) {
    body.push(tube([[-0.05, 7.35, z * 0.92], [0.1, 6.5, z * 1.02], [0.25, 5.9, z * 0.95]], 0.2, 8, 8));
    body.push(tube([[0.25, 5.9, z * 0.95], [0.7, 5.75, z * 0.75], [1.05, 5.8, z * 0.45]], 0.16, 8, 8));
    body.push(new THREE.SphereGeometry(0.17, 10, 8).scale(1.3, 0.8, 1).translate(1.15, 5.82, z * 0.38));
    body.push(new THREE.SphereGeometry(0.2, 10, 8).scale(1.6, 0.55, 0.9).translate(0.62, 0.12, z * 0.38));
  }
  // 翅膀：前缘骨 + 数排羽毛。每片羽毛沿前缘排开，朝 fall 方向伸出
  const feather = (w, L) => {
    const g = new THREE.PlaneGeometry(w, L, 2, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const t = (L / 2 - y) / L; // 0 根 → 1 尖
      const taper = t < 0.72 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - 0.72) / 0.28) ** 2));
      p.setXYZ(i, x * taper, y - L / 2, Math.abs(x) * 0.1 + t * t * 0.05 * L);
    }
    g.computeVertexNormals();
    return g;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const addWing = (lead, fall, rows, t0 = 0.04) => {
    const bone = [];
    for (let i = 0; i <= 12; i++) bone.push(lead(i / 12).toArray());
    wings.push(tube(bone, 0.12, 24, 6));
    rows.forEach(([len, wd, n], k) => {
      for (let i = 0; i < n; i++) {
        const t = t0 + (1 - t0) * (i + 0.5) / n;
        const p = lead(t);
        const T = lead(Math.min(1, t + 0.01)).sub(lead(Math.max(0, t - 0.01))).normalize();
        const D = fall(t, k).normalize();
        D.sub(T.clone().multiplyScalar(D.dot(T))).normalize();
        const g = feather(wd * (1 - t * 0.25), len(t));
        const y = D.clone().negate(), z = new THREE.Vector3().crossVectors(T, y);
        g.applyMatrix4(new THREE.Matrix4().makeBasis(T, y, z));
        g.translate(p.x, p.y - k * 0.07, p.z);
        wings.push(g);
      }
    });
  };
  for (const side of [-1, 1]) {
    if (spread === 'mercy') {
      // 施恩座上的小基路伯：高张翅膀，向前伸到施恩座上方，彼此几乎相接（出25:20）
      const root = V(-0.2, 7.5, side * 0.8), tip = V(7.6, 12.6, side * 2.1);
      const lead = (t) => root.clone().lerp(tip, t).add(V(0, Math.sin(Math.PI * t) * 1.3, 0));
      addWing(lead, () => V(-0.35, -1, side * 0.35), [[(t) => 1.8, 0.85, 10], [(t) => 3.2 - t * 0.8, 0.8, 12], [(t) => 4.8 - t * 1.8, 0.75, 14]], 0.06);
    } else {
      // 大基路伯：翅膀向两边张开，又向前伸展如篷，"张着翅膀在约柜之上，遮掩约柜和抬柜的杠"（王上8:7）
      const rootZ = side * 0.75, tipZ = side * (span / 2 - 0.05);
      const lead = (t) => V(-0.45 - 0.1 * t, 7.55 + Math.sin(Math.PI * t * 0.85) * 0.85 + 0.55 * t, rootZ + (tipZ - rootZ) * t);
      const fall = (t, k) => V(Math.cos(0.26 + 0.22 * t + k * 0.04), -Math.sin(0.26 + 0.22 * t + k * 0.04), side * 0.16 * t);
      addWing(lead, fall, [[(t) => 0.9 - t * 0.2, 0.46, 16], [(t) => 1.7 - t * 0.4, 0.43, 18], [(t) => 2.6 - t * 0.7, 0.4, 20], [(t) => 3.5 - t * 1.0, 0.38, 22]], 0.1);
    }
  }
  let b = merge(body), w = merge(wings);
  if (spread === 'mercy') {
    // 脸对脸，朝着施恩座：身子微微前倾
    const lean = new THREE.Matrix4().makeRotationZ(-0.2);
    b.applyMatrix4(lean); w.applyMatrix4(lean);
  }
  b = b.scale(s, s, s); w = w.scale(s, s, s);
  return { body: b, wings: w };
}

export function buildFurnishings(M, world, scene) {
  const group = new THREE.Group(); group.name = 'furnishings';
  scene.add(group);
  const B = new Builder(M);

  // 圣所里的十个灯台与十张桌子：右（南）五，左（北）五
  const lampGeo = lampstandGeo();
  const tGeo = tableGeo();
  const xs = [7, 14, 21, 28, 35];
  const flames = [];
  for (const s of [-1, 1]) for (const x of xs) {
    const lz = s * 5.6, tz = s * 8.2;
    B.place('lampstand', 'gold', lampGeo, [x, F, lz], 0);
    for (const lx of LAMP_XS) flames.push(new THREE.Vector3(x + lx + 0.1, F + 3.16, lz));
    world.addBox(x - 1.2, F, lz - 0.6, x + 1.2, F + 3.2, lz + 0.6, 'furn');
    B.place('table', 'gold', tGeo, [x, F, tz], 0);
    world.addBox(x - 1.05, F, tz - 0.55, x + 1.05, F + 1.6, tz + 0.55, 'furn');
    // 陈设饼：两摞，每摞六个（利24:5-6），上放乳香
    for (const dx of [-0.5, 0.5]) {
      for (let k = 0; k < 6; k++) B.add('showbread', 'bread', new THREE.CylinderGeometry(0.4, 0.42, 0.11, 16).scale(1, 1, 0.92).translate(x + dx, F + 1.56 + 0.06 + k * 0.115, tz));
      B.add('showbread', 'gold', lathe([[0.01, 0], [0.12, 0.01], [0.13, 0.08], [0.02, 0.06]], 10).translate(x + dx, F + 1.56 + 0.7, tz));
    }
  }
  // 金香坛：在内殿门前（王上6:22）
  B.place('incense_altar', 'gold', incenseGeo(), [4, F, 0], 0);
  B.box('incense_altar', 'ember', 3.65, F + 1.86, -0.35, 4.35, F + 1.9, 0.35);
  world.addBox(3.4, F, -0.6, 4.6, F + 2.1, 0.6, 'furn');

  // 两个基路伯（王上6:23-28）
  const big = cherubGeo(10, { span: 10 });
  for (const z of [-5, 5]) {
    B.add('cherubim', 'gold', big.body.clone().translate(-10.6, F, z));
    B.add('cherubim', 'goldWing', big.wings.clone().translate(-10.6, F, z));
    world.addBox(-12, F, z - 1.3, -9.4, F + 9, z + 1.3, 'furn');
  }
  // 约柜：长二肘半、宽一肘半、高一肘半（出25:10）
  const ax = -9.2, az = 0;
  B.box('ark', 'gold', ax - 1.25, F + 0.12, az - 0.75, ax + 1.25, F + 1.5, az + 0.75);
  for (const [y0, y1, e] of [[F + 1.38, F + 1.5, 0.06], [F + 0.12, F + 0.24, 0.04]]) B.box('ark', 'goldDark', ax - 1.25 - e, y0, az - 0.75 - e, ax + 1.25 + e, y1, az + 0.75 + e);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    B.box('ark', 'gold', ax + sx * 1.1 - 0.12, F, az + sz * 0.62 - 0.12, ax + sx * 1.1 + 0.12, F + 0.14, az + sz * 0.62 + 0.12);
    B.add('ark', 'gold', new THREE.TorusGeometry(0.12, 0.03, 6, 12).translate(ax + sx * 0.95, F + 0.42, az + sz * 0.79));
  }
  // 杠：东西向，杠头在圣所可以看见（王上8:8）
  for (const sz of [-1, 1]) B.add('ark', 'gold', new THREE.CylinderGeometry(0.075, 0.075, 9.4, 10).rotateZ(Math.PI / 2).translate(ax + 2.2, F + 0.42, az + sz * 0.79));
  // 施恩座与二基路伯（出25:17-20）
  B.box('mercy_seat', 'gold', ax - 1.28, F + 1.5, az - 0.78, ax + 1.28, F + 1.64, az + 0.78);
  const small = cherubGeo(0.95, { spread: 'mercy', span: 1.5 });
  for (const sx of [-1, 1]) {
    const rot = sx > 0 ? Math.PI : 0; // 脸对脸
    const m = new THREE.Matrix4().makeRotationY(rot).setPosition(ax + sx * 1.0, F + 1.64, az);
    B.add('mercy_seat', 'gold', small.body.clone(), m);
    B.add('mercy_seat', 'goldWing', small.wings.clone(), m);
  }
  world.addBox(ax - 1.4, F, az - 0.9, ax + 1.4, F + 2.6, az + 0.9, 'furn');

  M.goldWing = M.gold.clone(); M.goldWing.side = THREE.DoubleSide;
  M.interior.push(M.goldWing);
  B.build(group);

  registry.setFocus('lampstand', [21, F + 2.5, 5.6], 9, [-0.35, 0.3, -1]);
  registry.setFocus('table', [21, F + 1.5, 8.2], 7, [-0.3, 0.6, -1]);
  registry.setFocus('showbread', [21, F + 2, 8.2], 4, [-0.2, 0.8, -1]);
  registry.setFocus('incense_altar', [4, F + 1.6, 0], 7, [1, 0.5, 0.5]);
  registry.setFocus('cherubim', [-10, F + 7, 0], 24, [1, 0.12, 0.25]);
  registry.setFocus('ark', [ax, F + 1.2, az], 7, [1, 0.45, 0.5]);
  registry.setFocus('ark_history', [ax, F + 1.2, az], 7, [1, 0.45, 0.5]);
  registry.setFocus('mercy_seat', [ax, F + 2, az], 4.5, [0.8, 0.8, 0.6]);

  // 灯火（点）与殿内暖光
  const fg = new THREE.BufferGeometry().setFromPoints(flames);
  const flameMat = new THREE.PointsMaterial({ map: M.flame.map, size: 0.55, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe0a8', fog: false });
  const glowMat = new THREE.PointsMaterial({ map: M.glow.map, size: 2.2, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffb35c', fog: false });
  const pts = new THREE.Points(fg, flameMat), glow = new THREE.Points(fg, glowMat);
  group.add(pts, glow);
  const lights = [];
  for (const x of [10, 30]) for (const s of [-1, 1]) {
    const L = new THREE.PointLight('#ffb460', 60, 34, 1.5);
    L.position.set(x, F + 6, s * 5.2);
    group.add(L); lights.push(L);
  }
  const debirLight = new THREE.PointLight('#ffc27a', 42, 34, 1.25);
  debirLight.position.set(-3.5, F + 6.5, 0);
  group.add(debirLight);

  return {
    group,
    setTime(v) {
      const night = v === 'night' || v === 'dusk';
      for (const L of lights) L.userData.base = night ? 75 : 60;
      glowMat.opacity = night ? 0.5 : 0.35;
    },
    setScene() {},
    update(dt, t, cam) {
      // 镜头在殿内或殿门附近才点亮殿内灯光（减少室外每个像素的光照计算）
      const near = cam && cam.x > -24 && cam.x < 75 && Math.abs(cam.z) < 30 && cam.y < F + 40;
      for (const L of lights) L.visible = near;
      debirLight.visible = near;
      flameMat.size = 0.52 + Math.sin(t * 13) * 0.03 + Math.sin(t * 7.3) * 0.02;
      for (let i = 0; i < lights.length; i++) lights[i].intensity = (lights[i].userData.base ?? 60) * (1 + Math.sin(t * (9 + i)) * 0.03 + Math.sin(t * (17 + i * 3)) * 0.02);
    },
  };
}
