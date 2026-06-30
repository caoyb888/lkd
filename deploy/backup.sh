#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# SQL Server 数据库每日备份（BACKUP DATABASE）+ 上传件备份 + 30 天轮转
#
# 对应 MySQL 版的 mysqldump；SQL Server 用 T-SQL 的 BACKUP DATABASE 生成 .bak。
#
# 用法（手动）:  sudo bash deploy/backup.sh
# 定时（cron）:  sudo crontab -e
#   0 2 * * *  /opt/lkda/deploy/backup.sh >> /var/log/lkda-backup.log 2>&1
#
# 依赖:  sqlcmd（provision.sh 已装 mssql-tools18）
# 环境:  从 /opt/lkda/lkda.env 读取 DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD
# ───────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE="${LKDA_ENV:-/opt/lkda/lkda.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/lkda}"
UPLOAD_DIR="${UPLOAD_DIR:-/data/lkda-uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
# SQL Server 容器内可见的备份目录（同机部署时与宿主一致；容器化部署需挂载映射）
MSSQL_BAK_DIR="${MSSQL_BAK_DIR:-$BACKUP_DIR}"

SQLCMD="$(command -v sqlcmd || echo /opt/mssql-tools18/bin/sqlcmd)"
[[ -x "$SQLCMD" ]] || { echo "未找到 sqlcmd，请先安装 mssql-tools18"; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "未找到 env 文件: $ENV_FILE"; exit 1; }
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

TS="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
BAK_FILE="$MSSQL_BAK_DIR/${DB_NAME}_${TS}.bak"

echo "[$(date '+%F %T')] 开始备份数据库 $DB_NAME → $BAK_FILE"
"$SQLCMD" -S "${DB_HOST},${DB_PORT:-1433}" -U "$DB_USERNAME" -P "$DB_PASSWORD" -C -b -Q \
  "BACKUP DATABASE [$DB_NAME] TO DISK = N'$BAK_FILE'
   WITH INIT, COMPRESSION, CHECKSUM, STATS = 10, NAME = N'$DB_NAME-full';"
echo "  ✓ 数据库备份完成"

# 压缩上传件目录（增量可改用 rsync 到异地）
if [[ -d "$UPLOAD_DIR" ]]; then
  FILES_TGZ="$BACKUP_DIR/uploads_${TS}.tar.gz"
  tar -czf "$FILES_TGZ" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
  echo "  ✓ 上传件备份完成: $FILES_TGZ"
fi

# 轮转：删除 N 天前的备份
find "$BACKUP_DIR" -name "${DB_NAME}_*.bak" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "  ✓ 已清理 ${RETENTION_DAYS} 天前的旧备份"

# ★ 强烈建议：把 $BACKUP_DIR 同步到异地/对象存储（取消注释并配置）
# rsync -az "$BACKUP_DIR/" backup-host:/remote/lkda/
# aws s3 sync "$BACKUP_DIR/" s3://your-bucket/lkda/ --storage-class STANDARD_IA

echo "[$(date '+%F %T')] 备份流程结束"
