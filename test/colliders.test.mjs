import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld } from '../src/core/colliders.js';

function world() {
  const w = new CollisionWorld();
  w.setTerrain(() => -100);
  w.addBox(-50, -2, -50, 50, 0, 50, 'floor');       // 地面 y=0
  w.addBox(10, 0, -20, 12, 30, 20, 'wall');         // 东面一堵 30 肘高的墙
  w.addBox(-10, 0, -2, -8, 0.5, 2, 'step');         // 0.5 肘台阶
  w.addRamp(-30, 10, -24, 40, 0, 10, 'z', 'ramp');  // 坡道：z 10→40，y 0→10
  return w;
}

test('地面高度取脚下最高的可站面', () => {
  const w = world();
  assert.equal(w.groundAt(0, 0, 1), 0);
  assert.equal(w.groundAt(-9, 0, 0.2), 0.5);
  assert.equal(w.groundAt(0, 100, 0), -100); // 出了平台就落到地形
});

test('走向高墙会被挡住', () => {
  const w = world();
  const p = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 100; i++) w.move(p, 0.3, 0, 0.6, 3.2);
  assert.ok(p.x <= 10 - 0.6 + 1e-6, `x=${p.x}`);
  assert.ok(p.x > 9);
});

test('沿墙斜走时保留平行分量（滑动）', () => {
  const w = world();
  const p = { x: 9.3, y: 0, z: 0 };
  w.move(p, 0.5, 0.5, 0.6, 3.2);
  assert.ok(p.z > 0.4, `z=${p.z}`);
  assert.ok(p.x <= 9.4 + 1e-6);
});

test('低台阶可以走上去，高度随之抬起', () => {
  const w = world();
  const p = { x: -12, y: 0, z: 0 };
  for (let i = 0; i < 10; i++) w.move(p, 0.3, 0, 0.6, 3.2);
  assert.ok(p.x > -9.5);
  assert.equal(p.y, 0.5);
});

test('坡道高度线性变化', () => {
  const w = world();
  assert.ok(Math.abs(w.groundAt(-27, 25, 10) - 5) < 1e-6);
  const p = { x: -27, y: 0, z: 9 };
  for (let i = 0; i < 60; i++) w.move(p, 0, 0.5, 0.4, 3.2);
  assert.ok(p.y > 9, `y=${p.y}`);
});

test('按标签移除碰撞体', () => {
  const w = world();
  w.removeTag('wall');
  const p = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 60; i++) w.move(p, 0.3, 0, 0.6, 3.2);
  assert.ok(p.x > 12);
});
