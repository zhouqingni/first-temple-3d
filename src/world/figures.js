// 人物的身体部件（以米为单位，成年男子身高 1.68，面朝 +z）与大祭司、所罗门的细致造型
import * as THREE from 'three';
import { lathe, merge, transformed, tube } from './geom.js';
import { canvas } from './motifs.js';

const OPEN_FRONT = (open) => [open / 2, Math.PI * 2 - open];

export function bodyParts() {
  const robe = lathe([[0.26, 0.04], [0.25, 0.25], [0.215, 0.65], [0.178, 0.98], [0.185, 1.12], [0.205, 1.28], [0.205, 1.38], [0.15, 1.45], [0.065, 1.5]], 10).scale(1, 1, 0.78);
  const robeShort = lathe([[0.2, 0.42], [0.19, 0.62], [0.17, 0.98], [0.18, 1.12], [0.2, 1.28], [0.2, 1.38], [0.15, 1.45], [0.065, 1.5]], 12).scale(1, 1, 0.8);
  const [ps, pl] = OPEN_FRONT(0.9);
  const mantle = lathe([[0.285, 0.42], [0.25, 0.8], [0.21, 1.1], [0.225, 1.3], [0.22, 1.4], [0.16, 1.46]], 12, ps, pl).scale(1, 1, 0.8);
  const sash = new THREE.TorusGeometry(0.185, 0.028, 5, 14).rotateX(Math.PI / 2).scale(1, 1, 0.79).translate(0, 1.0, 0);
  const head = new THREE.SphereGeometry(0.105, 10, 7).scale(0.92, 1.05, 1).translate(0, 1.585, 0.005);
  const [hs, hl] = OPEN_FRONT(1.7);
  const hood = lathe([[0.005, 1.725], [0.085, 1.715], [0.125, 1.665], [0.132, 1.585], [0.142, 1.5], [0.175, 1.42]], 12, hs, hl);
  const [vs, vl] = OPEN_FRONT(1.5);
  const veil = lathe([[0.005, 1.72], [0.09, 1.71], [0.128, 1.655], [0.138, 1.57], [0.165, 1.46], [0.225, 1.3], [0.26, 1.1]], 12, vs, vl).scale(1, 1, 0.85);
  const cap = lathe([[0.005, 1.755], [0.075, 1.75], [0.112, 1.72], [0.118, 1.66], [0.112, 1.635]], 12);
  const beard = new THREE.SphereGeometry(0.068, 8, 6).scale(1, 1.25, 0.7).translate(0, 1.515, 0.066);
  const hair = new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.95, 1.05, 1.02).translate(0, 1.6, -0.008);
  const arm = new THREE.CylinderGeometry(0.052, 0.044, 0.6, 6).translate(0, -0.3, 0);
  const hand = new THREE.SphereGeometry(0.043, 5, 4).translate(0, -0.63, 0.01);
  const foot = new THREE.BoxGeometry(0.085, 0.05, 0.21).translate(0, 0.025, 0.04);
  const leg = new THREE.CylinderGeometry(0.045, 0.038, 0.44, 6).translate(0, -0.22, 0);
  const staff = new THREE.CylinderGeometry(0.016, 0.02, 1.55, 5).translate(0, -0.4, 0.02);
  // 扛在肩上的羊羔（利1:10）
  const lamb = merge([
    new THREE.SphereGeometry(0.17, 9, 7).scale(1.9, 1.0, 1.0),
    new THREE.SphereGeometry(0.085, 8, 6).scale(1.2, 1, 1).translate(0.36, 0.06, 0.02),
    new THREE.SphereGeometry(0.03, 5, 4).translate(0.43, 0.06, 0.08),
    ...[[-0.18, 1], [0.18, 1], [-0.18, -1], [0.18, -1]].map(([x, s]) => new THREE.CylinderGeometry(0.025, 0.02, 0.22, 5).rotateX(s * 0.9).translate(x, -0.06, s * 0.12)),
  ]).translate(0, 1.47, -0.06);
  // 头顶的果筐（申26:2）
  const basketParts = [lathe([[0.01, 0], [0.13, 0.005], [0.17, 0.06], [0.185, 0.13], [0.17, 0.135], [0.155, 0.07], [0.01, 0.04]], 12)];
  const fruitCols = [];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, r = i < 7 ? 0.1 : 0.02;
    const f = new THREE.SphereGeometry(0.045, 6, 5).translate(Math.cos(a) * r, 0.14 + (i >= 7 ? 0.05 : 0), Math.sin(a) * r);
    basketParts.push(f);
  }
  const basket = merge(basketParts).translate(0, 1.71, 0);
  // 一对斑鸠（利12:8）
  const dove = (x) => merge([new THREE.SphereGeometry(0.05, 7, 5).scale(1.6, 0.9, 0.9), new THREE.SphereGeometry(0.03, 6, 4).translate(0.08, 0.03, 0), new THREE.ConeGeometry(0.025, 0.08, 4).rotateZ(Math.PI / 2).translate(-0.1, 0.01, 0)]).translate(x, 0, 0);
  const doves = merge([dove(-0.05), dove(0.07).rotateY(0.3)]).translate(0, 1.16, 0.2);
  // 琴、号、钹（代下5:12）
  const lyre = merge([
    new THREE.BoxGeometry(0.28, 0.12, 0.06).translate(0, 0, 0),
    tube([[-0.12, 0.05, 0], [-0.16, 0.25, 0], [-0.11, 0.42, 0]], 0.018, 6, 4),
    tube([[0.12, 0.05, 0], [0.16, 0.25, 0], [0.11, 0.42, 0]], 0.018, 6, 4),
    new THREE.CylinderGeometry(0.014, 0.014, 0.28, 4).rotateZ(Math.PI / 2).translate(0, 0.42, 0),
  ]).rotateX(-0.3).translate(-0.05, 1.12, 0.2);
  const trumpet = merge([
    new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6).rotateX(Math.PI / 2).translate(0, 0, 0.31),
    new THREE.ConeGeometry(0.06, 0.1, 10, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.64),
  ]).rotateX(-0.55).translate(0, 1.52, 0.1);
  return { robe, robeShort, mantle, sash, head, hood, veil, cap, beard, hair, arm, hand, foot, leg, staff, lamb, basket, doves, lyre, trumpet };
}

