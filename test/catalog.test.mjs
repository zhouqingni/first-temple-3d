import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { versesOf } from '../src/core/refs.js';

const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url)));
const verses = JSON.parse(readFileSync(new URL('../src/data/verses.json', import.meta.url)));
const STATUS = ['明载', '推测', '异读'];

test('每个条目字段齐全', () => {
  for (const [id, e] of Object.entries(catalog.entries)) {
    assert.ok(e.name, `${id} 缺名称`);
    assert.ok(catalog.groups.includes(e.group), `${id} 分组不对：${e.group}`);
    assert.ok(STATUS.includes(e.status), `${id} 状态不对：${e.status}`);
    assert.ok(e.summary && e.summary.length > 10, `${id} 缺简述`);
    assert.ok(Array.isArray(e.refs) && e.refs.length > 0, `${id} 没有经文依据`);
    for (const n of e.notes ?? []) assert.ok(STATUS.includes(n.tag), `${id} 说明标签不对：${n.tag}`);
  }
});

test('每条引用的经文都在和合本里找得到', () => {
  for (const [id, e] of Object.entries(catalog.entries)) {
    for (const r of e.refs) {
      for (const key of versesOf(r)) assert.ok(verses[key], `${id} 引用 ${r} 缺 ${key}`);
    }
  }
});
