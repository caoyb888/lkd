package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员创建用户 DTO（需要 user:manage 权限）。
 */
@Data
public class CreateUserDTO {

    @NotBlank(message = "用户名不能为空")
    @Size(max = 50, message = "用户名长度不能超过50位")
    @Pattern(regexp = "^[A-Za-z0-9_]{3,50}$", message = "用户名只能包含字母、数字和下划线，长度3-50位")
    private String username;

    @NotBlank(message = "昵称不能为空")
    @Size(max = 50, message = "昵称长度不能超过50位")
    private String nickname;

    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "手机号格式不正确，请输入11位手机号")
    private String phone;

    @NotNull(message = "所属部门不能为空")
    private Long deptId;

    @NotBlank(message = "角色不能为空")
    @Pattern(
        regexp = "^(user|archive_admin|company_leader)$",
        message = "角色值不合法，合法值：user / archive_admin / company_leader"
    )
    private String role;

    /**
     * 初始密码（必须符合强度规则）。
     * 规则：至少6位，同时包含字母、数字及特殊字符（$@!%*#?&）。
     */
    @NotBlank(message = "初始密码不能为空")
    @Size(min = 6, max = 100, message = "初始密码长度为6-100位")
    private String initialPassword;
}
