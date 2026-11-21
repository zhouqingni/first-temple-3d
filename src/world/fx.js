// 特效：坛上的火与烟（利6:13）、香烟、窗棂透光；献殿之日的云彩（王上8:10）与天火（代下7:1）
import * as THREE from 'three';
import { ALTAR, Y, HOUSE, PORCH } from '../core/layout.js';
import { WINDOW_XS } from './temple.js';
import { dirFrom, PRESETS } from './sky.js';
import { registry } from '../app/registry.js';

const F = Y.floor;

class Particles {
  constructor(n, map, { color = '#ffffff', additive = false, opacity = 1 } = {}) {
    this.n = n;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, color: { value: new THREE.Color(color) }, scale: { value: 600 }, opacity: { value: opacity } },
      vertexShader: 'attribute float size; attribute float alpha; varying float vA; uniform float scale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; vA = alpha; }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 color; uniform float opacity; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color * t.rgb, t.a * vA * opacity); }',
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.life = new Float32Array(n); this.vel = new Float32Array(n * 3); this.age = new Float32Array(n);
  }
  commit() {
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = g.attributes.size.needsUpdate = g.attributes.alpha.needsUpdate = true;
  }
}

export class FX {
  constructor(scene, M, quality) {
    this.scene = scene; this.M = M; this.q = quality;
    this.group = new THREE.Group(); this.group.name = 'fx'; scene.add(this.group);
    const top = Y.inner + ALTAR.h;
    this.altarTop = new THREE.Vector3(ALTAR.cx, top, ALTAR.cz);
    // 坛上的火
    this.fire = new Particles(quality === 'low' ? 40 : 90, M.flame.map, { color: '#ffd0a0', additive: true });
    this.group.add(this.fire.points);
    // 烟
    this.smoke = new Particles(quality === 'low' ? 40 : 80, M.smoke, { color: '#8c8478', opacity: 0.55 });
    this.group.add(this.smoke.points);
    // 香烟（金香坛）
    this.incense = new Particles(28, M.smoke, { color: '#ece6dc', opacity: 0.35 });
    this.group.add(this.incense.points);
    for (const P of [this.fire, this.smoke, this.incense]) for (let i = 0; i < P.n; i++) P.age[i] = Math.random() * 10, P.life[i] = 0;
    this.fireLight = new THREE.PointLight('#ff8a3a', quality === 'low' ? 0 : 160, 70, 1.5);
    this.fireLight.position.copy(this.altarTop).add(new THREE.Vector3(0, 3, 0));
    this.group.add(this.fireLight);
    registry.add('altar_fire', this.fire.points, { pick: false });

    // 窗棂透光
    this.shafts = [];
    const shaftGeo = new THREE.BoxGeometry(1.6, 6, 1).translate(0, 0, 0.5);
    for (const x of WINDOW_XS) for (const s of [-1, 1]) {
      const m = new THREE.Mesh(shaftGeo, M.shaft);
      m.userData = { x, s };
      m.visible = false; m.renderOrder = 5;
      this.group.add(m); this.shafts.push(m);
    }
    this.doorShaft = new THREE.Mesh(new THREE.BoxGeometry(4.4, 9.4, 1).translate(0, 0, 0.5), M.shaft.clone());
    this.doorShaft.material.uniforms = { color: { value: new THREE.Color('#fff1c8') }, opacity: { value: 0.07 } };
    this.doorShaft.visible = false;
    this.group.add(this.doorShaft);

    // 献殿：云彩与天火
    this.cloud = new Particles(quality === 'low' ? 90 : 200, M.smoke, { color: '#fff4dc', opacity: 0 });
    this.group.add(this.cloud.points);
    for (let i = 0; i < this.cloud.n; i++) this.seedCloud(i);
    this.cloudLight = { intensity: 0 }; // 云的亮度由材质自身表现，不再多加一盏灯
    this.heaven = new Particles(80, M.flame.map, { color: '#ffe2a8', additive: true, opacity: 0 });
    this.group.add(this.heaven.points);
    this.cloudT = 0; this.cloudTarget = 0; this.heavenT = -1; this.boost = 0;
  }

