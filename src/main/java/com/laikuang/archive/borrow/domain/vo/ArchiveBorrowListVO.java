package com.laikuang.archive.borrow.domain.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 借阅单列表视图对象。
 */
@Data
public class ArchiveBorrowListVO {

    private Long borrowId;
    private Long borrowerId;
    private String borrowerName;
    private String borrowerDept;
    /** 借阅人脱敏手机号，如 138****5678，审批队列中使用 */
    private String borrowerPhone;
    private String archiveNo;
    private String volumeTitle;
    private Integer applyCount;
    private String reason;
    private Integer status;
    private String statusName;
    private LocalDateTime borrowDate;
    private LocalDateTime planReturnDate;
    private LocalDateTime actualReturnDate;
    private LocalDateTime createdAt;

    /** 剩余天数（负数表示已逾期天数） */
    private Integer remainingDays;

    /** 提醒级别：0-正常，1-即将到期(≤3天)，2-已逾期 */
    private Integer remindLevel;

    /** 档案总份数，审批时参考 */
    private Integer volumeCopies;

    /** 剩余可借份数（volumeCopies - borrowedCopies），审批时参考 */
    private Integer volumeAvailable;
}
