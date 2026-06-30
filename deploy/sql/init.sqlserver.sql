/* ============================================================================
   莱矿-档案管理系统 · 数据库初始化脚本（SQL Server 版）
   目标: Microsoft SQL Server 2019/2022 (Linux 或 Windows)
   由 sql/init.sql (MySQL 8.0) 移植而来。

   移植要点（与 MySQL 版的差异）：
   - AUTO_INCREMENT            → IDENTITY(1,1)
   - VARCHAR / TEXT            → NVARCHAR / NVARCHAR(MAX)（中文用 Unicode，避免乱码）
   - DATETIME                  → DATETIME2，默认 SYSDATETIME()
   - ON UPDATE CURRENT_TIMESTAMP → SQL Server 无此语法，改用 AFTER UPDATE 触发器
   - PARTITION BY RANGE COLUMNS(year) → 分区函数(PARTITION FUNCTION) + 分区方案(PARTITION SCHEME)
   - 反引号 `col`              → 方括号 [col]

   执行方式：
     sqlcmd -S localhost -U sa -P '<密码>' -i deploy/sql/init.sqlserver.sql
   （首次执行会创建数据库、表、分区、触发器并写入基础字典数据）
   ============================================================================ */

/* ---- 1. 创建数据库（带中文排序规则，VARCHAR 类列也安全）---- */
IF DB_ID(N'laikuang_archive') IS NULL
BEGIN
    CREATE DATABASE [laikuang_archive] COLLATE Chinese_PRC_CI_AS;
END
GO

USE [laikuang_archive];
GO

/* ============================================================================
   2. 年度分区：分区函数 + 分区方案
   RANGE RIGHT 边界值 = MySQL 的 "VALUES LESS THAN"，语义一致：
     < '2020' | ['2020','2021') | ... | ['2027','2028') | >= '2028'(future)
   分区列 year 为 NVARCHAR(10)，函数类型必须完全匹配。
   单机部署统一落在 [PRIMARY] 文件组；如需冷热分盘可改造为多文件组。
   ============================================================================ */
IF EXISTS (SELECT 1 FROM sys.partition_functions WHERE name = N'pf_year')
    DROP PARTITION SCHEME ps_year;
GO
IF EXISTS (SELECT 1 FROM sys.partition_functions WHERE name = N'pf_year')
    DROP PARTITION FUNCTION pf_year;
GO
CREATE PARTITION FUNCTION pf_year (NVARCHAR(10))
AS RANGE RIGHT FOR VALUES
    (N'2020', N'2021', N'2022', N'2023', N'2024', N'2025', N'2026', N'2027', N'2028');
GO
CREATE PARTITION SCHEME ps_year
AS PARTITION pf_year ALL TO ([PRIMARY]);
GO

/* ============================================================================
   3. 表结构
   ============================================================================ */

/* ---- 3.1 部门管理表 sys_dept ---- */
IF OBJECT_ID(N'sys_dept', N'U') IS NOT NULL DROP TABLE [sys_dept];
GO
CREATE TABLE [sys_dept] (
    [dept_id]    BIGINT        NOT NULL IDENTITY(1,1),
    [dept_name]  NVARCHAR(100) NOT NULL,
    [parent_id]  BIGINT        NULL CONSTRAINT df_dept_parent DEFAULT (0),
    [sort_order] INT           NULL CONSTRAINT df_dept_sort   DEFAULT (0),
    [created_at] DATETIME2     NOT NULL CONSTRAINT df_dept_created DEFAULT (SYSDATETIME()),
    [updated_at] DATETIME2     NOT NULL CONSTRAINT df_dept_updated DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_sys_dept PRIMARY KEY CLUSTERED ([dept_id])
);
GO

/* ---- 3.2 用户中心表 sys_user ---- */
IF OBJECT_ID(N'sys_user', N'U') IS NOT NULL DROP TABLE [sys_user];
GO
CREATE TABLE [sys_user] (
    [user_id]    BIGINT        NOT NULL IDENTITY(1,1),
    [username]   NVARCHAR(50)  NOT NULL,
    [password]   NVARCHAR(200) NOT NULL,
    [nickname]   NVARCHAR(50)  NOT NULL,
    [phone]      NVARCHAR(20)  NULL,
    [dept_id]    BIGINT        NOT NULL,
    [role]       NVARCHAR(20)  NOT NULL CONSTRAINT df_user_role   DEFAULT (N'user'),
    [status]     TINYINT       NULL     CONSTRAINT df_user_status DEFAULT (1),
    [created_at] DATETIME2     NOT NULL CONSTRAINT df_user_created DEFAULT (SYSDATETIME()),
    [updated_at] DATETIME2     NOT NULL CONSTRAINT df_user_updated DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_sys_user PRIMARY KEY CLUSTERED ([user_id]),
    CONSTRAINT uk_username UNIQUE ([username])
);
GO
CREATE INDEX idx_dept_id ON [sys_user]([dept_id]);
GO

