package com.laikuang.archive.common.constant;

/**
 * 审批业务类型常量。
 */
public interface ApproveBusinessType {

    /** 归档审核（检查人/审核人操作：待审核 → 待确认/草稿） */
    int ARCHIVE_REVIEW = 1;

    /** 归档确认（档案管理员操作：待确认 → 已正式归档/待审核） */
    int ARCHIVE_CONFIRM = 2;

    /** 销毁审批（公司领导操作） */
    int DESTROY_APPROVE = 3;

    /** 借阅审批 */
    int BORROW_APPROVE = 4;
}
