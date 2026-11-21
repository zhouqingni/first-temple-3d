// 地名标注与尺寸标注（CSS2D）
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { state } from '../app/state.js';
import { HOUSE, PORCH, ALTAR, SEA, PILLARS, INNER, PALACE, TERRACES, Y } from '../core/layout.js';

const F = Y.floor;

export class Labels {
  constructor(scene, camera, dom, T) {
    this.scene = scene; this.camera = camera; this.T = T;
    this.r = new CSS2DRenderer({ element: dom });
    this.r.setSize(innerWidth, innerHeight);
    this.names = new THREE.Group(); this.dims = new THREE.Group();
    scene.add(this.names, this.dims);
    const h = (x, z, up = 30) => T.heightAt(x, z) + up;
    const p3 = TERRACES[2], p2 = TERRACES[1], p1 = TERRACES[0];
    this.items = [
      ['耶和华的殿', [10, F + 48, 0], 120, 2600, true],
      ['内院', [118, 9, -36], 60, 900],
      ['大院', [180, 2, -80], 120, 1400],
      ['大卫城', [110, h(110, 1050, 60), 1050], 300, 6000, true],
      ['汲沦溪谷', [560, h(560, 300, 30), 300], 300, 6000, true],
      ['橄榄山', [1600, h(1600, 0, 70), 0], 400, 9000, true],
      ['欣嫩子谷', [-900, h(-900, 1700, 30), 1700], 400, 8000, true],
      ['城西的山岗', [-950, h(-950, 300, 40), 300], 400, 8000, true],
      ['基训泉', [300, h(300, 1062, 14), 1062], 150, 2500],
      ['米罗', [195, h(195, 610, 26), 610], 150, 2500],
      ['黎巴嫩林宫', [65, p3.y + PALACE.forest.h + 10, 409], 80, 2200],
      ['柱廊', [65, p2.y + PALACE.pillars.h + 6, 318], 60, 1500],
      ['审判廊', [65, p2.y + PALACE.throne.h + 6, 273], 60, 1500],
      ['王的宫室', [17, p1.y + PALACE.king.h + 6, 188], 60, 1500],
      ['法老女儿的宫', [126, p1.y + PALACE.pharaoh.h + 6, 188], 60, 1500],
      ['铜坛', [ALTAR.cx, 16, ALTAR.cz], 15, 420],
      ['铜海', [SEA.cx, 12, SEA.cz], 12, 300],
      ['雅斤', [PILLARS.x, F + 27, PILLARS.z + 3], 10, 300],
      ['波阿斯', [PILLARS.x, F + 27, -PILLARS.z - 3], 10, 300],
      ['铜台', [130, 6, 0], 10, 200],
    ].map(([text, pos, minD, maxD, big]) => {
      const el = document.createElement('div');
      el.className = `lbl${big ? ' big' : ''}`; el.textContent = text;
      const o = new CSS2DObject(el); o.position.set(...pos);
      o.userData = { minD, maxD, el };
      this.names.add(o);
      return o;
    });
    this.buildDims();
    state.on('porch', () => this.buildDims());
    state.on('pillar', () => this.buildDims());
    state.on('cubit', () => this.buildDims());
    state.on('names', (v) => { this.names.visible = v; });
    state.on('dims', (v) => { this.dims.visible = v; });
    this.names.visible = state.get('names');
    this.dims.visible = state.get('dims');
  }

