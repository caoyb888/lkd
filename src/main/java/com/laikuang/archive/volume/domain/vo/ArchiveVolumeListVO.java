package com.laikuang.archive.volume.domain.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 案卷级目录列表 VO（精简字段，适用于列表页展示）。
 */
@Data
public class ArchiveVolumeListVO {

    private Long recordId;
    private String year;
    private String archiveNo;
    private String volumeTitle;
    private String categoryName;
    private String categoryL1;
    private String categoryL2;
    private String securityLevel;
    private String securityLevelLabel;
    private String retentionPeriod;
    private String retentionPeriodLabel;
    private Integer status;
    private Integer inStock;
    private String compiler;
    private Integer copies;
    private Integer borrowedCopies;
    private Integer pendingDestroy;
    private Long compilerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
