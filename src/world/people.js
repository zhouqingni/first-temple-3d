// 人群：百姓（男女老少）、祭司、利未人、大祭司；平日游走供职，献殿之日列队、跪拜
import * as THREE from 'three';
import { bodyParts, highPriest, solomon } from './figures.js';
import { NavGrid, MASK } from './navgrid.js';
import { m2c, state } from '../app/state.js';
import { registry } from '../app/registry.js';
import { ALTAR, SEA, STANDS, PLATFORM, Y, GATES } from '../core/layout.js';

const F = Y.floor;
const R = () => Math.random();
const pick = (a) => a[Math.floor(R() * a.length)];

const SKIN = ['#b8875f', '#a7764f', '#c69a72', '#8f6443', '#b07c52'];
const HAIR = ['#2a211b', '#3a2c22', '#1c1714'];
const GREY = ['#8d877e', '#b7b2a8', '#e2ded5'];
const PLAIN = ['#e8dfc8', '#d8c9a6', '#cdb996', '#a88b62', '#8a6a48', '#6e5440', '#8d8a80', '#5a4a3c'];
const DYED = ['#9c3b2a', '#3c5a8a', '#c9a03b', '#6f7348', '#7d4a2f', '#8a2f3a', '#45607a', '#b0873c'];
const SASH = ['#9c3b2a', '#c9a03b', '#3c5a8a', '#5a4330', '#e8dfc8'];

const PART_KEYS = ['robe', 'robeShort', 'mantle', 'sash', 'head', 'hood', 'veil', 'cap', 'beard', 'hair', 'armL', 'armR', 'handL', 'handR', 'footL', 'footR', 'legL', 'legR', 'staff', 'lamb', 'basket', 'doves', 'lyre', 'trumpet'];
const GEO_OF = { armL: 'arm', armR: 'arm', handL: 'hand', handR: 'hand', footL: 'foot', footR: 'foot', legL: 'leg', legR: 'leg' };
const HEADISH = new Set(['head', 'hood', 'veil', 'cap', 'beard', 'hair']);

const ROLE_ENTRY = { man: 'man', woman: 'woman', child: 'child', elder: 'elder', priest: 'priest', levite: 'levite', singer: 'singers', trumpeter: 'singers', high_priest: 'high_priest', solomon: 'solomon' };

