// 打包：src/main.js → 单文件 dist/第一圣殿.html（离线双击可开）与 dist/在线版.html（发布用，无外壳）
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const dev = process.argv.includes('--dev');
const res = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: !dev,
  sourcemap: false,
  write: false,
  target: 'es2020',
  legalComments: 'none',
  define: { __DEV__: String(dev) },
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/ui/style.css', 'utf8');
const body = readFileSync('src/ui/body.html', 'utf8');
const head = `<title>第一圣殿</title>
<meta name="description" content="依和合本经文复原的所罗门圣殿，可俯瞰、漫步与查考经文">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;900&display=swap">
<style>${css}</style>`;
mkdirSync('dist', { recursive: true });
const full = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
writeFileSync('dist/第一圣殿.html', full);
writeFileSync('dist/index.html', full); // 局域网访问时直接打开根地址
mkdirSync('网页', { recursive: true });
writeFileSync('网页/index.html', full); // 公开发布用（GitHub Pages、Cloudflare）
writeFileSync('dist/在线版.html', `${head}\n${body}\n<script>${js}</script>\n`);
console.log(`完成：${(full.length / 1024 / 1024).toFixed(2)} MB${dev ? '（开发版）' : ''}`);
