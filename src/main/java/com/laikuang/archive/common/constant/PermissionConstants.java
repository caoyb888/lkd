package com.laikuang.archive.common.constant;

/**
 * 权限码常量。与 @SaCheckPermission("xxx") 注解中的字符串保持一致。
 */
public interface PermissionConstants {

    // ---------- 档案查看 ----------
    String ARCHIVE_VIEW    = "archive:view";

    // ---------- 档案新建/编辑（草稿态） ----------
    String ARCHIVE_CREATE  = "archive:create";

    // ---------- 档案管理员操作（归档确认、批量导入、有限修改） ----------
    String ARCHIVE_MANAGE  = "archive:manage";

    // ---------- 档案销毁（仅公司领导） ----------
    String ARCHIVE_DESTROY = "archive:destroy";

    // ---------- 借阅申请（任意登录用户） ----------
    String BORROW_APPLY    = "borrow:apply";

    // ---------- 借阅审批（档案管理员+） ----------
    String BORROW_APPROVE  = "borrow:approve";

    // ---------- 借阅历史：仅本部门 ----------
    String BORROW_HISTORY_DEPT = "borrow:history:dept";

    // ---------- 借阅历史：全局（管理员+） ----------
    String BORROW_HISTORY_ALL  = "borrow:history:all";

    // ---------- 用户管理（管理员+） ----------
    String USER_MANAGE     = "user:manage";
}
