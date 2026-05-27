package com.laikuang.archive.common.constant;

/**
 * 系统角色常量。与 sys_user.role 字段值保持一致。
 */
public interface RoleConstants {

    /** 普通员工：查看/检索档案、新建草稿、申请借阅、查看本部门历史 */
    String USER = "user";

    /** 档案管理员：处理借阅审批、确认归档、批量导入、有限修改目录 */
    String ARCHIVE_ADMIN = "archive_admin";

    /** 公司领导：审批"删除/恢复/销毁"高危操作 */
    String COMPANY_LEADER = "company_leader";
}
