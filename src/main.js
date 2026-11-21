// 第一圣殿 3D 复原：启动、场景搭建、主循环
import * as THREE from 'three';
import { state } from './app/state.js';
import { registry } from './app/registry.js';
import { makeTerrain } from './core/terrain-fn.js';
import { CollisionWorld } from './core/colliders.js';
import { INNER, GREAT, TERRACES, Y, PODIUM } from './core/layout.js';
import { createMaterials } from './world/materials.js';
import { SkySystem, interiorEnv } from './world/sky.js';
import { buildTerrain, Trees, Houses, buildCityWorks } from './world/terrain.js';
import { buildTemple } from './world/temple.js';
import { buildFurnishings } from './world/furnishings.js';
import { buildCourts } from './world/court.js';
import { buildPalace } from './world/palace.js';
import { People } from './world/people.js';
import { FX } from './world/fx.js';
import { UI } from './ui/ui.js';
import { Controls } from './ui/controls.js';
import { Picker } from './ui/picking.js';
import { Labels } from './ui/labels.js';
import { Minimap } from './ui/minimap.js';
import { Tour } from './ui/tour.js';

const $ = (s) => document.querySelector(s);
const tick = () => new Promise((r) => setTimeout(r, 16));

// 自动画质：看设备类型与显卡
function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch { return ''; }
}
function detectQuality() {
  const q = state.get('quality');
  if (q !== 'auto') return q;
  const coarse = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const mem = navigator.deviceMemory || 8;
  const gpu = gpuName();
  if (coarse) return /Apple GPU|Adreno \(TM\) (7|8)|Mali-G7/i.test(gpu) && mem >= 4 ? 'mid' : 'low';
  if (/Intel|HD Graphics|Iris|UHD|SwiftShader|llvmpipe|Mali|Adreno/i.test(gpu)) return 'mid';
  return 'high';
}

