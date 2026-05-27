package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新部门 DTO。
 */
@Data
public class UpdateDeptDTO {

    @NotBlank(message = "部门名称不能为空")
    @Size(max = 100, message = "部门名称不能超过100位")
    private String  deptName;

    /** 修改上级部门（不能将自身或自身下级设为父节点） */
    private Long    parentId;

    private Integer sortOrder;
}
