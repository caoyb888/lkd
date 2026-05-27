package com.laikuang.archive.system.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.common.constant.ResultCode;
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
import com.laikuang.archive.system.mapper.SysDeptMapper;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.slf4j.MDC;

/**
 * 用户中心业务实现。
 *
 * 安全关键点：
 *   1. 个人操作（updateProfile / changePassword）的 userId 从 Sa-Token 会话取得，
 *      严禁从入参取 userId，防止水平越权（OWASP A01）。
 *   2. 密码修改前验证原密码正确性，验证新密码强度，两次 Argon2id 哈希开销较大，
 *      属于正常业务行为，不做缓存。
 *   3. 管理员重置密码后立即踢掉目标用户所有活跃 Token，确保账号安全。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final SysUserMapper userMapper;
    private final SysDeptMapper deptMapper;

    // ======== 个人中心 ========

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateProfile(UpdateProfileDTO dto) {
        Long currentUserId = StpUtil.getLoginIdAsLong();

        SysUser update = new SysUser();
        update.setUserId(currentUserId);
        update.setNickname(dto.getNickname());
        // phone 允许传空字符串来清空手机号，传 null 则跳过（不修改）
        if (dto.getPhone() != null) {
            update.setPhone(StringUtils.hasText(dto.getPhone()) ? dto.getPhone() : null);
        }
        userMapper.updateById(update);

        log.info("[User] 用户更新个人信息，userId={}", currentUserId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changePassword(ChangePasswordDTO dto) {
        Long currentUserId = StpUtil.getLoginIdAsLong();

        SysUser user = userMapper.selectById(currentUserId);
        if (user == null) {
            throw new BusinessException("当前用户信息不存在，请重新登录");
        }

        // 1. 验证原密码（不暴露"原密码是否正确"以外的信息）
        if (!PasswordUtil.matches(dto.getOldPassword(), user.getPassword())) {
            log.warn("[User] 修改密码：原密码校验失败，userId={}", currentUserId);
            throw new BusinessException(ResultCode.PARAM_ERROR, "原密码错误");
        }

        // 2. 新密码强度规则校验（后端强制，防止绕过前端）
        assertPasswordStrong(dto.getNewPassword());

        // 3. 新密码不能与原密码相同
        if (PasswordUtil.matches(dto.getNewPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "新密码不能与原密码相同");
        }

        // 4. Argon2id 哈希后持久化
        SysUser update = new SysUser();
        update.setUserId(currentUserId);
        update.setPassword(PasswordUtil.encode(dto.getNewPassword()));
        userMapper.updateById(update);

        log.info("[User] 用户修改密码成功，userId={}", currentUserId);
    }

    // ======== 管理员用户管理 ========

    @Override
    public IPage<UserListVO> pageUsers(PageQuery pageQuery, String keyword) {
        Page<SysUser> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());

        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
                .and(StringUtils.hasText(keyword), w -> w
                        .like(SysUser::getUsername, keyword)
                        .or()
                        .like(SysUser::getNickname, keyword))
                .orderByAsc(SysUser::getUserId);

        IPage<UserListVO> result = userMapper.selectPage(page, wrapper).convert(this::toListVO);

        // 批量查询部门名称，避免 N+1
        java.util.Set<Long> deptIds = result.getRecords().stream()
                .map(UserListVO::getDeptId)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());

        if (!deptIds.isEmpty()) {
            java.util.List<com.laikuang.archive.system.domain.entity.SysDept> depts = deptMapper.selectList(
                    new LambdaQueryWrapper<com.laikuang.archive.system.domain.entity.SysDept>()
                            .in(com.laikuang.archive.system.domain.entity.SysDept::getDeptId, deptIds));
            java.util.Map<Long, String> deptMap = depts.stream()
                    .collect(java.util.stream.Collectors.toMap(
                            com.laikuang.archive.system.domain.entity.SysDept::getDeptId,
                            com.laikuang.archive.system.domain.entity.SysDept::getDeptName));
            for (UserListVO vo : result.getRecords()) {
                if (vo.getDeptId() != null) {
                    vo.setDeptName(deptMap.getOrDefault(vo.getDeptId(), "未知部门"));
                }
            }
        }

        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createUser(CreateUserDTO dto) {
        // 1. 用户名唯一性校验
        Long existing = userMapper.selectCount(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, dto.getUsername())
        );
        if (existing > 0) {
            throw new BusinessException(ResultCode.PARAM_ERROR,
                    "用户名 [" + dto.getUsername() + "] 已存在");
        }

        // 2. 初始密码强度校验
        assertPasswordStrong(dto.getInitialPassword());

        SysUser user = new SysUser();
        user.setUsername(dto.getUsername());
        user.setNickname(dto.getNickname());
        user.setPhone(StringUtils.hasText(dto.getPhone()) ? dto.getPhone() : null);
        user.setDeptId(dto.getDeptId());
        user.setRole(dto.getRole());
        user.setPassword(PasswordUtil.encode(dto.getInitialPassword()));
        user.setStatus(1);
        userMapper.insert(user);

        log.info("[User] 管理员创建用户，operatorId={}, newUsername={}, role={}",
                StpUtil.getLoginIdAsLong(), dto.getUsername(), dto.getRole());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateUser(Long userId, UpdateUserDTO dto) {
        assertUserExists(userId);

        SysUser update = new SysUser();
        update.setUserId(userId);

        if (StringUtils.hasText(dto.getNickname()))  update.setNickname(dto.getNickname());
        if (dto.getPhone()   != null)                update.setPhone(StringUtils.hasText(dto.getPhone()) ? dto.getPhone() : null);
        if (dto.getDeptId()  != null)                update.setDeptId(dto.getDeptId());
        if (StringUtils.hasText(dto.getRole()))      update.setRole(dto.getRole());
        if (dto.getStatus()  != null)                update.setStatus(dto.getStatus());

        userMapper.updateById(update);

        log.info("[User] 管理员更新用户信息，operatorId={}, targetUserId={}",
                StpUtil.getLoginIdAsLong(), userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void resetPassword(Long userId, ResetPasswordDTO dto) {
        assertUserExists(userId);

        // 密码强度校验
        assertPasswordStrong(dto.getNewPassword());

        SysUser update = new SysUser();
        update.setUserId(userId);
        update.setPassword(PasswordUtil.encode(dto.getNewPassword()));
        userMapper.updateById(update);

        // 重置密码后立即踢出目标用户所有活跃会话，强制重新登录
        StpUtil.logout(userId);

        log.warn("[AUDIT-RESET-PWD] 管理员重置用户密码，operatorId={}, targetUserId={}, ip={}, traceId={}",
                StpUtil.getLoginIdAsLong(), userId, MDC.get("clientIP"), MDC.get("traceId"));
    }

    // ======== 内部工具 ========

    private void assertPasswordStrong(String password) {
        if (!PasswordUtil.isStrong(password)) {
            throw new BusinessException(ResultCode.PASSWORD_RULE_INVALID,
                    "密码强度不足：至少6位，且必须同时包含字母、数字及特殊字符（$@!%*#?&）");
        }
    }

    private void assertUserExists(Long userId) {
        if (userMapper.selectById(userId) == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "目标用户不存在");
        }
    }

    private static final java.util.Map<String, String> ROLE_CODE_MAP = java.util.Map.of(
        "user",           "ROLE_USER",
        "archive_admin",  "ROLE_ADMIN",
        "company_leader", "ROLE_LEADER"
    );

    private UserListVO toListVO(SysUser user) {
        UserListVO vo = new UserListVO();
        vo.setUserId(user.getUserId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setPhone(PasswordUtil.desensitizePhone(user.getPhone()));
        vo.setPhoneRaw(user.getPhone());
        vo.setDeptId(user.getDeptId());

        // 查询部门名称
        if (user.getDeptId() != null) {
            com.laikuang.archive.system.domain.entity.SysDept dept = deptMapper.selectById(user.getDeptId());
            vo.setDeptName(dept != null ? dept.getDeptName() : null);
        }

        // 角色映射为前端格式
        String roleCode = ROLE_CODE_MAP.getOrDefault(user.getRole(), user.getRole());
        vo.setRoles(java.util.Collections.singletonList(roleCode));

        vo.setStatus(user.getStatus());
        vo.setCreatedAt(user.getCreatedAt());
        return vo;
    }
}
