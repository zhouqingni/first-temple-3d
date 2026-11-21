import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRef, formatRef, versesOf, lookup } from '../src/core/refs.js';

test('单节范围', () => {
  const r = parseRef('王上6:2-3');
  assert.equal(r.length, 1);
  assert.equal(r[0].book, '1KI');
  assert.equal(r[0].abbr, '王上');
  assert.equal(r[0].ch, 6);
  assert.equal(r[0].v1, 2);
  assert.equal(r[0].v2, 3);
});

test('同章多段', () => {
  const r = parseRef('代下3:4,15-17');
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].v1, r[0].v2, r[1].v1, r[1].v2], [4, 4, 15, 17]);
});

test('长缩写优先（约壹 不被当成 约）', () => {
  const r = parseRef('约壹1:5');
  assert.equal(r[0].book, '1JN');
});

test('格式化显示全名', () => {
  assert.equal(formatRef('王上6:2-3'), '列王纪上 6:2-3');
  assert.equal(formatRef('代下3:4,15'), '历代志下 3:4,15');
});

test('展开为逐节键', () => {
  assert.deepEqual(versesOf('出25:10-12'), ['EXO.25.10', 'EXO.25.11', 'EXO.25.12']);
});

test('非法引用抛错', () => {
  assert.throws(() => parseRef('不存在1:1'));
  assert.throws(() => parseRef('王上6'));
});

test('lookup 返回经文行', () => {
  const db = { 'EXO.25.10': '甲', 'EXO.25.11': '乙' };
  assert.deepEqual(lookup('出25:10-11', db), [{ key: 'EXO.25.10', v: 10, ch: 25, text: '甲' }, { key: 'EXO.25.11', v: 11, ch: 25, text: '乙' }]);
});
