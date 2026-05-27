package com.laikuang.archive.common.constant;

/**
 * 借阅状态常量。
 */
public interface BorrowStatus {

    /** 待审批 */
    int PENDING = 0;

    /** 已借出/已批准 */
    int BORROWED = 1;

    /** 已驳回 */
    int REJECTED = 2;

    /** 已归还 */
    int RETURNED = 3;

    /** 逾期未归还 */
    int OVERDUE = 4;
}
