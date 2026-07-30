package com.laikuang.archive.volume.domain.vo;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 案卷级目录详情 VO。
 * 包含案卷全部字段及卷内文件列表（打印/查看时使用）。
 */
@Data
public class ArchiveVolumeVO {

    private Long recordId;
    private String year;
    private String fondsNo;
    private String categoryName;
    private String categoryL1;
    private String categoryL2;
    private String categoryL3;
    private String deviceCode;
    private String volumeNo;
    private String volumeTitle;
    private Integer fileCount;
    private Integer totalPages;
    private String compileUnit;
    private String compileDate;
    private String retentionPeriod;
    private String securityLevel;
    private String compiler;
    private Long compilerId;
    private LocalDate compileDateActual;
    private String reviewer;
    private LocalDate inspectDate;
    private LocalDate archiveDate;
    private String notes;
    private String remark;
    private String archiveNo;
    private String categoryCode;
    private String locationNo;
    private Integer inStock;
    private LocalDate registerDate;
    private String organization;
    private Integer copies;
    private Integer borrowedCopies;
    private Integer pendingDestroy;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 字典中文标签（详情展示用，随 VO 填充） */
    private String categoryL1Label;
    private String securityLevelLabel;
    private String retentionPeriodLabel;

    /** 卷内文件列表（按需填充） */
    private List<ArchiveFileBriefVO> fileList;
}
