// 程序生成的纹理与共享材质。纹理以"肘"为尺度（世界 UV：1 单位 = 1 肘）
import * as THREE from 'three';
import { canvas, cherub, palm, rosette, gourd, chainBand, lion, ox, heightData, blur, normalCanvas, tintCanvas } from './motifs.js';
import { nfast } from '../core/terrain-fn.js';

let RNG = 12345;
const rnd = () => ((RNG = (RNG * 16807) % 2147483647) / 2147483647);

function tex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const GOLD_LO = [0.42, 0.27, 0.08], GOLD_HI = [1.0, 0.82, 0.45];

// —— 金墙浮雕：6×7.5 肘一块（花带、基路伯与棕树、野瓜、链子与宝石）——
function goldWall(P) {
  const W = 6 * P, H = Math.round(7.5 * P);
  const c = canvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const yc = (y) => H - y * P; // 肘（自下而上）→ 像素
  // 底子：微微起伏的平面
  ctx.fillStyle = 'rgb(60,60,60)'; ctx.fillRect(0, 0, W, H);
  // 边线
  ctx.fillStyle = 'rgb(150,150,150)';
  for (const y of [0.15, 1.05, 6.2, 7.35]) ctx.fillRect(0, yc(y + 0.12), W, 0.12 * P);
  // 初开的花
  for (let i = 0; i < 6; i++) rosette(ctx, (i + 0.5) * P, yc(0.6), 0.4 * P, 12);
  // 主带：棕树居中，两旁基路伯相向
  palm(ctx, 3 * P, yc(1.25), 4.6 * P);
  palm(ctx, 0, yc(1.25), 4.6 * P);
  palm(ctx, W, yc(1.25), 4.6 * P);
  cherub(ctx, 1.55 * P, yc(1.25), 4.7 * P, 1);
  cherub(ctx, 4.45 * P, yc(1.25), 4.7 * P, -1);
  // 野瓜两行
  for (let i = 0; i < 20; i++) {
    gourd(ctx, (i + 0.5) * 0.3 * P, yc(6.5), 0.11 * P, 0.07 * P);
    gourd(ctx, (i + 0.0) * 0.3 * P + 0.15 * P, yc(6.75), 0.11 * P, 0.07 * P);
  }
  // 链子
  const gems = chainBand(ctx, 0, W, yc(7.12), 0.36 * P, 0.22 * P);
  let h = blur(heightData(c), W, H, Math.max(1, P / 64));
  const nrm = normalCanvas(h, W, H, P / 22);
  const col = tintCanvas(h, W, H, GOLD_LO, GOLD_HI, 0.05, 3);
  // 宝石（代下3:6）
  const cx = col.getContext('2d');
  const gemC = ['#b3122e', '#1f4fb8', '#1d7a4a', '#7a2a9a'];
  gems.forEach(([x, y], i) => {
    cx.fillStyle = gemC[i % gemC.length];
    cx.beginPath(); cx.arc(x, y, 0.07 * P, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.7)';
    cx.beginPath(); cx.arc(x - 0.02 * P, y - 0.02 * P, 0.02 * P, 0, Math.PI * 2); cx.fill();
  });
  return { map: tex(col, { repeat: [1 / 6, 1 / 7.5] }), normal: tex(nrm, { repeat: [1 / 6, 1 / 7.5], srgb: false }) };
}

// —— 门扇浮雕：一扇门（两片折叠门）2.5×10 肘 ——
function goldDoor(P) {
  const W = Math.round(2.5 * P), H = 10 * P;
  const c = canvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(70,70,70)'; ctx.fillRect(0, 0, W, H);
  const yc = (y) => H - y * P;
  ctx.strokeStyle = 'rgb(170,170,170)'; ctx.lineWidth = 0.08 * P;
  for (const x of [0.06, 1.25, 2.44]) { ctx.beginPath(); ctx.moveTo(x * P, 0); ctx.lineTo(x * P, H); ctx.stroke(); }
  for (const half of [0, 1.25]) {
    const x0 = half * P;
    ctx.strokeStyle = 'rgb(150,150,150)'; ctx.lineWidth = 0.05 * P;
    for (const [y0, y1] of [[0.2, 1.4], [1.6, 6.0], [6.2, 9.8]]) ctx.strokeRect(x0 + 0.15 * P, yc(y1), 0.95 * P, (y1 - y0) * P);
    rosette(ctx, x0 + 0.625 * P, yc(0.8), 0.42 * P, 12);
    palm(ctx, x0 + 0.625 * P, yc(1.7), 4.1 * P);
    cherub(ctx, x0 + 0.62 * P, yc(6.35), 3.2 * P, half ? -1 : 1);
  }
  const h = blur(heightData(c), W, H, Math.max(1, P / 64));
  return {
    map: tex(tintCanvas(h, W, H, GOLD_LO, GOLD_HI, 0.05, 5)),
    normal: tex(normalCanvas(h, W, H, P / 22), { srgb: false }),
  };
}

