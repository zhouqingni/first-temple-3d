// 界面：经文面板、悬停提示、索引、设置、开关、模式切换、提示语
import * as THREE from 'three';
import catalog from '../data/catalog.json';
import verses from '../data/verses.json';
import { lookup, formatRef } from '../core/refs.js';
import { state } from '../app/state.js';
import { registry } from '../app/registry.js';
import { HOUSE, Y } from '../core/layout.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TAG = { 明载: 't-ming', 推测: 't-tui', 异读: 't-yi' };
const REGION_NAME = { inner_court: '内院', great_court: '大院', palace: '宫室', cityofdavid: '大卫城', kidron: '汲沦溪谷', olives: '橄榄山', hinnom: '欣嫩子谷', westhill: '城西的山岗', moriah: '摩利亚山' };

export const E = catalog.entries;

export function firstVerse(id) {
  const e = E[id];
  if (!e) return '';
  const r = lookup(e.refs[0], verses)[0];
  return r ? `${r.text}（${formatRef(e.refs[0]).replace(/:.*$/, `:${r.v}`)}）` : '';
}

export class UI {
  constructor({ controls, camera, scene, sky, temple, people }) {
    Object.assign(this, { controls, camera, scene, sky, temple, people });
    this.sheets = ['panel', 'index', 'settings', 'help'];
    this.bind();
    this.buildIndex();
    this.syncToggles();
    this.syncSettings();
    this.whereT = 0; this.inDebir = false;
    controls.on((e) => {
      if (e.type === 'mode' || e.type === 'arrived') this.syncMode();
      if (e.type === 'interact' && this.tour?.active && !this.tour.flying) this.tour.pauseAuto();
    });
  }

  attach({ tour, picker, minimap, labels }) { Object.assign(this, { tour, picker, minimap, labels }); this.syncToggles(); }