/* ---- 3.3 数据字典主表 sys_dict ---- */
IF OBJECT_ID(N'sys_dict', N'U') IS NOT NULL DROP TABLE [sys_dict];
GO
CREATE TABLE [sys_dict] (
    [dict_id]    BIGINT        NOT NULL IDENTITY(1,1),
    [dict_code]  NVARCHAR(50)  NOT NULL,
    [dict_name]  NVARCHAR(100) NOT NULL,
    [status]     TINYINT       NULL     CONSTRAINT df_dict_status DEFAULT (1),
    [created_at] DATETIME2     NOT NULL CONSTRAINT df_dict_created DEFAULT (SYSDATETIME()),
    [updated_at] DATETIME2     NOT NULL CONSTRAINT df_dict_updated DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_sys_dict PRIMARY KEY CLUSTERED ([dict_id]),
    CONSTRAINT uk_dict_code UNIQUE ([dict_code])
);
GO

/* ---- 3.4 数据字典项子表 sys_dict_item ---- */
IF OBJECT_ID(N'sys_dict_item', N'U') IS NOT NULL DROP TABLE [sys_dict_item];
GO
CREATE TABLE [sys_dict_item] (
    [item_id]    BIGINT        NOT NULL IDENTITY(1,1),
    [dict_code]  NVARCHAR(50)  NOT NULL,
    [item_value] NVARCHAR(50)  NOT NULL,
    [item_label] NVARCHAR(100) NOT NULL,
    [sort_order] INT           NULL     CONSTRAINT df_ditem_sort   DEFAULT (0),
    [status]     TINYINT       NULL     CONSTRAINT df_ditem_status DEFAULT (1),
    [created_at] DATETIME2     NOT NULL CONSTRAINT df_ditem_created DEFAULT (SYSDATETIME()),
    [updated_at] DATETIME2     NOT NULL CONSTRAINT df_ditem_updated DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_sys_dict_item PRIMARY KEY CLUSTERED ([item_id])
);
GO
CREATE INDEX idx_dict_code   ON [sys_dict_item]([dict_code]);
CREATE INDEX idx_dict_status ON [sys_dict_item]([dict_code], [status], [sort_order]);
GO

