package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建字典项 DTO。
 */
@Data
public class CreateDictItemDTO {

    @NotBlank(message = "字典编码不能为空")
    @Size(max = 50)
    private String  dictCode;

    @NotBlank(message = "字典项实际值不能为空")
    @Size(max = 50, message = "字典项实际值不能超过50位")
    private String  itemValue;

    @NotBlank(message = "字典项显示名称不能为空")
    @Size(max = 100, message = "字典项显示名称不能超过100位")
    private String  itemLabel;

    private Integer sortOrder;
}
