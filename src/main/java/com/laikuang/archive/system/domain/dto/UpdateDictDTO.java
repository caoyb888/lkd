package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新数据字典 DTO（dictCode 不可修改）。
 */
@Data
public class UpdateDictDTO {

    @NotBlank(message = "字典名称不能为空")
    @Size(max = 100, message = "字典名称不能超过100位")
    private String dictName;

    /** 状态：1-启用，0-停用 */
    @NotNull(message = "状态不能为空")
    private Integer status;
}