/* ---- 3.5 案卷级主目录表 archive_volume（按 year 分区）---- */
IF OBJECT_ID(N'archive_volume', N'U') IS NOT NULL DROP TABLE [archive_volume];
GO
CREATE TABLE [archive_volume] (
    [record_id]           BIGINT        NOT NULL IDENTITY(1,1),
    [fonds_no]            NVARCHAR(20)  NULL,
    [year]               NVARCHAR(10)  NOT NULL,
    [category_name]      NVARCHAR(50)  NULL,
    [category_l1]        NVARCHAR(20)  NULL,
    [category_l2]        NVARCHAR(20)  NULL,
    [category_l3]        NVARCHAR(20)  NULL,
    [device_code]        NVARCHAR(50)  NULL,
    [volume_no]          NVARCHAR(20)  NULL,
    [volume_title]       NVARCHAR(200) NOT NULL,
    [file_count]         INT           NULL CONSTRAINT df_vol_filecount DEFAULT (0),
    [total_pages]        INT           NULL CONSTRAINT df_vol_totalpages DEFAULT (0),
    [compile_unit]       NVARCHAR(100) NULL,
    [compile_date]       NVARCHAR(50)  NULL,
    [retention_period]   NVARCHAR(20)  NULL,
    [security_level]     NVARCHAR(20)  NULL,
    [compiler]           NVARCHAR(50)  NULL,
    [compiler_id]        BIGINT        NULL,
    [compile_date_actual] DATE         NULL,
    [reviewer]           NVARCHAR(50)  NULL,
    [inspect_date]       DATE          NULL,
    [archive_date]       DATE          NULL,
    [notes]              NVARCHAR(MAX) NULL,
    [remark]             NVARCHAR(MAX) NULL,
    [archive_no]         NVARCHAR(50)  NOT NULL,
    [category_code]      NVARCHAR(50)  NULL,
    [location_no]        NVARCHAR(50)  NULL,
    [in_stock]           TINYINT       NULL CONSTRAINT df_vol_instock DEFAULT (1),
    [register_date]      DATE          NULL,
    [organization]       NVARCHAR(100) NULL,
    [destroy_flag]       TINYINT       NULL CONSTRAINT df_vol_destroy DEFAULT (0),
    [pending_destroy]    TINYINT       NULL CONSTRAINT df_vol_pending DEFAULT (0),
    [copies]             INT           NULL CONSTRAINT df_vol_copies DEFAULT (1),
    [borrowed_copies]    INT           NULL CONSTRAINT df_vol_borrowed DEFAULT (0),
    [source_file]        NVARCHAR(200) NULL,
    [status]             TINYINT       NULL CONSTRAINT df_vol_status DEFAULT (0),
    [created_at]         DATETIME2     NOT NULL CONSTRAINT df_vol_created DEFAULT (SYSDATETIME()),
    [updated_at]         DATETIME2     NOT NULL CONSTRAINT df_vol_updated DEFAULT (SYSDATETIME()),
    /* 复合主键含分区列 year；聚集索引建在分区方案上以实现分区对齐 */
    CONSTRAINT pk_archive_volume PRIMARY KEY CLUSTERED ([record_id], [year]) ON ps_year([year])
) ON ps_year([year]);
GO
/* 全局档号唯一性：唯一索引必须包含分区列(year)，与分区对齐 */
CREATE UNIQUE INDEX uk_archive_no_year ON [archive_volume]([archive_no], [year]) ON ps_year([year]);
CREATE INDEX idx_vol_year             ON [archive_volume]([year])                 ON ps_year([year]);
CREATE INDEX idx_vol_fonds_no         ON [archive_volume]([fonds_no], [year])     ON ps_year([year]);
CREATE INDEX idx_vol_category_l1      ON [archive_volume]([category_l1], [year])  ON ps_year([year]);
CREATE INDEX idx_vol_volume_no        ON [archive_volume]([volume_no], [year])    ON ps_year([year]);
CREATE INDEX idx_composite_search     ON [archive_volume]([year], [category_l1], [status]) ON ps_year([year]);
GO

/* ---- 3.6 文件级明细目录表 archive_file（按 year 分区）---- */
IF OBJECT_ID(N'archive_file', N'U') IS NOT NULL DROP TABLE [archive_file];
GO
CREATE TABLE [archive_file] (
    [record_id]      BIGINT        NOT NULL IDENTITY(1,1),
    [fonds_no]       NVARCHAR(20)  NULL,
    [category_name]  NVARCHAR(50)  NULL,
    [year]           NVARCHAR(10)  NOT NULL,
    [category_l1]    NVARCHAR(20)  NULL,
    [category_l2]    NVARCHAR(20)  NULL,
    [category_l3]    NVARCHAR(20)  NULL,
    [device_code]    NVARCHAR(50)  NULL,
    [volume_no]      NVARCHAR(20)  NOT NULL,
    [seq_no]         INT           NULL,
    [file_no]        NVARCHAR(50)  NULL,
    [file_title]     NVARCHAR(200) NOT NULL,
    [responsible]    NVARCHAR(100) NULL,
    [pages]          INT           NULL CONSTRAINT df_file_pages DEFAULT (0),
    [compile_date]   NVARCHAR(50)  NULL,
    [keywords]       NVARCHAR(200) NULL,
    [archive_date]   DATE          NULL,
    [security_level] NVARCHAR(20)  NULL,
    [original_path]  NVARCHAR(500) NULL,
    [archive_no]     NVARCHAR(50)  NOT NULL,
    [remark]         NVARCHAR(MAX) NULL,
    [retention_period] NVARCHAR(20) NULL,
    [category_code]  NVARCHAR(50)  NULL,
    [drawing_size]   NVARCHAR(20)  NULL,
    [a4_equivalent]  NVARCHAR(20)  NULL,
    [cabinet_no]     NVARCHAR(20)  NULL,
    [change_record]  NVARCHAR(MAX) NULL,
    [project_name]   NVARCHAR(200) NULL,
    [drawer_no]      NVARCHAR(20)  NULL,
    [page_start]     NVARCHAR(20)  NULL,
    [archive_status] NVARCHAR(20)  NULL,
    [location_no]    NVARCHAR(50)  NULL,
    [in_stock]       TINYINT       NULL CONSTRAINT df_file_instock DEFAULT (1),
    [organization]   NVARCHAR(100) NULL,
    [related_flag]   NVARCHAR(50)  NULL,
    [destroy_flag]   TINYINT       NULL CONSTRAINT df_file_destroy DEFAULT (0),
    [copies]         INT           NULL CONSTRAINT df_file_copies DEFAULT (1),
    [borrowed_copies] INT          NULL CONSTRAINT df_file_borrowed DEFAULT (0),
    [source_file]    NVARCHAR(200) NULL,
    [compiler_id]    BIGINT        NULL,
    [status]         TINYINT       NULL CONSTRAINT df_file_status DEFAULT (0),
    [created_at]     DATETIME2     NOT NULL CONSTRAINT df_file_created DEFAULT (SYSDATETIME()),
    [updated_at]     DATETIME2     NOT NULL CONSTRAINT df_file_updated DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_archive_file PRIMARY KEY CLUSTERED ([record_id], [year]) ON ps_year([year])
) ON ps_year([year]);
GO
CREATE INDEX idx_file_year         ON [archive_file]([year])                  ON ps_year([year]);
CREATE INDEX idx_file_volume_no    ON [archive_file]([volume_no], [year])     ON ps_year([year]);
CREATE INDEX idx_file_archive_no   ON [archive_file]([archive_no], [year])    ON ps_year([year]);
CREATE INDEX idx_file_title        ON [archive_file]([file_title], [year])    ON ps_year([year]);
CREATE INDEX idx_volume_search     ON [archive_file]([volume_no], [seq_no], [year]) ON ps_year([year]);
GO

