package com.laikuang.archive.file.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

/**
 * 文件级明细目录新建 DTO。
 * 文件必须关联到某一案卷（通过 volumeNo + year 定位）。
 */
@Data
public class ArchiveFileSaveDTO {

    @NotBlank(message = "年度不能为空")
    private String year;

    @NotBlank(message = "关联案卷号不能为空")
    private String volumeNo;

    @NotBlank(message = "档号不能为空")
    private String archiveNo;

    private String fondsNo;
    private String categoryName;
    private String categoryL1;
    private String categoryL2;
    private String categoryL3;
    private String deviceCode;

    private Integer seqNo;
    private String fileNo;

    @NotBlank(message = "文件标题不能为空")
    private String fileTitle;

    private String responsible;
    private Integer pages;
    private String compileDate;
    private String keywords;
    private LocalDate archiveDate;
    private String securityLevel;
    private String originalPath;
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
    private Integer copies;
    private String organization;
    private String relatedFlag;
}
