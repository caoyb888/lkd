package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新字典项 DTO（dictCode 不可修改）。
 */
@Data
public class UpdateDictItemDTO {

    @NotBlank(message = "字典项实际值不能为空")
    @Size(max = 50)
    private String  itemValue;

    @NotBlank(message = "字典项显示名称不能为空")
    @Size(max = 100)
    private String  itemLabel;

    private Integer sortOrder;

    /** 状态：1-启用，0-停用 */
    @NotNull(message = "状态不能为空")
    private Integer status;
}
