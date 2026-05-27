package com.laikuang.archive.system.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.system.domain.dto.ChangePasswordDTO;
import com.laikuang.archive.system.domain.dto.CreateUserDTO;
import com.laikuang.archive.system.domain.dto.ResetPasswordDTO;
import com.laikuang.archive.system.domain.dto.UpdateProfileDTO;
import com.laikuang.archive.system.domain.dto.UpdateUserDTO;
import com.laikuang.archive.system.domain.vo.UserListVO;
import com.laikuang.archive.system.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户中心接口。
 *
 * 个人操作（任意已登录用户）：
 *   PUT  /user/profile          — 更新昵称/手机号
 *   PUT  /user/password         — 修改密码（需原密码）
 *
 * 管理员操作（需要 user:manage 权限）：
 *   GET  /user/page             — 分页查询用户列表
 *   POST /user                  — 创建用户
 *   PUT  /user/{userId}         — 更新用户信息（昵称/手机号/角色/状态/部门）
 *   POST /user/{userId}/reset-password  — 重置密码（踢出所有活跃会话）
 */
@Validated
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ---- 个人中心 ----

    /**
     * PUT /api/user/profile
     * 更新当前登录用户的昵称和手机号。
     * userId 在 Service 层从 Sa-Token 会话取得，无水平越权风险。
     */
    @PutMapping("/profile")
    public Result<Void> updateProfile(@RequestBody @Validated UpdateProfileDTO dto) {
        userService.updateProfile(dto);
        return Result.success();
    }

    /**
     * PUT /api/user/password
     * 修改密码。需提供原密码，新密码必须满足强度规则：
     * 至少6位，同时包含字母、数字及特殊字符（$@!%*#?&）。
     */
    @PutMapping("/password")
    public Result<Void> changePassword(@RequestBody @Validated ChangePasswordDTO dto) {
        userService.changePassword(dto);
        return Result.success();
    }

    // ---- 管理员用户管理 ----

    /**
     * GET /api/user/page?current=1&pageSize=10&keyword=xxx
     * 分页查询用户列表。手机号脱敏返回，密码不返回。
     */
    @GetMapping("/page")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<IPage<UserListVO>> pageUsers(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String keyword) {
        return Result.success(userService.pageUsers(pageQuery, keyword));
    }

    /**
     * POST /api/user
     * 管理员创建新用户，需提供初始密码（须满足强度规则）。
     */
    @PostMapping
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> createUser(@RequestBody @Validated CreateUserDTO dto) {
        userService.createUser(dto);
        return Result.success();
    }

    /**
     * PUT /api/user/{userId}
     * 管理员更新用户信息（局部更新，非 null 字段才覆盖）。
     */
    @PutMapping("/{userId}")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> updateUser(
            @PathVariable Long userId,
            @RequestBody @Validated UpdateUserDTO dto) {
        userService.updateUser(userId, dto);
        return Result.success();
    }

    /**
     * POST /api/user/{userId}/reset-password
     * 管理员重置指定用户的密码，执行后该用户所有活跃 Token 立即失效。
     */
    @PostMapping("/{userId}/reset-password")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> resetPassword(
            @PathVariable Long userId,
            @RequestBody @Validated ResetPasswordDTO dto) {
        userService.resetPassword(userId, dto);
        return Result.success();
    }
}
