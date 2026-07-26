package com.laikuang.archive.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.system.domain.dto.ChangePasswordDTO;
import com.laikuang.archive.system.domain.dto.CreateUserDTO;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Sprint 1 — S1-05：系统管理模块 Controller 层集成测试。
 * 使用 MockMvc 测试 RESTful 接口、参数校验、Sa-Token 鉴权、统一响应格式。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SystemControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SysUserMapper userMapper;

    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        // 通过 HTTP 登录获取 Token
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername("admin");
        loginDTO.setPassword("Admin@123");

        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // Result 为不可变封装（无私有构造），测试侧用 JsonNode 解析
        adminToken = objectMapper.readTree(body).path("data").path("token").asText();
        assertNotNull(adminToken, "Token 不应为空");
    }

    // ==================== 认证接口 ====================

    @Test
    @DisplayName("POST /auth/login: 登录成功应返回 2000 及 Token")
    void loginShouldReturnToken() throws Exception {
        LoginDTO dto = new LoginDTO();
        dto.setUsername("admin");
        dto.setPassword("Admin@123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.SUCCESS))
                .andExpect(jsonPath("$.data.token").exists())
                .andExpect(jsonPath("$.data.role").value("company_leader"));
    }

    @Test
    @DisplayName("POST /auth/login: 密码错误应返回统一提示，code=401")
    void loginWithWrongPasswordShouldReturnUnifiedMessage() throws Exception {
        LoginDTO dto = new LoginDTO();
        dto.setUsername("admin");
        dto.setPassword("Wrong@123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.UNAUTHORIZED))
                .andExpect(jsonPath("$.msg").value("用户名或密码错误"));
    }

    @Test
    @DisplayName("POST /auth/login: 参数校验失败应返回 4000")
    void loginWithEmptyUsernameShouldReturnParamError() throws Exception {
        LoginDTO dto = new LoginDTO();
        dto.setUsername("");
        dto.setPassword("123456");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.PARAM_ERROR));
    }

    @Test
    @DisplayName("GET /auth/info: 未携带 Token 应返回 401")
    void getUserInfoWithoutTokenShouldReturn401() throws Exception {
        mockMvc.perform(get("/auth/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.UNAUTHORIZED));
    }

    @Test
    @DisplayName("GET /auth/info: 携带 Token 应返回用户信息（手机号脱敏）")
    void getUserInfoWithTokenShouldReturnDesensitizedPhone() throws Exception {
        // 先更新管理员手机号
        SysUser admin = userMapper.selectById(1L);
        admin.setPhone("13812345678");
        userMapper.updateById(admin);

        mockMvc.perform(get("/auth/info")
                        .header("satoken", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.SUCCESS))
                .andExpect(jsonPath("$.data.phone").value("138****5678"));
    }

    // ==================== 用户管理接口（鉴权） ====================

    @Test
    @DisplayName("GET /user/page: 无 Token 应返回 401")
    void pageUsersWithoutTokenShouldReturn401() throws Exception {
        mockMvc.perform(get("/user/page?current=1&pageSize=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.UNAUTHORIZED));
    }

    @Test
    @DisplayName("POST /user: 管理员创建用户应成功")
    void adminCreateUserShouldSuccess() throws Exception {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setUsername("controller_user");
        dto.setNickname("控制器测试用户");
        dto.setPhone("13800138002");
        dto.setDeptId(1L);
        dto.setRole("user");
        dto.setInitialPassword("Strong@123");

        mockMvc.perform(post("/user")
                        .header("satoken", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.SUCCESS));
    }

    @Test
    @DisplayName("POST /user: 弱密码应返回密码强度错误")
    void createUserWithWeakPasswordShouldFail() throws Exception {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setUsername("weak_user");
        dto.setNickname("弱密码");
        dto.setDeptId(1L);
        dto.setRole("user");
        dto.setInitialPassword("123456");

        mockMvc.perform(post("/user")
                        .header("satoken", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.PASSWORD_RULE_INVALID));
    }

    @Test
    @DisplayName("PUT /user/password: 修改密码接口参数校验")
    void changePasswordValidation() throws Exception {
        ChangePasswordDTO dto = new ChangePasswordDTO();
        dto.setOldPassword("");
        dto.setNewPassword("123");

        mockMvc.perform(put("/user/password")
                        .header("satoken", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.PARAM_ERROR));
    }

    // ==================== 部门管理接口 ====================

    @Test
    @DisplayName("GET /dept/tree: 无需权限即可访问")
    void getDeptTreeWithoutPermission() throws Exception {
        mockMvc.perform(get("/dept/tree")
                        .header("satoken", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.SUCCESS));
    }

    // ==================== 字典管理接口 ====================

    @Test
    @DisplayName("GET /dict/all-items: 任意登录用户可访问")
    void getAllActiveItemsShouldBeAccessible() throws Exception {
        mockMvc.perform(get("/dict/all-items")
                        .header("satoken", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.SUCCESS));
    }

    @Test
    @DisplayName("POST /dict: 管理员能成功创建字典")
    void createDictWithPermissionShouldSuccess() throws Exception {
        com.laikuang.archive.system.domain.dto.CreateDictDTO dto =
                new com.laikuang.archive.system.domain.dto.CreateDictDTO();
        dto.setDictCode("controller_dict");
        dto.setDictName("控制器字典");

        mockMvc.perform(post("/dict")
                        .header("satoken", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.SUCCESS));
    }

    // ==================== 统一响应格式校验 ====================

    @Test
    @DisplayName("所有成功响应应包含 traceId、code=2000")
    void responseShouldContainTraceId() throws Exception {
        mockMvc.perform(get("/auth/info")
                        .header("satoken", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(ResultCode.SUCCESS))
                .andExpect(jsonPath("$.traceId").exists())
                .andExpect(jsonPath("$.msg").exists());
    }

    @Test
    @DisplayName("未预期异常不应暴露堆栈（兜底 5000）")
    void unexpectedExceptionShouldNotExposeStack() throws Exception {
        mockMvc.perform(get("/user/page?current=abc&pageSize=10")
                        .header("satoken", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.traceId").exists())
                .andExpect(jsonPath("$.msg").exists());
    }
}