// —— 细致人物：大祭司（出28章） ——
function ephodTex() {
  const c = canvas(256, 256), x = c.getContext('2d');
  const cols = ['#d6a83e', '#2a4ea0', '#6a2c7e', '#b0302a', '#ece6d6'];
  for (let i = 0; i < 32; i++) { x.fillStyle = cols[i % 5]; x.fillRect(0, i * 8, 256, 8); }
  for (let i = 0; i < 256; i += 4) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(i, 0, 1, 256); }
  x.strokeStyle = '#f0c860'; x.lineWidth = 3;
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, 20 + i * 42); x.lineTo(256, 20 + i * 42); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const GEMS = ['#b3122e', '#d9b23a', '#c0392b', '#1f8a4c', '#1f4fb8', '#eef2f4', '#c76a2a', '#cfc8bd', '#7d3c98', '#5fa8a0', '#a3452b', '#2f6b4f'];

export function highPriest(M) {
  const g = new THREE.Group(); g.name = 'high_priest';
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const linen = std({ color: '#f1ede2', roughness: 0.9 });
  const blue = std({ color: '#203f8f', roughness: 0.75 });
  const skin = std({ color: '#a9774e', roughness: 0.7 });
  const goldM = M.gold;
  const ephod = std({ map: ephodTex(), roughness: 0.6, metalness: 0.2 });
  const body = new THREE.Group(); g.add(body);
  const add = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // 杂色细麻的内袍（出28:39）
  add(lathe([[0.25, 0.03], [0.24, 0.3], [0.21, 0.7], [0.18, 1.0], [0.2, 1.3], [0.15, 1.46], [0.065, 1.51]], 14).scale(1, 1, 0.8), linen);
  // 全蓝的外袍，底边石榴与金铃铛相间（出28:31-35）
  add(lathe([[0.285, 0.42], [0.26, 0.6], [0.225, 0.95], [0.215, 1.2], [0.222, 1.34], [0.16, 1.45], [0.07, 1.5]], 16).scale(1, 1, 0.82), blue);
  const n = 48;
  const pomM = [std({ color: '#2a4ea0' }), std({ color: '#6a2c7e' }), std({ color: '#b0302a' })];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const p = [Math.sin(a) * 0.29, 0.39, Math.cos(a) * 0.29 * 0.82];
    if (i % 2) add(new THREE.ConeGeometry(0.022, 0.045, 6).translate(...p), goldM);
    else add(new THREE.SphereGeometry(0.022, 6, 5).translate(...p), pomM[(i / 2) % 3]);
  }
  // 以弗得（出28:6-8）：前后两片，肩带，巧工织的带子
  add(new THREE.BoxGeometry(0.42, 0.56, 0.02).translate(0, 1.14, 0.19), ephod);
  add(new THREE.BoxGeometry(0.42, 0.56, 0.02).translate(0, 1.14, -0.18), ephod);
  add(new THREE.TorusGeometry(0.2, 0.03, 5, 16).rotateX(Math.PI / 2).scale(1, 1, 0.82).translate(0, 0.98, 0), ephod);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.07, 0.03, 0.36).translate(s * 0.13, 1.43, 0), ephod);
    // 肩上两块宝石（出28:9-12）
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8).translate(s * 0.13, 1.455, 0), goldM);
    add(new THREE.SphereGeometry(0.026, 8, 6).scale(1, 0.5, 1).translate(s * 0.13, 1.468, 0), std({ color: '#7a2a1c', roughness: 0.15, metalness: 0.1 }));
  }
  // 决断的胸牌：四行宝石，每行三颗（出28:15-21）
  add(new THREE.BoxGeometry(0.2, 0.2, 0.02).translate(0, 1.27, 0.205), goldM);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    add(new THREE.BoxGeometry(0.044, 0.036, 0.02).translate((c - 1) * 0.06, 1.335 - r * 0.045, 0.218), std({ color: GEMS[r * 3 + c], roughness: 0.12, metalness: 0.15, emissive: GEMS[r * 3 + c], emissiveIntensity: 0.08 }));
  }
  for (const s of [-1, 1]) add(tube([[s * 0.09, 1.37, 0.21], [s * 0.12, 1.41, 0.12], [s * 0.13, 1.44, 0.02]], 0.006, 6, 4), goldM);
  // 头、须、冠冕与金牌（出28:36-38）
  add(new THREE.SphereGeometry(0.105, 14, 10).scale(0.92, 1.05, 1).translate(0, 1.585, 0.005), skin);
  add(new THREE.SphereGeometry(0.075, 10, 8).scale(1, 1.5, 0.75).translate(0, 1.49, 0.07), std({ color: '#5a5048', roughness: 1 }));
  add(lathe([[0.005, 1.8], [0.08, 1.795], [0.115, 1.76], [0.122, 1.68], [0.118, 1.635]], 14), linen);
  for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.118, 0.012, 4, 16).rotateX(Math.PI / 2).translate(0, 1.66 + i * 0.03, 0), linen);
  add(new THREE.BoxGeometry(0.1, 0.035, 0.01).translate(0, 1.665, 0.118), goldM);
  add(new THREE.TorusGeometry(0.12, 0.006, 4, 16).rotateX(Math.PI / 2).translate(0, 1.665, 0), std({ color: '#203f8f' }));
  // 手臂（细麻袖）
  const arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.215, 1.4, 0); body.add(piv);
    add(new THREE.CylinderGeometry(0.055, 0.045, 0.6, 7).translate(0, -0.3, 0), linen, piv);
    add(new THREE.SphereGeometry(0.044, 6, 5).translate(0, -0.63, 0.01), skin, piv);
    arms.push(piv);
  }
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.085, 0.04, 0.2).translate(s * 0.08, 0.02, 0.05), skin);
  g.userData.arms = arms; g.userData.body = body;
  return g;
}

