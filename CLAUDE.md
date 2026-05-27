# 莱矿-档案管理系统 CLAUDE.md

## 项目概述

莱矿档案管理系统是一个**前后端分离单体 MVC 架构**的企业级档案管理平台，实现"案卷-文件"两级传统档案的全生命周期管理。系统涵盖档案编目录入、借阅审批、生命周期流转、打印导出、安全审计等核心功能。

## 技术栈

| 层级 | 选型 | 说明 |
|---|---|---|
| 后端框架 | Spring Boot 3.x | RESTful API，内置 Tomcat |
| 持久层 | MyBatis-Plus | CRUD 简化 + 分页 + 条件构造器 |
| 权限框架 | Sa-Token + JWT | 轻量单体鉴权，HttpOnly Cookie 或 Header |
| 数据库 | MySQL 8.0 (InnoDB) | RANGE COLUMNS 年度物理分区 |
| 前端 | Vue 3 + Element Plus | 下拉框/表格/表单组件 |
| 对象转换 | MapStruct | 高性能 Entity/DTO/VO 互转 |
| Excel | EasyExcel | 批量导入，严格格式校验 |
| Word 打印 | poi-tl | 占位符模板渲染，导出 .docx |
| 定时任务 | Spring `@Scheduled` | 凌晨扫描借阅逾期状态 |
| 反向代理 | Nginx | 动静分离，前端静态资源托管 |

## 包结构约定

```
com.laikuang.archive.[module].[layer]
```

例：`com.laikuang.archive.borrow.service`

**模块划分：**

- `system` — 用户、部门、数据字典（`sys_*` 表）
- `volume` — 案卷级档案编目（`archive_volume`）
- `file` — 文件级明细编目（`archive_file`）
- `borrow` — 借阅申请与审批（`archive_borrow`）
- `approve` — 归档/销毁审批日志（`archive_approve_log`）
- `common` — 全局工具类、异常基类、常量、Result 封装

## 分层架构与职责边界

```
前端客户端
    ↓ HTTP RESTful
Controller（表现层）
    ↓ DTO
Service（业务逻辑层）
    ↓ Entity
Mapper（持久层）
    ↓ SQL
MySQL
```

**各层严格规则：**

- **Controller**：只做参数接收 + `@Validated` 基础校验，调用 Service，禁止包含业务逻辑或 SQL。
- **Service**：业务核心；事务控制、多表协同、档号生成、状态机流转均在此层。有事务需求的方法必须加 `@Transactional(rollbackFor = Exception.class)`。
- **Mapper**：仅执行数据库 CRUD，不做业务转换。
- **禁止逆向依赖**：各层单向依赖，不得跨层调用。

## 领域对象规范（POJO）

| 类型 | 说明 | 示例 |
|---|---|---|
| Entity | 严格对应数据库表，仅用于持久层 | `ArchiveVolume` |
| DTO | 前端提交 / 模块间传输 | `ArchiveVolumeSaveDTO` |
| VO | 后端向前端返回的视图展示 | `ArchiveVolumeListVO` |

- **严禁**将 Entity 直接暴露给前端。
- **严禁**使用 `BeanUtils.copyProperties`，必须使用 **MapStruct** 进行对象转换。

## 命名约定

| 类型 | 规则 | 示例 |
|---|---|---|
| 包名 | 单数小写名词 | `com.laikuang.archive.borrow.service` |
| 类名 | UpperCamelCase | `ArchiveVolumeController` |
| 接口实现 | `Impl` 结尾 | `ArchiveVolumeServiceImpl` |
| Mapper 接口 | `Mapper` 结尾 | `ArchiveVolumeMapper` |
| 变量/方法 | lowerCamelCase | `volumeTitle`，`generateArchiveNo()` |
| 常量 | 全大写下划线 | `MAX_BORROW_DAYS` |
| 数据库表名/字段 | snake_case | `archive_volume`，`fonds_no` |
| 系统表前缀 | `sys_` | `sys_user`，`sys_dept` |
| 业务表前缀 | `archive_` | `archive_volume`，`archive_borrow` |

## 统一响应格式

所有接口必须返回 `Result<T>`：

```json
{
  "code": 2000,
  "msg": "操作成功",
  "data": {},
  "traceId": "9f7b1d9c6e3b4a2e8c1a23456789abcd"
}
```

**错误码规范：**

| 区间 | 含义 |
|---|---|
| `2000` | 操作成功 |
| `4000–4019` | 参数校验异常 |
| `4020–4050` | 业务逻辑冲突（档号重复、借阅超限等） |
| `401 / 403` | 鉴权/越权拦截 |
| `5000` | 系统未知异常 |

## 异常体系