// —— 凿成的石头（方石，带琢边）——
function stoneTex({ tileW = 12, tileH = 6, rows = 4, P = 64, base = [0.85, 0.8, 0.69], vary = 0.07, beam = false, boss = true, minL = 2, maxL = 5 }) {
  const W = tileW * P, H = Math.round(tileH * P);
  const hc = canvas(W, H), hx = hc.getContext('2d');
  const cc = canvas(W, H), cx = cc.getContext('2d');
  hx.fillStyle = '#000'; hx.fillRect(0, 0, W, H);
  const beamH = 0.55;
  const courseH = beam ? (tileH - beamH) / rows : tileH / rows;
  let y = H;
  for (let r = 0; r < rows; r++) {
    const ch = courseH * P;
    let x = -rnd() * maxL * P;
    while (x < W) {
      const L = (minL + rnd() * (maxL - minL)) * P;
      const t = 1 + (rnd() - 0.5) * vary * 2;
      const warm = (rnd() - 0.5) * 0.04;
      const col = `rgb(${(base[0] * t + warm) * 255 | 0},${base[1] * t * 255 | 0},${(base[2] * t - warm) * 255 | 0})`;
      const draw = (ox) => {
        cx.fillStyle = col; cx.fillRect(ox + x, y - ch, L, ch);
        hx.fillStyle = 'rgb(120,120,120)'; hx.fillRect(ox + x + 2, y - ch + 2, L - 4, ch - 4);
        if (boss) { hx.fillStyle = 'rgb(175,175,175)'; hx.fillRect(ox + x + 0.14 * P, y - ch + 0.14 * P, L - 0.28 * P, ch - 0.28 * P); }
      };
      draw(0); if (x + L > W) draw(-W); if (x < 0) draw(W);
      x += L;
    }
    y -= ch;
    if (beam && r === rows - 1) {
      // 一层香柏木（王上6:36、7:12）
      cx.fillStyle = '#8a5a36'; cx.fillRect(0, 0, W, y);
      hx.fillStyle = 'rgb(140,140,140)'; hx.fillRect(0, 2, W, y - 4);
      cx.strokeStyle = 'rgba(40,20,10,0.35)'; cx.lineWidth = 1;
      for (let k = 0; k < 6; k++) { cx.beginPath(); cx.moveTo(0, y * (k + 0.5) / 6); cx.lineTo(W, y * (k + 0.5) / 6 + rnd() * 4); cx.stroke(); }
    }
  }
  // 风化斑点
  const img = cx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < W * H; i++) {
    const px = i % W, py = (i / W) | 0;
    const n = nfast(px / (P * 0.8), py / (P * 0.8)) * 0.08 + nfast(px / 6 + 3.1, py / 6 + 7.7) * 0.03;
    for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.max(0, Math.min(255, d[i * 4 + k] * (1 + n)));
  }
  cx.putImageData(img, 0, 0);
  let h = heightData(hc);
  for (let i = 0; i < h.length; i++) h[i] += nfast((i % W) / 9 + 1.3, ((i / W) | 0) / 9 + 4.2) * 0.05;
  h = blur(h, W, H, 1);
  return {
    map: tex(cc, { repeat: [1 / tileW, 1 / tileH] }),
    normal: tex(normalCanvas(h, W, H, P / 26), { repeat: [1 / tileW, 1 / tileH], srgb: false }),
  };
}

// —— 铺石地 ——
function paveTex(P, tile = 16, base = [0.88, 0.8, 0.66]) {
  const W = tile * P;
  const cc = canvas(W, W), cx = cc.getContext('2d'), hc = canvas(W, W), hx = hc.getContext('2d');
  hx.fillStyle = '#000'; hx.fillRect(0, 0, W, W);
  let y = 0;
  while (y < W) {
    const rh = (1.5 + rnd() * 2) * P;
    let x = -rnd() * 2 * P;
    const hh = Math.min(rh, W - y);
    while (x < W) {
      const L = (1.6 + rnd() * 3) * P;
      const t = 1 + (rnd() - 0.5) * 0.14;
      cx.fillStyle = `rgb(${base[0] * t * 255 | 0},${base[1] * t * 255 | 0},${base[2] * t * 255 | 0})`;
      cx.fillRect(x, y, L, hh);
      hx.fillStyle = 'rgb(160,160,160)';
      hx.fillRect(x + 2, y + 2, L - 4, hh - 4);
      x += L;
    }
    y += rh;
  }
  const img = cx.getImageData(0, 0, W, W), d = img.data;
  for (let i = 0; i < W * W; i++) {
    const n = nfast((i % W) / (P * 1.5), ((i / W) | 0) / (P * 1.5)) * 0.1;
    for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.max(0, Math.min(255, d[i * 4 + k] * (1 + n)));
  }
  cx.putImageData(img, 0, 0);
  const h = blur(heightData(hc), W, W, 1);
  return {
    map: tex(cc, { repeat: [1 / tile, 1 / tile] }),
    normal: tex(normalCanvas(h, W, W, P / 30), { repeat: [1 / tile, 1 / tile], srgb: false }),
  };
}