export class People {
  constructor(scene, M, world, quality) {
    this.scene = scene; this.world = world;
    this.group = new THREE.Group(); this.group.name = 'people';
    scene.add(this.group);
    const terr = world.terrain; world.setTerrain(() => -1e9);
    this.nav = new NavGrid(world);
    world.setTerrain(terr);
    const Q = { high: [150, 30, 14, 110], mid: [96, 22, 12, 70], low: [48, 12, 6, 34] }[quality] ?? [96, 22, 12, 70];
    this.agents = [];
    this.spawnLay(Q[0]);
    for (let i = 0; i < Q[1]; i++) this.add(this.make('priest'));
    for (let i = 0; i < Q[2]; i++) this.add(this.make('levite'));
    this.extra = [];
    for (let i = 0; i < Q[3]; i++) { const a = this.make(pick(['man', 'man', 'woman', 'elder', 'child'])); a.dedicationOnly = true; this.add(a); }
    this.hpAgent = this.make('high_priest'); this.add(this.hpAgent);
    this.solAgent = this.make('solomon'); this.solAgent.dedicationOnly = true; this.add(this.solAgent);

    // 实例化部件
    const G = bodyParts();
    const N = this.agents.length;
    this.meshes = {};
    const mats = {};
    const matFor = (k) => {
      if (k === 'trumpet') return (mats.t ??= new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.85, roughness: 0.3 }));
      return (mats.c ??= new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88 }));
    };
    // 只给用得到某部件的人分配实例：平日的人在前，献殿才出现的人在后
    this.slots = {}; this.nDaily = {};
    const order = [...this.agents.filter((a) => !a.dedicationOnly), ...this.agents.filter((a) => a.dedicationOnly)];
    for (const k of PART_KEYS) {
      const list = order.filter((a) => a.parts.has(k) || (k === 'trumpet' && a.role === 'priest') || (k === 'lyre' && a.role === 'levite'));
      list.forEach((a, i) => { (a.slot ??= {})[k] = i; });
      this.slots[k] = list;
      this.nDaily[k] = list.filter((a) => !a.dedicationOnly).length;
    }
    for (const k of PART_KEYS) {
      const im = new THREE.InstancedMesh(G[GEO_OF[k] ?? k], matFor(k), Math.max(1, this.slots[k].length));
      im.castShadow = true; im.receiveShadow = true;
      im.frustumCulled = false;
      im.userData.people = this;
      this.meshes[k] = im;
      this.group.add(im);
      registry.add('people', im);
    }
    this.colorize();
    // 大祭司与所罗门的细致造型
    this.hp = highPriest(M); this.group.add(this.hp);
    this.hp.traverse((o) => { if (o.isMesh) registry.add('high_priest', o); });
    this.sol = solomon(M); this.group.add(this.sol); this.sol.visible = false;
    this.buildAssembly(quality);
    this.sol.traverse((o) => { if (o.isMesh) registry.add('solomon', o); });

    this._m = new THREE.Matrix4(); this._b = new THREE.Matrix4(); this._l = new THREE.Matrix4(); this._l2 = new THREE.Matrix4(); this._z = new THREE.Matrix4().makeScale(0, 0, 0);
    this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
    this.planBudget = 0;
    this.scene_ = 'daily';
    this.phase = 'stand';
    this.rescale();
    for (const a of this.agents) this.place(a);
    this.setScene(state.get('scene'));
    this.setVisible(state.get('people'));
  }

  add(a) { a.i = this.agents.length; this.agents.push(a); return a; }

  make(role) {
    const a = { role, x: 0, y: 0, z: 0, h: R() * 6.28, phase: R() * 6.28, mode: 'idle', wait: R() * 4, path: null, pi: 0, gesture: 'none', gT: 0, kneel: 0, prostrate: 0, act: 0, parts: new Set(), col: {}, leader: null };
    const skin = pick(SKIN);
    a.col.head = a.col.handL = a.col.handR = a.col.legL = a.col.legR = skin;
    a.col.footL = a.col.footR = '#4a3626';
    a.col.beard = pick(HAIR); a.col.hair = pick(HAIR);
    const base = ['robe', 'head', 'armL', 'armR', 'handL', 'handR', 'footL', 'footR', 'sash'];
    base.forEach((p) => a.parts.add(p));
    a.heightM = 1.68; a.speedM = 1.2; a.mask = MASK.lay; a.stoop = 0;
    if (role === 'man' || role === 'elder') {
      a.parts.add('hood'); a.parts.add('beard'); if (R() < 0.7) a.parts.add('mantle');
      a.col.robe = pick(PLAIN); a.col.mantle = R() < 0.5 ? pick(PLAIN) : pick(DYED); a.col.hood = pick(['#e8dfc8', '#d8c9a6', '#e8dfc8', '#9c3b2a', '#8d8a80']); a.col.sash = pick(SASH);
      a.heightM = 1.62 + R() * 0.14;
      if (role === 'elder') { a.parts.add('staff'); a.col.staff = '#5d4632'; a.col.beard = pick(GREY); a.heightM -= 0.05; a.speedM = 0.62; a.stoop = 0.14; }
      else if (R() < 0.28) { a.parts.add('lamb'); a.col.lamb = '#eee8da'; a.carry = 'lamb'; }
    } else if (role === 'woman') {
      a.parts.add('veil'); a.parts.add('mantle');
      a.col.robe = R() < 0.5 ? pick(DYED) : pick(PLAIN); a.col.mantle = pick(DYED.concat(PLAIN)); a.col.veil = pick(['#e8dfc8', '#3c5a8a', '#9c3b2a', '#d8c9a6', '#6f7348', '#8a2f3a']); a.col.sash = pick(SASH);
      a.heightM = 1.52 + R() * 0.1; a.speedM = 1.1;
      const r = R();
      if (r < 0.28) { a.parts.add('basket'); a.col.basket = '#9a7448'; a.carry = 'basket'; }
      else if (r < 0.45) { a.parts.add('doves'); a.col.doves = '#d9d6cf'; a.carry = 'doves'; }
    } else if (role === 'child') {
      a.parts.delete('robe'); a.parts.add('robeShort'); a.parts.add('hair'); a.parts.add('legL'); a.parts.add('legR');
      a.col.robeShort = pick(PLAIN.concat(DYED)); a.col.sash = pick(SASH);
      a.heightM = 0.95 + R() * 0.35; a.speedM = 1.35; a.headScale = 1.25;
    } else if (role === 'priest' || role === 'trumpeter') {
      a.parts.add('cap'); a.parts.add('beard');
      a.col.robe = '#f2eee4'; a.col.cap = '#f4f1ea'; a.col.sash = pick(['#2a4ea0', '#6a2c7e', '#b0302a']);
      a.col.armL = a.col.armR = '#f2eee4';
      a.heightM = 1.64 + R() * 0.12; a.speedM = 1.05; a.mask = MASK.priest; a.col.footL = a.col.footR = skin;
      a.col.trumpet = '#d9dbe0';
    } else if (role === 'levite' || role === 'singer') {
      a.parts.add('hood'); a.parts.add('beard'); a.parts.add('mantle');
      a.col.robe = '#ece6d6'; a.col.mantle = '#d8cfb8'; a.col.hood = '#ece6d6'; a.col.sash = '#7d4a2f';
      a.heightM = 1.64 + R() * 0.12; a.speedM = 1.1; a.mask = MASK.levite;
      a.col.lyre = '#7a5232';
    } else if (role === 'high_priest' || role === 'solomon') {
      a.parts.clear(); a.heightM = 1.74; a.speedM = 0.85; a.mask = MASK.priest;
    }
    if (!a.col.armL) a.col.armL = a.col.armR = a.col.robe ?? a.col.robeShort;
    a.headScale ??= 1;
    a.speed = a.speedM;
    return a;
  }

  spawnLay(count) {
    let n = 0;
    while (n < count) {
      const r = R();
      if (r < 0.32) {
        const f = this.add(this.make('man')), m = this.add(this.make('woman'));
        m.leader = f; m.off = [0.9, -0.3];
        const kids = 1 + Math.floor(R() * 2.4);
        for (let k = 0; k < kids; k++) { const c = this.add(this.make('child')); c.leader = R() < 0.6 ? m : f; c.off = [-0.6 + k * 0.9, -1.1 - k * 0.3]; }
        n += 2 + kids;
      } else if (r < 0.55) { this.add(this.make('man')); n++; }
      else if (r < 0.75) { this.add(this.make('woman')); n++; }
      else if (r < 0.9) { const e = this.add(this.make('elder')); n++; if (R() < 0.4) { const c = this.add(this.make('child')); c.leader = e; c.off = [0.8, 0.2]; n++; } }
      else { const a = this.add(this.make('man')), b = this.add(this.make('man')); b.leader = a; b.off = [0.9, 0]; n += 2; }
    }
  }

  colorize() {
    const c = new THREE.Color();
    for (const k of PART_KEYS) for (const a of this.slots[k]) {
      c.set(a.col[k] ?? a.col.robe ?? '#cccccc');
      this.meshes[k].setColorAt(a.slot[k], c);
    }
    for (const k of PART_KEYS) if (this.meshes[k].instanceColor) this.meshes[k].instanceColor.needsUpdate = true;
  }

  rescale() {
    for (const a of this.agents) a.s = m2c(a.heightM / 1.68);
    this.k = m2c(1);
    if (this.asm) this.poseAssembly(this.asmPose ?? 0);
    this.hp.scale.setScalar(m2c(1.74 / 1.68) * (1.68 / 1.68));
    this.sol.scale.setScalar(m2c(1.72 / 1.68));
  }

  setVisible(v) { this.group.visible = v; }

  // —— 献殿之日的会众：简化的实例人群，站满大院（代下7:3）——
  buildAssembly(quality) {
    const n = { high: 2600, mid: 1800, low: 800 }[quality] ?? 1600;
    const body = new THREE.ConeGeometry(0.24, 1.42, 7).translate(0, 0.71, 0);
    const head = new THREE.SphereGeometry(0.11, 6, 5).translate(0, 1.55, 0);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    this.asmB = new THREE.InstancedMesh(body, mat, n);
    this.asmH = new THREE.InstancedMesh(head, mat, n);
    this.asm = [];
    const c = new THREE.Color();
    const ok = (x, z) => this.nav.allowed(this.nav.idx(x, z), MASK.lay) && !(x > -64 && x < 158 && z > -56 && z < 56);
    let tries = 0;
    const taken = new Set();
    while (this.asm.length < n && tries++ < n * 20) {
      const x = -104 + R() * 312, z = -96 + R() * 216;
      if (!ok(x, z)) continue;
      const key = Math.round(x / 1.15) * 4096 + Math.round(z / 1.15);
      if (taken.has(key)) continue;
      taken.add(key);
      const i = this.asm.length;
      this.asm.push({ x, z, h: Math.atan2(60 - x, 0 - z) + (R() - 0.5) * 0.4, s: 0.85 + R() * 0.25 });
      c.set(R() < 0.5 ? pick(PLAIN) : pick(DYED)); this.asmB.setColorAt(i, c);
      c.set(pick(R() < 0.6 ? ['#e8dfc8', '#d8c9a6', '#9c3b2a', '#3c5a8a'] : SKIN)); this.asmH.setColorAt(i, c);
    }
    this.asmB.count = this.asmH.count = this.asm.length;
    this.asmB.receiveShadow = this.asmH.receiveShadow = true;
    this.asmB.userData.people = this; this.asmH.userData.people = this;
    this.asmGroup = new THREE.Group(); this.asmGroup.add(this.asmB, this.asmH); this.asmGroup.visible = false;
    this.group.add(this.asmGroup);
    this.poseAssembly(0);
  }

  poseAssembly(pros) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    this.asm.forEach((p, i) => {
      const s = this.k * p.s;
      e.set(pros * 1.3, p.h, 0, 'YXZ'); q.setFromEuler(e);
      m.compose(v.set(p.x, Y.great + pros * 0.12 * s, p.z), q, sc.set(s, s, s));
      this.asmB.setMatrixAt(i, m); this.asmH.setMatrixAt(i, m);
    });
    this.asmB.instanceMatrix.needsUpdate = this.asmH.instanceMatrix.needsUpdate = true;
    this.asmB.computeBoundingSphere(); this.asmH.computeBoundingSphere();
    this.asmPose = pros;
  }

  // —— 放置与任务 ——
  place(a) {
    if (a.role === 'high_priest') { [a.x, a.z] = [80, 4]; }
    else if (a.role === 'solomon') { [a.x, a.z] = [PLATFORM.cx, PLATFORM.cz]; }
    else if (a.leader) { a.x = a.leader.x + (R() - 0.5) * 2; a.z = a.leader.z + (R() - 0.5) * 2; }
    else { [a.x, a.z] = this.nav.randomPoint(a.mask); }
    a.y = this.world.groundAt(a.x, a.z, 20, 0);
    a.mode = 'idle'; a.wait = R() * 6; a.path = null;
  }

  task(a) {
    const T = { p: null, face: null, gesture: 'none', dur: 3 + R() * 6 };
    if (a.role === 'priest') {
      const r = R();
      if (r < 0.18) { T.p = [ALTAR.cx - 8 + R() * 16, ALTAR.cz - ALTAR.size / 2 - 2.2 - R() * 1.5]; T.face = [T.p[0], ALTAR.cz]; T.gesture = 'work'; T.dur = 8 + R() * 6; }
      else if (r < 0.24) { T.p = [ALTAR.cx - 2 + R() * 4, ALTAR.cz + ALTAR.size / 2 - 1.6]; T.face = [ALTAR.cx, ALTAR.cz]; T.gesture = 'work'; T.dur = 8 + R() * 6; }
      else if (r < 0.4) { const s = R() < 0.5 ? -1 : 1, x = pick(STANDS.xs); T.p = [x + (R() - 0.5), s * (STANDS.z - 3.2)]; T.face = [x, s * STANDS.z]; T.gesture = 'work'; }
      else if (r < 0.5) { const ang = R() * 6.28; T.p = [SEA.cx + Math.cos(ang) * 8.6, SEA.cz + Math.sin(ang) * 8.6]; T.face = [SEA.cx, SEA.cz]; T.gesture = 'work'; }
      else if (r < 0.66) { const s = R() < 0.5 ? -1 : 1, x = pick([7, 14, 21, 28, 35]); T.p = [x + 0.3, s * 4.2]; T.face = [x, s * 5.6]; T.gesture = 'work'; T.dur = 6 + R() * 6; }
      else if (r < 0.71) { T.p = [5.6, (R() - 0.5) * 1.2]; T.face = [4, 0]; T.gesture = 'pray'; T.dur = 8; }
      else if (r < 0.82) { T.p = [79 + R() * 8, (R() - 0.5) * 18]; T.face = [40, 0]; T.gesture = 'pray'; T.dur = 8 + R() * 8; }
      else T.p = this.nav.randomPoint(MASK.priest);
    } else if (a.role === 'levite') {
      if (a.post) { T.p = a.post.p; T.face = a.post.face; T.dur = 30; T.gesture = a.post.g ?? 'none'; }
      else T.p = this.nav.randomPoint(MASK.levite);
    } else if (a.role === 'high_priest') {
      const r = R();
      if (r < 0.4) { T.p = [79, 0]; T.face = [200, 0]; T.gesture = 'bless'; T.dur = 14; }
      else if (r < 0.7) { T.p = [ALTAR.cx - 12, (R() - 0.5) * 8]; T.face = [ALTAR.cx, 0]; T.dur = 8; }
      else { T.p = [6, 0]; T.face = [4, 0]; T.gesture = 'pray'; T.dur = 10; }
    } else {
      const r = R();
      const gate = pick([[162, 0], [120, -72], [120, 72]]);
      if (r < 0.32) { T.p = [gate[0] + (R() - 0.5) * (gate[1] ? 9 : 3), gate[1] + (R() - 0.5) * (gate[1] ? 3 : 9)]; T.face = [60, 0]; T.gesture = R() < 0.55 ? 'pray' : 'none'; T.dur = 6 + R() * 10; }
      else T.p = this.nav.randomPoint(MASK.lay);
      if (!T.face && R() < 0.25) { T.face = [60, 0]; T.gesture = 'pray'; }
    }
    return T;
  }

  // —— 场景 ——
  setScene(v) {
    this.scene_ = v;
    const ded = v === 'dedication';
    this.sol.visible = ded;
    if (this.asmGroup) this.asmGroup.visible = ded;
    for (const a of this.agents) { a.hidden = a.dedicationOnly && !ded; a.leaderSaved ??= a.leader; a.zeroed = false; }
    for (const k of PART_KEYS) this.meshes[k].count = ded ? this.slots[k].length : this.nDaily[k];
    if (!ded) {
      for (const a of this.agents) { a.static = false; a.leader = a.leaderSaved; a.kneel = a.prostrate = 0; a.gesture = 'none'; if (a.role === 'trumpeter') a.role = 'priest'; if (a.role === 'singer') a.role = 'levite'; this.place(a); }
      this.assignPosts();
      return;
    }
    // 献殿之日：百姓面向殿站在大院；祭司吹号、利未人歌唱站在坛东（代下5:12）；所罗门在铜台上（代下6:13）
    const lay = this.agents.filter((a) => !['priest', 'levite', 'high_priest', 'solomon', 'trumpeter', 'singer'].includes(a.role));
    const spots = [];
    for (let x = 158; x < 206; x += 2.1) for (let z = -92; z < 92; z += 2.0) spots.push([x + (R() - 0.5) * 0.6, z + (R() - 0.5) * 0.6, 40, 0]);
    for (let z = -96; z < -56; z += 2.1) for (let x = -100; x < 150; x += 2.2) spots.push([x + (R() - 0.5) * 0.6, z, x, 0]);
    for (let z = 58; z < 118; z += 2.1) for (let x = -100; x < 150; x += 2.2) spots.push([x + (R() - 0.5) * 0.6, z, x, 0]);
    spots.sort(() => R() - 0.5);
    const good = spots.filter(([x, z]) => this.nav.allowed(this.nav.idx(x, z), MASK.lay));
    good.sort((p, q) => Math.hypot(p[0] - 152, p[1]) - Math.hypot(q[0] - 152, q[1]));
    for (let i = good.length - 1; i > 0; i--) if (R() < 0.5) { const j = Math.floor(R() * Math.min(good.length, lay.length * 3)); [good[i], good[j]] = [good[j], good[i]]; }
    lay.forEach((a, i) => { const s = good[i % good.length]; a.x = s[0]; a.z = s[1]; a.leader = null; this.stand(a, [s[2] === 40 ? 40 : s[2], 0]); });
    const priests = this.agents.filter((a) => a.role === 'priest');
    priests.forEach((a, i) => { const col = i % 6, row = Math.floor(i / 6); a.role = 'trumpeter'; a.x = 114 + row * 1.7; a.z = -9 + col * 3.4 + (row % 2) * 1.2; this.stand(a, [0, a.z]); });
    const lev = this.agents.filter((a) => a.role === 'levite');
    lev.forEach((a, i) => { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2); a.role = 'singer'; a.x = 113 + (k % 4) * 1.8; a.z = s * (14 + Math.floor(k / 4) * 1.8); this.stand(a, [0, a.z]); a.post = null; });
    const hp = this.hpAgent; hp.x = 80; hp.z = 0; this.stand(hp, [200, 0]);
    const so = this.solAgent; so.x = PLATFORM.cx; so.z = PLATFORM.cz; this.stand(so, [0, 0]);
    this.setPhase('stand');
  }

  stand(a, face) {
    a.static = true; a.mode = 'idle'; a.path = null; a.wait = 1e9;
    a.y = this.world.groundAt(a.x, a.z, 20, 0);
    a.h = Math.atan2(face[0] - a.x, face[1] - a.z);
    a.gesture = 'none';
  }

  // 献殿各阶段：stand / praise / cloud / pray / fire / prostrate
  setPhase(p) {
    this.phase = p;
    this.asmTarget = p === 'prostrate' ? 1 : 0;
    for (const a of this.agents) {
      if (!a.static) continue;
      a.kneelT = 0; a.prosT = 0; a.gesture = 'none';
      if (a.role === 'trumpeter') a.gesture = p === 'stand' ? 'none' : 'trumpet';
      if (a.role === 'singer') a.gesture = p === 'stand' ? 'none' : 'lyre';
      if (a.role === 'solomon') { a.gesture = ['pray', 'fire', 'prostrate'].includes(p) ? 'pray' : 'none'; a.kneelT = ['pray', 'fire'].includes(p) ? 1 : 0; a.prosT = p === 'prostrate' ? 1 : 0; }
      else if (p === 'pray' && !['trumpeter', 'singer'].includes(a.role)) a.gesture = 'pray';
      if (p === 'prostrate' && a.role !== 'solomon') { a.prosT = 1; a.gesture = 'none'; }
    }
  }

  assignPosts() {
    const lev = this.agents.filter((a) => a.role === 'levite');
    const posts = [];
    for (const g of GATES) {
      const out = g.side === 'e' ? [1, 0] : g.side === 'n' ? [0, -1] : [0, 1];
      const along = [out[1], out[0]];
      for (const s of [-1, 1]) posts.push({ p: [g.x - out[0] * 2.5 + along[0] * s * 3.6, g.z - out[1] * 2.5 + along[1] * s * 3.6], face: [g.x + out[0] * 50, g.z + out[1] * 50] });
    }
    for (let i = 0; i < 6; i++) posts.push({ p: [124 + (i % 3) * 1.8, 16 + Math.floor(i / 3) * 1.8], face: [40, 0], g: 'lyre' });
    lev.forEach((a, i) => { a.post = posts[i] ?? null; if (a.post) { a.x = a.post.p[0]; a.z = a.post.p[1]; a.y = this.world.groundAt(a.x, a.z, 20, 0); } });
  }

  // —— 每帧 ——
  update(dt, t, camera, frame) {
    if (!this.group.visible) return;
    this.planBudget = 3;
    const cam = camera.position;
    const ded = this.scene_ === 'dedication';
    for (const a of this.agents) {
      if (a.hidden) continue;
      const d = Math.hypot(a.x - cam.x, a.z - cam.z);
      a.far = d > 520 ? 6 : d > 260 ? 2 : 1;
      if ((frame + a.i) % a.far !== 0) continue;
      const dtt = dt * a.far;
      if (!a.static) this.think(a, dtt);
      // 跪、俯伏的过渡
      a.kneel += ((a.kneelT ?? 0) - a.kneel) * Math.min(1, dtt * 1.5);
      a.prostrate += ((a.prosT ?? 0) - a.prostrate) * Math.min(1, dtt * (ded ? 0.8 + (a.i % 7) * 0.12 : 2));
      a.gT += dtt;
    }
    this.separate(cam);
    this.draw(frame, cam);
    if (this.asmGroup?.visible && Math.abs((this.asmTarget ?? 0) - this.asmPose) > 0.01) this.poseAssembly(this.asmPose + Math.sign(this.asmTarget - this.asmPose) * Math.min(Math.abs(this.asmTarget - this.asmPose), dt * 0.6));
  }

  think(a, dt) {
    if (a.leader && !a.leader.hidden) {
      const L = a.leader;
      const sh = Math.sin(L.h), ch = Math.cos(L.h);
      const tx = L.x + a.off[0] * ch + a.off[1] * sh, tz = L.z - a.off[0] * sh + a.off[1] * ch;
      const dx = tx - a.x, dz = tz - a.z, D = Math.hypot(dx, dz);
      if (D > 0.35) {
        const sp = Math.min(a.speedM * (D > 3 ? 1.6 : 1), D / Math.max(dt, 1e-3)) * this.k;
        this.stepTo(a, dx / D, dz / D, sp * dt);
        a.moving = true;
      } else { a.moving = false; a.h = lerpAngle(a.h, L.h, Math.min(1, dt * 3)); a.gesture = L.gesture === 'pray' ? 'pray' : 'none'; }
      return;
    }
    if (a.mode === 'idle') {
      a.moving = false;
      a.wait -= dt;
      a.y = this.world.groundAt(a.x, a.z, a.y + 0.3, 0.6);
      if (a.faceTo) a.h = lerpAngle(a.h, Math.atan2(a.faceTo[0] - a.x, a.faceTo[1] - a.z), Math.min(1, dt * 3));
      if (a.wait <= 0 && this.planBudget > 0) {
        this.planBudget--;
        const T = this.task(a);
        const path = this.nav.find(a.x, a.z, T.p[0], T.p[1], a.mask);
        if (path && path.length > 1) { a.path = path; a.pi = 1; a.mode = 'walk'; a.T = T; a.gesture = a.carry === 'basket' ? 'basket' : 'none'; a.faceTo = null; a.stuck = 0; }
        else a.wait = 1 + R() * 2;
      }
    } else if (a.mode === 'walk') {
      const [tx, tz] = a.path[a.pi];
      const dx = tx - a.x, dz = tz - a.z, D = Math.hypot(dx, dz);
      if (D < 0.5) {
        a.pi++;
        if (a.pi >= a.path.length) {
          a.mode = 'idle'; a.wait = a.T.dur; a.faceTo = a.T.face; a.gesture = a.T.gesture; a.gT = 0; a.moving = false;
          return;
        }
      } else {
        const sp = a.speedM * this.k * dt;
        const ox = a.x, oz = a.z;
        this.stepTo(a, dx / D, dz / D, Math.min(sp, D));
        a.moving = true;
        a.stuck = Math.hypot(a.x - ox, a.z - oz) < sp * 0.2 ? (a.stuck ?? 0) + dt : 0;
        if (a.stuck > 2.5) { a.mode = 'idle'; a.wait = 0.5; }
      }
    }
  }

  stepTo(a, ux, uz, L) {
    const nx = a.x + ux * L, nz = a.z + uz * L;
    const k = this.nav.idx(nx, nz);
    if (k >= 0 && this.nav.zone[k] && Math.abs(this.nav.h[k] - a.y) < 1.6) { a.x = nx; a.z = nz; }
    a.y = this.world.groundAt(a.x, a.z, a.y, 1.2);
    a.h = lerpAngle(a.h, Math.atan2(ux, uz), 0.25);
    a.phase += L / (this.k * 0.36 * (a.heightM / 1.68)) * 1.0;
  }

  // 被挤开时只挪到高度相近的格子上，并重新贴地（不会嵌进台阶）
  nudge(a, nx, nz) {
    const k = this.nav.idx(nx, nz);
    if (k < 0 || !this.nav.zone[k] || Math.abs(this.nav.h[k] - a.y) > 0.6) return;
    const y = this.world.groundAt(nx, nz, a.y, 0.6);
    if (Math.abs(y - a.y) > 0.6) return;
    a.x = nx; a.z = nz; a.y = y;
  }

  separate(cam) {
    const cell = 3, map = new Map();
    for (const a of this.agents) {
      if (a.hidden || a.static) continue;
      const k = Math.floor(a.x / cell) * 10007 + Math.floor(a.z / cell);
      (map.get(k) ?? map.set(k, []).get(k)).push(a);
    }
    const rad = this.k * 0.55;
    for (const a of this.agents) {
      if (a.hidden || a.static || !a.moving) continue;
      const cx = Math.floor(a.x / cell), cz = Math.floor(a.z / cell);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        for (const b of map.get((cx + i) * 10007 + cz + j) ?? []) {
          if (b === a || b.leader === a || a.leader === b) continue;
          const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
          if (d > 0 && d < rad) { const push = (rad - d) * 0.5; this.nudge(a, a.x + dx / d * push, a.z + dz / d * push); }
        }
      }
      // 让开漫步者
      const dx = a.x - cam.x, dz = a.z - cam.z, d = Math.hypot(dx, dz);
      if (d > 0 && d < this.k * 0.9 && Math.abs(cam.y - a.y - this.k * 1.6) < 3) this.nudge(a, a.x + dx / d * 0.15, a.z + dz / d * 0.15);
    }
  }

  // —— 绘制 ——
  draw(frame, cam) {
    const M = this.meshes, base = this._b, tmp = this._m, loc = this._l, Z = this._z;
    const q = this._q, v = this._v, sc = this._s, e = this._e;
    for (const a of this.agents) {
      if (a.role === 'high_priest' || a.role === 'solomon') { this.drawDetailed(a); continue; }
      if (!a.hidden && (frame + a.i) % a.far !== 0 && !a.dirty) continue;
      if (a.hidden) { if (!a.zeroed) { for (const k in a.slot) M[k].setMatrixAt(a.slot[k], Z); a.zeroed = true; } continue; }
      a.zeroed = false;
      const walk = a.moving ? 1 : 0;
      const sw = Math.sin(a.phase);
      const bob = walk * Math.abs(Math.cos(a.phase)) * 0.02;
      // 身体：位置、朝向、跪/俯伏、弯腰
      const kneelDrop = a.kneel * 0.42 + a.prostrate * 0.62;
      const pitch = a.stoop + a.kneel * 0.12 + a.prostrate * 1.25;
      e.set(pitch, a.h, walk * sw * 0.025, 'YXZ');
      q.setFromEuler(e);
      base.compose(v.set(a.x, a.y + (bob - kneelDrop * (1 - a.prostrate * 0.35)) * a.s, a.z), q, sc.set(a.s, a.s, a.s));
      // 手臂角度
      let la = -sw * 0.36 * walk, ra = sw * 0.36 * walk, lz = 0, rz = 0;
      const g = a.gesture, gt = a.gT;
      if (g === 'pray') { la = ra = -2.75; lz = -0.38; rz = 0.38; }
      else if (g === 'bless') { la = ra = -1.95; lz = -0.25; rz = 0.25; }
      else if (g === 'work') { la = -1.0 + Math.sin(gt * 2.6) * 0.25; ra = -1.15 - Math.sin(gt * 2.6 + 1) * 0.25; }
      else if (g === 'trumpet') { la = -1.7; ra = -1.85; lz = 0.25; rz = -0.25; }
      else if (g === 'lyre') { la = -0.9; ra = -0.7 + Math.sin(gt * 7) * 0.15; lz = 0.3; rz = -0.35; }
      if (a.carry === 'lamb' && g !== 'pray') { la = ra = -2.5; lz = -0.15; rz = 0.15; }
      if (a.carry === 'basket' && g !== 'pray') ra = -2.85;
      if (a.carry === 'doves' && g !== 'pray') { la = ra = -0.75; lz = 0.35; rz = -0.35; }
      if (a.role === 'elder' && g !== 'pray') ra = -0.35;
      for (const k in a.slot) {
        if (!a.parts.has(k) && !(k === 'trumpet' && g === 'trumpet') && !(k === 'lyre' && g === 'lyre')) { M[k].setMatrixAt(a.slot[k], Z); continue; }
        let m = base;
        if (k === 'armL' || k === 'handL' || k === 'armR' || k === 'handR') {
          const L = k.endsWith('L'), s = L ? -1 : 1;
          e.set(L ? la : ra, 0, L ? lz : rz, 'XYZ'); q.setFromEuler(e);
          loc.compose(v.set(s * 0.205, 1.4, 0), q, sc.set(1, 1, 1));
          m = tmp.multiplyMatrices(base, loc);
        } else if (k === 'footL' || k === 'footR') {
          const s = k === 'footL' ? -1 : 1, ph = s < 0 ? sw : -sw;
          loc.makeTranslation(s * 0.08, walk * Math.max(0, Math.cos(a.phase) * -s) * 0.05, ph * 0.17 * walk);
          m = tmp.multiplyMatrices(base, loc);
        } else if (k === 'legL' || k === 'legR') {
          const s = k === 'legL' ? -1 : 1;
          e.set((s < 0 ? sw : -sw) * 0.5 * walk, 0, 0, 'XYZ'); q.setFromEuler(e);
          loc.compose(v.set(s * 0.065, 0.45, 0), q, sc.set(1, 1, 1));
          m = tmp.multiplyMatrices(base, loc);
        } else if (k === 'staff') {
          e.set(ra, 0, 0, 'XYZ'); q.setFromEuler(e);
          loc.compose(v.set(0.205, 1.4, 0), q, sc.set(1, 1, 1));
          tmp.multiplyMatrices(base, loc);
          this._l2.makeRotationX(-ra);
          loc.makeTranslation(0, -0.63, 0.02).multiply(this._l2);
          m = tmp.multiply(loc);
        } else if (HEADISH.has(k) && a.headScale !== 1) {
          a.headM ??= new THREE.Matrix4().makeTranslation(0, 1.5, 0).multiply(new THREE.Matrix4().makeScale(a.headScale, a.headScale, a.headScale)).multiply(new THREE.Matrix4().makeTranslation(0, -1.5, 0));
          m = tmp.multiplyMatrices(base, a.headM);
        }
        M[k].setMatrixAt(a.slot[k], m);
      }
      a.dirty = false;
    }
    for (const k of PART_KEYS) M[k].instanceMatrix.needsUpdate = true;
  }

  drawDetailed(a) {
    const g = a.role === 'high_priest' ? this.hp : this.sol;
    if (a.hidden) { g.visible = false; return; }
    g.visible = true;
    const walk = a.moving ? 1 : 0, sw = Math.sin(a.phase);
    g.position.set(a.x, a.y - (a.kneel * 0.42 + a.prostrate * 0.5) * this.k, a.z);
    g.rotation.set(0, a.h, 0);
    g.userData.body.rotation.x = a.kneel * 0.1 + a.prostrate * 1.2;
    const [L, Rr] = g.userData.arms;
    let la = -sw * 0.3 * walk, ra = sw * 0.3 * walk, lz = 0, rz = 0;
    if (a.gesture === 'pray') { la = ra = -2.75; lz = -0.38; rz = 0.38; }
    if (a.gesture === 'bless') { la = ra = -1.95; lz = -0.25; rz = 0.25; }
    L.rotation.set(la, 0, lz); Rr.rotation.set(ra, 0, rz);
  }

  agentAt(mesh, instanceId) { return this.agents[instanceId]; }
  entryFor(agent) { return ROLE_ENTRY[agent.role] ?? 'man'; }
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