```
BaseException (RuntimeException)
├── BusinessException     — 业务逻辑异常（档号重复、档案已借出）
├── SystemException       — 系统级异常（文件丢失、DB 宕机）
└── UnauthorizedException — 越权 / 未登录
```

- 全局异常拦截器 (`GlobalExceptionHandler`) 统一捕获，**严禁**向前端暴露 Java 堆栈。
- 捕获后写 `ERROR` 日志（含堆栈 + traceId），返回标准化 `Result.fail(code, msg)`。

## 日志规范

**日志格式：**

```
[%d{yyyy-MM-dd HH:mm:ss.SSS}] [%X{traceId}] [%thread] [%-5level] %logger{50} - %msg%n
```

- `traceId`：入口拦截器通过 **MDC** 注入唯一 UUID，全链路（Controller→Service→DB）一致。
- `ERROR`：不可恢复异常，必须附完整堆栈。
- `WARN`：可容错的非预期逻辑（逾期提醒失败、用户被挤下线）。
- `INFO`：核心足迹（管理员确认归档、领导签署销毁）。
- `DEBUG`：**生产环境关闭**。

**高危操作必须记录审计日志示例：**

```java
log.info("[AUDIT-DESTROY] 操作用户ID: {}, 操作人: {}, 业务类型: 销毁审批, 状态: 批准通过, 目标档号: {}, 销毁原因: {}",
         currentUserId, nickname, archiveNo, destroyReason);
```

## 安全要求（强制执行）

### 认证与权限

- 权限注解：`@SaCheckPermission("archive:destroy")`
- **水平越权防范**：草稿修改、借阅操作在 DB 层必须校验 `compiler_id` 或 `borrower_id = currentUserId`。

### 密码存储

- **严禁**明文或 MD5 存储密码。
- 必须使用 **Argon2id**（推荐）或 **BCrypt** 加盐哈希。
- 密码规则正则（前后端均校验）：
  ```
  ^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$
  ```

### 数据脱敏

- 手机号：`138****5678`（日志输出 + 列表接口）
- 密码字段：序列化为 `******` 或不返回。

### SQL 安全

- **严禁** MyBatis 中使用 `${}` 拼接查询条件，必须使用 `#{}` 预编译。
- 必须拼接动态表字段时，必须在代码层做**白名单过滤**。

### 文件上传

- 只允许：`.pdf`、`.docx`、`.xlsx`、`.zip`
- 文件名存储规则：`UUID.randomUUID() + "_" + originalFilename`
- 上传文件**严禁**放置于 Web 运行根目录，必须存储于独立静态资源目录并通过 Nginx 只读代理。

## 档案状态机

| Status 值 | 状态 | 可见范围 | 可操作性 |
|---|---|---|---|
| `0` | 草稿 | 仅立卷人 | 可修改/删除 |
| `1` | 待审核 | 检查人/审核人 | 立卷人只读 |
| `2` | 待确认 | 档案管理员 | 可退回或确认 |
| `3` | 已正式归档 | 全员可查 | 不可修改 |

- `destroy_flag = 1`：已标记销毁，**所有检索、借阅界面均不展示**。
- **禁止**物理 DELETE，一律逻辑删除（`destroy_flag` 或状态回退）。

## 档号生成规则

格式：`全宗号.一级类目.二级类目.三级类目.设备代号.案卷号`

示例：`01.8.01.0101.01.003`

生成时机：用户填完前置下拉框后，前端发异步请求，后端查询当前组合下最大 `volume_no` +1 拼接返回预览。**确认归档时后端再次校验唯一性**（唯一索引 `uk_archive_no_year`）。

## 数据库关键设计

### 核心表

| 表名 | 说明 |
|---|---|
| `sys_dept` | 部门管理（树形结构，`parent_id=0` 为顶层） |
| `sys_user` | 用户（Argon2id 密码，关联部门） |
| `sys_dict` + `sys_dict_item` | 数据字典（保管期限、密级、全宗号等） |
| `archive_volume` | 案卷级主目录（**物理分区表**，复合主键 `(record_id, year)`） |
| `archive_file` | 文件级明细目录（**物理分区表**，复合主键 `(record_id, year)`） |
| `archive_borrow` | 借阅申请与状态流转 |
| `archive_approve_log` | 归档/销毁/借阅审批历史（审计日志） |

### 分区策略

`archive_volume` 和 `archive_file` 按 `year` 字段使用 `PARTITION BY RANGE COLUMNS(year)` 物理分区（`p_before_2020`、`p_2020`…`p_2027`、`p_future`）。

**年度扩容（每年新增分区）：**

```sql
ALTER TABLE `archive_volume` REORGANIZE PARTITION p_future INTO (
  PARTITION p_2028 VALUES LESS THAN ('2029'),
  PARTITION p_future VALUES LESS THAN (MAXVALUE)
);
```