/* ---- 3.7 借阅申请及状态流转表 archive_borrow ---- */
IF OBJECT_ID(N'archive_borrow', N'U') IS NOT NULL DROP TABLE [archive_borrow];
GO
CREATE TABLE [archive_borrow] (
    [borrow_id]          BIGINT        NOT NULL IDENTITY(1,1),
    [borrower_id]        BIGINT        NOT NULL,
    [borrower_dept]      NVARCHAR(100) NOT NULL,
    [archive_no]         NVARCHAR(50)  NOT NULL,
    [borrow_date]        DATETIME2     NULL,
    [plan_return_date]   DATETIME2     NULL,
    [actual_return_date] DATETIME2     NULL,
    [apply_count]        INT           NULL CONSTRAINT df_borrow_count DEFAULT (1),
    [reason]             NVARCHAR(500) NULL,
    [status]             TINYINT       NOT NULL CONSTRAINT df_borrow_status DEFAULT (0),
    [created_at]         DATETIME2     NOT NULL CONSTRAINT df_borrow_created DEFAULT (SYSDATETIME()),
    [updated_at]         DATETIME2     NOT NULL CONSTRAINT df_borrow_updated DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_archive_borrow PRIMARY KEY CLUSTERED ([borrow_id])
);
GO
CREATE INDEX idx_borrower      ON [archive_borrow]([borrower_id]);
CREATE INDEX idx_borrow_arcno  ON [archive_borrow]([archive_no]);
CREATE INDEX idx_status_remind ON [archive_borrow]([status], [plan_return_date]);
GO

/* ---- 3.8 审批历史及审计日志表 archive_approve_log（仅 created_at，无更新触发器）---- */
IF OBJECT_ID(N'archive_approve_log', N'U') IS NOT NULL DROP TABLE [archive_approve_log];
GO
CREATE TABLE [archive_approve_log] (
    [log_id]        BIGINT        NOT NULL IDENTITY(1,1),
    [business_type] TINYINT       NOT NULL,
    [target_id]     BIGINT        NOT NULL,
    [approver_id]   BIGINT        NOT NULL,
    [action]        NVARCHAR(20)  NOT NULL,
    [opinion]       NVARCHAR(MAX) NULL,
    [created_at]    DATETIME2     NOT NULL CONSTRAINT df_log_created DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_archive_approve_log PRIMARY KEY CLUSTERED ([log_id])
);
GO
CREATE INDEX idx_target_business ON [archive_approve_log]([business_type], [target_id]);
CREATE INDEX idx_approver        ON [archive_approve_log]([approver_id]);
GO

