#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# 为域名申请 Let's Encrypt 证书（首次签发用 standalone，临时占用 80）
# 之后续期由 certbot 的 systemd timer 自动完成。
#
# 用法:  sudo bash deploy/setup-tls.sh your.domain.com you@example.com
#
# 注意：运行时会短暂停止 nginx（standalone 需独占 80 端口），约几秒。
#       请在“启用含 443 的 nginx-lkda.conf 之前”运行本脚本，
#       否则缺证书会导致 nginx -t 失败。
# ───────────────────────────────────────────────────────────────
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "请用 root / sudo 运行"; exit 1; }

DOMAIN="${1:-}"
EMAIL="${2:-}"
[[ -n "$DOMAIN" && -n "$EMAIL" ]] || { echo "用法: sudo bash deploy/setup-tls.sh <域名> <邮箱>"; exit 1; }

echo "── 为 $DOMAIN 申请证书 ──"
certbot certonly --standalone \
  -d "$DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" \
  --pre-hook  "systemctl stop nginx" \
  --post-hook "systemctl start nginx"

echo "✓ 证书已签发：/etc/letsencrypt/live/$DOMAIN/"
echo "  续期：certbot 已注册自动续期 timer（systemctl list-timers | grep certbot）。"
echo "  下一步：把 nginx-lkda.conf 里的 your.domain.com 改成 $DOMAIN，启用站点并 reload。"
