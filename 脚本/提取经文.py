"""从本机和合本 USFM 中取出条目用到的全部经文，写入 src/data/verses.json。

用法：python3 -I 脚本/提取经文.py [和合本 usfm 目录]
默认目录：../圣经人物关系图/数据源/和合本/usfm
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
USFM = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / '圣经人物关系图' / '数据源' / '和合本' / 'usfm'
BOOKS = json.loads((ROOT / 'src/core/books.json').read_text(encoding='utf-8'))
ABBRS = sorted(BOOKS, key=len, reverse=True)
SOURCES = [ROOT / 'src/data/catalog.json', ROOT / 'src/data/tour.json']


def collect_refs(node, out):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == 'refs' and isinstance(v, list):
                out.extend(x for x in v if isinstance(x, str))
            else:
                collect_refs(v, out)
    elif isinstance(node, list):
        for v in node:
            collect_refs(v, out)


def parse_ref(s):
    abbr = next((a for a in ABBRS if s.startswith(a)), None)
    if not abbr:
        raise ValueError(f'未知书卷：{s}')
    m = re.fullmatch(r'(\d+):([\d,\-]+)', s[len(abbr):])
    if not m:
        raise ValueError(f'引用格式不对：{s}')
    ch = int(m.group(1))
    keys = []
    for part in m.group(2).split(','):
        a, _, z = part.partition('-')
        for v in range(int(a), int(z or a) + 1):
            keys.append((abbr, ch, v))
    return keys


def clean(t):
    t = re.sub(r'\\f .*?\\f\*', '', t)
    t = re.sub(r'\\x .*?\\x\*', '', t)
    t = re.sub(r'\\\+?(pn|add|nd|wj|qs|k|w|bd|it)\*?\s?', '', t)
    t = re.sub(r'\s*（[^（）]*·[^（）]*）\s*$', '', t)
    t = re.sub(r'\\\w+\*?', '', t)
    return re.sub(r'\s{2,}', ' ', t).strip()


def parse_usfm(path):
    book, ch, cur = {}, None, None
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.rstrip()
        m = re.match(r'\\c\s+(\d+)', line)
        if m:
            ch = int(m.group(1)); book[ch] = {}; cur = None; continue
        m = re.match(r'\\v\s+(\d+)\s*(.*)', line)
        if m and ch is not None:
            cur = int(m.group(1)); book[ch][cur] = m.group(2); continue
        if cur is None or ch is None or not line:
            continue
        if re.match(r'\\(q\d?|m|pi\d?|li\d?)\b', line):
            book[ch][cur] += ' ' + re.sub(r'^\\\w+\d?\s*', '', line)
        elif not line.startswith('\\'):
            book[ch][cur] += line
    return {c: {v: clean(t) for v, t in vs.items()} for c, vs in book.items()}


def main():
    refs = []
    for src in SOURCES:
        if src.exists():
            collect_refs(json.loads(src.read_text(encoding='utf-8')), refs)
    wanted = {}
    for r in refs:
        for abbr, ch, v in parse_ref(r):
            wanted.setdefault(abbr, set()).add((ch, v))
    out, missing = {}, []
    for abbr, keys in wanted.items():
        b = BOOKS[abbr]
        data = parse_usfm(USFM / b['file'])
        for ch, v in sorted(keys):
            text = data.get(ch, {}).get(v)
            if not text:
                missing.append(f'{abbr}{ch}:{v}')
            else:
                out[f"{b['code']}.{ch}.{v}"] = text
    out = dict(sorted(out.items()))
    (ROOT / 'src/data/verses.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'条目引用 {len(refs)} 处，经文 {len(out)} 节，缺失 {len(missing)} 节')
    if missing:
        print('缺失：', '、'.join(missing))
        sys.exit(1)


if __name__ == '__main__':
    main()
