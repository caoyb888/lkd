package com.laikuang.archive.borrow.domain.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 借阅审批提交DTO。
 */
@Data
public class ArchiveBorrowApproveDTO {

    /** 审批动作：PASS-通过，REJECT-驳回 */
    @NotBlank(message = "审批动作不能为空")
    private String action;

    /** 审批意见 */
    private String opinion;

    /** 批准时必填：实际允许借阅天数（1-365）；若借阅申请已带 planReturnDate 则可不传 */
    @Min(value = 1, message = "借阅天数至少为1天")
    @Max(value = 365, message = "借阅天数最多为365天")
    private Integer borrowDays;
}
