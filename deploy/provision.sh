#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# 一次性环境初始化（Ubuntu 24.04）
# 安装 JDK17 / Nginx / Certbot / sqlcmd，创建运行用户与目录。
# 用法:  sudo bash deploy/provision.sh
# ───────────────────────────────────────────────────────────────
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "请用 root / sudo 运行"; exit 1; }

echo "── 1/6 apt 更新 ──"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y

echo "── 2/6 安装 JDK17 / Nginx / Certbot / 工具 ──"
apt-get install -y openjdk-17-jre-headless nginx certbot python3-certbot-nginx \
                   curl gnupg ca-certificates ufw

echo "── 3/6 安装 sqlcmd（mssql-tools18，备份脚本用）──"
if ! command -v sqlcmd >/dev/null 2>&1 && [[ ! -x /opt/mssql-tools18/bin/sqlcmd ]]; then
  curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg
  curl -fsSL https://packages.microsoft.com/config/ubuntu/22.04/prod.list \
    | sed 's#packages.microsoft.com/keys/microsoft.asc#usr/share/keyrings/microsoft-prod.gpg#' \
    > /etc/apt/sources.list.d/mssql-release.list || true
  apt-get update -y || true
  ACCEPT_EULA=Y apt-get install -y mssql-tools18 unixodbc-dev || \
    echo "  ⚠ sqlcmd 安装失败，可稍后手动安装；不影响应用运行，仅备份脚本需要"
  grep -q '/opt/mssql-tools18/bin' /etc/profile.d/mssql.sh 2>/dev/null || \
    echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' > /etc/profile.d/mssql.sh
fi

echo "── 4/6 创建运行用户 lkda 与目录 ──"
id lkda >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin lkda
install -d -o lkda -g lkda /opt/lkda /opt/lkda/logs
install -d -o lkda -g lkda /data/lkda-uploads
install -d -o root -g root /var/www/lkda /var/www/letsencrypt /var/backups/lkda

echo "── 5/6 防火墙（仅放行 SSH/HTTP/HTTPS）──"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

echo "── 6/6 完成 ──"
echo "  JDK : $(java -version 2>&1 | head -1)"
echo "  下一步见 deploy/README.md：拷贝 jar/dist、配置 env、初始化 SQL Server、申请证书、启用 Nginx。"
