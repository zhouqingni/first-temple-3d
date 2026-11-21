// 悬停与点按：射线拾取物件（人群另作圆柱检测，地形用高度场步进），显示名称与经文
import * as THREE from 'three';
import { registry } from '../app/registry.js';
import { E } from './ui.js';

function visibleInScene(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

export class Picker {
  constructor(camera, dom, scene, ui, T, people, controls) {
    Object.assign(this, { camera, dom, scene, ui, T, people, controls });
    this.ray = new THREE.Raycaster();
    this.ray.firstHitOnly = true;
    this.ndc = new THREE.Vector2();
    this.mouse = null; this.dirtyT = 0;
    // 悬停时让物件本身微微发亮（不画方框，也不穿墙）
    this.glowMat = new THREE.MeshBasicMaterial({ color: '#ffcf6a', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    this.glow = []; this.glowId = null;
    this.sel = null;
    const touch = () => matchMedia('(pointer: coarse)').matches;
    dom.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY }; });
    dom.addEventListener('pointerleave', () => { this.mouse = null; this.ui.tip(null); this.showBox(this.sel); });
    dom.addEventListener('pointerup', (e) => {
      if (this.controls.dragged || e.button > 0) return;
      const hit = this.pick(e.clientX, e.clientY);
      if (hit) { this.sel = hit; this.ui.open(hit.id); this.showBox(hit); this.ui.tip(null); }
      else if (touch()) this.ui.tip(null);
    });
    dom.addEventListener('dblclick', (e) => {
      const hit = this.pick(e.clientX, e.clientY);
      if (hit && this.controls.mode !== 'walk') {
        const p = hit.point;
        const dir = this.camera.position.clone().sub(p).normalize();
        const dist = Math.min(this.camera.position.distanceTo(p) * 0.5, hit.agent ? 12 : 60);
        this.controls.flyTo({ pos: p.clone().addScaledVector(dir, Math.max(6, dist)).toArray(), target: p.toArray(), duration: 1.4 });
      }
    });
  }

  clearSelection() { this.sel = null; this.showBox(null); }

  pick(x, y) {
    const r = this.dom.getBoundingClientRect();
    this.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const objs = registry.pickables.filter((o) => !o.userData.people && visibleInScene(o));
    const hits = this.ray.intersectObjects(objs, false);
    let best = null;
    for (const h of hits) {
      if (h.object.isPoints) continue;
      const id = h.object.userData.id;
      if (id && E[id]) { best = { id, point: h.point, dist: h.distance, object: h.object, instanceId: h.instanceId }; break; }
    }
    // 人物
    if (this.people.group.visible) {
      const ag = this.pickAgent(best ? best.dist : Infinity);
      if (ag) best = ag;
    }
    // 地形
    const td = this.terrainHit(best ? best.dist : 5000);
    if (td) best = td;
    return best;
  }

  pickAgent(maxD) {
    const o = this.ray.ray.origin, d = this.ray.ray.direction;
    const k = this.people.k;
    let best = null, bd = maxD;
    const test = (a, x, y, z, h, r) => {
      // 竖直圆柱（近似）：求射线到轴线的最近点
      const tx = x - o.x, tz = z - o.z;
      const dd = d.x * d.x + d.z * d.z;
      if (dd < 1e-6) return;
      const t = (tx * d.x + tz * d.z) / dd;
      if (t <= 0 || t > bd) return;
      const px = o.x + d.x * t - x, pz = o.z + d.z * t - z, py = o.y + d.y * t;
      if (px * px + pz * pz < r * r && py > y && py < y + h) { bd = t; best = { id: null, agent: a, point: new THREE.Vector3(x, y + h * 0.6, z), dist: t }; }
    };
    for (const a of this.people.agents) {
      if (a.hidden) continue;
      const h = (a.heightM - a.prostrate * 1.2) * k;
      test(a, a.x, a.y, a.z, Math.max(0.5 * k, h), 0.3 * k * (a.heightM / 1.68));
    }
    if (best) best.id = this.people.entryFor(best.agent);
    return best;
  }

  terrainHit(maxD) {
    const o = this.ray.ray.origin, d = this.ray.ray.direction;
    let t = 0.5, prev = o.y - this.T.heightAt(o.x, o.z);
    if (prev < 0) return null;
    while (t < maxD) {
      const step = Math.max(1.5, t * 0.012);
      const nt = t + step;
      const x = o.x + d.x * nt, y = o.y + d.y * nt, z = o.z + d.z * nt;
      const h = y - this.T.heightAt(x, z);
      if (h < 0) {
        let lo = t, hi = nt;
        for (let i = 0; i < 8; i++) { const m = (lo + hi) / 2; const hh = o.y + d.y * m - this.T.heightAt(o.x + d.x * m, o.z + d.z * m); if (hh > 0) lo = m; else hi = m; }
        const p = new THREE.Vector3(o.x + d.x * hi, o.y + d.y * hi, o.z + d.z * hi);
        const id = this.T.regionAt(p.x, p.z);
        return E[id] ? { id, point: p, dist: hi, terrain: true } : null;
      }
      t = nt;
      if (y > 600 && d.y > 0) break;
    }
    return null;
  }

  showBox(hit) {
    const id = hit && !hit.terrain && !hit.agent ? hit.id : null;
    if (id === this.glowId) return;
    for (const g of this.glow) this.scene.remove(g);
    this.glow = []; this.glowId = id;
    if (!id) return;
    const box = registry.bounds(id);
    if (!box || box.getSize(new THREE.Vector3()).length() > 120) return; // 院子、山谷这类大范围不发光
    for (const o of registry.byId.get(id) ?? []) {
      if (o.userData.people || !visibleInScene(o)) continue;
      let g;
      if (o.isInstancedMesh) { if (o.count > 3000) continue; g = new THREE.InstancedMesh(o.geometry, this.glowMat, o.count); g.instanceMatrix = o.instanceMatrix; }
      else if (o.isMesh) g = new THREE.Mesh(o.geometry, this.glowMat);
      else continue;
      o.updateWorldMatrix(true, false);
      g.matrixAutoUpdate = false; g.matrix.copy(o.matrixWorld); g.matrixWorldNeedsUpdate = true;
      g.renderOrder = 3; g.frustumCulled = false;
      this.scene.add(g); this.glow.push(g);
    }
  }

  update(dt, t) {
    this.glowMat.opacity = 0.14 + Math.sin(t * 3.5) * 0.08;
    this.dirtyT -= dt;
    if (!this.mouse || this.dirtyT > 0 || this.controls.fly) return;
    this.dirtyT = 0.07;
    if (this.controls.downAt && this.controls.dragged) { this.ui.tip(null); return; }
    const hit = this.pick(this.mouse.x, this.mouse.y);
    this.ui.tip(hit?.id, this.mouse.x, this.mouse.y);
    this.dom.style.cursor = hit ? 'pointer' : '';
    this.showBox(hit ?? this.sel);
  }
}
