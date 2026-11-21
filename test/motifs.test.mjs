import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blur } from '../src/world/motifs.js';

test('模糊半径为小数时不产生 NaN（中画质 P=96 时半径为 1.5）', () => {
  const w = 8, h = 6, src = new Float32Array(w * h).map((_, i) => (i % 3) / 2);
  for (const r of [0.5, 1, 1.5, 2.25]) {
    const out = blur(src, w, h, r);
    assert.ok(out.every(Number.isFinite), `r=${r}`);
  }
});
