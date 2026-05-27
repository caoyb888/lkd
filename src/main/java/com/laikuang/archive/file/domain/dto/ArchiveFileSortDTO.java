package com.laikuang.archive.file.domain.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 卷内文件排序 DTO。
 */
@Data
public class ArchiveFileSortDTO {

    @NotNull(message = "文件ID不能为空")
    private Long recordId;

    @NotBlank(message = "年度不能为空")
    private String year;

    @NotNull(message = "顺序号不能为空")
    @Min(value = 1, message = "顺序号最小为1")
    private Integer seqNo;
}
