#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# 莱矿-档案管理系统 · 一键启动脚本（后台常驻版）
#
# 与 start.sh 的区别：本脚本把前后端各自放进独立会话（setsid）后台运行，
# 启动完立即返回 —— 关闭终端 / 断开 SSH / 退出当前进程都不会把服务带停。
#
# 用法:
#   ./serve.sh            # = ./serve.sh start dev  启动（开发模式，默认）
#   ./serve.sh start dev  # 开发模式：后端 jar(dev) + Vite dev server(:5173)
#   ./serve.sh start prod # 生产模式：后端 jar(prod) + 前端 dist 静态预览(:5173)
#   ./serve.sh stop       # 停止前后端
#   ./serve.sh restart [dev|prod]
#   ./serve.sh status     # 查看运行状态
#   ./serve.sh logs [be|fe]   # 实时查看后端/前端日志（默认 be）
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# ── 路径 ────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT/lkda-web-react"
JAR_FILE="$ROOT/target/archive-1.0.0.jar"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"
BE_LOG="$LOG_DIR/backend.log"
FE_LOG="$LOG_DIR/frontend.log"
BE_PID="$LOG_DIR/backend.pid"
FE_PID="$LOG_DIR/frontend.pid"

BE_PORT=8080
FE_PORT=5173

# ── 低配置优化参数（与 start.sh 一致）───────────────────────────
JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseSerialGC \
  -XX:MetaspaceSize=64m -XX:MaxMetaspaceSize=128m \
  -XX:+DisableExplicitGC -Djava.security.egd=file:/dev/./urandom \
  -Dfile.encoding=UTF-8 -Dspring.backgroundpreinitializer.ignore=true"
export NODE_OPTIONS="--max-old-space-size=512"

# ── 颜色 ────────────────────────────────────────────────────────
R='\033[0m'; B='\033[1m'; G='\033[32m'; Y='\033[33m'; RED='\033[31m'; C='\033[36m'
info()  { echo -e "  $*"; }
ok()    { echo -e "${G}  ✓ $*${R}"; }
warn()  { echo -e "${Y}  ⚠ $*${R}"; }
err()   { echo -e "${RED}  ✗ $*${R}"; }
title() { echo -e "\n${B}${C}═══ $* ═══${R}"; }

# ── 工具：端口监听 PID ──────────────────────────────────────────
port_pid() {
  local p="$1"
  if command -v lsof &>/dev/null; then
    lsof -t -iTCP:"$p" -sTCP:LISTEN 2>/dev/null | head -1
  elif command -v ss &>/dev/null; then
    ss -tlnp 2>/dev/null | grep -oP ":$p\s.*pid=\K[0-9]+" | head -1
  fi
}
port_up() { [[ -n "$(port_pid "$1")" ]]; }

# ── 工具：杀掉占用端口的进程（连同子进程）──────────────────────
kill_port() {
  local p="$1" name="$2" pid
  pid="$(port_pid "$p" || true)"
  if [[ -z "$pid" ]]; then info "$name (:$p) 未运行"; return; fi
  # 先优雅，再强制；尝试杀整个进程组以带走子进程（如 vite）
  local pgid; pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
  if [[ -n "$pgid" ]]; then kill -TERM "-$pgid" 2>/dev/null || true; fi
  kill -TERM "$pid" 2>/dev/null || true
  for _ in 1 2 3 4 5; do port_up "$p" || break; sleep 1; done
  if port_up "$p"; then
    warn "$name 未在 5s 内退出，强制结束"
    [[ -n "$pgid" ]] && kill -KILL "-$pgid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
  fi
  ok "$name 已停止"
}

# ── 工具：以独立会话后台启动一条命令 ────────────────────────────
# 用 setsid 脱离当前会话/进程组，nohup 忽略 SIGHUP，stdin 接 /dev/null。
spawn() {
  local logf="$1"; shift
  setsid nohup "$@" >"$logf" 2>&1 </dev/null &
  disown 2>/dev/null || true
}

# ── 环境检测 ────────────────────────────────────────────────────
need() { command -v "$1" &>/dev/null || { err "未找到 $1，请先安装"; exit 1; }; }

# ── 启动：后端 ──────────────────────────────────────────────────
start_backend() {
  local profile="$1"
  if port_up "$BE_PORT"; then warn "后端已在运行 (:$BE_PORT, PID $(port_pid "$BE_PORT"))，跳过"; return; fi
  need java
  if [[ ! -f "$JAR_FILE" ]]; then
    need mvn
    warn "未找到 $JAR_FILE，开始打包后端（mvn package -DskipTests）…"
    ( cd "$ROOT" && mvn package -DskipTests -q )
    ok "后端打包完成"
  fi
  info "启动后端 ($profile) …  JVM: -Xmx384m -XX:+UseSerialGC"
  spawn "$BE_LOG" java $JAVA_OPTS -jar "$JAR_FILE" --spring.profiles.active="$profile"
  # 等待端口就绪
  for i in $(seq 1 60); do
    port_up "$BE_PORT" && { echo "$(port_pid "$BE_PORT")" > "$BE_PID"; ok "后端就绪 → http://localhost:$BE_PORT (PID $(cat "$BE_PID"))"; return; }
    sleep 1
  done
  err "后端 60s 内未就绪，请查看日志：$BE_LOG"; tail -n 20 "$BE_LOG" || true
}

