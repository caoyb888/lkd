package com.laikuang.archive.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.system.domain.dto.ChangePasswordDTO;
import com.laikuang.archive.system.domain.dto.CreateUserDTO;
import com.laikuang.archive.system.domain.dto.ResetPasswordDTO;
import com.laikuang.archive.system.domain.dto.UpdateProfileDTO;
import com.laikuang.archive.system.domain.dto.UpdateUserDTO;
import com.laikuang.archive.system.domain.vo.UserListVO;

public interface UserService {

    // ---- 个人中心（任意已登录用户）----

    /**
     * 更新当前登录用户的昵称和手机号。
     * userId 强制取自 Sa-Token 会话，防止水平越权。
     */
    void updateProfile(UpdateProfileDTO dto);

    /**
     * 修改当前登录用户的密码。
     * 执行：旧密码校验 → 新密码强度校验 → Argon2id 哈希 → 持久化。
     */
    void changePassword(ChangePasswordDTO dto);

    // ---- 管理员用户管理（需要 user:manage 权限）----

    /**
     * 分页查询用户列表（手机号脱敏，密码不返回）。
     * @param keyword 可选，模糊匹配用户名或昵称
     */
    IPage<UserListVO> pageUsers(PageQuery pageQuery, String keyword);

    /**
     * 创建新用户。
     * 执行：用户名唯一性校验 → 初始密码强度校验 → Argon2id 哈希 → 写入。
     */
    void createUser(CreateUserDTO dto);

    /**
     * 更新用户信息（局部更新，非 null 字段才更新）。
     */
    void updateUser(Long userId, UpdateUserDTO dto);

    /**
     * 管理员重置用户密码（无需旧密码），重置后强制踢出该用户所有活跃会话。
     */
    void resetPassword(Long userId, ResetPasswordDTO dto);
}