/* ---- 3.9 系统通知/待办消息表 sys_notification ---- */
IF OBJECT_ID(N'sys_notification', N'U') IS NOT NULL DROP TABLE [sys_notification];
GO
CREATE TABLE [sys_notification] (
    [notice_id]  BIGINT        NOT NULL IDENTITY(1,1),
    [user_id]    BIGINT        NOT NULL,
    [title]      NVARCHAR(100) NOT NULL,
    [content]    NVARCHAR(500) NULL,
    [type]       TINYINT       NOT NULL CONSTRAINT df_notice_type DEFAULT (1),
    [ref_id]     BIGINT        NULL,
    [is_read]    TINYINT       NULL CONSTRAINT df_notice_read DEFAULT (0),
    [created_at] DATETIME2     NOT NULL CONSTRAINT df_notice_created DEFAULT (SYSDATETIME()),
    [updated_at] DATETIME2     NOT NULL CONSTRAINT df_notice_updated DEFAULT (SYSDATETIME()),
    CONSTRAINT pk_sys_notification PRIMARY KEY CLUSTERED ([notice_id])
);
GO
CREATE INDEX idx_user_unread ON [sys_notification]([user_id], [is_read], [created_at]);
GO

/* ============================================================================
   4. updated_at 自动更新触发器（替代 MySQL 的 ON UPDATE CURRENT_TIMESTAMP）
   说明：SQL Server 默认关闭递归触发器(RECURSIVE_TRIGGERS=OFF)，
        触发器内对本表的 UPDATE 不会再次触发自身，安全无死循环。
   ============================================================================ */
GO
CREATE OR ALTER TRIGGER trg_sys_dept_upd ON [sys_dept] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [sys_dept] t JOIN inserted i ON t.[dept_id] = i.[dept_id];
END;
GO
CREATE OR ALTER TRIGGER trg_sys_user_upd ON [sys_user] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [sys_user] t JOIN inserted i ON t.[user_id] = i.[user_id];
END;
GO
CREATE OR ALTER TRIGGER trg_sys_dict_upd ON [sys_dict] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [sys_dict] t JOIN inserted i ON t.[dict_id] = i.[dict_id];
END;
GO
CREATE OR ALTER TRIGGER trg_sys_dict_item_upd ON [sys_dict_item] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [sys_dict_item] t JOIN inserted i ON t.[item_id] = i.[item_id];
END;
GO
CREATE OR ALTER TRIGGER trg_archive_volume_upd ON [archive_volume] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [archive_volume] t
        JOIN inserted i ON t.[record_id] = i.[record_id] AND t.[year] = i.[year];
END;
GO
CREATE OR ALTER TRIGGER trg_archive_file_upd ON [archive_file] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [archive_file] t
        JOIN inserted i ON t.[record_id] = i.[record_id] AND t.[year] = i.[year];
END;
GO
CREATE OR ALTER TRIGGER trg_archive_borrow_upd ON [archive_borrow] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [archive_borrow] t JOIN inserted i ON t.[borrow_id] = i.[borrow_id];
END;
GO
CREATE OR ALTER TRIGGER trg_sys_notification_upd ON [sys_notification] AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE t SET [updated_at] = SYSDATETIME() FROM [sys_notification] t JOIN inserted i ON t.[notice_id] = i.[notice_id];
END;
GO

/* ============================================================================
   5. 基础数据（中文字面量统一加 N 前缀 → NVARCHAR）
   ============================================================================ */

/* 部门：显式主键需开启 IDENTITY_INSERT */
SET IDENTITY_INSERT [sys_dept] ON;
INSERT INTO [sys_dept] ([dept_id], [dept_name], [parent_id], [sort_order]) VALUES (1, N'莱矿集团', 0, 0);
INSERT INTO [sys_dept] ([dept_id], [dept_name], [parent_id], [sort_order]) VALUES (2, N'档案管理部', 1, 1);
SET IDENTITY_INSERT [sys_dept] OFF;
GO

/* 默认管理员（密码占位符，应用 DataInitializer 启动时写入 Argon2id 哈希，默认 Admin@123）*/
INSERT INTO [sys_user] ([username], [password], [nickname], [phone], [dept_id], [role], [status])
VALUES (N'admin', N'INIT_CHANGE_ON_FIRST_DEPLOY', N'系统管理员', NULL, 2, N'company_leader', 1);
GO

