// 条目 id → 场景物体；供悬停拾取、经文索引"飞过去"使用
import * as THREE from 'three';

class Registry {
  constructor() {
    this.byId = new Map();   // id → Object3D[]
    this.pickables = [];     // 参与射线拾取的网格
    this.focus = new Map();  // id → {target:[x,y,z], dist}（可手动指定视角）
  }

  add(id, obj, { pick = true } = {}) {
    if (!this.byId.has(id)) this.byId.set(id, []);
    this.byId.get(id).push(obj);
    obj.userData.id = id;
    if (pick) this.pickables.push(obj);
  }

  setFocus(id, target, dist, dir) { this.focus.set(id, { target, dist, dir }); }

  bounds(id) {
    const objs = this.byId.get(id);
    if (!objs) return null;
    const box = new THREE.Box3();
    for (const o of objs) {
      if (!o.visible && !o.userData.alwaysBound) continue;
      if (o.isInstancedMesh) continue;
      o.updateWorldMatrix(true, false);
      const g = o.geometry;
      if (g) {
        if (!g.boundingBox) g.computeBoundingBox();
        box.union(g.boundingBox.clone().applyMatrix4(o.matrixWorld));
      } else box.expandByObject(o);
    }
    return box.isEmpty() ? null : box;
  }

  remove(obj) {
    const id = obj.userData.id;
    const arr = this.byId.get(id);
    if (arr) this.byId.set(id, arr.filter((o) => o !== obj));
    this.pickables = this.pickables.filter((o) => o !== obj);
  }
}

export const registry = new Registry();