# ── 启动：前端 ──────────────────────────────────────────────────
start_frontend() {
  local mode="$1"
  if port_up "$FE_PORT"; then warn "前端已在运行 (:$FE_PORT, PID $(port_pid "$FE_PORT"))，跳过"; return; fi
  need node; need npm
  if [[ "$mode" == "prod" ]]; then
    if [[ ! -d "$FRONTEND_DIR/dist" ]]; then
      warn "未找到前端 dist，开始构建（npm run build）…"
      ( cd "$FRONTEND_DIR" && npm run build )
      ok "前端构建完成"
    fi
    info "启动前端（生产·静态预览） …"
    spawn "$FE_LOG" npm --prefix "$FRONTEND_DIR" run preview -- --host 0.0.0.0 --port "$FE_PORT"
  else
    info "启动前端（Vite dev server） …  NODE 内存上限 512MB"
    spawn "$FE_LOG" npm --prefix "$FRONTEND_DIR" run dev
  fi
  for i in $(seq 1 40); do
    port_up "$FE_PORT" && { echo "$(port_pid "$FE_PORT")" > "$FE_PID"; ok "前端就绪 → http://localhost:$FE_PORT (PID $(cat "$FE_PID"))"; return; }
    sleep 1
  done
  err "前端 40s 内未就绪，请查看日志：$FE_LOG"; tail -n 20 "$FE_LOG" || true
}

# ── 命令：start ─────────────────────────────────────────────────
do_start() {
  local mode="${1:-dev}"
  [[ "$mode" == "dev" || "$mode" == "prod" ]] || { err "未知模式 '$mode'（dev|prod）"; exit 1; }
  title "莱矿-档案管理系统 启动（$mode 模式·后台常驻）"
  start_backend "$mode"
  start_frontend "$mode"
  echo ""
  echo -e "${B}${G}═══════════════════════════════════════════════${R}"
  ok "全部启动完成（已脱离当前会话，关闭终端不影响）"
  info "前端: ${C}http://localhost:$FE_PORT${R}    后端: ${C}http://localhost:$BE_PORT${R}"
  info "日志: $BE_LOG | $FE_LOG"
  info "停止: ${Y}./serve.sh stop${R}   状态: ${Y}./serve.sh status${R}"
  echo -e "${B}${G}═══════════════════════════════════════════════${R}"
}

# ── 命令：stop ──────────────────────────────────────────────────
do_stop() {
  title "停止服务"
  kill_port "$FE_PORT" "前端"
  kill_port "$BE_PORT" "后端"
  rm -f "$BE_PID" "$FE_PID"
}

# ── 命令：status ────────────────────────────────────────────────
do_status() {
  title "运行状态"
  if port_up "$BE_PORT"; then ok "后端 运行中  :$BE_PORT  (PID $(port_pid "$BE_PORT"))"; else err "后端 未运行  :$BE_PORT"; fi
  if port_up "$FE_PORT"; then ok "前端 运行中  :$FE_PORT  (PID $(port_pid "$FE_PORT"))"; else err "前端 未运行  :$FE_PORT"; fi
}

# ── 命令：logs ──────────────────────────────────────────────────
do_logs() {
  local which="${1:-be}"
  case "$which" in
    be|backend)  info "tail -f $BE_LOG（Ctrl+C 退出）"; tail -n 50 -f "$BE_LOG" ;;
    fe|frontend) info "tail -f $FE_LOG（Ctrl+C 退出）"; tail -n 50 -f "$FE_LOG" ;;
    *) err "用法: ./serve.sh logs [be|fe]"; exit 1 ;;
  esac
}

# ── 入口 ────────────────────────────────────────────────────────
CMD="${1:-start}"
case "$CMD" in
  start)          do_start "${2:-dev}" ;;
  stop)           do_stop ;;
  restart)        do_stop; do_start "${2:-dev}" ;;
  status)         do_status ;;
  logs)           do_logs "${2:-be}" ;;
  dev|prod)       do_start "$CMD" ;;        # 兼容 ./serve.sh dev
  *) echo -e "用法: ${B}./serve.sh [start|stop|restart|status|logs] [dev|prod]${R}"; exit 1 ;;
esac
