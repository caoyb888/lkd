package com.laikuang.archive.borrow.domain.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 借阅申请提交DTO。
 */
@Data
public class ArchiveBorrowApplyDTO {

    /** 申请借阅的案卷档号 */
    @NotBlank(message = "档号不能为空")
    private String archiveNo;

    /** 案卷年度（用于精确定位分区表记录） */
    @NotBlank(message = "年度不能为空")
    private String year;

    /** 申请份数（1-99，默认1） */
    @NotNull(message = "申请份数不能为空")
    @Min(value = 1, message = "申请份数最少为1份")
    @Max(value = 99, message = "申请份数最多为99份")
    private Integer applyCount;

    /** 借阅原因 */
    private String reason;

    /** 借阅天数（1-365），与 planReturnDate 二选一 */
    @Min(value = 1, message = "借阅天数至少为1天")
    @Max(value = 365, message = "借阅天数最多为365天")
    private Integer borrowDays;

    /** 计划归还日期（YYYY-MM-DD），与 borrowDays 二选一，优先使用 */
    private String planReturnDate;
}
