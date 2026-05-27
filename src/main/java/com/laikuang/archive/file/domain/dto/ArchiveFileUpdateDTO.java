package com.laikuang.archive.file.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

/**
 * 文件级明细目录更新 DTO。
 * 仅允许更新草稿状态（status = 0）的文件，且仅限立卷人本人操作。
 * 年度、档号、案卷号不可修改。
 */
@Data
public class ArchiveFileUpdateDTO {

    @NotBlank(message = "文件标题不能为空")
    private String fileTitle;

    private Integer seqNo;
    private String fileNo;
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
