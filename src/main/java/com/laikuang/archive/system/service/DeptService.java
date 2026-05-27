package com.laikuang.archive.system.service;

import com.laikuang.archive.system.domain.dto.CreateDeptDTO;
import com.laikuang.archive.system.domain.dto.UpdateDeptDTO;
import com.laikuang.archive.system.domain.vo.DeptTreeVO;

import java.util.List;

public interface DeptService {

    /** 获取完整部门树（按 sortOrder 排序） */
    List<DeptTreeVO> getDeptTree();

    /** 新建部门 */
    void createDept(CreateDeptDTO dto);

    /** 更新部门信息（不能将自身设为父节点） */
    void updateDept(Long deptId, UpdateDeptDTO dto);

    /**
     * 删除部门。
     * 前置校验：①无子部门 ②无归属用户，满足后才执行删除。
     */
    void deleteDept(Long deptId);
}
