package com.laikuang.archive.approve.domain.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 审批日志视图对象。
 */
@Data
public class ArchiveApproveLogVO {

    private Long logId;
    private Integer businessType;
    private String businessTypeLabel;
    private Long targetId;
    private String targetArchiveNo;
    private Long approverId;
    private String approverName;
    private String action;
    private String actionName;
    private String opinion;
    private LocalDateTime createdAt;
}
