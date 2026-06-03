#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 莱矿-档案管理系统 一键启动脚本（低配置服务器优化版）
# 适用: 2C2G 及以下云服务器
# 用法:
#   ./start.sh dev   # 开发模式
#   ./start.sh prod  # 生产模式
#   ./start.sh       # 默认 dev 模式
#   ./start.sh stop  # 停止所有服务
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── 颜色定义 ────────────────────────────────────────────────────
RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
CYAN='\033[36m'

# ── 路径 ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$SCRIPT_DIR/lkda-web-react"
JAR_FILE="$BACKEND_DIR/target/archive-1.0.0.jar"
LOG_DIR="$BACKEND_DIR/logs"

# ── 低配置优化参数 ──────────────────────────────────────────────
# JVM: 2G 内存服务器，Java 堆上限 384MB，使用 SerialGC（单核/低内存最优）
JAVA_OPTS="-Xms128m -Xmx384m \
  -XX:+UseSerialGC \
  -XX:MetaspaceSize=64m \
  -XX:MaxMetaspaceSize=128m \
  -XX:+DisableExplicitGC \
  -XX:+UseStringDeduplication \
  -Djava.security.egd=file:/dev/./urandom \
  -Dfile.encoding=UTF-8 \
  -Dspring.backgroundpreinitializer.ignore=true"

# Node.js: 限制老年代堆内存 512MB，避免 Vite/esbuild 吃光内存
export NODE_OPTIONS="--max-old-space-size=512"

# ── 模式 ────────────────────────────────────────────────────────
MODE="${1:-dev}"
if [[ "$MODE" == "stop" ]]; then
  echo -e "${BOLD}${YELLOW}═══ 正在停止所有服务... ═══${RESET}"
  # 停止 Java 后端
  JAVA_PIDS=$(pgrep -f "archive-1.0.0.jar" || true)
  if [[ -n "$JAVA_PIDS" ]]; then
    echo -e "  停止后端 Java 进程: $JAVA_PIDS"
    kill $JAVA_PIDS 2>/dev/null || true
    sleep 2
  fi
  # 停止前端 dev server
  NODE_PIDS=$(pgrep -f "lkda-web.*vite" || true)
  if [[ -n "$NODE_PIDS" ]]; then
    echo -e "  停止前端 Node 进程: $NODE_PIDS"
    kill $NODE_PIDS 2>/dev/null || true
    sleep 1
  fi
  echo -e "${GREEN}✓ 所有服务已停止${RESET}"
  exit 0
fi

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo -e "${RED}错误：未知模式 '$MODE'${RESET}"
  echo -e "用法: ${BOLD}./start.sh [dev|prod|stop]${RESET}"
  exit 1
fi

# ── 资源检测 ────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}═══ 莱矿-档案管理系统 一键启动（低配置优化版）═══${RESET}\n"

# 内存检测
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
MEM_AVAIL=$(free -m | awk '/^Mem:/{print $7}')
echo -e "${BOLD}服务器资源:${RESET}"
echo -e "  内存总量: ${MEM_TOTAL}MB / 可用: ${MEM_AVAIL}MB"
if [[ "$MEM_TOTAL" -lt 2048 ]]; then
  echo -e "  ${YELLOW}⚠ 内存较低（< 2GB），已启用低配置优化参数${RESET}"
fi

# 磁盘检测
DISK_AVAIL=$(df -m / | awk 'NR==2{print $4}')
echo -e "  磁盘可用: ${DISK_AVAIL}MB"
if [[ "$DISK_AVAIL" -lt 5120 ]]; then
  echo -e "  ${YELLOW}⚠ 磁盘空间不足 5GB，建议清理旧日志${RESET}"
fi

# 环境检测
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ 未找到 $1，请先安装${RESET}"
    exit 1
  fi
  echo -e "${GREEN}✓ $1$(command -v "$1")${RESET}"
}

echo ""
echo -e "${BOLD}环境检测:${RESET}"
check_cmd java
check_cmd mvn
check_cmd node

# ── 清理旧日志（保留最近 7 天，避免磁盘满）───────────────────────
if [[ -d "$LOG_DIR" ]]; then
  find "$LOG_DIR" -name "*.log" -mtime +7 -type f -delete 2>/dev/null || true
  find "$LOG_DIR" -name "*.gz" -mtime +7 -type f -delete 2>/dev/null || true
fi

# ── 端口占用检测 ────────────────────────────────────────────────
check_port() {
  local port=$1
  local name=$2
  if command -v ss &>/dev/null && ss -tlnp 2>/dev/null | grep -q ":$port "; then
    echo -e "${YELLOW}⚠ 端口 $port 已被占用（$name），将尝试停止旧进程${RESET}"
    return 0
  elif command -v lsof &>/dev/null && lsof -Pi :"$port" -sTCP:LISTEN -t &>/dev/null; then
    echo -e "${YELLOW}⚠ 端口 $port 已被占用（$name），将尝试停止旧进程${RESET}"
    return 0
  fi
  return 1
}

echo ""
if check_port 8080 "后端"; then
  OLD_JAVA=$(lsof -t -i:8080 2>/dev/null || ss -tlnp 2>/dev/null | grep ":8080 " | grep -oP 'pid=\K[0-9]+' | head -1)
  if [[ -n "$OLD_JAVA" ]]; then
    kill "$OLD_JAVA" 2>/dev/null || true
    sleep 2
  fi
fi
if check_port 5173 "前端"; then
  OLD_NODE=$(lsof -t -i:5173 2>/dev/null || ss -tlnp 2>/dev/null | grep ":5173 " | grep -oP 'pid=\K[0-9]+' | head -1)
  if [[ -n "$OLD_NODE" ]]; then
    kill "$OLD_NODE" 2>/dev/null || true
    sleep 1
  fi
