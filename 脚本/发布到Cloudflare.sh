#!/bin/bash
# 把 网页/ 发布到 Cloudflare。设置写在项目根目录的 wrangler.jsonc 里。
# 第一次用要先登录：npx --yes wrangler@4 login
# GitHub Pages 不用跑这个：推送到 GitHub 就会自动发布
set -e
cd "$(dirname "$0")/.."
npm run build
npx --yes wrangler@4 deploy