async function boot() {
  const bar = $('#load-bar'), msg = $('#load-msg');
  const T0 = performance.now(); let Tl = T0; window.__timings = [];
  const step = async (p, text) => { const now = performance.now(); window.__timings.push([msg.textContent, Math.round(now - Tl)]); bar.style.width = `${p}%`; msg.textContent = text; await tick(); Tl = performance.now(); };
  const quality = detectQuality();
  window.__quality = quality;

  await step(4, '预备工地……');
  const renderer = new THREE.WebGLRenderer({ antialias: quality === 'high', powerPreference: 'high-performance', logarithmicDepthBuffer: false });
  const baseDPR = Math.min(window.devicePixelRatio, quality === 'high' ? 1.5 : quality === 'mid' ? 1 : 0.85);
  let renderScale = 1;
  renderer.setPixelRatio(baseDPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('#stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.25, 26000);

  const platforms = [
    { x0: INNER.x0, x1: INNER.x1, z0: INNER.z0, z1: INNER.z1, y: Y.inner, region: 'inner_court' },
    { x0: GREAT.x0, x1: GREAT.x1, z0: GREAT.z0, z1: GREAT.z1, y: Y.great, region: 'great_court' },
    ...TERRACES.map((t) => ({ ...t, region: 'palace' })),
  ];
  await step(10, '测量摩利亚山……');
  const T = makeTerrain({ flatten: platforms });
  const world = new CollisionWorld(16);
  world.setTerrain(T.heightAt);

  await step(20, '在山中凿石头，预备香柏木……');
  const M = createMaterials(quality);
  const sky = new SkySystem(renderer, scene, quality);
  sky.envMaterials = [M.bronze, M.bronzeDark, M.bronzePanel, M.water];
  sky.apply(state.get('time'));
  const envIn = interiorEnv(renderer);
  M.goldWallOut.envMap = envIn; M.goldWallOut.envMapIntensity = 0.8;
  for (const m of M.interior) { m.envMap = envIn; m.envMapIntensity = 0.9; }
  M.goldFloor.envMapIntensity = 0.45;
  M.goldWall.envMapIntensity = 1.2;

  await step(32, '塑造山谷与橄榄山……');
  scene.add(buildTerrain(T, M, quality, platforms));
  const trees = new Trees(T, M, quality, platforms);
  scene.add(trees.trunks, trees.crowns);
  trees.trunks.castShadow = trees.crowns.castShadow = false;
  await step(40, '建造大卫城……');
  const houses = new Houses(T, M, quality, platforms);
  scene.add(houses.bodies, houses.roofs);
  houses.bodies.castShadow = quality === 'high';
  const city = new THREE.Group(); scene.add(city);
  buildCityWorks(T, M, city);
  city.traverse((o) => { if (o.isMesh) o.castShadow = false; });

  await step(52, '立殿的根基……');
  const courts = buildCourts(M, world, scene, T);
  for (const m of M.extraBronze ?? []) { m.envMap = sky.envRT.texture; m.envMapIntensity = sky.preset.night ? 0.35 : 1; sky.envMaterials.push(m); }
  const temple = buildTemple(M, world, scene);
  await step(64, '贴上精金，安放约柜……');
  const furn = buildFurnishings(M, world, scene);
  await step(72, '建造黎巴嫩林宫……');
  const palace = buildPalace(M, world, scene, T);
  const fx = new FX(scene, M, quality);
  await step(82, '众人上殿……');
  const people = new People(scene, M, world, quality);
  if (quality !== 'high') people.group.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  await step(90, '预备经文……');

  const controls = new Controls(camera, renderer.domElement, world, T);
  const labels = new Labels(scene, camera, $('#labels'), T);
  labels.controls = null;
  const ui = new UI({ controls, camera, scene, sky, temple, people });
  const picker = new Picker(camera, renderer.domElement, scene, ui, T, people, controls);
  const minimap = new Minimap($('#minimap'), controls, camera);
  const tour = new Tour(controls, ui, people, fx);
  ui.attach({ tour, picker, minimap, labels });
  labels.controls = controls;

  const rescaleHuman = () => { trees.rescale(); houses.rescale(); people.rescale(); controls.rescale(); };
  state.on('cubit', rescaleHuman);
  state.on('time', (v) => { sky.apply(v); fx.setTime(v, sky); furn.setTime(v); });
  fx.setTime(state.get('time'), sky); furn.setTime(state.get('time'));
  state.on('roof', (v) => { temple.roofGroup.visible = v; });
  state.on('people', (v) => people.setVisible(v));
  state.on('scene', (v) => { fx.setScene(v); people.setScene(v); furn.setScene(v); });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labels.resize();
  });

  await step(100, '殿已造成。');
  renderer.compile(scene, camera);
  const enter = $('#enter');
  enter.hidden = false;
  msg.textContent = '殿和一切属殿的，都按着样式造成。（王上6:38）';
  const start = () => { $('#loading').classList.add('done'); setTimeout(() => $('#loading').remove(), 1000); ui.welcome(); };
  enter.addEventListener('click', start, { once: true });
  if (new URLSearchParams(location.search).has('auto') || location.hash === '#auto') start();

  const clock = new THREE.Clock();
  const focus = new THREE.Vector3();
  let frame = 0, ftAcc = 0, ftN = 0;
  // 自适应分辨率：帧时间长就降低渲染分辨率，宽裕时再升回
  const adapt = (dt) => {
    if (dt > 0.25) { ftAcc = 0; ftN = 0; return; } // 切到后台、卡顿时不计
    ftAcc += dt; ftN++;
    if (ftAcc < 2) return;
    const avg = ftAcc / ftN; ftAcc = 0; ftN = 0;
    let next = renderScale;
    if (avg > 0.045 && renderScale > 0.6) next = Math.max(0.6, renderScale * 0.85);
    else if (avg < 0.022 && renderScale < 1) next = Math.min(1, renderScale * 1.15);
    if (next !== renderScale) { renderScale = next; renderer.setPixelRatio(baseDPR * renderScale); renderer.setSize(window.innerWidth, window.innerHeight); }
  };
  function loop() {
    requestAnimationFrame(loop);
    const raw = clock.getDelta();
    if (document.visibilityState === 'visible') adapt(raw);
    stepFrame(Math.min(raw, 0.1), clock.elapsedTime);
  }
  function stepFrame(dt, t) {
    frame++;
    controls.update(dt);
    tour.update(dt);
    controls.focusPoint(focus);
    sky.update(focus);
    temple.update(dt, camera.position);
    palace.update(camera.position);
    furn.update(dt, t, camera.position);
    fx.update(dt, t, camera);
    people.update(dt, t, camera, frame);
    picker.update(dt, t);
    ui.update(dt, camera);
    renderer.render(scene, camera);
    labels.render();
    if (frame % 3 === 0) minimap.draw();
  }
  loop();
  window.__app = { scene, camera, renderer, controls, world, registry, state, T, people, ui, tour, fx, stepFrame, sky };
}

boot().catch((e) => {
  console.error(e);
  const msg = document.querySelector('#load-msg');
  if (msg) msg.textContent = `载入出错：${e.message}。请换用新版 Chrome、Edge 或 Safari 再试。`;
});