fi
echo ""

# ── 构建检查 ────────────────────────────────────────────────────
if [[ "$MODE" == "prod" ]]; then
  if [[ ! -f "$JAR_FILE" ]]; then
    echo -e "${YELLOW}⚠ 未找到 $JAR_FILE，开始打包后端...${RESET}"
    cd "$BACKEND_DIR"
    mvn package -DskipTests -q
    echo -e "${GREEN}✓ 后端打包完成${RESET}"
  fi
  if [[ ! -d "$FRONTEND_DIR/dist" ]]; then
    echo -e "${YELLOW}⚠ 未找到前端 dist，开始构建前端...${RESET}"
    cd "$FRONTEND_DIR"
    npm run build
    echo -e "${GREEN}✓ 前端构建完成${RESET}"
  fi
else
  if [[ ! -f "$JAR_FILE" ]]; then
    echo -e "${YELLOW}⚠ 未找到 jar，开始编译后端...${RESET}"
    cd "$BACKEND_DIR"
    mvn package -DskipTests -q
    echo -e "${GREEN}✓ 后端编译完成${RESET}"
  fi
fi

# ── 子进程 PID 记录 ─────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

# ── 清理函数 ────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${BOLD}${YELLOW}═══ 正在停止服务... ═══${RESET}"
  
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "  停止前端 (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
  
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "  停止后端 (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  
  echo -e "${GREEN}✓ 所有服务已停止${RESET}"
  exit 0
}

trap cleanup INT TERM EXIT

# ── 启动后端 ────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}═══ 启动后端服务 (${MODE} 模式) ═══${RESET}"
echo -e "  ${YELLOW}JVM 参数: -Xms128m -Xmx384m -XX:+UseSerialGC${RESET}"

if [[ "$MODE" == "prod" ]]; then
  cd "$BACKEND_DIR"
  nohup java $JAVA_OPTS -jar "$JAR_FILE" \
    --spring.profiles.active=prod \
    > "$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo -e "  后端已启动 (PID: $BACKEND_PID) → http://localhost:8080"
  echo -e "  日志: $LOG_DIR/backend.log"
else
  cd "$BACKEND_DIR"
  nohup java $JAVA_OPTS -jar "$JAR_FILE" \
    --spring.profiles.active=dev \
    > "$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo -e "  后端已启动 (PID: $BACKEND_PID) → http://localhost:8080"
  echo -e "  日志: $LOG_DIR/backend.log"
fi

# ── 等待后端就绪 ────────────────────────────────────────────────
echo -e "  等待后端就绪..."
for i in {1..60}; do
  if curl -s http://localhost:8080 &>/dev/null; then
    echo -e "${GREEN}  ✓ 后端服务已就绪${RESET}"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${RED}  ✗ 后端进程意外退出，请检查日志${RESET}"
    cat "$LOG_DIR/backend.log" | tail -20
    exit 1
  fi
  sleep 1
  if [[ $i -eq 60 ]]; then
    echo -e "${YELLOW}  ⚠ 后端启动超时，请手动检查日志${RESET}"
  fi
done

# ── 启动前端 ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}═══ 启动前端服务 (${MODE} 模式) ═══${RESET}"
echo -e "  ${YELLOW}Node 内存限制: --max-old-space-size=512${RESET}"

cd "$FRONTEND_DIR"

if [[ "$MODE" == "prod" ]]; then
  # 生产模式：优先使用 Python http.server（最轻量），其次 npx serve
  if command -v python3 &>/dev/null; then
    python3 -m http.server 5173 --directory dist > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
  elif command -v npx &>/dev/null && npx serve --version &>/dev/null; then
    npx serve -s dist -l 5173 > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
  else
    echo -e "${RED}✗ 未找到可用的静态文件服务器（python3 或 npx serve）${RESET}"
    exit 1
  fi
  echo -e "  前端已启动 (PID: $FRONTEND_PID) → http://localhost:5173"
  echo -e "  日志: $LOG_DIR/frontend.log"
else
  # 开发模式：Vite dev server
  if command -v pnpm &>/dev/null; then
    pnpm dev > "$LOG_DIR/frontend.log" 2>&1 &
  else
    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
  fi
  FRONTEND_PID=$!
  echo -e "  前端已启动 (PID: $FRONTEND_PID) → http://localhost:5173"
  echo -e "  日志: $LOG_DIR/frontend.log"
fi

# ── 等待前端就绪 ────────────────────────────────────────────────
echo -e "  等待前端就绪..."
for i in {1..30}; do
  if curl -s http://localhost:5173 &>/dev/null; then
    echo -e "${GREEN}  ✓ 前端服务已就绪${RESET}"
    break
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "${RED}  ✗ 前端进程意外退出，请检查日志${RESET}"
    cat "$LOG_DIR/frontend.log" | tail -20
    exit 1
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo -e "${YELLOW}  ⚠ 前端启动超时，请手动检查日志${RESET}"
  fi
done

# ── 就绪提示 ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  莱矿-档案管理系统 已全部启动${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}访问地址:${RESET}"
echo -e "    前端页面: ${CYAN}http://localhost:5173${RESET}"
echo -e "    后端 API: ${CYAN}http://localhost:8080${RESET}"
echo ""
echo -e "  ${BOLD}日志文件:${RESET}"
echo -e "    后端: $LOG_DIR/backend.log"
echo -e "    前端: $LOG_DIR/frontend.log"
echo ""
echo -e "  ${BOLD}操作:${RESET}"
echo -e "    按 ${YELLOW}Ctrl+C${RESET} 停止所有服务"
echo -e "    或执行 ${YELLOW}./start.sh stop${RESET} 停止"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${RESET}"

# ── 保持运行 ────────────────────────────────────────────────────
wait
