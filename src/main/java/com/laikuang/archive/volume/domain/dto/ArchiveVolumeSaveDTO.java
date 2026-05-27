package com.laikuang.archive.volume.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

/**
 * 案卷级目录新建/保存 DTO。
 * 新建时 status 默认为 0（草稿），由 Service 层自动填充，无需前端传入。
 */
@Data
public class ArchiveVolumeSaveDTO {

    @NotBlank(message = "年度不能为空")
    private String year;

    @NotBlank(message = "全宗号不能为空")
    private String fondsNo;

    private String categoryName;

    @NotBlank(message = "一级类目不能为空")
    private String categoryL1;

    private String categoryL2;

    private String categoryL3;

    private String deviceCode;

    @NotBlank(message = "案卷题名不能为空")
    private String volumeTitle;

    private Integer fileCount;
    private Integer totalPages;
    private String compileUnit;
    private String compileDate;
    private String retentionPeriod;
    private String securityLevel;
    private LocalDate compileDateActual;
    private String reviewer;
    private LocalDate inspectDate;
    private LocalDate archiveDate;
    private String notes;
    private String remark;
    private String categoryCode;
    private String locationNo;
    private Integer copies;
    private String organization;
}
