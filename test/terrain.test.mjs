import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTerrain } from '../src/core/terrain-fn.js';

const T = makeTerrain({ flatten: [{ x0: -60, x1: 140, z0: -50, z1: 50, y: 0, region: 'inner_court' }] });

test('圣殿山顶接近内院地面', () => {
  const h = T.natural(0, 0);
  assert.ok(h > -8 && h < 4, `h=${h}`);
});

test('汲沦溪谷比圣殿山低 90 肘以上', () => {
  assert.ok(T.heightAt(600, 0) < T.heightAt(0, 0) - 90);
});

test('橄榄山高于圣殿山', () => {
  assert.ok(T.heightAt(1650, 0) > T.heightAt(0, 0) + 100);
});

test('大卫城山脊向南下降', () => {
  assert.ok(T.heightAt(60, 600) < T.heightAt(0, 0) - 40);
  assert.ok(T.heightAt(120, 1200) < T.heightAt(60, 600) - 40);
});

test('平台范围内地形不高过平台面', () => {
  for (let x = -60; x <= 140; x += 20) for (let z = -50; z <= 50; z += 20) assert.ok(T.heightAt(x, z) <= -0.5);
});

test('地名区域', () => {
  assert.equal(T.regionAt(0, 0), 'inner_court');
  assert.equal(T.regionAt(1500, 0), 'olives');
  assert.equal(T.regionAt(610, -200), 'kidron');
  assert.equal(T.regionAt(100, 1000), 'cityofdavid');
  assert.equal(T.regionAt(-1000, 0), 'westhill');
});
