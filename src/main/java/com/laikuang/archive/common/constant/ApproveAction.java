package com.laikuang.archive.common.constant;

/**
 * 审批动作常量。
 */
public interface ApproveAction {

    /** 通过 */
    String PASS = "PASS";

    /** 驳回 */
    String REJECT = "REJECT";

    /** 退回上一级 */
    String BACK = "BACK";

    /** 申请（销毁/恢复审批发起） */
    String APPLY = "APPLY";
}
