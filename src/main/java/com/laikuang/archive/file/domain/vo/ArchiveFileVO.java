package com.laikuang.archive.file.domain.vo;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 文件级明细目录详情 VO。
 */
@Data
public class ArchiveFileVO {

    private Long recordId;
    private String fondsNo;
    private String categoryName;
    private String year;
    private String categoryL1;
    private String categoryL2;
    private String categoryL3;
    private String deviceCode;
    private String volumeNo;
    private Integer seqNo;
    private String fileNo;
    private String fileTitle;
    private String responsible;
    private Integer pages;
    private String compileDate;
    private String keywords;
    private LocalDate archiveDate;
    private String securityLevel;
    private String originalPath;
    private String archiveNo;
    private String remark;
    private String retentionPeriod;
    private String categoryCode;
    private String drawingSize;
    private String a4Equivalent;
    private String cabinetNo;
    private String changeRecord;
    private String projectName;
    private String drawerNo;
    private String pageStart;
    private String archiveStatus;
    private String locationNo;
    private Integer inStock;
    private String organization;
    private String relatedFlag;
    private Integer copies;
    private Integer borrowedCopies;
    private Integer status;
    private Long compilerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