// 所罗门王（献殿之日）
export function solomon(M) {
  const g = new THREE.Group(); g.name = 'solomon';
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const purple = std({ color: '#5a2569', roughness: 0.6 });
  const inner = std({ color: '#e9dfc6', roughness: 0.85 });
  const skin = std({ color: '#ad7a52', roughness: 0.7 });
  const body = new THREE.Group(); g.add(body);
  const add = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  add(lathe([[0.27, 0.03], [0.25, 0.4], [0.21, 0.8], [0.19, 1.0], [0.21, 1.3], [0.15, 1.46], [0.065, 1.51]], 14).scale(1, 1, 0.8), inner);
  const [ps, pl] = OPEN_FRONT(0.7);
  add(lathe([[0.31, 0.06], [0.28, 0.5], [0.24, 0.95], [0.235, 1.3], [0.2, 1.42], [0.12, 1.48]], 16, ps, pl).scale(1, 1, 0.85), purple);
  add(new THREE.TorusGeometry(0.3, 0.018, 4, 24, Math.PI * 2 - 0.7).rotateX(Math.PI / 2).rotateY(0.35).scale(1, 1, 0.85).translate(0, 0.07, 0), M.gold);
  add(new THREE.SphereGeometry(0.105, 14, 10).scale(0.92, 1.05, 1).translate(0, 1.585, 0.005), skin);
  add(new THREE.SphereGeometry(0.075, 10, 8).scale(1, 1.45, 0.75).translate(0, 1.49, 0.07), std({ color: '#2b211a', roughness: 1 }));
  add(new THREE.SphereGeometry(0.112, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(0, 1.6, -0.01), std({ color: '#2b211a', roughness: 1 }));
  add(new THREE.CylinderGeometry(0.122, 0.118, 0.07, 16, 1, true).translate(0, 1.69, 0), M.gold);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(new THREE.ConeGeometry(0.018, 0.06, 4).translate(Math.sin(a) * 0.12, 1.75, Math.cos(a) * 0.12), M.gold); }
  const arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.215, 1.4, 0); body.add(piv);
    add(new THREE.CylinderGeometry(0.06, 0.05, 0.6, 7).translate(0, -0.3, 0), purple, piv);
    add(new THREE.SphereGeometry(0.044, 6, 5).translate(0, -0.63, 0.01), skin, piv);
    arms.push(piv);
  }
  g.userData.arms = arms; g.userData.body = body;
  return g;
}
