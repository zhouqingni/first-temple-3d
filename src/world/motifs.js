// 浮雕纹样（画在灰度"高度图"上：越白越高）
// 基路伯、棕树、初开的花（王上6:29）、野瓜（6:18）、链子（代下3:5）、狮子、牛（王上7:29）

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const g = (v) => `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;

export function cherub(ctx, cx, base, h, facing = 1, opt = {}) {
  const f = facing, v = opt.v ?? 0.82;
  const P = (x, y) => [cx + f * x * h, base - y * h];
  const path = (pts, close = true) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      if (p.length === 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, ...P(...p));
      else ctx.quadraticCurveTo(...P(p[0], p[1]), ...P(p[2], p[3]));
    });
    if (close) ctx.closePath();
  };
  // 后翼（低浮雕）
  ctx.fillStyle = opt.c2 ?? g(v * 0.62);
  path([[-0.02, 0.74], [-0.24, 0.68, -0.34, 0.34], [-0.3, 0.3], [-0.2, 0.36], [-0.24, 0.26], [-0.12, 0.34], [-0.14, 0.24], [-0.04, 0.4]]);
  ctx.fill();
  // 长袍
  ctx.fillStyle = opt.c1 ?? g(v * 0.86);
  path([[-0.07, 0.76], [0.06, 0.76], [0.1, 0.4, 0.13, 0.02], [-0.13, 0.02], [-0.11, 0.4, -0.07, 0.76]]);
  ctx.fill();
  // 衣褶
  ctx.strokeStyle = opt.lineC ?? g(v * 0.6);
  ctx.lineWidth = Math.max(1, h * 0.008);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(...P(i * 0.02, 0.62)); ctx.lineTo(...P(i * 0.045, 0.05)); ctx.stroke();
  }
  // 腰带
  ctx.fillStyle = opt.c3 ?? g(v);
  path([[-0.09, 0.5], [0.09, 0.5], [0.095, 0.47], [-0.095, 0.47]]); ctx.fill();
  // 脚
  ctx.fillStyle = opt.c1 ?? g(v * 0.86);
  path([[0.02, 0.03], [0.16, 0.03], [0.17, 0.0], [0.02, 0.0]]); ctx.fill();
  // 伸向棕树的手臂
  ctx.strokeStyle = opt.c1 ?? g(v * 0.9);
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.045;
  ctx.beginPath(); ctx.moveTo(...P(0.02, 0.72)); ctx.quadraticCurveTo(...P(0.12, 0.7), ...P(0.22, 0.64)); ctx.stroke();
  // 头
  ctx.fillStyle = opt.c3 ?? g(v);
  ctx.beginPath(); ctx.ellipse(...P(0.01, 0.855), h * 0.062, h * 0.072, 0, 0, Math.PI * 2); ctx.fill();
  path([[0.055, 0.87], [0.088, 0.84], [0.058, 0.83]]); ctx.fill(); // 鼻
  // 发与发带
  ctx.fillStyle = opt.c2 ?? g(v * 0.7);
  path([[-0.06, 0.9], [-0.01, 0.93, 0.04, 0.9], [0.0, 0.88], [-0.045, 0.8], [-0.07, 0.8]]); ctx.fill();
  ctx.strokeStyle = opt.c3 ?? g(v);
  ctx.lineWidth = h * 0.008;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(...P(-0.055, 0.8 + i * 0.022), h * 0.01, 0, Math.PI * 2); ctx.stroke(); }
  // 前翼：自肩高举向前，羽毛成排
  ctx.fillStyle = opt.c3 ?? g(v);
  path([[-0.03, 0.74], [-0.1, 1.02, 0.08, 1.06], [0.3, 1.04, 0.36, 0.9], [0.28, 0.9], [0.31, 0.84], [0.22, 0.86], [0.24, 0.79], [0.14, 0.82], [0.14, 0.75], [0.06, 0.78], [0.03, 0.72]]);
  ctx.fill();
  ctx.strokeStyle = opt.lineC ?? g(v * 0.62);
  ctx.lineWidth = Math.max(1, h * 0.007);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    ctx.beginPath(); ctx.moveTo(...P(-0.02 + t * 0.05, 0.76 + t * 0.2)); ctx.lineTo(...P(0.07 + t * 0.26, 0.8 + t * 0.12)); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(...P(-0.04, 0.86)); ctx.quadraticCurveTo(...P(0.08, 1.0), ...P(0.33, 0.93)); ctx.stroke();
}

export function palm(ctx, cx, base, h, opt = {}) {
  const v = opt.v ?? 0.8;
  const top = base - h * 0.62;
  ctx.fillStyle = opt.c1 ?? g(v * 0.85);
  // 台座
  ctx.fillRect(cx - h * 0.09, base - h * 0.04, h * 0.18, h * 0.04);
  ctx.fillRect(cx - h * 0.06, base - h * 0.07, h * 0.12, h * 0.03);
  // 树干（带鳞纹）
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.04, base - h * 0.07);
  ctx.lineTo(cx - h * 0.028, top); ctx.lineTo(cx + h * 0.028, top); ctx.lineTo(cx + h * 0.04, base - h * 0.07);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = opt.lineC ?? g(v * 0.55);
  ctx.lineWidth = Math.max(1, h * 0.008);
  for (let y = base - h * 0.1; y > top; y -= h * 0.035) {
    ctx.beginPath(); ctx.moveTo(cx - h * 0.035, y); ctx.lineTo(cx, y - h * 0.018); ctx.lineTo(cx + h * 0.035, y); ctx.stroke();
  }
  // 涡卷（腓尼基式棕榈柱头）
  ctx.strokeStyle = opt.c2 ?? g(v);
  ctx.lineWidth = h * 0.02;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.15) {
      const r = h * 0.07 * (1 - a / (Math.PI * 3.6));
      const x = cx + s * (h * 0.06 + Math.cos(a) * r * s * -1 + r), y = top + h * 0.02 + Math.sin(a) * r;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 枣串
  ctx.fillStyle = opt.c2 ?? g(v * 0.9);
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(cx + s * (h * 0.05 + (i % 3) * h * 0.016), top + h * 0.06 + Math.floor(i / 3) * h * 0.018, h * 0.011, 0, Math.PI * 2); ctx.fill();
  }
  // 叶
  const fronds = 11;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (1.05 + 0.9 * i / (fronds - 1));
    const len = h * (0.24 + 0.12 * Math.sin(Math.PI * i / (fronds - 1)));
    const ex = cx + Math.cos(a) * len, ey = top - h * 0.02 + Math.sin(a) * len * 0.75 + len * 0.35 * Math.abs(Math.cos(a));
    const mx = cx + Math.cos(a) * len * 0.5, my = top - h * 0.02 + Math.sin(a) * len * 0.7;
    ctx.strokeStyle = opt.c2 ?? g(v);
    ctx.lineWidth = h * 0.028;
    ctx.beginPath(); ctx.moveTo(cx, top - h * 0.01); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.strokeStyle = opt.lineC ?? g(v * 0.6);
    ctx.lineWidth = Math.max(1, h * 0.006);
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      const px = (1 - t) * (1 - t) * cx + 2 * t * (1 - t) * mx + t * t * ex;
      const py = (1 - t) * (1 - t) * (top - h * 0.01) + 2 * t * (1 - t) * my + t * t * ey;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a + 1.2) * h * 0.02, py + Math.sin(a + 1.2) * h * 0.02 + h * 0.012); ctx.stroke();
    }
  }
}

export function rosette(ctx, cx, cy, r, petals = 12, opt = {}) {
  const v = opt.v ?? 0.85;
  ctx.fillStyle = opt.c1 ?? g(v * 0.75);
  for (let i = 0; i < petals; i++) {
    const a = i / petals * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.42, r * 0.16, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = opt.c2 ?? g(v * 0.95);
  for (let i = 0; i < petals; i++) {
    const a = (i + 0.5) / petals * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r * 0.38, cy + Math.sin(a) * r * 0.38, r * 0.26, r * 0.1, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = opt.c3 ?? g(v);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = opt.lineC ?? g(v * 0.5);
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2); ctx.stroke();
}

export function gourd(ctx, cx, cy, rx, ry, opt = {}) {
  const v = opt.v ?? 0.85;
  ctx.fillStyle = opt.c1 ?? g(v * 0.8);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = opt.c2 ?? g(v);
  ctx.beginPath(); ctx.ellipse(cx - rx * 0.2, cy - ry * 0.25, rx * 0.5, ry * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = opt.lineC ?? g(v * 0.5);
  ctx.lineWidth = Math.max(1, rx * 0.12);
  ctx.beginPath(); ctx.moveTo(cx + rx, cy); ctx.lineTo(cx + rx * 1.4, cy - ry * 0.3); ctx.stroke();
}

export function chainBand(ctx, x0, x1, cy, lw, lh, opt = {}) {
  const v = opt.v ?? 0.85;
  ctx.lineWidth = lh * 0.22;
  const gems = [];
  let i = 0;
  for (let x = x0 + lw * 0.5; x < x1; x += lw * 0.78, i++) {
    ctx.strokeStyle = g(i % 2 ? v * 0.7 : v);
    ctx.beginPath();
    if (i % 2) ctx.ellipse(x, cy, lw * 0.18, lh * 0.5, 0, 0, Math.PI * 2);
    else ctx.ellipse(x, cy, lw * 0.5, lh * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (i % 6 === 3) gems.push([x, cy]);
  }
  return gems;
}

export function lion(ctx, cx, base, h, facing = 1, opt = {}) {
  const v = opt.v ?? 0.82, f = facing;
  const P = (x, y) => [cx + f * x * h, base - y * h];
  ctx.fillStyle = g(v * 0.82);
  ctx.beginPath();
  ctx.moveTo(...P(-0.5, 0.55)); ctx.quadraticCurveTo(...P(-0.1, 0.62), ...P(0.25, 0.6));
  ctx.lineTo(...P(0.3, 0.3)); ctx.lineTo(...P(-0.5, 0.32)); ctx.closePath(); ctx.fill();
  for (const [x, w] of [[-0.48, 0.09], [-0.34, 0.09], [0.12, 0.09], [0.24, 0.09]]) ctx.fillRect(...P(x, 0.36), w * h, 0.36 * h);
  ctx.fillStyle = g(v);
  ctx.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, r = (i % 2 ? 0.2 : 0.26) * h;
    const [px, py] = P(0.3, 0.68);
    i ? ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r) : ctx.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = g(v * 0.9);
  ctx.beginPath(); ctx.ellipse(...P(0.4, 0.68), h * 0.11, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = g(v * 0.85); ctx.lineWidth = h * 0.04; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...P(-0.5, 0.5)); ctx.quadraticCurveTo(...P(-0.72, 0.6), ...P(-0.64, 0.86)); ctx.stroke();
}

export function ox(ctx, cx, base, h, facing = 1) {
  const v = 0.82, f = facing;
  const P = (x, y) => [cx + f * x * h, base - y * h];
  ctx.fillStyle = g(v * 0.8);
  ctx.beginPath();
  ctx.moveTo(...P(-0.52, 0.66)); ctx.quadraticCurveTo(...P(0.0, 0.78), ...P(0.3, 0.72));
  ctx.lineTo(...P(0.34, 0.36)); ctx.quadraticCurveTo(...P(-0.1, 0.3), ...P(-0.52, 0.38)); ctx.closePath(); ctx.fill();
  for (const x of [-0.5, -0.36, 0.14, 0.26]) ctx.fillRect(...P(x, 0.38), 0.09 * h, 0.38 * h);
  ctx.fillStyle = g(v);
  ctx.beginPath(); ctx.ellipse(...P(0.42, 0.62), h * 0.13, h * 0.11, f * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = g(v); ctx.lineWidth = h * 0.035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...P(0.36, 0.72)); ctx.quadraticCurveTo(...P(0.3, 0.9), ...P(0.45, 0.92)); ctx.stroke();
  ctx.lineWidth = h * 0.025;
  ctx.beginPath(); ctx.moveTo(...P(-0.52, 0.62)); ctx.lineTo(...P(-0.6, 0.3)); ctx.stroke();
}

export function pomegranate(ctx, cx, cy, r, opt = {}) {
  const v = opt.v ?? 0.85;
  ctx.fillStyle = opt.c1 ?? g(v * 0.85);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.35, cy - r * 0.8); ctx.lineTo(cx - r * 0.2, cy - r * 1.35); ctx.lineTo(cx, cy - r * 1.0);
  ctx.lineTo(cx + r * 0.2, cy - r * 1.35); ctx.lineTo(cx + r * 0.35, cy - r * 0.8); ctx.closePath(); ctx.fill();
}

// —— 高度图处理 ——

export function heightData(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const out = new Float32Array(c.width * c.height);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

export function blur(h, w, H, r) {
  r = Math.round(r);
  if (r < 1) return h;
  const tmp = new Float32Array(h.length), out = new Float32Array(h.length);
  const k = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += h[y * w + ((x + w) % w)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / k;
      s += h[y * w + ((x + r + 1) % w)] - h[y * w + ((x - r + w) % w)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[((y + H) % H) * w + x];
    for (let y = 0; y < H; y++) {
      out[y * w + x] = s / k;
      s += tmp[((y + r + 1) % H) * w + x] - tmp[((y - r + H) % H) * w + x];
    }
  }
  return out;
}

export function normalCanvas(h, w, H, strength = 2) {
  const c = canvas(w, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const l = h[y * w + ((x - 1 + w) % w)], r = h[y * w + ((x + 1) % w)];
      const u = h[((y - 1 + H) % H) * w + x], dn = h[((y + 1) % H) * w + x];
      let nx = (l - r) * strength, ny = (dn - u) * strength, nz = 1;
      const L = Math.hypot(nx, ny, nz);
      nx /= L; ny /= L; nz /= L;
      const i = (y * w + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// 按高度给颜色：base/top 为 [r,g,b]（0-1），noise 为每像素随机起伏
export function tintCanvas(h, w, H, low, high, noise = 0.04, seed = 1) {
  const c = canvas(w, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, H);
  const d = img.data;
  let s = seed * 9301 + 49297;
  for (let i = 0; i < h.length; i++) {
    s = (s * 9301 + 49297) % 233280;
    const n = (s / 233280 - 0.5) * noise;
    const t = Math.min(1, Math.max(0, h[i]));
    for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.min(255, Math.max(0, (low[k] + (high[k] - low[k]) * t + n) * 255));
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
