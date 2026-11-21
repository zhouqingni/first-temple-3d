// 天空、太阳、雾与环境光；四个时段
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export const PRESETS = {
  morning: { label: '清晨', el: 15, az: -8, turb: 3.6, ray: 1.5, mie: 0.005, g: 0.82, sun: '#ffdcb0', sunI: 3.3, sky: '#d6dfea', ground: '#a08a68', hemiI: 0.6, fog: '#d9d2c4', fogD: 0.00015, exp: 0.62, night: 0 },
  noon: { label: '正午', el: 64, az: 95, turb: 3.2, ray: 1.1, mie: 0.004, g: 0.8, sun: '#fff5e6', sunI: 3.4, sky: '#d2dbe8', ground: '#a08c6c', hemiI: 0.7, fog: '#cdd7e2', fogD: 0.00013, exp: 0.5, night: 0 },
  dusk: { label: '黄昏', el: 6, az: 188, turb: 8, ray: 3, mie: 0.008, g: 0.88, sun: '#ffab68', sunI: 2.4, sky: '#b8b0c8', ground: '#6a5644', hemiI: 0.45, fog: '#c6a58c', fogD: 0.00024, exp: 0.68, night: 0 },
  night: { label: '夜晚', el: -14, az: 200, turb: 2, ray: 0.4, mie: 0.002, g: 0.7, sun: '#a9bce6', sunI: 0.42, sky: '#2a3656', ground: '#15120f', hemiI: 0.32, fog: '#121827', fogD: 0.00026, exp: 0.95, night: 1, moon: { el: 38, az: 128 } },
};

export function dirFrom(el, az) {
  const e = THREE.MathUtils.degToRad(el), a = THREE.MathUtils.degToRad(az);
  return new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a));
}

export class SkySystem {
  constructor(renderer, scene, quality) {
    this.renderer = renderer; this.scene = scene;
    this.sky = new Sky();
    this.sky.scale.setScalar(16000);
    this.sky.material.depthWrite = false;
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight('#ffffff', 3);
    this.sun.castShadow = true;
    const S = quality === 'high' ? 3072 : quality === 'mid' ? 1536 : 1024;
    this.sun.shadow.mapSize.set(S, S);
    this.shadowHalf = quality === 'low' ? 130 : 180;
    const c = this.sun.shadow.camera;
    c.left = -this.shadowHalf; c.right = this.shadowHalf; c.top = this.shadowHalf; c.bottom = -this.shadowHalf;
    c.near = 10; c.far = 2400;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.7;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight('#cdd8ea', '#8f7b5e', 0.8);
    scene.add(this.hemi);
    scene.fog = new THREE.FogExp2('#d8cbb4', 0.0002);

    // 星空
    const N = 2200, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random(), v = Math.random() * 0.95;
      const th = u * Math.PI * 2, ph = Math.acos(1 - v);
      pos.set([Math.sin(ph) * Math.cos(th) * 12000, Math.cos(ph) * 12000, Math.sin(ph) * Math.sin(th) * 12000], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(this.stars);
    // 月亮
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(110, 32), new THREE.MeshBasicMaterial({ color: '#f3efe2', fog: false, transparent: true, opacity: 0 }));
    scene.add(this.moon);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null;
    this.dir = new THREE.Vector3();
    this.focus = new THREE.Vector3();
  }

  apply(name) {
    const p = PRESETS[name] ?? PRESETS.morning;
    this.preset = p; this.name = name;
    const u = this.sky.material.uniforms;
    const sunDir = dirFrom(p.el, p.az);
    u.sunPosition.value.copy(sunDir);
    u.turbidity.value = p.turb; u.rayleigh.value = p.ray; u.mieCoefficient.value = p.mie; u.mieDirectionalG.value = p.g;
    // 夜里用月光代替太阳投影
    this.dir.copy(p.night ? dirFrom(p.moon.el, p.moon.az) : sunDir);
    this.sun.color.set(p.sun); this.sun.intensity = p.sunI;
    this.hemi.color.set(p.sky); this.hemi.groundColor.set(p.ground); this.hemi.intensity = p.hemiI;
    this.scene.fog.color.set(p.fog); this.scene.fog.density = p.fogD;
    this.renderer.toneMappingExposure = p.exp;
    this.stars.material.opacity = p.night ? 0.9 : 0;
    this.moon.material.opacity = p.night ? 1 : 0;
    this.moon.position.copy(this.dir).multiplyScalar(11000);
    this.moon.lookAt(0, 0, 0);
    this.sky.visible = true;
    // 环境贴图（金器、铜器的反光）
    if (this.envRT) this.envRT.dispose();
    const tmp = new THREE.Scene();
    const sky2 = new Sky(); sky2.scale.setScalar(1000);
    Object.assign(sky2.material.uniforms.sunPosition.value, sunDir);
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) sky2.material.uniforms[k].value = u[k].value;
    tmp.add(sky2);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.ground).multiplyScalar(p.night ? 0.2 : 1.2) }));
    ground.position.y = -40; tmp.add(ground);
    if (p.night) tmp.background = new THREE.Color('#0b1020');
    this.envRT = this.pmrem.fromScene(tmp, 0.02, 1, 3000);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = p.night ? 0.12 : 0.32;
    for (const m of this.envMaterials ?? []) { m.envMap = this.envRT.texture; m.envMapIntensity = p.night ? 0.35 : 1.0; m.needsUpdate = true; }
    sky2.geometry.dispose(); sky2.material.dispose(); ground.geometry.dispose();
  }

  // 阴影跟随视点；对齐到阴影贴图的像素格，避免闪烁
  update(focus) {
    const S = this.sun.shadow.mapSize.x, texel = (this.shadowHalf * 2) / S;
    this.focus.set(Math.round(focus.x / texel) * texel, Math.round(focus.y / texel) * texel, Math.round(focus.z / texel) * texel);
    this.sun.target.position.copy(this.focus);
    this.sun.position.copy(this.focus).addScaledVector(this.dir, 900);
    this.sun.target.updateMatrixWorld();
    this.stars.position.copy(focus);
  }
}

// 殿内用的暖色环境贴图：昏暗的金色房间里点着灯
export function interiorEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.background = new THREE.Color('#1a1008');
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 30, 20), new THREE.MeshBasicMaterial({ color: '#3a2410', side: THREE.BackSide }));
  s.add(room);
  const lampM = new THREE.MeshBasicMaterial({ color: '#ffcf80' });
  for (let i = 0; i < 10; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), lampM);
    l.position.set(-16 + (i % 5) * 8, -6, i < 5 ? -7 : 7);
    s.add(l);
  }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), new THREE.MeshBasicMaterial({ color: '#fff0d0' }));
  door.position.set(19.9, -9, 0); door.rotation.y = -Math.PI / 2; s.add(door);
  const win = new THREE.MeshBasicMaterial({ color: '#d8e2f0' });
  for (let i = 0; i < 6; i++) for (const z of [-9.9, 9.9]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), win);
    w.position.set(-15 + i * 6, 8, z); w.lookAt(w.position.x, 8, 0); s.add(w);
  }
  const rt = pm.fromScene(s, 0.04);
  pm.dispose();
  return rt.texture;
}