  seedCloud(i) {
    const P = this.cloud;
    const inHouse = i < P.n * 0.78;
    const x = inHouse ? HOUSE.x0 + Math.random() * (PORCH.x1 - HOUSE.x0) : PORCH.x1 + Math.random() * 26;
    const z = inHouse ? (Math.random() - 0.5) * 19 : (Math.random() - 0.5) * 30;
    const y = inHouse ? F + 1 + Math.random() * 27 : F + Math.random() * 22;
    P.pos.set([x, y, z], i * 3);
    P.size[i] = inHouse ? 9 + Math.random() * 9 : 12 + Math.random() * 14;
    P.vel.set([(Math.random() - 0.5) * 0.4, (Math.random() - 0.2) * 0.25, (Math.random() - 0.5) * 0.4], i * 3);
    P.life[i] = Math.random() * 6.28;
  }

  setTime(v, sky) {
    const p = PRESETS[v] ?? PRESETS.morning;
    const sun = dirFrom(p.el, p.az);
    const on = !p.night && p.el > 4;
    for (const m of this.shafts) {
      const { x, s } = m.userData;
      const facing = sun.z * s;
      m.visible = on && facing > 0.12;
      if (!m.visible) continue;
      const y = F + 21.75;
      const start = new THREE.Vector3(x, y, s * 10.5);
      const L = Math.min(48, (y - F) / Math.max(0.15, sun.y));
      m.position.copy(start);
      m.scale.set(1, 1, L);
      m.lookAt(start.clone().sub(sun));
    }
    const d = this.doorShaft;
    d.visible = on && sun.x > 0.6 && p.el < 35;
    if (d.visible) {
      const start = new THREE.Vector3(HOUSE.eastOuter, F + 5, 0);
      d.position.copy(start); d.scale.set(1, 1, 34); d.lookAt(start.clone().sub(sun));
    }
    this.fireLight.intensity = this.q === 'low' ? 0 : p.night ? 260 : 140;
  }

  setScene(v) {
    this.ded = v === 'dedication';
    if (!this.ded) { this.cloudTarget = 0; this.heavenT = -1; this.boost = 0; }
  }

  // 献殿阶段：stand / praise / cloud / pray / fire / prostrate
  setPhase(p) {
    if (!this.ded) return;
    this.cloudTarget = ['cloud', 'pray', 'fire', 'prostrate'].includes(p) ? 1 : 0;
    if (p === 'fire') { this.heavenT = 0; for (let i = 0; i < this.heaven.n; i++) this.heaven.life[i] = -Math.random() * 1.2; }
    if (p === 'stand' || p === 'praise') { this.heavenT = -1; this.boost = 0; }
  }