/* 数据字典 */
INSERT INTO [sys_dict] ([dict_code], [dict_name]) VALUES (N'retention_period', N'保管期限');
INSERT INTO [sys_dict_item] ([dict_code], [item_value], [item_label], [sort_order]) VALUES
    (N'retention_period', N'permanent', N'永久', 1),
    (N'retention_period', N'30_years',  N'30年', 2),
    (N'retention_period', N'10_years',  N'10年', 3);

INSERT INTO [sys_dict] ([dict_code], [dict_name]) VALUES (N'security_level', N'密级');
INSERT INTO [sys_dict_item] ([dict_code], [item_value], [item_label], [sort_order]) VALUES
    (N'security_level', N'public',       N'公开', 1),
    (N'security_level', N'internal',     N'内部', 2),
    (N'security_level', N'confidential', N'秘密', 3),
    (N'security_level', N'secret',       N'机密', 4);

INSERT INTO [sys_dict] ([dict_code], [dict_name]) VALUES (N'archive_status', N'档案状态');
INSERT INTO [sys_dict_item] ([dict_code], [item_value], [item_label], [sort_order]) VALUES
    (N'archive_status', N'0', N'草稿', 1),
    (N'archive_status', N'1', N'待审核', 2),
    (N'archive_status', N'2', N'待确认', 3),
    (N'archive_status', N'3', N'已正式归档', 4);

INSERT INTO [sys_dict] ([dict_code], [dict_name]) VALUES (N'category_l1', N'一级类目');
INSERT INTO [sys_dict_item] ([dict_code], [item_value], [item_label], [sort_order]) VALUES
    (N'category_l1', N'01', N'01', 1),
    (N'category_l1', N'02', N'02', 2),
    (N'category_l1', N'03', N'03', 3),
    (N'category_l1', N'04', N'04', 4),
    (N'category_l1', N'05', N'05', 5),
    (N'category_l1', N'8',  N'8',  6);

INSERT INTO [sys_dict] ([dict_code], [dict_name]) VALUES (N'category_l2', N'二级类目');
INSERT INTO [sys_dict_item] ([dict_code], [item_value], [item_label], [sort_order]) VALUES
    (N'category_l2', N'A',  N'A',  1),
    (N'category_l2', N'B',  N'B',  2),
    (N'category_l2', N'C',  N'C',  3),
    (N'category_l2', N'D',  N'D',  4),
    (N'category_l2', N'01', N'01', 5);

INSERT INTO [sys_dict] ([dict_code], [dict_name]) VALUES (N'fonds_no', N'全宗号');
INSERT INTO [sys_dict_item] ([dict_code], [item_value], [item_label], [sort_order]) VALUES
    (N'fonds_no', N'01',     N'01',     1),
    (N'fonds_no', N'LK-001', N'LK-001', 2),
    (N'fonds_no', N'LK-002', N'LK-002', 3),
    (N'fonds_no', N'LK-003', N'LK-003', 4),
    (N'fonds_no', N'LK-004', N'LK-004', 5),
    (N'fonds_no', N'LK-005', N'LK-005', 6);

INSERT INTO [sys_dict] ([dict_code], [dict_name]) VALUES (N'equipment_code', N'设备代号');
INSERT INTO [sys_dict_item] ([dict_code], [item_value], [item_label], [sort_order]) VALUES
    (N'equipment_code', N'DJ-01', N'DJ-01', 1),
    (N'equipment_code', N'DJ-02', N'DJ-02', 2),
    (N'equipment_code', N'DQ-01', N'DQ-01', 3),
    (N'equipment_code', N'DQ-02', N'DQ-02', 4),
    (N'equipment_code', N'KT-01', N'KT-01', 5),
    (N'equipment_code', N'KT-02', N'KT-02', 6),
    (N'equipment_code', N'TJ-01', N'TJ-01', 7),
    (N'equipment_code', N'TJ-02', N'TJ-02', 8);
GO

/* ============================================================================
   6. 年度分区扩容示例（每年新增一个分区，将最右的 future 分区切分）
   SQL Server 用 SPLIT RANGE，对应 MySQL 的 REORGANIZE PARTITION p_future。
   例：扩容到 2029 年（两张分区表都要执行）
   --------------------------------------------------------------------------
   ALTER PARTITION SCHEME ps_year NEXT USED [PRIMARY];
   ALTER PARTITION FUNCTION pf_year() SPLIT RANGE (N'2029');
   ============================================================================ */
PRINT N'✓ laikuang_archive (SQL Server) 初始化完成';
GO
