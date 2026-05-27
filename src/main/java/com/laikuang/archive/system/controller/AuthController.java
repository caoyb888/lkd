package com.laikuang.archive.system.controller;

import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.system.domain.vo.LoginVO;
import com.laikuang.archive.system.domain.vo.UserInfoVO;
import com.laikuang.archive.system.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口（登录、注销、获取当前用户信息）。
 * /auth/login 已在 Sa-Token 拦截器中放行，无需 Token。
 * /auth/logout 和 /auth/info 需要已登录状态。
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/login
     * 用户名密码登录，成功返回 Token。
     * 前端后续所有请求须在 Header 中携带: satoken: {token}
     */
    @PostMapping("/login")
    public Result<LoginVO> login(@RequestBody @Validated LoginDTO dto) {
        return Result.success(authService.login(dto));
    }

    /**
     * POST /api/auth/logout
     * 注销当前 Token，清除服务端会话。
     */
    @PostMapping("/logout")
    public Result<Void> logout() {
        authService.logout();
        return Result.success();
    }

    /**
     * GET /api/auth/info
     * 获取当前登录用户信息（手机号已脱敏，密码不返回）。
     */
    @GetMapping("/info")
    public Result<UserInfoVO> info() {
        return Result.success(authService.getCurrentUserInfo());
    }
}
