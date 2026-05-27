package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 修改密码 DTO（任意登录用户，需提供原密码）。
 * 新密码强度规则在 Service 层通过 PasswordUtil.isStrong() 额外校验：
 *   至少6位，且同时包含字母、数字、特殊字符（$@!%*#?&）。
 */
@Data
public class ChangePasswordDTO {

    @NotBlank(message = "原密码不能为空")
    private String oldPassword;

    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 100, message = "新密码长度为6-100位")
    private String newPassword;
}
