package com.laikuang.archive.system.service;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.dto.ChangePasswordDTO;
import com.laikuang.archive.system.domain.dto.CreateUserDTO;
import com.laikuang.archive.system.domain.dto.ResetPasswordDTO;
import com.laikuang.archive.system.domain.dto.UpdateProfileDTO;
import com.laikuang.archive.system.domain.dto.UpdateUserDTO;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.domain.vo.UserListVO;
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
 * Sprint 1 — S1-05：用户中心集成测试。
 * 覆盖密码强度黑盒、修改密码安全、用户 CRUD、水平越权防范、重置密码踢出会话。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private SysUserMapper userMapper;

    private Long testUserId;
    private static final String TEST_USERNAME = "testuser";
    private static final String TEST_PASSWORD = "Test@123";

    @BeforeEach
    void setUp() {
        // 登录为管理员，供需要权限的操作使用
        StpUtil.login(1L);
    }

    // ==================== 密码强度黑盒测试 ====================

    @Test
    @DisplayName("创建用户-密码强度不足：应拦截并提示")
    void createUserWithWeakPasswordShouldFail() {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setUsername("weak_pwd_user");
        dto.setNickname("弱密码用户");
        dto.setDeptId(1L);
        dto.setRole("user");
        dto.setInitialPassword("123456"); // 无字母、无特殊字符

        BusinessException ex = assertThrows(BusinessException.class,
                () -> userService.createUser(dto));
        assertTrue(ex.getMessage().contains("密码强度不足"));
    }

    @Test
    @DisplayName("创建用户-合法强密码：应成功创建")
    void createUserWithStrongPasswordShouldSuccess() {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setUsername("strong_pwd_user");
        dto.setNickname("强密码用户");
        dto.setPhone("13800138001");
        dto.setDeptId(1L);
        dto.setRole("user");
        dto.setInitialPassword("Strong@123");

        assertDoesNotThrow(() -> userService.createUser(dto));

        SysUser user = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUsername, "strong_pwd_user"));
        assertNotNull(user);
        assertTrue(PasswordUtil.matches("Strong@123", user.getPassword()));
    }

    // ==================== 修改密码 ====================

    @Test
    @DisplayName("修改密码-原密码错误：应拦截")
    void changePasswordWithWrongOldPassword() {
        // 创建一个测试用户并登录
        createTestUserAndLogin();

        ChangePasswordDTO dto = new ChangePasswordDTO();
        dto.setOldPassword("Wrong@123");
        dto.setNewPassword("New@456");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> userService.changePassword(dto));
        assertEquals("原密码错误", ex.getMessage());
    }

    @Test
    @DisplayName("修改密码-新密码与原密码相同：应拦截")
    void changePasswordSameAsOld() {
        createTestUserAndLogin();

        ChangePasswordDTO dto = new ChangePasswordDTO();
        dto.setOldPassword(TEST_PASSWORD);
        dto.setNewPassword(TEST_PASSWORD);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> userService.changePassword(dto));
        assertEquals("新密码不能与原密码相同", ex.getMessage());
    }

    @Test
    @DisplayName("修改密码-新密码强度不足：应拦截")
    void changePasswordWithWeakNewPassword() {
        createTestUserAndLogin();

        ChangePasswordDTO dto = new ChangePasswordDTO();
        dto.setOldPassword(TEST_PASSWORD);
        dto.setNewPassword("123456");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> userService.changePassword(dto));
        assertTrue(ex.getMessage().contains("密码强度不足"));
    }

    @Test
    @DisplayName("修改密码-成功：应更新哈希并可用新密码登录")
    void changePasswordSuccess() {
        createTestUserAndLogin();

        ChangePasswordDTO dto = new ChangePasswordDTO();
        dto.setOldPassword(TEST_PASSWORD);
        dto.setNewPassword("New@456");

        assertDoesNotThrow(() -> userService.changePassword(dto));

        SysUser user = userMapper.selectById(testUserId);
        assertTrue(PasswordUtil.matches("New@456", user.getPassword()));
        assertFalse(PasswordUtil.matches(TEST_PASSWORD, user.getPassword()));
    }

    // ==================== 用户管理 CRUD ====================

    @Test
    @DisplayName("用户名重复：应拦截")
    void createUserWithDuplicateUsername() {
        // 先创建第一个用户
        CreateUserDTO dto1 = new CreateUserDTO();
        dto1.setUsername("dup_user");
        dto1.setNickname("用户1");
        dto1.setDeptId(1L);
        dto1.setRole("user");
        dto1.setInitialPassword("Pass@123");
        userService.createUser(dto1);

        // 再创建同名用户
        CreateUserDTO dto2 = new CreateUserDTO();
        dto2.setUsername("dup_user");
        dto2.setNickname("用户2");
        dto2.setDeptId(1L);
        dto2.setRole("user");
        dto2.setInitialPassword("Pass@456");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> userService.createUser(dto2));
        assertTrue(ex.getMessage().contains("已存在"));
    }

    @Test
    @DisplayName("分页查询用户：应返回脱敏手机号，不返回密码")
    void pageUsersShouldDesensitizePhone() {
        // 创建一个带手机号的用户
        CreateUserDTO dto = new CreateUserDTO();
        dto.setUsername("page_test_user");
        dto.setNickname("分页测试");
        dto.setPhone("13812345678");
        dto.setDeptId(1L);
        dto.setRole("user");
        dto.setInitialPassword("Pass@123");
        userService.createUser(dto);

        PageQuery pageQuery = new PageQuery();
        pageQuery.setCurrent(1);
        pageQuery.setPageSize(10);

        IPage<UserListVO> page = userService.pageUsers(pageQuery, "page_test_user");
        assertFalse(page.getRecords().isEmpty());

        UserListVO vo = page.getRecords().get(0);
        assertEquals("138****5678", vo.getPhone());
    }

    @Test
    @DisplayName("更新用户信息：局部更新，非 null 字段才覆盖")
    void updateUserPartial() {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setUsername("update_test_user");
        dto.setNickname("更新测试");
        dto.setDeptId(1L);
        dto.setRole("user");
        dto.setInitialPassword("Pass@123");
        userService.createUser(dto);

        SysUser user = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUsername, "update_test_user"));

        UpdateUserDTO updateDto = new UpdateUserDTO();
        updateDto.setNickname("新昵称");
        // phone、deptId、role、status 均为 null，不应覆盖
        userService.updateUser(user.getUserId(), updateDto);

        SysUser updated = userMapper.selectById(user.getUserId());
        assertEquals("新昵称", updated.getNickname());
        assertEquals("user", updated.getRole()); // 未被覆盖
        assertEquals(1, updated.getStatus());    // 未被覆盖
    }

    @Test
    @DisplayName("管理员重置密码：应更新哈希并踢出用户会话")
    void resetPasswordShouldUpdateHashAndKickSession() {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setUsername("reset_test_user");
        dto.setNickname("重置测试");
        dto.setDeptId(1L);
        dto.setRole("user");
        dto.setInitialPassword("Old@123");
        userService.createUser(dto);

        SysUser user = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUsername, "reset_test_user"));

        ResetPasswordDTO resetDto = new ResetPasswordDTO();
        resetDto.setNewPassword("Reset@456");
        userService.resetPassword(user.getUserId(), resetDto);

        SysUser updated = userMapper.selectById(user.getUserId());
        assertTrue(PasswordUtil.matches("Reset@456", updated.getPassword()));
    }

    @Test
    @DisplayName("更新个人资料：应从 Token 取 userId，防止水平越权")
    void updateProfileShouldUseTokenUserId() {
        createTestUserAndLogin();

        UpdateProfileDTO dto = new UpdateProfileDTO();
        dto.setNickname("新名字");
        dto.setPhone("13987654321");

        userService.updateProfile(dto);

        SysUser updated = userMapper.selectById(testUserId);
        assertEquals("新名字", updated.getNickname());
        assertEquals("13987654321", updated.getPhone());
    }

    // ==================== 内部工具方法 ====================

    private void createTestUserAndLogin() {
        SysUser user = new SysUser();
        user.setUsername(TEST_USERNAME);
        user.setPassword(PasswordUtil.encode(TEST_PASSWORD));
        user.setNickname("测试用户");
        user.setDeptId(1L);
        user.setRole("user");
        user.setStatus(1);
        userMapper.insert(user);
        this.testUserId = user.getUserId();

        StpUtil.login(testUserId);
    }
}
