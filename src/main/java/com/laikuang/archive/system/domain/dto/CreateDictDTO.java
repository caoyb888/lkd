package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建数据字典 DTO。
 */
@Data
public class CreateDictDTO {

    @NotBlank(message = "字典编码不能为空")
    @Size(max = 50, message = "字典编码不能超过50位")
    @Pattern(regexp = "^[a-z][a-z0-9_]*$",
             message = "字典编码只能包含小写字母、数字和下划线，且以字母开头")
    private String dictCode;

    @NotBlank(message = "字典名称不能为空")
    @Size(max = 100, message = "字典名称不能超过100位")
    private String dictName;
}
