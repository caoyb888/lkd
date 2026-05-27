package com.laikuang.archive.system.domain.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 待办汇总数量 VO，用于侧边栏徽标展示。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotifyCountVO {

    /** 待我审批数（归档待审核 + 借阅待审批，视角：管理员/检查人） */
    private long pendingApprove;

    /** 当前用户逾期未归还借阅数 */
    private long overdueCount;

    /** 当前用户待审批借阅申请数 */
    private long myPendingBorrow;
}
