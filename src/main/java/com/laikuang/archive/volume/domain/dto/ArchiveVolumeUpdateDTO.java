package com.laikuang.archive.volume.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

/**
 * 案卷级目录更新 DTO。
 * 仅允许更新草稿状态（status = 0）的案卷，且仅限立卷人本人操作。
 * 年度（year）与档号（archiveNo）不可修改，如需调整须删除重建。
 */
@Data
public class ArchiveVolumeUpdateDTO {

    @NotBlank(message = "案卷题名不能为空")
    private String volumeTitle;

    private String categoryName;
    private String categoryL1;
    private String categoryL2;
    private String categoryL3;
    private String deviceCode;
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
