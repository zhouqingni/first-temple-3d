// 几何辅助：按世界坐标铺 UV 的盒体、按"条目×材质"合并网格
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { registry } from '../app/registry.js';

const _m = new THREE.Matrix4();

// 依法线主方向给几何体铺世界坐标 UV（1 单位 = 1 肘，材质 repeat 决定纹理尺寸）
export function worldUV(geo, origin = [0, 0, 0]) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  const [ox, oy, oz] = origin;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) - ox, y = p.getY(i) - oy, z = p.getZ(i) - oz;
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    let u, v;
    if (ax >= ay && ax >= az) { u = nx > 0 ? -z : z; v = y; }
    else if (az >= ay) { u = nz > 0 ? x : -x; v = y; }
    else { u = x; v = ny > 0 ? -z : z; }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export function boxGeo(x0, y0, z0, x1, y1, z1, { uvOrigin } = {}) {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  const g = new THREE.BoxGeometry(w || 0.001, h || 0.001, d || 0.001);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return worldUV(g, uvOrigin);
}

function normalize(geos) {
  return geos.map((g) => {
    let out = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(out.attributes)) if (!['position', 'normal', 'uv'].includes(k)) out.deleteAttribute(k);
    if (!out.attributes.uv) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
    if (!out.attributes.normal) out.computeVertexNormals();
    return out;
  });
}

// 收集几何体，按 (条目 id, 材质键) 合并成网格；网格登记到 registry 以便悬停查经文
export class Builder {
  constructor(M) { this.M = M; this.parts = new Map(); }

  add(id, mat, geo, matrix) {
    if (matrix) geo.applyMatrix4(matrix);
    const k = `${id}|${mat}`;
    if (!this.parts.has(k)) this.parts.set(k, []);
    this.parts.get(k).push(geo);
    return geo;
  }

  box(id, mat, x0, y0, z0, x1, y1, z1, opts) {
    return this.add(id, mat, boxGeo(x0, y0, z0, x1, y1, z1, opts));
  }

  // 在 matrix 变换下添加一个已构建好的几何体（会克隆）
  place(id, mat, geo, pos, rotY = 0, scale = 1) {
    const g = geo.clone();
    _m.compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(scale, scale, scale));
    return this.add(id, mat, g, _m);
  }

  build(parent, { cast = true, receive = true, pick = true, layer } = {}) {
    const meshes = [];
    for (const [k, geos] of this.parts) {
      const [id, mat] = k.split('|');
      const geo = mergeGeometries(normalize(geos), false);
      geo.computeBoundingSphere();
      const material = this.M[mat];
      if (!material) throw new Error(`没有材质：${mat}`);
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = cast && !material.transparent;
      mesh.receiveShadow = receive;
      mesh.userData.id = id;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      if (layer) mesh.userData.layer = layer;
      parent.add(mesh);
      if (pick && id) registry.add(id, mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}

// 旋转体：profile 为 [[r, y], ...]
export function lathe(profile, seg = 32, phiStart = 0, phiLen = Math.PI * 2) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg, phiStart, phiLen);
}

// 沿曲线的管子
export function tube(points, radius, seg = 24, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  return new THREE.TubeGeometry(curve, seg, radius, radial, closed);
}

export function mat4(pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot, 'YXZ')),
    new THREE.Vector3(...(Array.isArray(scale) ? scale : [scale, scale, scale])),
  );
}

export function merge(geos) { return mergeGeometries(normalize(geos), false); }

export function transformed(geo, pos, rot, scale) { return geo.clone().applyMatrix4(mat4(pos, rot, scale)); }