  line(a, b, text, tick = [0, 1, 0]) {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), t = new THREE.Vector3(...tick).multiplyScalar(0.8);
    const pts = [A, Bv, A.clone().add(t), A.clone().sub(t), Bv.clone().add(t), Bv.clone().sub(t)];
    const g = new THREE.BufferGeometry().setFromPoints([pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]]);
    const l = new THREE.LineSegments(g, this.lineMat ??= new THREE.LineBasicMaterial({ color: '#f6d27a', depthTest: false, transparent: true }));
    l.renderOrder = 9;
    this.dims.add(l);
    const el = document.createElement('div'); el.className = 'dim'; el.textContent = text;
    const o = new CSS2DObject(el); o.position.copy(A).add(Bv).multiplyScalar(0.5);
    this.dims.add(o);
  }

  buildDims() {
    for (const c of [...this.dims.children]) { if (c.element) c.element.remove(); this.dims.remove(c); }
    const cu = state.get('cubit');
    const fmt = (n, note = '') => `${n} 肘 · 约 ${(n * cu).toFixed(1)} 米${note}`;
    const ph = state.get('porch') === 'a' ? PORCH.heights.a : PORCH.heights.b;
    const pl = state.get('pillar') === 'a' ? PILLARS.heights.a : PILLARS.heights.b;
    const top = F + 36;
    this.line([HOUSE.x0, top, -HOUSE.halfW - 6], [HOUSE.x1, top, -HOUSE.halfW - 6], `殿长 ${fmt(60)}`, [0, 0, 1]);
    this.line([HOUSE.x0, top, -HOUSE.halfW], [HOUSE.x0, top, HOUSE.halfW], `宽 ${fmt(20)}`, [1, 0, 0]);
    this.line([HOUSE.x0 - 12, F, -HOUSE.halfW - 16], [HOUSE.x0 - 12, F + 30, -HOUSE.halfW - 16], `高 ${fmt(30)}`, [1, 0, 0]);
    this.line([HOUSE.x0, F + 22, 0], [0, F + 22, 0], `至圣所 ${fmt(20)}（长宽高同）`, [0, 1, 0]);
    this.line([0, F + 32, 0], [HOUSE.x1, F + 32, 0], `外殿 ${fmt(40)}`, [0, 1, 0]);
    this.line([PORCH.x0, F + ph + 4, -PORCH.halfW], [PORCH.x0, F + ph + 4, PORCH.halfW], `廊长 ${fmt(20)}`, [1, 0, 0]);
    this.line([PORCH.front + 3, F, -PORCH.halfW - 8], [PORCH.front + 3, F + ph, -PORCH.halfW - 8], `廊高 ${fmt(ph, ph > 30 ? '（代下3:4）' : '（推测）')}`, [1, 0, 0]);
    this.line([PILLARS.x + 3, F, PILLARS.z + 3], [PILLARS.x + 3, F + pl, PILLARS.z + 3], `柱高 ${fmt(pl)}`, [1, 0, 0]);
    this.line([PILLARS.x + 3, F + pl, PILLARS.z + 3], [PILLARS.x + 3, F + pl + 5, PILLARS.z + 3], '柱顶 5 肘', [1, 0, 0]);
    const ax = ALTAR.cx, az = ALTAR.cz, as = ALTAR.size / 2;
    this.line([ax - as, ALTAR.h + 2, az - as - 2], [ax + as, ALTAR.h + 2, az - as - 2], `铜坛 ${fmt(20)}`, [0, 0, 1]);
    this.line([ax + as + 2, 0, az - as], [ax + as + 2, ALTAR.h, az - as], `坛高 ${fmt(10)}`, [1, 0, 0]);
    this.line([SEA.cx - 5.4, 10, SEA.cz], [SEA.cx + 5.4, 10, SEA.cz], `铜海径 ${fmt(10)}`, [0, 0, 1]);
    this.line([INNER.x0, 3, INNER.z1 + 6], [INNER.x1, 3, INNER.z1 + 6], `内院 200 肘（推测）`, [0, 0, 1]);
  }

  resize() { this.r.setSize(innerWidth, innerHeight); }

  render() {
    const cam = this.camera.position;
    // 在殿内或漫步时不显示地名（标注会穿墙）
    const indoor = cam.x > -38 && cam.x < 62 && Math.abs(cam.z) < 28 && cam.y < F + 34;
    const walking = this.controls?.mode === 'walk';
    if (this.names.visible) for (const o of this.items) {
      const d = cam.distanceTo(o.position);
      const show = !indoor && !walking && d > o.userData.minD && d < o.userData.maxD;
      if (o.visible !== show) o.visible = show;
    }
    this.r.render(this.scene, this.camera);
  }
}
