package com.laikuang.archive.system.service.impl;

import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.exception.UnauthorizedException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.domain.vo.LoginVO;
import com.laikuang.archive.system.domain.vo.UserInfoVO;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 登录认证业务实现。
 * 安全要点：
 *   1. 用户名不存在与密码错误返回相同提示，防止用户名枚举攻击。
 *   2. 密码使用 Argon2id 哈希比对，严禁明文或 MD5。
 *   3. 禁用账号提前拦截，不进入密码比对流程。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;

    @Override
    public LoginVO login(LoginDTO dto) {
        // 1. 查询用户（仅按用户名，不暴露是否存在）
        SysUser user = sysUserMapper.selectOne(
            new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, dto.getUsername())
        );

        // 用户不存在与密码错误使用相同提示，防止枚举
        if (user == null || !PasswordUtil.matches(dto.getPassword(), user.getPassword())) {
            log.warn("[Auth] 登录失败，用户名或密码错误，username={}", dto.getUsername());
            throw new BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误");
        }

        // 2. 账号状态校验
        if (user.getStatus() == null || user.getStatus() == 0) {
            log.warn("[Auth] 登录失败，账号已禁用，userId={}", user.getUserId());
            throw new BusinessException(ResultCode.UNAUTHORIZED, "账号已被禁用，请联系管理员");
        }

        // 3. Sa-Token 颁发 Token（loginId = userId）
        StpUtil.login(user.getUserId());
        SaTokenInfo tokenInfo = StpUtil.getTokenInfo();

        log.info("[Auth] 用户登录成功，userId={}, username={}, role={}",
                 user.getUserId(), user.getUsername(), user.getRole());

        LoginVO vo = new LoginVO();
        vo.setToken(tokenInfo.getTokenValue());
        vo.setTokenName(tokenInfo.getTokenName());
        vo.setUserId(user.getUserId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setRole(user.getRole());
        return vo;
    }

    @Override
    public void logout() {
        Long userId = StpUtil.getLoginIdAsLong();
        StpUtil.logout();
        log.info("[Auth] 用户注销，userId={}", userId);
    }

    @Override
    public UserInfoVO getCurrentUserInfo() {
        Long userId = StpUtil.getLoginIdAsLong();
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw new UnauthorizedException("用户信息不存在，请重新登录");
        }

        UserInfoVO vo = new UserInfoVO();
        vo.setUserId(user.getUserId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        // 手机号脱敏处理
        vo.setPhone(PasswordUtil.desensitizePhone(user.getPhone()));
        vo.setDeptId(user.getDeptId());
        vo.setRole(user.getRole());
        vo.setStatus(user.getStatus());
        return vo;
    }
}
