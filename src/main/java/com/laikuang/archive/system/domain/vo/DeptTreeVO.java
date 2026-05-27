package com.laikuang.archive.system.domain.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

/**
 * 部门树节点 VO。
 * children 为 null 时不序列化（叶子节点不输出空数组）。
 */
@Data
public class DeptTreeVO {

    private Long    deptId;
    private String  deptName;
    private Long    parentId;
    private Integer sortOrder;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<DeptTreeVO> children;
}
