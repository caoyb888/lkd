package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建部门 DTO。parentId 为空或 0 表示根部门。
 */
@Data
public class CreateDeptDTO {

    @NotBlank(message = "部门名称不能为空")
    @Size(max = 100, message = "部门名称不能超过100位")
    private String  deptName;

    /** 上级部门ID，null 或 0 表示顶层部门 */
    private Long    parentId;

    private Integer sortOrder;
}
