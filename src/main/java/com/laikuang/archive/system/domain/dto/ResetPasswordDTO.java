package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员重置用户密码 DTO（无需验证原密码）。
 * 执行后强制踢出目标用户所有活跃会话。
 */
@Data
public class ResetPasswordDTO {

    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 100, message = "新密码长度为6-100位")
    private String newPassword;
}