// —— 香柏木 ——
function cedarTex(P) {
  const W = 4 * P;
  const c = canvas(W, W), x = c.getContext('2d');
  const img = x.createImageData(W, W), d = img.data;
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const plank = Math.floor(i / (P * 0.8));
      const grain = Math.sin((i / P) * 22 + nfast(i / 30 + plank * 7, j / 160) * 2.2) * 0.5 + 0.5;
      const t = 0.82 + grain * 0.12 + (plank % 3) * 0.04 + nfast(i / 6 + 2.2, j / 60 + 5.5) * 0.04;
      const edge = (i % (P * 0.8)) < 2 ? 0.6 : 1;
      const k = (j * W + i) * 4;
      d[k] = 150 * t * edge; d[k + 1] = 82 * t * edge; d[k + 2] = 48 * t * edge; d[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return tex(c, { repeat: [1 / 4, 1 / 4] });
}

// —— 盆座侧板：狮子、牛、基路伯、棕树、璎珞（王上7:29、36）——
function standPanel(P) {
  const W = 4 * P, H = 2 * P;
  const c = canvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(70,70,70)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgb(170,170,170)';
  ctx.fillRect(0, 0, W, 0.14 * P); ctx.fillRect(0, H - 0.14 * P, W, 0.14 * P);
  for (const x of [0, 1.3, 2.7, 3.86]) ctx.fillRect(x * P, 0, 0.14 * P, H);
  lion(ctx, 0.72 * P, H - 0.3 * P, 1.1 * P, 1);
  cherub(ctx, 2.0 * P, H - 0.22 * P, 1.35 * P, 1);
  ox(ctx, 3.28 * P, H - 0.3 * P, 1.0 * P, -1);
  for (const x of [1.37, 2.77]) palm(ctx, x * P, H - 0.16 * P, 1.6 * P);
  ctx.strokeStyle = 'rgb(200,200,200)'; ctx.lineWidth = 0.05 * P;
  for (let i = 0; i < 8; i++) { // 垂下的璎珞
    ctx.beginPath(); ctx.arc((i + 0.5) * 0.5 * P, H - 0.16 * P, 0.22 * P, 0, Math.PI); ctx.stroke();
  }
  const h = blur(heightData(c), W, H, Math.max(1, P / 64));
  return {
    map: tex(tintCanvas(h, W, H, [0.3, 0.17, 0.07], [0.86, 0.6, 0.34], 0.06, 9), { repeat: [1 / 4, 1 / 2] }),
    normal: tex(normalCanvas(h, W, H, P / 18), { repeat: [1 / 4, 1 / 2], srgb: false }),
  };
}

// —— 幔子：蓝色、紫色、朱红色线和细麻，绣出基路伯（代下3:14）——
function veilTex(P) {
  const W = 5 * P, H = 9 * P;
  const c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#1d2f7a'; x.fillRect(0, 0, W, H);
  // 织纹
  for (let j = 0; j < H; j += 2) { x.fillStyle = j % 4 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'; x.fillRect(0, j, W, 1); }
  for (let i = 0; i < W; i += 3) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(i, 0, 1, H); }
  // 边带
  const band = (y, h) => {
    x.fillStyle = '#8e1b1f'; x.fillRect(0, y, W, h);
    x.fillStyle = '#5b1f6b'; x.fillRect(0, y + h * 0.3, W, h * 0.4);
    x.fillStyle = '#e8e2d0'; x.fillRect(0, y + h * 0.47, W, h * 0.06);
  };
  band(0.2 * P, 0.45 * P); band(H - 0.65 * P, 0.45 * P);
  // 基路伯（两两相向）
  const opt = (c1, c2, c3) => ({ c1, c2, c3, lineC: '#e8e2d0' });
  cherub(x, 1.35 * P, H - 1.0 * P, 3.4 * P, 1, opt('#8e1b1f', '#5b1f6b', '#c9302c'));
  cherub(x, 3.65 * P, H - 1.0 * P, 3.4 * P, -1, opt('#8e1b1f', '#5b1f6b', '#c9302c'));
  cherub(x, 1.35 * P, H - 4.6 * P, 3.4 * P, 1, opt('#5b1f6b', '#8e1b1f', '#7d3590'));
  cherub(x, 3.65 * P, H - 4.6 * P, 3.4 * P, -1, opt('#5b1f6b', '#8e1b1f', '#7d3590'));
  for (const [cx2, cy2] of [[2.5, 2.2], [2.5, 5.8]]) rosette(x, cx2 * P, H - cy2 * P, 0.35 * P, 10, { c1: '#e8e2d0', c2: '#c9302c', c3: '#e8e2d0', lineC: '#5b1f6b' });
  return tex(c);
}

function noiseTex(N = 256, scale = 24, oct = 4) {
  const c = canvas(N, N), x = c.getContext('2d');
  const img = x.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    // 可平铺：在环面上取样
    const a = i / N * Math.PI * 2, b = j / N * Math.PI * 2;
    const v = nfast(i / N * 16, j / N * 16) * 0.5 + 0.5 + nfast(i / N * 16 * 4 + 3, j / N * 16 * 4 + 9) * 0.15;
    const k = (j * N + i) * 4;
    d[k] = d[k + 1] = d[k + 2] = Math.max(0, Math.min(255, v * 255)); d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function glowTex(inner = [255, 240, 200], outer = [255, 120, 20], elong = 1) {
  const S = 128, c = canvas(S, S * elong), x = c.getContext('2d');
  const gr = x.createRadialGradient(S / 2, S * elong * 0.62, 2, S / 2, S * elong * 0.55, S / 2);
  gr.addColorStop(0, `rgba(${inner},1)`);
  gr.addColorStop(0.35, `rgba(${outer},0.75)`);
  gr.addColorStop(1, `rgba(${outer},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, S, S * elong);
  return tex(c, { srgb: true });
}

function smokeTex() {
  const S = 128, c = canvas(S, S), x = c.getContext('2d');
  const img = x.createImageData(S, S), d = img.data;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (i - S / 2) / (S / 2), dy = (j - S / 2) / (S / 2);
    const r = Math.sqrt(dx * dx + dy * dy);
    const n = nfast(i / 18, j / 18) * 0.5 + 0.5;
    const a = Math.max(0, 1 - r) ** 1.6 * (0.5 + n * 0.8);
    const k = (j * S + i) * 4;
    d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.min(255, a * 255);
  }
  x.putImageData(img, 0, 0);
  return tex(c);
}

function plankTex(P) {
  const W = 4 * P;
  const c = canvas(W, W), x = c.getContext('2d');
  x.fillStyle = 'rgb(150,150,150)'; x.fillRect(0, 0, W, W);
  x.fillStyle = 'rgb(40,40,40)';
  for (let i = 0; i <= 5; i++) x.fillRect(0, i * 0.8 * P - 1, W, 2);
  for (let j = 0; j < 5; j++) { const o = (j % 2) * 2 * P + rnd() * P; x.fillRect(o, j * 0.8 * P, 2, 0.8 * P); x.fillRect(o + 2 * P, j * 0.8 * P, 2, 0.8 * P); }
  const h = blur(heightData(c), W, W, 1);
  return {
    map: tex(tintCanvas(h, W, W, [0.55, 0.38, 0.12], [0.95, 0.78, 0.42], 0.08, 4), { repeat: [1 / 4, 1 / 4] }),
    normal: tex(normalCanvas(h, W, W, 3), { repeat: [1 / 4, 1 / 4], srgb: false }),
  };
}

export function createMaterials(quality = 'high') {
  const P = quality === 'high' ? 128 : quality === 'mid' ? 96 : 64;
  const S = quality === 'high' ? 64 : quality === 'mid' ? 48 : 32;
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const wall = goldWall(P);
  const door = goldDoor(P);
  const stone = stoneTex({ P: S });
  const stoneBig = stoneTex({ P: S / 2, tileW: 24, tileH: 9, rows: 4, minL: 4, maxL: 10, base: [0.8, 0.75, 0.63], vary: 0.09 });
  const court = stoneTex({ P: S, tileW: 12, tileH: 4.8, rows: 3, minL: 2.5, maxL: 6 });
  const porch = stoneTex({ P: S, tileW: 12, tileH: 5.35, rows: 3, beam: true, minL: 2.5, maxL: 6 });
  const pave = paveTex(S / 2);
  const paveCoarse = paveTex(S / 2, 24, [0.82, 0.74, 0.6]);
  const cedar = cedarTex(S * 2);
  const panel = standPanel(P);
  const plank = plankTex(S * 2);
  const noise = tex(noiseTex(256), { srgb: false, repeat: [1 / 40, 1 / 40] });

  const M = {
    stone: std({ map: stone.map, normalMap: stone.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.86 }),
    stoneBig: std({ map: stoneBig.map, normalMap: stoneBig.normal, roughness: 0.92, color: new THREE.Color(0.92, 0.9, 0.86) }),
    courtStone: std({ map: court.map, normalMap: court.normal, roughness: 0.86 }),
    porchStone: std({ map: porch.map, normalMap: porch.normal, roughness: 0.85 }),
    pavement: std({ map: pave.map, normalMap: pave.normal, roughness: 0.9 }),
    pavementCoarse: std({ map: paveCoarse.map, normalMap: paveCoarse.normal, roughness: 0.95 }),
    cedar: std({ map: cedar, roughness: 0.72 }),
    goldWall: std({ map: wall.map, normalMap: wall.normal, normalScale: new THREE.Vector2(1.2, 1.2), metalness: 0.6, roughness: 0.4 }),
    goldDoor: std({ map: door.map, normalMap: door.normal, normalScale: new THREE.Vector2(1.2, 1.2), metalness: 0.65, roughness: 0.38, side: THREE.DoubleSide }),
    goldFloor: std({ map: plank.map, normalMap: plank.normal, normalScale: new THREE.Vector2(0.35, 0.35), metalness: 1, roughness: 0.55, color: new THREE.Color(0.78, 0.7, 0.55) }),
    gold: std({ color: new THREE.Color('#e7b955'), metalness: 1, roughness: 0.24 }),
    goldDark: std({ color: new THREE.Color('#b8862e'), metalness: 1, roughness: 0.38 }),
    bronze: std({ color: new THREE.Color('#b08a5e'), metalness: 1, roughness: 0.4 }),
    bronzeDark: std({ color: new THREE.Color('#7a5230'), metalness: 0.9, roughness: 0.5 }),
    bronzePanel: std({ map: panel.map, normalMap: panel.normal, metalness: 1, roughness: 0.4 }),
    water: std({ color: new THREE.Color('#2f4c55'), metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.88 }),
    veil: std({ map: veilTex(Math.round(P * 0.8)), roughness: 0.85, side: THREE.DoubleSide }),
    linen: std({ color: new THREE.Color('#eeeae0'), roughness: 0.92 }),
    plaster: std({ map: stone.map, color: new THREE.Color(0.95, 0.9, 0.82), roughness: 0.95 }),
    roofEarth: std({ color: new THREE.Color('#9c8a6c'), roughness: 1, map: noise }),
    ivory: std({ color: new THREE.Color('#efe4c8'), roughness: 0.35 }),
    terrain: std({ vertexColors: true, roughness: 0.97, map: noise }),
    dirt: std({ color: new THREE.Color('#a8957a'), roughness: 1, map: noise }),
    bark: std({ color: new THREE.Color('#5d4a38'), roughness: 1 }),
    leaf: std({ vertexColors: true, roughness: 0.9, flatShading: true }),
    wood: std({ map: cedar, color: new THREE.Color(0.75, 0.7, 0.65), roughness: 0.8 }),
    dark: std({ color: new THREE.Color('#141110'), roughness: 1 }),
    bread: std({ color: new THREE.Color('#d9a868'), roughness: 0.85 }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a') }),
    flame: new THREE.MeshBasicMaterial({ map: glowTex([255, 246, 210], [255, 140, 30], 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ map: glowTex([255, 230, 170], [255, 170, 60], 1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    smoke: smokeTex(),
    shaft: new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color('#fff1c8') }, opacity: { value: 0.09 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 color; uniform float opacity; varying vec3 vP; void main(){ float along = clamp(vP.z, 0.0, 1.0); float e = 1.0 - smoothstep(0.25, 0.5, max(abs(vP.x) / 1.6, abs(vP.y) / 6.0 * 1.0)); gl_FragColor = vec4(color, opacity * (1.0 - along) * (1.0 - along) * (0.35 + 0.65 * e)); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }),
  };
  M.stoneBig.map = stoneBig.map;
  M.goldWallOut = M.goldWall.clone();
  M.goldWallOut.metalness = 0.5; M.goldWallOut.roughness = 0.5;
  M.interior = [M.goldWall, M.goldDoor, M.goldFloor, M.gold, M.goldDark];
  return M;
}
