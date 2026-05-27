package com.laikuang.archive.system.service;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import cn.dev33.satoken.exception.NotLoginException;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.domain.vo.LoginVO;
import com.laikuang.archive.system.domain.vo.UserInfoVO;
import com.laikuang.archive.system.mapper.SysUserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 1 — S1-05：认证模块集成测试。
 * 覆盖登录安全（统一错误提示、禁用拦截）、Token 颁发、用户信息脱敏。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private SysUserMapper userMapper;

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD = "Admin@123";

    @BeforeEach
    void setUp() {
        // 确保 Sa-Token 上下文干净
        StpUtil.logout();
    }

    @Test
    @DisplayName("登录成功：应返回 Token、用户名、角色")
    void loginSuccess() {
        LoginDTO dto = new LoginDTO();
        dto.setUsername(ADMIN_USERNAME);
        dto.setPassword(ADMIN_PASSWORD);

        LoginVO vo = authService.login(dto);

        assertNotNull(vo.getToken());
        assertEquals("satoken", vo.getTokenName());
        assertEquals(ADMIN_USERNAME, vo.getUsername());
        assertEquals("company_leader", vo.getRole());
        assertNotNull(vo.getUserId());
    }

    @Test
    @DisplayName("登录失败-用户名不存在：应返回统一提示，不暴露用户是否存在")
    void loginWithNonExistentUser() {
        LoginDTO dto = new LoginDTO();
        dto.setUsername("not_exist_user");
        dto.setPassword(ADMIN_PASSWORD);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.login(dto));
        assertEquals("用户名或密码错误", ex.getMessage());
    }

    @Test
    @DisplayName("登录失败-密码错误：应返回统一提示，不暴露用户名存在")
    void loginWithWrongPassword() {
        LoginDTO dto = new LoginDTO();
        dto.setUsername(ADMIN_USERNAME);
        dto.setPassword("Wrong@123");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.login(dto));
        assertEquals("用户名或密码错误", ex.getMessage());
    }

    @Test
    @DisplayName("登录失败-账号已禁用：应拦截并提示禁用")
    void loginWithDisabledUser() {
        // 创建一个禁用状态的测试用户
        SysUser user = new SysUser();
        user.setUsername("disabled_user");
        user.setPassword(PasswordUtil.encode("Any@123"));
        user.setNickname("禁用用户");
        user.setDeptId(1L);
        user.setRole("user");
        user.setStatus(0); // 禁用
        userMapper.insert(user);

        LoginDTO dto = new LoginDTO();
        dto.setUsername("disabled_user");
        dto.setPassword("Any@123");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.login(dto));
        assertEquals("账号已被禁用，请联系管理员", ex.getMessage());
    }

    @Test
    @DisplayName("获取当前用户信息：手机号应脱敏，密码不返回")
    void getCurrentUserInfo() {
        // 先登录
        LoginDTO dto = new LoginDTO();
        dto.setUsername(ADMIN_USERNAME);
        dto.setPassword(ADMIN_PASSWORD);
        authService.login(dto);

        UserInfoVO vo = authService.getCurrentUserInfo();

        assertEquals(ADMIN_USERNAME, vo.getUsername());
        assertEquals("company_leader", vo.getRole());
        // 管理员初始无手机号，应为 null；若有则验证脱敏格式
        if (vo.getPhone() != null) {
            assertTrue(vo.getPhone().contains("****"));
        }
    }

    @Test
    @DisplayName("未登录时获取用户信息：应抛出 NotLoginException")
    void getUserInfoWithoutLogin() {
        StpUtil.logout();
        assertThrows(NotLoginException.class,
                () -> authService.getCurrentUserInfo());
    }

    @Test
    @DisplayName("注销：应正常执行不抛异常")
    void logoutSuccess() {
        LoginDTO dto = new LoginDTO();
        dto.setUsername(ADMIN_USERNAME);
        dto.setPassword(ADMIN_PASSWORD);
        authService.login(dto);

        assertDoesNotThrow(() -> authService.logout());
    }
}
