-- ===========================================================
-- 莱矿-档案管理系统 数据库初始化脚本
-- 数据库版本: MySQL 8.0
-- 字符集: utf8mb4 / utf8mb4_0900_ai_ci
-- ===========================================================

CREATE DATABASE IF NOT EXISTS `laikuang_archive`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `laikuang_archive`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- 1. 部门管理表 sys_dept
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `sys_dept`;
CREATE TABLE `sys_dept` (
  `dept_id`    BIGINT       NOT NULL AUTO_INCREMENT COMMENT '部门ID，自增主键',
  `dept_name`  VARCHAR(100) NOT NULL                COMMENT '部门名称',
  `parent_id`  BIGINT       DEFAULT 0               COMMENT '父级部门ID，顶层为0',
  `sort_order` INT          DEFAULT 0               COMMENT '显示排序值',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '创建时间',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='部门管理表';

-- -----------------------------------------------------------
-- 2. 用户中心表 sys_user
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `user_id`    BIGINT      NOT NULL AUTO_INCREMENT COMMENT '用户ID，自增主键',
  `username`   VARCHAR(50) NOT NULL                COMMENT '登录用户名',
  `password`   VARCHAR(200) NOT NULL               COMMENT '加密后的登录密码（Argon2id）',
  `nickname`   VARCHAR(50) NOT NULL                COMMENT '用户真实姓名或昵称',
  `phone`      VARCHAR(20) DEFAULT NULL            COMMENT '联系手机号',
  `dept_id`    BIGINT      NOT NULL                COMMENT '所属部门ID，关联sys_dept.dept_id',
  `role`       VARCHAR(20) NOT NULL DEFAULT 'user'  COMMENT '角色：user-普通员工，archive_admin-档案管理员，company_leader-公司领导',
  `status`     TINYINT(1)  DEFAULT 1               COMMENT '帐号状态：1-正常，0-禁用',
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '创建时间',
  `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_dept_id` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户中心及基础信息表';

-- -----------------------------------------------------------
-- 3. 数据字典主表 sys_dict
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `sys_dict`;
CREATE TABLE `sys_dict` (
  `dict_id`    BIGINT       NOT NULL AUTO_INCREMENT COMMENT '字典ID，主键',
  `dict_code`  VARCHAR(50)  NOT NULL                COMMENT '数据字典编码（如 retention_period, security_level）',
  `dict_name`  VARCHAR(100) NOT NULL                COMMENT '字典中文名称（如 保管期限, 密级）',
  `status`     TINYINT(1)   DEFAULT 1               COMMENT '状态：1-启用，0-停用',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '创建时间',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='数据字典主表';

-- -----------------------------------------------------------
-- 4. 数据字典项子表 sys_dict_item
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `sys_dict_item`;
CREATE TABLE `sys_dict_item` (
  `item_id`    BIGINT       NOT NULL AUTO_INCREMENT COMMENT '字典明细项ID，主键',
  `dict_code`  VARCHAR(50)  NOT NULL                COMMENT '数据字典主表编码，关联sys_dict.dict_code',
  `item_value` VARCHAR(50)  NOT NULL                COMMENT '数据字典实际值（存储于业务表中，如 30_years）',
  `item_label` VARCHAR(100) NOT NULL                COMMENT '数据字典显示名称（前端展示用，如 30年）',
  `sort_order` INT          DEFAULT 0               COMMENT '排序顺序',
  `status`     TINYINT(1)   DEFAULT 1               COMMENT '状态：1-启用，0-停用',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '创建时间',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`item_id`),
  KEY `idx_dict_code` (`dict_code`),
  KEY `idx_dict_status` (`dict_code`, `status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='数据字典项子表';

-- -----------------------------------------------------------
-- 5. 案卷级主目录表 archive_volume（按年度 RANGE COLUMNS 物理分区）
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `archive_volume`;
CREATE TABLE `archive_volume` (
  `record_id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '记录ID（与年度共同构成复合主键）',
  `fonds_no`            VARCHAR(20)  DEFAULT NULL  COMMENT '全宗号',
  `year`                VARCHAR(10)  NOT NULL       COMMENT '年度（分区键）',
  `category_name`       VARCHAR(50)  DEFAULT NULL  COMMENT '分类名称',
  `category_l1`         VARCHAR(20)  DEFAULT NULL  COMMENT '一级类目',
  `category_l2`         VARCHAR(20)  DEFAULT NULL  COMMENT '二级类目',
  `category_l3`         VARCHAR(20)  DEFAULT NULL  COMMENT '三级类目',
  `device_code`         VARCHAR(50)  DEFAULT NULL  COMMENT '设备代号',
  `volume_no`           VARCHAR(20)  DEFAULT NULL  COMMENT '案卷号',
  `volume_title`        VARCHAR(200) NOT NULL       COMMENT '案卷题名',
  `file_count`          INT          DEFAULT 0     COMMENT '卷内文件件数',
  `total_pages`         INT          DEFAULT 0     COMMENT '案卷总页数',
  `compile_unit`        VARCHAR(100) DEFAULT NULL  COMMENT '编制单位',
  `compile_date`        VARCHAR(50)  DEFAULT NULL  COMMENT '编制日期',
  `retention_period`    VARCHAR(20)  DEFAULT NULL  COMMENT '保管期限',
  `security_level`      VARCHAR(20)  DEFAULT NULL  COMMENT '密级',
  `compiler`            VARCHAR(50)  DEFAULT NULL  COMMENT '立卷人',
  `compiler_id`         BIGINT       DEFAULT NULL  COMMENT '立卷人用户ID',
  `compile_date_actual` DATE         DEFAULT NULL  COMMENT '立卷日期',
  `reviewer`            VARCHAR(50)  DEFAULT NULL  COMMENT '审核人',
  `inspect_date`        DATE         DEFAULT NULL  COMMENT '检查日期',
  `archive_date`        DATE         DEFAULT NULL  COMMENT '归档日期',
  `notes`               TEXT                       COMMENT '备考说明',
  `remark`              TEXT                       COMMENT '备注',
  `archive_no`          VARCHAR(50)  NOT NULL       COMMENT '档号（唯一性标识）',
  `category_code`       VARCHAR(50)  DEFAULT NULL  COMMENT '分类号',
  `location_no`         VARCHAR(50)  DEFAULT NULL  COMMENT '库位号',
  `in_stock`            TINYINT(1)   DEFAULT 1     COMMENT '是否在库：1-在库，0-借出',
  `register_date`       DATE         DEFAULT NULL  COMMENT '登记日期',
  `organization`        VARCHAR(100) DEFAULT NULL  COMMENT '编制机构',
  `destroy_flag`        TINYINT(1)   DEFAULT 0     COMMENT '销毁标识：0-未销毁，1-已标记销毁',
  `pending_destroy`     TINYINT(1)   DEFAULT 0     COMMENT '销毁待审批：0-否，1-是',
  `copies`              INT          DEFAULT 1     COMMENT '总份数',
  `borrowed_copies`     INT          DEFAULT 0     COMMENT '已借出份数',
  `source_file`         VARCHAR(200) DEFAULT NULL  COMMENT '导入来源文件路径或名称',
  `status`              TINYINT      DEFAULT 0     COMMENT '档案状态：0-草稿，1-待审核，2-待确认，3-已正式归档',
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '创建时间',
  `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`record_id`, `year`),
  UNIQUE KEY `uk_archive_no_year`    (`archive_no`, `year`),
  KEY `idx_year`                     (`year`),
  KEY `idx_fonds_no`                 (`fonds_no`),
  KEY `idx_category_l1`              (`category_l1`),
  KEY `idx_volume_no`                (`volume_no`),
  KEY `idx_composite_search`         (`year`, `category_l1`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='案卷级主目录表'
PARTITION BY RANGE COLUMNS(`year`) (
  PARTITION p_before_2020 VALUES LESS THAN ('2020'),
  PARTITION p_2020        VALUES LESS THAN ('2021'),
  PARTITION p_2021        VALUES LESS THAN ('2022'),
  PARTITION p_2022        VALUES LESS THAN ('2023'),
  PARTITION p_2023        VALUES LESS THAN ('2024'),
  PARTITION p_2024        VALUES LESS THAN ('2025'),
  PARTITION p_2025        VALUES LESS THAN ('2026'),
  PARTITION p_2026        VALUES LESS THAN ('2027'),
  PARTITION p_2027        VALUES LESS THAN ('2028'),
  PARTITION p_future      VALUES LESS THAN (MAXVALUE)
);

-- -----------------------------------------------------------
-- 6. 文件级明细目录表 archive_file（按年度 RANGE COLUMNS 物理分区）
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `archive_file`;
CREATE TABLE `archive_file` (
  `record_id`      BIGINT       NOT NULL AUTO_INCREMENT COMMENT '记录ID（与年度共同构成复合主键）',
  `fonds_no`       VARCHAR(20)  DEFAULT NULL  COMMENT '全宗号',
  `category_name`  VARCHAR(50)  DEFAULT NULL  COMMENT '分类名称',
  `year`           VARCHAR(10)  NOT NULL       COMMENT '年度（分区键）',
  `category_l1`    VARCHAR(20)  DEFAULT NULL  COMMENT '一级类目',
  `category_l2`    VARCHAR(20)  DEFAULT NULL  COMMENT '二级类目',
  `category_l3`    VARCHAR(20)  DEFAULT NULL  COMMENT '三级类目',
  `device_code`    VARCHAR(50)  DEFAULT NULL  COMMENT '设备代号',
  `volume_no`      VARCHAR(20)  NOT NULL       COMMENT '关联案卷号，关联archive_volume.volume_no',
  `seq_no`         INT          DEFAULT NULL  COMMENT '卷内顺序号',
  `file_no`        VARCHAR(50)  DEFAULT NULL  COMMENT '文件编号',
  `file_title`     VARCHAR(200) NOT NULL       COMMENT '文件标题',
  `responsible`    VARCHAR(100) DEFAULT NULL  COMMENT '责任者',
  `pages`          INT          DEFAULT 0     COMMENT '单份文件页数',
  `compile_date`   VARCHAR(50)  DEFAULT NULL  COMMENT '编制日期',
  `keywords`       VARCHAR(200) DEFAULT NULL  COMMENT '主题词，多个用逗号隔开',
  `archive_date`   DATE         DEFAULT NULL  COMMENT '归档日期',
  `security_level` VARCHAR(20)  DEFAULT NULL  COMMENT '密级',
  `original_path`  VARCHAR(500) DEFAULT NULL  COMMENT '原文电子文件存储路径',
  `archive_no`     VARCHAR(50)  NOT NULL       COMMENT '档号',
  `remark`         TEXT                       COMMENT '备注',
  `retention_period` VARCHAR(20) DEFAULT NULL COMMENT '保管期限',
  `category_code`  VARCHAR(50)  DEFAULT NULL  COMMENT '分类号',
  `drawing_size`   VARCHAR(20)  DEFAULT NULL  COMMENT '图幅',
  `a4_equivalent`  VARCHAR(20)  DEFAULT NULL  COMMENT '折合A4页数',
  `cabinet_no`     VARCHAR(20)  DEFAULT NULL  COMMENT '保管橱号',
  `change_record`  TEXT                       COMMENT '变更记载',
  `project_name`   VARCHAR(200) DEFAULT NULL  COMMENT '所属项目名称',
  `drawer_no`      VARCHAR(20)  DEFAULT NULL  COMMENT '抽屉号',
  `page_start`     VARCHAR(20)  DEFAULT NULL  COMMENT '卷内页次区间（如 1-15）',
  `archive_status` VARCHAR(20)  DEFAULT NULL  COMMENT '归档状态标记',
  `location_no`    VARCHAR(50)  DEFAULT NULL  COMMENT '物理存放库位号',
  `in_stock`       TINYINT(1)   DEFAULT 1     COMMENT '是否在库：1-在库，0-借出',
  `organization`   VARCHAR(100) DEFAULT NULL  COMMENT '归档机构',
  `related_flag`   VARCHAR(50)  DEFAULT NULL  COMMENT '关联标记',
  `destroy_flag`   TINYINT(1)   DEFAULT 0     COMMENT '销毁标识：0-正常，1-已标记销毁',
  `copies`         INT          DEFAULT 1     COMMENT '件数份数',
  `borrowed_copies` INT         DEFAULT 0     COMMENT '已借出份数',
  `source_file`    VARCHAR(200) DEFAULT NULL  COMMENT '导入数据源文件',
  `compiler_id`    BIGINT       DEFAULT NULL  COMMENT '立卷人用户ID',
  `status`         TINYINT      DEFAULT 0     COMMENT '文件状态：0-草稿，1-待审核，2-待确认，3-已正式归档',
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '创建时间',
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`record_id`, `year`),
  KEY `idx_year`          (`year`),
  KEY `idx_volume_no`     (`volume_no`),
  KEY `idx_archive_no`    (`archive_no`),
  KEY `idx_file_title`    (`file_title`),
  KEY `idx_volume_search` (`volume_no`, `seq_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文件级明细目录表'
PARTITION BY RANGE COLUMNS(`year`) (
  PARTITION p_before_2020 VALUES LESS THAN ('2020'),
  PARTITION p_2020        VALUES LESS THAN ('2021'),
  PARTITION p_2021        VALUES LESS THAN ('2022'),
  PARTITION p_2022        VALUES LESS THAN ('2023'),
  PARTITION p_2023        VALUES LESS THAN ('2024'),
  PARTITION p_2024        VALUES LESS THAN ('2025'),
  PARTITION p_2025        VALUES LESS THAN ('2026'),
  PARTITION p_2026        VALUES LESS THAN ('2027'),
  PARTITION p_2027        VALUES LESS THAN ('2028'),
  PARTITION p_future      VALUES LESS THAN (MAXVALUE)
);

-- -----------------------------------------------------------
-- 7. 档案借阅申请及状态流转表 archive_borrow
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `archive_borrow`;
CREATE TABLE `archive_borrow` (
  `borrow_id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '借阅记录ID，自增主键',
  `borrower_id`        BIGINT       NOT NULL                COMMENT '借阅申请人ID，关联sys_user.user_id',
  `borrower_dept`      VARCHAR(100) NOT NULL                COMMENT '借阅人所在部门（快照，防止部门变更导致历史数据偏差）',
  `archive_no`         VARCHAR(50)  NOT NULL                COMMENT '申请借阅的案卷/文件档号',
  `borrow_date`        DATETIME     DEFAULT NULL            COMMENT '实际借出日期',
  `plan_return_date`   DATETIME     DEFAULT NULL            COMMENT '预计归还日期',
  `actual_return_date` DATETIME     DEFAULT NULL            COMMENT '实际归还日期',
  `apply_count`        INT          DEFAULT 1             COMMENT '申请份数',
  `reason`             VARCHAR(500) DEFAULT NULL            COMMENT '借阅原因',
  `status`             TINYINT      NOT NULL DEFAULT 0      COMMENT '借阅申请状态：0-待审批，1-已借出，2-已驳回，3-已归还，4-逾期未归还',
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '申请发起时间',
  `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`borrow_id`),
  KEY `idx_borrower`      (`borrower_id`),
  KEY `idx_archive_no`    (`archive_no`),
  KEY `idx_status_remind` (`status`, `plan_return_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='档案借阅申请及状态流转表';

-- -----------------------------------------------------------
-- 8. 档案流程审批历史及审计日志表 archive_approve_log
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `archive_approve_log`;
CREATE TABLE `archive_approve_log` (
  `log_id`        BIGINT      NOT NULL AUTO_INCREMENT COMMENT '审批日志ID，自增主键',
  `business_type` TINYINT     NOT NULL                COMMENT '业务类型：1-新建案卷归档审核，2-案卷正式归档确认，3-公司领导销毁/删除审批，4-借阅申请审批',
  `target_id`     BIGINT      NOT NULL                COMMENT '审批对应目标业务ID（volume.record_id 或 borrow.borrow_id）',
  `approver_id`   BIGINT      NOT NULL                COMMENT '当前节点审批人ID，关联sys_user.user_id',
  `action`        VARCHAR(20) NOT NULL                COMMENT '审批操作：PASS-通过，REJECT-驳回，BACK-退回',
  `opinion`       TEXT                                COMMENT '审批人签署意见',
  `created_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '审批时间',
  PRIMARY KEY (`log_id`),
  KEY `idx_target_business` (`business_type`, `target_id`),
  KEY `idx_approver`        (`approver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='档案流程审批历史及审计日志表';

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------
-- 9. 系统通知/待办消息表 sys_notification
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `sys_notification`;
CREATE TABLE `sys_notification` (
  `notice_id`   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '通知ID，自增主键',
  `user_id`     BIGINT       NOT NULL                COMMENT '接收用户ID，关联sys_user.user_id',
  `title`       VARCHAR(100) NOT NULL                COMMENT '通知标题',
  `content`     VARCHAR(500) DEFAULT NULL            COMMENT '通知内容',
  `type`        TINYINT      NOT NULL DEFAULT 1      COMMENT '通知类型：1-借阅到期提醒，2-借阅逾期提醒',
  `ref_id`      BIGINT       DEFAULT NULL            COMMENT '关联业务ID（如borrow_id）',
  `is_read`     TINYINT(1)   DEFAULT 0               COMMENT '是否已读：0-未读，1-已读',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                    COMMENT '创建时间',
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`notice_id`),
  KEY `idx_user_unread` (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统通知及待办消息表';

-- ===========================================================
-- 初始化基础数据
-- ===========================================================

-- 根部门
INSERT INTO `sys_dept` (`dept_id`, `dept_name`, `parent_id`, `sort_order`)
VALUES (1, '莱矿集团', 0, 0);

-- 档案管理部门
INSERT INTO `sys_dept` (`dept_id`, `dept_name`, `parent_id`, `sort_order`)
VALUES (2, '档案管理部', 1, 1);

-- 默认管理员账号
-- 密码为 Admin@123（Argon2id 哈希），首次部署后请立即通过系统修改密码
-- 此处密码字段为占位符，正式运行前需通过应用层生成真实 Argon2id 哈希后手动更新
-- 密码占位符，应用启动时 DataInitializer 将自动替换为 Argon2id 哈希（默认密码 Admin@123）
INSERT INTO `sys_user` (`username`, `password`, `nickname`, `phone`, `dept_id`, `role`, `status`)
VALUES ('admin', 'INIT_CHANGE_ON_FIRST_DEPLOY', '系统管理员', NULL, 2, 'company_leader', 1);

-- 数据字典：保管期限 (retention_period)
INSERT INTO `sys_dict` (`dict_code`, `dict_name`) VALUES ('retention_period', '保管期限');
INSERT INTO `sys_dict_item` (`dict_code`, `item_value`, `item_label`, `sort_order`) VALUES
  ('retention_period', 'permanent', '永久',  1),
  ('retention_period', '30_years',  '30年',  2),
  ('retention_period', '10_years',  '10年',  3);

-- 数据字典：密级 (security_level)
INSERT INTO `sys_dict` (`dict_code`, `dict_name`) VALUES ('security_level', '密级');
INSERT INTO `sys_dict_item` (`dict_code`, `item_value`, `item_label`, `sort_order`) VALUES
  ('security_level', 'public',       '公开',  1),
  ('security_level', 'internal',     '内部',  2),
  ('security_level', 'confidential', '秘密',  3),
  ('security_level', 'secret',       '机密',  4);

-- 数据字典：档案状态 (archive_status)
INSERT INTO `sys_dict` (`dict_code`, `dict_name`) VALUES ('archive_status', '档案状态');
INSERT INTO `sys_dict_item` (`dict_code`, `item_value`, `item_label`, `sort_order`) VALUES
  ('archive_status', '0', '草稿',     1),
  ('archive_status', '1', '待审核',   2),
  ('archive_status', '2', '待确认',   3),
  ('archive_status', '3', '已正式归档', 4);

-- 数据字典：一级类目 (category_l1)
INSERT INTO `sys_dict` (`dict_code`, `dict_name`) VALUES ('category_l1', '一级类目');
INSERT INTO `sys_dict_item` (`dict_code`, `item_value`, `item_label`, `sort_order`) VALUES
  ('category_l1', '01', '01', 1),
  ('category_l1', '02', '02', 2),
  ('category_l1', '03', '03', 3),
  ('category_l1', '04', '04', 4),
  ('category_l1', '05', '05', 5),
  ('category_l1', '8',  '8',  6);

-- 数据字典：二级类目 (category_l2)
INSERT INTO `sys_dict` (`dict_code`, `dict_name`) VALUES ('category_l2', '二级类目');
INSERT INTO `sys_dict_item` (`dict_code`, `item_value`, `item_label`, `sort_order`) VALUES
  ('category_l2', 'A',  'A',  1),
  ('category_l2', 'B',  'B',  2),
  ('category_l2', 'C',  'C',  3),
  ('category_l2', 'D',  'D',  4),
  ('category_l2', '01', '01', 5);

-- 数据字典：全宗号 (fonds_no)
INSERT INTO `sys_dict` (`dict_code`, `dict_name`) VALUES ('fonds_no', '全宗号');
INSERT INTO `sys_dict_item` (`dict_code`, `item_value`, `item_label`, `sort_order`) VALUES
  ('fonds_no', '01',     '01',     1),
  ('fonds_no', 'LK-001', 'LK-001', 2),
  ('fonds_no', 'LK-002', 'LK-002', 3),
  ('fonds_no', 'LK-003', 'LK-003', 4),
  ('fonds_no', 'LK-004', 'LK-004', 5),
  ('fonds_no', 'LK-005', 'LK-005', 6);

-- 数据字典：设备代号 (equipment_code)
INSERT INTO `sys_dict` (`dict_code`, `dict_name`) VALUES ('equipment_code', '设备代号');
INSERT INTO `sys_dict_item` (`dict_code`, `item_value`, `item_label`, `sort_order`) VALUES
  ('equipment_code', 'DJ-01', 'DJ-01', 1),
  ('equipment_code', 'DJ-02', 'DJ-02', 2),
  ('equipment_code', 'DQ-01', 'DQ-01', 3),
  ('equipment_code', 'DQ-02', 'DQ-02', 4),
  ('equipment_code', 'KT-01', 'KT-01', 5),
  ('equipment_code', 'KT-02', 'KT-02', 6),
  ('equipment_code', 'TJ-01', 'TJ-01', 7),
  ('equipment_code', 'TJ-02', 'TJ-02', 8);

-- ===========================================================
-- 分区扩容示例（每年新增时执行，将 p_future 切分出新年度分区）
-- 示例：扩容至 2028 年
-- ALTER TABLE `archive_volume` REORGANIZE PARTITION p_future INTO (
--   PARTITION p_2028 VALUES LESS THAN ('2029'),
--   PARTITION p_future VALUES LESS THAN (MAXVALUE)
-- );
-- ALTER TABLE `archive_file` REORGANIZE PARTITION p_future INTO (
--   PARTITION p_2028 VALUES LESS THAN ('2029'),
--   PARTITION p_future VALUES LESS THAN (MAXVALUE)
-- );
-- ===========================================================
