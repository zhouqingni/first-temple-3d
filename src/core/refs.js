// 经文引用解析：'王上6:2-3'、'代下3:4,15-17'、'出25:10-22'
import BOOKS from './books.json' with { type: 'json' };

const ABBRS = Object.keys(BOOKS).sort((a, b) => b.length - a.length);

export function parseRef(str) {
  const s = String(str).trim();
  const abbr = ABBRS.find((a) => s.startsWith(a));
  if (!abbr) throw new Error(`未知书卷：${s}`);
  const rest = s.slice(abbr.length);
  const m = rest.match(/^(\d+):([\d,\-]+)$/);
  if (!m) throw new Error(`引用格式不对：${s}`);
  const ch = Number(m[1]);
  const b = BOOKS[abbr];
  return m[2].split(',').map((part) => {
    const [a, z] = part.split('-').map(Number);
    if (!a || (z !== undefined && (!z || z < a))) throw new Error(`节数不对：${s}`);
    return { abbr, book: b.code, bookName: b.name, ch, v1: a, v2: z ?? a };
  });
}

export function formatRef(str) {
  const segs = parseRef(str);
  const vs = segs.map((g) => (g.v1 === g.v2 ? `${g.v1}` : `${g.v1}-${g.v2}`)).join(',');
  return `${segs[0].bookName} ${segs[0].ch}:${vs}`;
}

export function versesOf(str) {
  const out = [];
  for (const g of parseRef(str)) for (let v = g.v1; v <= g.v2; v++) out.push(`${g.book}.${g.ch}.${v}`);
  return out;
}

export function lookup(str, db) {
  const segs = parseRef(str);
  return versesOf(str).map((key) => {
    const [, ch, v] = key.split('.');
    return { key, ch: Number(ch), v: Number(v), text: db[key] };
  }).filter((x) => x.text !== undefined || !segs.length);
}

export { BOOKS };
