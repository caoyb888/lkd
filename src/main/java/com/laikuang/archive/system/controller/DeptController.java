package com.laikuang.archive.system.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.system.domain.dto.CreateDeptDTO;
import com.laikuang.archive.system.domain.dto.UpdateDeptDTO;
import com.laikuang.archive.system.domain.vo.DeptTreeVO;
import com.laikuang.archive.system.service.DeptService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 部门管理接口。
 *
 * GET  /dept/tree          — 获取部门树（任意已登录用户，用于表单下拉）
 * POST /dept               — 创建部门（需 user:manage 权限）
 * PUT  /dept/{deptId}      — 更新部门（需 user:manage 权限）
 * DELETE /dept/{deptId}    — 删除部门（需 user:manage 权限，有子部门或用户时拒绝）
 */
@RestController
@RequestMapping("/dept")
@RequiredArgsConstructor
public class DeptController {

    private final DeptService deptService;

    /**
     * GET /api/dept/tree
     * 获取完整部门树（按 sortOrder 排序，叶子节点 children 字段不输出）。
     */
    @GetMapping("/tree")
    public Result<List<DeptTreeVO>> getDeptTree() {
        return Result.success(deptService.getDeptTree());
    }

    /**
     * POST /api/dept
     * 创建部门。parentId 为 null 或 0 时创建根级部门。
     */
    @PostMapping
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> createDept(@RequestBody @Validated CreateDeptDTO dto) {
        deptService.createDept(dto);
        return Result.success();
    }

    /**
     * PUT /api/dept/{deptId}
     * 更新部门名称、排序、上级部门。
     * 不能将自身或自身的下级设为上级部门。
     */
    @PutMapping("/{deptId}")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> updateDept(
            @PathVariable Long deptId,
            @RequestBody @Validated UpdateDeptDTO dto) {
        deptService.updateDept(deptId, dto);
        return Result.success();
    }

    /**
     * DELETE /api/dept/{deptId}
     * 删除部门。存在子部门或归属用户时返回错误，拒绝删除。
     */
    @DeleteMapping("/{deptId}")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> deleteDept(@PathVariable Long deptId) {
        deptService.deleteDept(deptId);
        return Result.success();
    }
}
