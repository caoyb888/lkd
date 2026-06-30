# 莱矿-档案管理系统 · 生产部署物料（SQL Server 版）

目标机：**12 核 / 32G / Ubuntu 24.04**，数据库 **Microsoft SQL Server**，**有域名、需签发证书**。

架构（单节点，无需 Docker/K8s）：

```
浏览器 ──443/TLS──> Nginx ──/         前端静态 dist 直出
                      └──/api/──> 127.0.0.1:8080  Spring Boot jar (systemd, prod profile)
                                        └──> SQL Server (1433)
上传件 /data/lkda-uploads ──Nginx 只读 /files/──> 浏览器
```

## 物料清单

| 文件 | 作用 |
|---|---|
| `provision.sh` | 一次性装环境：JDK17、Nginx、Certbot、sqlcmd，建用户/目录/防火墙 |
| `sql/init.sqlserver.sql` | **SQL Server 建库脚本**（表/分区/触发器/字典数据，由 MySQL 版移植） |
| `application-prod.yml` | SQL Server 的生产 profile（已同步进 `src/main/resources/`） |
| `lkda.service` | 后端 systemd 单元（G1GC、堆 2~8G、崩溃自启、sandbox 加固） |
| `lkda.env.example` | 机密环境变量模板（DB 账号密码等，部署成 `/opt/lkda/lkda.env` 0600） |
| `nginx-lkda.conf` | Nginx 站点：TLS + `/api` 反代 + SPA 回退 + 100M 上传 + gzip + 安全头 |
| `setup-tls.sh` | Let's Encrypt 证书签发（certbot），自动续期 |
| `backup.sh` | SQL Server 每日 `BACKUP DATABASE` + 上传件打包 + 30 天轮转 |
| `deploy.sh` | 构建（mvn + npm）/ 推送 / 生产机就位重启 |

---

## ⚠️ 数据库迁移说明（MySQL → SQL Server，务必先读）

代码层耦合很小：MyBatis-Plus 会**按 JDBC 驱动自动识别 SQL Server 方言**（分页等），mapper XML 里没有 MySQL 专有函数，所以**主要工作是驱动 + DDL**。已经替你做好：

- ✅ `pom.xml` 增加 `mssql-jdbc` 依赖（与 mysql 驱动并存，dev 仍用 MySQL）。
- ✅ `application-prod.yml` 改为 SQL Server 数据源。
- ✅ `sql/init.sqlserver.sql` 完整移植：`IDENTITY`、`NVARCHAR`(中文 Unicode)、`DATETIME2`、
  分区函数/方案（`pf_year`/`ps_year`，等价于 MySQL `RANGE COLUMNS(year)`）、
  以及用 **AFTER UPDATE 触发器**复刻 `ON UPDATE CURRENT_TIMESTAMP`。

**仍需你验证 / 注意的点：**

1. **务必跑一遍冒烟测试**：登录、案卷列表/检索/分页、编目录入、借阅审批、打印导出。
   方言虽自动识别，但建议实测分页 SQL（`OFFSET ... FETCH`）与日期处理。
2. **存量数据迁移**：`init.sqlserver.sql` 只建结构 + 基础字典，**不搬历史业务数据**。
   若 MySQL 已有数据，需用 ETL（SSMA for MySQL / `bcp` / 自写脚本）迁移，注意字符集与
   `year` 分区列、`record_id` IDENTITY 的衔接。
3. **分区列类型**：`year` 为 `NVARCHAR(10)`，分区函数 `pf_year(NVARCHAR(10))` 必须类型一致。
4. **每年扩容**：见脚本末尾 `SPLIT RANGE`（两张分区表都要做），对应原 MySQL 的 `REORGANIZE`。
5. 默认管理员 `admin`：密码由应用 `DataInitializer` 启动时写入 Argon2id 哈希（默认 `Admin@123`），
   **首次登录后立即改密**。

---

## 内存规划（32G）

- **SQL Server 与应用同机**：给 SQL Server 设上限，避免它吃光内存——
  `EXEC sp_configure 'max server memory', 20480; RECONFIGURE;`（示例 20G），
  后端 JVM 用默认 `-Xmx8g`（见 `lkda.service`），余量留给系统/Nginx。
- **SQL Server 独立/云**：本机只跑 jar + Nginx，`-Xmx8g` 绰绰有余，可按需上调。

---

## 部署步骤

> 约定：后端 jar 放 `/opt/lkda/`，前端 dist 放 `/var/www/lkda/`，机密在 `/opt/lkda/lkda.env`。

**0. 装 SQL Server**（若同机，独立/云数据库可跳过）
按微软文档安装 *SQL Server 2022 for Ubuntu*，创建应用库账号 `lkda_app`（最小权限，仅授 `laikuang_archive` 库）。

**1. 初始化环境**
```bash
sudo bash deploy/provision.sh
```

**2. 初始化数据库**（在能连到 SQL Server 的机器上）
```bash
sqlcmd -S <DB_HOST>,1433 -U sa -P '<sa密码>' -C -i deploy/sql/init.sqlserver.sql
```

**3. 构建并就位产物**
```bash
# 本地构建 + 推送到生产机（也可在生产机直接 build）
bash deploy/deploy.sh push lkda@<生产机IP>
# 前端 dist 已 rsync 到 /var/www/lkda，jar 到 /opt/lkda/archive-1.0.0.jar.new
```

**4. 配置机密**
```bash
sudo cp /opt/lkda/deploy/lkda.env.example /opt/lkda/lkda.env
sudo nano /opt/lkda/lkda.env          # 填 DB_HOST/账号/密码
sudo chown lkda:lkda /opt/lkda/lkda.env && sudo chmod 600 /opt/lkda/lkda.env
```

**5. 注册后端服务**
```bash
sudo cp /opt/lkda/deploy/lkda.service /etc/systemd/system/lkda.service
sudo systemctl daemon-reload
sudo bash /opt/lkda/deploy/deploy.sh local    # 就位 jar + 启动/重启 lkda + reload nginx
journalctl -u lkda -f                         # 看启动日志
```

**6. 申请证书**（启用含 443 的站点配置之前）
```bash
sudo bash /opt/lkda/deploy/setup-tls.sh your.domain.com you@example.com
```

**7. 启用 Nginx 站点**
```bash
sudo sed -i 's/your.domain.com/真实域名/g' /opt/lkda/deploy/nginx-lkda.conf
sudo cp /opt/lkda/deploy/nginx-lkda.conf /etc/nginx/sites-available/lkda
sudo ln -sf /etc/nginx/sites-available/lkda /etc/nginx/sites-enabled/lkda
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**8. 配置每日备份**
```bash
sudo crontab -e
# 每天 02:00 备份
0 2 * * *  /opt/lkda/deploy/backup.sh >> /var/log/lkda-backup.log 2>&1
```
并把 `/var/backups/lkda` 同步到**异地/对象存储**（`backup.sh` 末尾有 rsync/s3 示例），且**演练一次恢复**。

---

## 日常运维

```bash
systemctl status lkda            # 后端状态
journalctl -u lkda -f            # 后端日志
systemctl restart lkda           # 重启后端
sudo bash deploy/deploy.sh push lkda@host   # 发新版本（构建+推送）→ 生产机再 deploy.sh local
```

**升级发布**：`deploy.sh push` → 生产机 `deploy.sh local`（替换 jar + `systemctl restart` + `nginx reload`，秒级）。单机不需要蓝绿；要零中断可在 Nginx 后挂两个 jar 实例轮换。
