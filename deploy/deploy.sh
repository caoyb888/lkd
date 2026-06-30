#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# 构建 + 发布脚本
#   build   本地构建后端 jar + 前端 dist
#   push    把产物 rsync 到生产机
#   release 在生产机上就位并重启服务（通常 SSH 到生产机执行 local 模式）
#
# 用法:
#   bash deploy/deploy.sh build                       # 仅构建
#   bash deploy/deploy.sh push user@prod.host         # 构建并推送到生产机
#   sudo bash deploy/deploy.sh local                  # 在生产机上就位+重启（产物已在本机）
# ───────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FE="$ROOT/lkda-web-react"
JAR="$ROOT/target/archive-1.0.0.jar"

APP_DIR=/opt/lkda
WEB_DIR=/var/www/lkda

build() {
  echo "── 构建后端（mvn package）──"
  ( cd "$ROOT" && mvn -q clean package -DskipTests )
  [[ -f "$JAR" ]] || { echo "✗ 未生成 $JAR"; exit 1; }
  echo "── 构建前端（npm ci && build）──"
  ( cd "$FE" && (npm ci || npm install) && npm run build )
  echo "✓ 构建完成: $JAR  +  $FE/dist"
}

push() {
  local target="${1:-}"; [[ -n "$target" ]] || { echo "用法: deploy.sh push user@host"; exit 1; }
  build
  echo "── 推送到 $target ──"
  rsync -az "$JAR"                      "$target:$APP_DIR/archive-1.0.0.jar.new"
  rsync -az --delete "$FE/dist/"        "$target:$WEB_DIR/"
  rsync -az "$ROOT/deploy/"             "$target:$APP_DIR/deploy/"
  echo "✓ 已推送。请在生产机执行: sudo bash $APP_DIR/deploy/deploy.sh local"
}

local_release() {
  [[ $EUID -eq 0 ]] || { echo "请用 sudo 运行 local 模式"; exit 1; }
  if [[ -f "$APP_DIR/archive-1.0.0.jar.new" ]]; then
    mv -f "$APP_DIR/archive-1.0.0.jar.new" "$APP_DIR/archive-1.0.0.jar"
  fi
  chown -R lkda:lkda "$APP_DIR"
  echo "── 重启后端 ──"
  systemctl restart lkda
  sleep 3
  systemctl --no-pager --lines=0 status lkda || true
  echo "── 重载 Nginx ──"
  nginx -t && systemctl reload nginx
  echo "✓ 发布完成"
}

case "${1:-}" in
  build)  build ;;
  push)   push "${2:-}" ;;
  local)  local_release ;;
  *) echo "用法: deploy.sh [build | push user@host | local]"; exit 1 ;;
esac