  update(dt, t, camera) {
    const scale = window.innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    for (const P of [this.fire, this.smoke, this.incense, this.cloud, this.heaven]) P.mat.uniforms.scale.value = scale;
    const A = this.altarTop;
    const boost = 1 + this.boost;
    // 火
    const f = this.fire;
    for (let i = 0; i < f.n; i++) {
      f.age[i] += dt;
      if (f.age[i] > f.life[i]) {
        f.age[i] = 0; f.life[i] = 0.6 + Math.random() * 0.9;
        const r = Math.random() * 2.6 * Math.sqrt(boost), a = Math.random() * 6.28;
        f.pos.set([A.x + Math.cos(a) * r, A.y + 0.3, A.z + Math.sin(a) * r], i * 3);
        f.vel.set([(Math.random() - 0.5) * 0.4, 1.8 + Math.random() * 1.8 * boost, (Math.random() - 0.5) * 0.4], i * 3);
      }
      const k = f.age[i] / f.life[i];
      for (let c = 0; c < 3; c++) f.pos[i * 3 + c] += f.vel[i * 3 + c] * dt;
      f.size[i] = (1.7 - k * 1.1) * (0.8 + 0.4 * boost);
      f.alpha[i] = Math.sin(Math.PI * Math.min(1, k * 1.2)) * 0.9;
    }
    f.commit();
    this.fireLight.position.y = A.y + 3 + Math.sin(t * 11) * 0.3;
    this.fireLight.visible = camera.position.distanceTo(A) < 260;
    // 烟
    const s = this.smoke;
    for (let i = 0; i < s.n; i++) {
      s.age[i] += dt;
      if (s.age[i] > s.life[i]) {
        s.age[i] = 0; s.life[i] = 9 + Math.random() * 7;
        s.pos.set([A.x + (Math.random() - 0.5) * 4, A.y + 2.5, A.z + (Math.random() - 0.5) * 4], i * 3);
        s.vel.set([0.6 + Math.random() * 0.6, 2.2 + Math.random() * 1.2, (Math.random() - 0.5) * 0.5], i * 3);
      }
      const k = s.age[i] / s.life[i];
      s.pos[i * 3] += s.vel[i * 3] * dt * (0.4 + k);
      s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt * (1 - k * 0.5);
      s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      s.size[i] = 3 + k * 18;
      s.alpha[i] = Math.min(1, k * 6) * (1 - k) * 0.55;
    }
    s.commit();
    // 香烟
    const n = this.incense;
    for (let i = 0; i < n.n; i++) {
      n.age[i] += dt;
      if (n.age[i] > n.life[i]) { n.age[i] = 0; n.life[i] = 6 + Math.random() * 4; n.pos.set([4 + (Math.random() - 0.5) * 0.3, F + 2, (Math.random() - 0.5) * 0.3], i * 3); }
      const k = n.age[i] / n.life[i];
      n.pos[i * 3 + 1] += dt * 1.1;
      n.pos[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.25;
      n.pos[i * 3 + 2] += Math.cos(t * 0.5 + i * 1.7) * dt * 0.25;
      n.size[i] = 0.6 + k * 5;
      n.alpha[i] = Math.min(1, k * 5) * (1 - k);
    }
    n.commit();
    // 云彩充满殿
    this.cloudT += (this.cloudTarget - this.cloudT) * Math.min(1, dt * 0.35);
    this.cloud.mat.uniforms.opacity.value = this.cloudT * 0.55;
    this.cloudLight.intensity = this.cloudT * 260;
    this.cloud.points.visible = this.cloudT > 0.01;
    if (this.cloud.points.visible) {
      const c = this.cloud;
      for (let i = 0; i < c.n; i++) {
        c.life[i] += dt * 0.3;
        for (let k = 0; k < 3; k++) c.pos[i * 3 + k] += c.vel[i * 3 + k] * dt + (k === 1 ? 0 : Math.sin(c.life[i] + k) * 0.08 * dt);
        if (c.pos[i * 3 + 1] > F + 30 || c.pos[i * 3 + 1] < F) c.vel[i * 3 + 1] *= -1;
        c.alpha[i] = 0.55 + Math.sin(c.life[i]) * 0.25;
      }
      c.commit();
    }
    // 火从天降
    const h = this.heaven;
    h.points.visible = this.heavenT >= 0;
    if (this.heavenT >= 0) {
      this.heavenT += dt;
      h.mat.uniforms.opacity.value = this.heavenT < 3.2 ? 1 : Math.max(0, 1 - (this.heavenT - 3.2));
      for (let i = 0; i < h.n; i++) {
        h.life[i] += dt;
        const k = h.life[i];
        if (k < 0) { h.alpha[i] = 0; continue; }
        const y = A.y + Math.max(0, 260 - k * 160);
        h.pos.set([A.x + Math.sin(i * 7.1) * (3 + k), y, A.z + Math.cos(i * 3.7) * (3 + k)], i * 3);
        h.size[i] = 10 + Math.sin(i) * 4;
        h.alpha[i] = y > A.y + 1 ? 0.9 : Math.max(0, 1 - (k - 1.6));
      }
      h.commit();
      if (this.heavenT > 1.5) this.boost = Math.min(2.5, this.boost + dt * 2);
      this.fireLight.intensity = (this.q === 'low' ? 0 : 140) * (1 + this.boost * 2);
    }
  }
}
