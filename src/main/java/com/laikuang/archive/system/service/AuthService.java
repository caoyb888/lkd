package com.laikuang.archive.system.service;

import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.system.domain.vo.LoginVO;
import com.laikuang.archive.system.domain.vo.UserInfoVO;

public interface AuthService {

    /**
     * 用户登录。
     * 执行 Argon2id 密码校验，通过后由 Sa-Token 颁发 JWT。
     */
    LoginVO login(LoginDTO dto);

    /** 注销当前 Token，清除 Sa-Token 会话 */
    void logout();

    /** 获取当前登录用户信息（手机号已脱敏） */
    UserInfoVO getCurrentUserInfo();
}