  bind() {
    document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
    $('#btn-index').addEventListener('click', () => this.toggleSheet('index'));
    $('#btn-settings').addEventListener('click', () => this.toggleSheet('settings'));
    $('#btn-help').addEventListener('click', () => this.toggleSheet('help'));
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closeSheet(b.dataset.close)));
    document.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.toggle;
      state.set(k, !state.get(k));
      this.syncToggles();
    }));
    document.querySelectorAll('.seg').forEach((seg) => seg.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      const k = seg.dataset.setting;
      let v = btn.dataset.v;
      if (k === 'cubit') v = Number(v);
      state.set(k, v);
      this.syncSettings();
      if (k === 'quality') this.toast('画质设置将在重新载入后生效', '', 2600);
      if (k === 'scene' && v === 'dedication') this.toast('献殿之日', '可在"导览"中按步骤观看（王上8；代下5-7）', 3500);
    }));
    $('#set-speech').addEventListener('change', (e) => state.set('speech', e.target.checked));
    $('#index-q').addEventListener('input', (e) => this.buildIndex(e.target.value.trim()));
    addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input,textarea')) return;
      const k = e.key.toLowerCase();
      if (k === '1') this.setMode('orbit');
      else if (k === '2') this.setMode('walk');
      else if (k === '3') this.setMode('tour');
      else if (k === 'r') { state.set('roof', !state.get('roof')); this.syncToggles(); }
      else if (k === 'm') { state.set('map', !state.get('map')); this.syncToggles(); }
      else if (k === 'i') this.toggleSheet('index');
      else if (k === 'escape') { for (const s of this.sheets) this.closeSheet(s); }
      else if (e.code === 'KeyD' && this.controls.mode !== 'walk') { state.set('dims', !state.get('dims')); this.syncToggles(); }
    });
    state.on('map', (v) => { $('#minimap').hidden = !v; });
    $('#minimap').hidden = !state.get('map');
  }

  syncToggles() {
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      const k = b.dataset.toggle;
      const v = state.get(k);
      b.setAttribute('aria-pressed', String(k === 'roof' ? !v : v));
    });
  }

  syncSettings() {
    document.querySelectorAll('.seg').forEach((seg) => {
      const v = String(state.get(seg.dataset.setting));
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    });
    $('#set-speech').checked = !!state.get('speech');
  }

  setMode(m) {
    if (m === 'tour') { this.tour?.start(); }
    else {
      if (this.tour?.active) this.tour.stop();
      this.controls.setMode(m);
    }
    this.syncMode();
  }

  syncMode() {
    const m = this.tour?.active ? 'tour' : this.controls.fly?.then === 'walk' ? 'walk' : this.controls.mode === 'tour' ? 'tour' : this.controls.mode;
    document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    const touch = matchMedia('(pointer: coarse)').matches;
    $('#joy').hidden = !(m === 'walk' && touch);
    $('#walkhint').hidden = !(m === 'walk' && !touch);
    $('#tourbar').hidden = m !== 'tour';
    if (m === 'walk') { this.closeSheet('index'); this.closeSheet('settings'); }
  }

  toggleSheet(id) { const el = $(`#${id}`); if (el.hidden) this.openSheet(id); else this.closeSheet(id); }
  openSheet(id) {
    for (const s of this.sheets) if (s !== id) $(`#${s}`).hidden = true;
    $(`#${id}`).hidden = false;
    if (id === 'index') setTimeout(() => { if (!matchMedia('(pointer: coarse)').matches) $('#index-q').focus(); }, 50);
  }
  closeSheet(id) { $(`#${id}`).hidden = true; if (id === 'panel') this.picker?.clearSelection(); }

  // —— 经文面板 ——
  open(id, opts = {}) {
    const e = E[id];
    if (!e) return;
    this.current = id;
    const cubit = state.get('cubit');
    const tags = [...new Set([e.status, ...(e.notes ?? []).map((n) => n.tag)])];
    const dims = (e.dims ?? []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${typeof v === 'number' ? `${v} 肘<span class="m">约 ${(v * cubit).toFixed(v * cubit < 10 ? 2 : 1)} 米</span>` : esc(v)}</td></tr>`).join('');
    const vs = e.refs.map((r) => {
      const lines = lookup(r, verses);
      return `<div class="verse"><h4>${esc(formatRef(r))}</h4><p>${lines.map((l) => `<sup>${l.v}</sup>${esc(l.text)}`).join('')}</p></div>`;
    }).join('');
    const notes = (e.notes ?? []).map((n) => `<div class="note"><span class="tag ${TAG[n.tag]}">${n.tag}</span><span>${esc(n.text)}</span></div>`).join('');
    const rel = this.related(id).map((r) => `<button data-open="${r}">${esc(E[r].name)}</button>`).join('');
    const extra = id === 'ark' ? '<button class="btn ghost" data-open="ark_history">约柜的来历</button>' : '';
    $('#panel-body').innerHTML = `
      <p class="eyebrow">${esc(e.group)}</p>
      <h2>${esc(e.name)}</h2>
      <div class="tags">${tags.map((t) => `<span class="tag ${TAG[t]}">${t}</span>`).join('')}</div>
      <p class="summary">${esc(e.summary)}</p>
      ${dims ? `<table class="dims">${dims}</table>` : ''}
      <div class="actions"><button class="btn" data-fly="${id}">飞到这里看</button>${extra}${'speechSynthesis' in window ? '<button class="btn ghost" data-speak>朗读</button>' : ''}</div>
      ${notes ? `<p class="sec">说明</p>${notes}` : ''}
      <p class="sec">经文依据 · 和合本</p>
      ${vs}
      ${rel ? `<p class="sec">相关</p><div class="related">${rel}</div>` : ''}`;
    const body = $('#panel-body');
    body.scrollTop = 0;
    body.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => this.open(b.dataset.open)));
    body.querySelector('[data-fly]')?.addEventListener('click', () => this.flyTo(id));
    body.querySelector('[data-speak]')?.addEventListener('click', () => this.speak(`${e.name}。${e.summary}`));
    this.openSheet('panel');
    if (opts.fly) this.flyTo(id);
  }

  related(id) {
    const e = E[id];
    const mine = new Set(e.refs.map((r) => r.split(':')[0]));
    const score = [];
    for (const [k, o] of Object.entries(E)) {
      if (k === id) continue;
      const n = o.refs.filter((r) => mine.has(r.split(':')[0])).length;
      if (n && o.group === e.group) score.push([n + 1, k]);
      else if (n >= 2) score.push([n, k]);
    }
    return score.sort((a, b) => b[0] - a[0]).slice(0, 6).map((s) => s[1]);
  }

  flyTo(id) {
    if (this.tour?.active) this.tour.stop();
    const f = registry.focus.get(id);
    const c = this.controls;
    if (f) {
      const dir = new THREE.Vector3(...(f.dir ?? [1, 0.6, 0.8])).normalize();
      const pos = new THREE.Vector3(...f.target).addScaledVector(dir, f.dist);
      c.flyTo({ pos: pos.toArray(), target: f.target, then: 'orbit' });
    } else {
      const box = registry.bounds(id);
      if (box) c.flyToBox(box, { then: 'orbit' });
    }
    // 屋顶外看不见殿内：飞向殿内时保留屋顶，飞向楼房时揭顶
    if (id === 'upper_rooms' || id === 'roof') { state.set('roof', id === 'roof'); this.syncToggles(); }
    if (matchMedia('(max-width: 760px)').matches) this.closeSheet('panel');
    setTimeout(() => this.syncMode(), 50);
  }

  speak(text) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/（[^）]*）/g, ''));
      u.lang = 'zh-CN'; u.rate = 0.95;
      speechSynthesis.speak(u);
      return u;
    } catch { return null; }
  }

  // —— 索引 ——
  buildIndex(q = '') {
    const list = $('#index-list');
    const groups = catalog.groups;
    const items = Object.entries(E).filter(([, e]) => !q || e.name.includes(q) || e.summary.includes(q) || e.refs.some((r) => r.includes(q) || formatRef(r).includes(q)));
    list.innerHTML = groups.map((g) => {
      const its = items.filter(([, e]) => e.group === g);
      if (!its.length) return '';
      return `<div class="idx-group"><h3>${g}</h3>${its.map(([id, e]) => `<button class="idx-item" data-id="${id}"><span class="nm">${esc(e.name)}</span><span class="rf">${esc(e.refs.slice(0, 2).join('；'))}</span></button>`).join('')}</div>`;
    }).join('') || '<p class="hint">没有找到。试试"柱"、"约柜"或"王上7"。</p>';
    list.querySelectorAll('.idx-item').forEach((b) => b.addEventListener('click', () => { this.open(b.dataset.id, { fly: true }); }));
  }

  // —— 悬停提示 ——
  tip(id, x, y) {
    const el = $('#tip');
    if (!id || !E[id]) { el.hidden = true; return; }
    const e = E[id];
    if (this.tipId !== id) {
      el.innerHTML = `<p class="nm">${esc(e.name)} <span class="tag ${TAG[e.status]}">${e.status}</span></p><p class="vs">${esc(firstVerse(id))}</p><p class="hint2">单击查看全部经文</p>`;
      this.tipId = id;
    }
    el.hidden = false;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = `${Math.min(innerWidth - w - 12, x + 16)}px`;
    el.style.top = `${Math.min(innerHeight - h - 12, y + 18)}px`;
  }

  toast(text, sub = '', ms = 3200) {
    const t = $('#toast');
    t.innerHTML = `${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), ms);
  }

  welcome() {
    this.toast('所罗门为耶和华所建的殿', '拖动旋转，滚轮缩放；悬停查看名称，单击查看经文', 5200);
    let seen = false;
    try { seen = localStorage.getItem('first-temple-seen') === '1'; localStorage.setItem('first-temple-seen', '1'); } catch { /* 无痕模式 */ }
    if (!seen) setTimeout(() => this.openSheet('help'), 1200);
  }

  update(dt, camera) {
    this.whereT -= dt;
    if (this.whereT > 0) return;
    this.whereT = 0.4;
    const c = this.controls;
    let text = '';
    if (c.mode === 'walk') {
      const p = c.p;
      const inHouse = p.x > HOUSE.x0 && p.x < HOUSE.eastOuter && Math.abs(p.z) < HOUSE.halfW && p.y > Y.floor - 0.5 && p.y < Y.floor + 2;
      if (inHouse && p.x < 0) text = '至圣所';
      else if (inHouse && p.x < HOUSE.x1) text = '圣所（外殿）';
      else if (p.x >= HOUSE.x1 && p.x < 62 && Math.abs(p.z) < 10 && p.y > 2) text = '殿前的廊子';
      else text = REGION_NAME[this.picker?.T.regionAt(p.x, p.z)] ?? '';
      const debir = text === '至圣所';
      if (debir && !this.inDebir) this.toast('至圣所', '"至于第二层帐幕，惟有大祭司一年一次独自进去，没有不带着血为自己和百姓的过错献上。"（来9:7）', 7000);
      this.inDebir = debir;
    }
    const el = $('#where');
    if (el.textContent !== text) el.textContent = text;
  }
}