### 关键索引

| 索引 | 表 | 字段 | 用途 |
|---|---|---|---|
| `uk_archive_no_year` | `archive_volume` | `(archive_no, year)` | 分区表全局档号唯一性保障 |
| `idx_composite_search` | `archive_volume` | `(year, category_l1, status)` | 高频多维筛选，走最左前缀 |
| `idx_volume_search` | `archive_file` | `(volume_no, seq_no)` | 卷内目录免排序展示 |
| `idx_status_remind` | `archive_borrow` | `(status, plan_return_date)` | 定时任务逾期扫描 |

### 时间与布尔字段约定

- 每张表必须包含 `created_at`、`updated_at`（`DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`）。
- 布尔/状态标识统一使用 `TINYINT(1)`（`in_stock`、`destroy_flag` 等）。

## 借阅状态机

| status | 含义 |
|---|---|
| `0` | 待审批 |
| `1` | 已借出/已批准 |
| `2` | 已驳回 |
| `3` | 已归还 |
| `4` | 逾期未归还 |

- 批准后：`archive_volume.in_stock = 0`，`borrowed_copies += 申请份数`。
- 归还后：`in_stock = 1`，`borrowed_copies` 回减，`actual_return_date` 记录。
- 当 `borrowed_copies == copies` 时，档案已被全部借空，禁止再发起新借阅。

## 定时任务

- 使用 Spring `@Scheduled`，每天凌晨执行。
- 扫描 `status = 1 AND plan_return_date < NOW()` 的借阅记录，更新状态为 `4`（逾期）。
- 生成系统内待办通知。

## 数据字典前端缓存约定

页面初始化时一次性请求所有字典数据，缓存于前端 Vuex / Pinia，录入时以 Element Plus `<el-select>` 展示，禁止每次输入触发字典请求。

## Excel 批量导入规范

- 使用 **EasyExcel** + 校验注解（非空、长度、字典值范围）。
- 任一行出错：**全单回滚**，明确报告"第 X 行第 Y 列格式错误"。
- 导入成功后状态初始化为**待审核（status=1）**。

## Word 打印规范

- 模板文件放置于后端资源目录，使用 `{{variable}}` 占位符（`poi-tl` 引擎）。
- 打印内容：档案盒封皮、侧脊、案卷目录、卷内文件目录。
- 后端渲染后以二进制文件流返回，前端直接下载 `.docx`。

## 代码评审门禁

- 合并至 `main` / `release` 前必须由 **BE-1 (Lead)** 完成 Code Review。
- **禁止**在 MyBatis XML 中使用 `${}`。
- **禁止**使用 `BeanUtils.copyProperties` 进行对象转换。

## 单元测试要求

- 核心 Service 层（`ArchiveVolumeServiceImpl`、`ArchiveBorrowServiceImpl` 等）方法覆盖率 **≥ 80%**。
- 每个 Sprint 结束前，Blocker/Critical 级别 Bug **100% 关闭**，一般/轻微遗留不超过 **3 个**。

## 部署架构

```
用户浏览器
    ↓ HTTP/HTTPS (80/443)
Nginx（静态资源直接返回，API 转发后端）
    ↓
Spring Boot Jar（内置 Tomcat）
    ↓
MySQL 8.0
```

- 前端：`npm run build` 后静态资源放入 Nginx。
- 后端：`nohup java -jar xxx.jar &`。
- 数据库备份：`mysqldump` Shell 脚本，每天凌晨执行，保留最近 30 天，存至独立磁盘或异地。

## 查询性能约定

- 检索响应时间 95 分位数 **< 300ms**，高频列表查询 **< 200ms**。
- 避免 `LIKE '%xxx%'` 全表扫描；全局模糊查询仅针对 `volume_title`、`file_title`、`keywords` 三个字段。
- 精确筛选字段（`year`、`category_l1`、`volume_no`、`archive_no`）必须走索引。
- 十万级以下数据量无需引入 Elasticsearch。

## Sprint 排期概览

| Sprint | 周期 | 核心目标 |
|---|---|---|
| Sprint 1 | 2026-06-01 ~ 06-12 | 基础设施、Sa-Token 鉴权、用户/部门/字典管理 |
| Sprint 2 | 2026-06-15 ~ 06-26 | 案卷/文件编目、检索、Excel 导入、Word 打印 |
| Sprint 3 | 2026-06-29 ~ 07-10 | 归档审批状态机、借阅流转、逾期预警 |
| Sprint 4 | 2026-07-13 ~ 07-24 | 高危销毁审批、安全审计脱敏、压测、UAT 上线 |
