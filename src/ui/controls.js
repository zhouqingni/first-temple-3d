// 浏览方式：俯瞰（环绕）、漫步（第一人称，带碰撞）、飞行（导览与"飞过去"）
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { m2c } from '../app/state.js';
import { HUMAN, Y, POI } from '../core/layout.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Controls {
  constructor(camera, dom, world, T) {
    this.camera = camera; this.dom = dom; this.world = world; this.T = T;
    this.mode = 'orbit';
    this.orbit = new OrbitControls(camera, dom);
    Object.assign(this.orbit, { enableDamping: true, dampingFactor: 0.08, screenSpacePanning: false, maxPolarAngle: Math.PI * 0.495, minDistance: 3, maxDistance: 7000, zoomSpeed: 1.1, rotateSpeed: 0.6, panSpeed: 0.9 });
    this.orbit.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    camera.position.set(...POI.overview.pos);
    this.orbit.target.set(...POI.overview.target);
    this.orbit.update();

    this.p = new THREE.Vector3(180, Y.great, 0); // 漫步者脚下
    this.yaw = Math.PI / 2; this.pitch = 0; this.vy = 0;
    this.keys = new Set();
    this.joy = { x: 0, y: 0, active: false, id: null };
    this.look = { id: null, x: 0, y: 0 };
    this.downAt = null; this.dragged = false;
    this.fly = null;
    this.listeners = [];
    this.rescale();
    this._bind();
  }

  rescale() { this.eye = m2c(HUMAN.eye); this.radius = m2c(0.32); this.height = m2c(1.75); this.step = m2c(0.55); }

  on(fn) { this.listeners.push(fn); }
  emit(e) { for (const f of this.listeners) f(e); }

  _bind() {
    const d = this.dom;
    addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input,textarea')) return;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    d.addEventListener('pointerdown', (e) => {
      this.downAt = { x: e.clientX, y: e.clientY }; this.dragged = false;
      if (this.mode === 'walk' && this.look.id === null) { this.look = { id: e.pointerId, x: e.clientX, y: e.clientY }; d.setPointerCapture?.(e.pointerId); }
      if (this.fly && this.fly.interruptible) this.fly = null;
      if (this.mode === 'tour' && !this.fly && this.tourTarget) { this.mode = 'orbit'; this.orbit.target.copy(this.tourTarget); this.orbit.enabled = true; this.orbit.update(); }
      this.emit({ type: 'interact' });
    });
    d.addEventListener('pointermove', (e) => {
      if (this.downAt && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 7) this.dragged = true;
      if (this.mode === 'walk' && this.look.id === e.pointerId) {
        const k = e.pointerType === 'touch' ? 0.0055 : 0.0035;
        this.yaw -= (e.clientX - this.look.x) * k;
        this.pitch = THREE.MathUtils.clamp(this.pitch - (e.clientY - this.look.y) * k, -1.35, 1.35);
        this.look.x = e.clientX; this.look.y = e.clientY;
      }
    });
    const up = (e) => { if (this.look.id === e.pointerId) this.look.id = null; setTimeout(() => { this.downAt = null; }, 0); };
    d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    d.addEventListener('wheel', (e) => {
      if (this.mode !== 'walk') return;
      e.preventDefault();
      const f = -Math.sign(e.deltaY) * 2.2;
      this._walk(f, 0);
    }, { passive: false });
    // 摇杆
    const joy = document.querySelector('#joy'), knob = joy?.querySelector('.knob');
    if (joy) {
      const set = (e) => {
        const r = joy.getBoundingClientRect();
        let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        const L = Math.hypot(x, y); if (L > 1) { x /= L; y /= L; }
        this.joy.x = x; this.joy.y = y;
        knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
      };
      joy.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.joy.active = true; this.joy.id = e.pointerId; joy.setPointerCapture(e.pointerId); set(e); this.emit({ type: 'interact' }); });
      joy.addEventListener('pointermove', (e) => { if (this.joy.active && e.pointerId === this.joy.id) set(e); });
      const end = () => { this.joy = { x: 0, y: 0, active: false, id: null }; knob.style.transform = ''; };
      joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    }
  }

  setMode(mode, opts = {}) {
    if (mode === this.mode && !opts.force) return;
    const prev = this.mode;
    this.mode = mode;
    this.orbit.enabled = mode === 'orbit';
    if (mode === 'walk') {
      const start = opts.at;
      if (start) { this.p.set(start.x, start.y ?? 50, start.z); this.yaw = start.yaw ?? this.yaw; this.pitch = 0; }
      else if (prev === 'orbit') {
        const t = this.orbit.target;
        if (this.world.groundAt(t.x, t.z, t.y + 2) > -60 && Math.abs(t.x) < 400 && t.z > -200 && t.z < 600) {
          this.p.set(t.x, t.y + 1, t.z);
          const dir = new THREE.Vector3().subVectors(t, this.camera.position);
          this.yaw = Math.atan2(-dir.x, -dir.z);
        } else { this.p.set(176, Y.great, 0); this.yaw = Math.PI / 2; }
      }
      this.p.y = this.world.groundAt(this.p.x, this.p.z, this.p.y + 40, 60);
      if (opts.fly !== false) {
        const to = this._walkPose();
        this.flyTo({ pos: to.pos.toArray(), target: to.target.toArray(), duration: 1.4, then: 'walk' });
      }
    }
    if (mode === 'orbit' && prev === 'walk') {
      const dir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const tgt = this.p.clone().addScaledVector(dir, 20).setY(this.p.y + 2);
      this.orbit.target.copy(tgt);
      this.camera.position.copy(tgt).addScaledVector(dir, -60).setY(this.p.y + 40);
      this.orbit.update();
    }
    this.emit({ type: 'mode', mode });
  }

  _walkPose() {
    const pos = new THREE.Vector3(this.p.x, this.p.y + this.eye, this.p.z);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    return { pos, target: pos.clone().add(dir) };
  }

  // 飞行：从当前位置平滑飞到 pos，看向 target；结束后进入 then 模式
  flyTo({ pos, target, duration = 2.2, then = 'orbit', arc = true, interruptible = true, onDone }) {
    const fromPos = this.camera.position.clone();
    const fromTarget = this.mode === 'walk' ? this._walkPose().target : this.orbit.target.clone();
    const toPos = new THREE.Vector3(...pos), toTarget = new THREE.Vector3(...target);
    const dist = fromPos.distanceTo(toPos);
    this.fly = { fromPos, fromTarget, toPos, toTarget, t: 0, dur: Math.max(0.6, duration * (dist < 30 ? 0.6 : 1)), then, lift: arc ? Math.min(400, dist * 0.25) : 0, interruptible, onDone };
    this.orbit.enabled = false;
  }

  flyToBox(box, { dist, dir, then } = {}) {
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const D = dist ?? Math.max(10, size * 1.25);
    const d = new THREE.Vector3(...(dir ?? [1, 0.6, 0.8])).normalize();
    const pos = c.clone().addScaledVector(d, D);
    const g = this.T.heightAt(pos.x, pos.z);
    if (pos.y < g + 3) pos.y = g + 3;
    this.flyTo({ pos: pos.toArray(), target: c.toArray(), then: then ?? (this.mode === 'walk' ? 'orbit' : this.mode === 'tour' ? 'tour' : 'orbit') });
  }

  _walk(fwd, strafe, extra = 0) {
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let dx = (-sy * fwd + cy * strafe), dz = (-cy * fwd - sy * strafe);
    if (extra) { dx += -sy * extra; dz += -cy * extra; }
    const L = Math.hypot(dx, dz);
    const n = Math.max(1, Math.ceil(L / (this.radius * 0.8)));
    for (let i = 0; i < n; i++) this.world.move(this.p, dx / n, dz / n, this.radius, this.height, this.step);
  }

  update(dt) {
    if (this.fly) {
      const f = this.fly;
      f.t += dt / f.dur;
      const k = ease(Math.min(1, f.t));
      this.camera.position.lerpVectors(f.fromPos, f.toPos, k);
      this.camera.position.y += Math.sin(Math.PI * k) * f.lift;
      const tg = new THREE.Vector3().lerpVectors(f.fromTarget, f.toTarget, k);
      this.camera.lookAt(tg);
      if (f.t >= 1) {
        this.fly = null;
        if (f.then === 'walk') { this.mode = 'walk'; this.orbit.enabled = false; }
        else if (f.then === 'tour') { this.mode = 'tour'; this.orbit.enabled = false; this.tourTarget = f.toTarget.clone(); }
        else { this.mode = 'orbit'; this.orbit.target.copy(f.toTarget); this.orbit.enabled = true; this.orbit.update(); }
        f.onDone?.();
        this.emit({ type: 'arrived', mode: this.mode });
      }
      return;
    }
    if (this.mode === 'orbit') {
      this.orbit.update();
      const c = this.camera.position, g = this.T.heightAt(c.x, c.z);
      if (c.y < g + 2) { c.y = g + 2; }
      const tg = this.orbit.target;
      tg.x = THREE.MathUtils.clamp(tg.x, -2400, 2700); tg.z = THREE.MathUtils.clamp(tg.z, -2200, 2600);
    } else if (this.mode === 'walk') {
      const k = this.keys;
      let fwd = 0, str = 0;
      if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
      if (k.has('KeyA')) str -= 1;
      if (k.has('KeyD')) str += 1;
      if (k.has('ArrowLeft')) this.yaw += dt * 1.6;
      if (k.has('ArrowRight')) this.yaw -= dt * 1.6;
      if (k.has('KeyQ')) this.yaw += dt * 1.6;
      if (k.has('KeyE')) this.yaw -= dt * 1.6;
      if (this.joy.active) { fwd += -this.joy.y; str += this.joy.x; }
      const L = Math.hypot(fwd, str); if (L > 1) { fwd /= L; str /= L; }
      const run = k.has('ShiftLeft') || k.has('ShiftRight') || (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.92);
      const speed = m2c(1.45) * (run ? 2.6 : 1);
      if (fwd || str) this._walk(fwd * speed * dt, str * speed * dt);
      // 落下（从台阶、墙头）
      const g = this.world.groundAt(this.p.x, this.p.z, this.p.y, this.step);
      if (g < this.p.y - 0.01) { this.vy -= 60 * dt; this.p.y = Math.max(g, this.p.y + this.vy * dt); } else { this.vy = 0; this.p.y = g; }
      const pose = this._walkPose();
      this.camera.position.lerp(pose.pos, Math.min(1, dt * 18));
      this.camera.position.x = pose.pos.x; this.camera.position.z = pose.pos.z;
      this.camera.lookAt(this.camera.position.clone().add(pose.target.sub(pose.pos)));
    } else if (this.mode === 'tour' && this.tourTarget) {
      // 导览停站时轻微环绕
      const c = this.camera.position, tg = this.tourTarget;
      const ang = dt * 0.025;
      const dx = c.x - tg.x, dz = c.z - tg.z;
      c.x = tg.x + dx * Math.cos(ang) - dz * Math.sin(ang);
      c.z = tg.z + dx * Math.sin(ang) + dz * Math.cos(ang);
      this.camera.lookAt(tg);
    }
  }

  focusPoint(out) {
    if (this.mode === 'walk') return out.copy(this.p);
    const t = this.fly ? this.fly.toTarget : this.mode === 'tour' && this.tourTarget ? this.tourTarget : this.orbit.target;
    const d = this.camera.position.distanceTo(t);
    out.copy(t);
    if (d > 600) out.lerp(new THREE.Vector3(40, 0, 60), Math.min(1, (d - 600) / 800));
    return out;
  }
}
