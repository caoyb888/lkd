package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员更新用户信息 DTO（需要 user:manage 权限）。
 * 所有字段均为可选，非 null 字段才会被更新（局部更新语义）。
 */
@Data
public class UpdateUserDTO {

    @Size(max = 50, message = "昵称长度不能超过50位")
    private String nickname;

    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "手机号格式不正确，请输入11位手机号")
    private String phone;

    private Long deptId;

    @Pattern(
        regexp = "^(user|archive_admin|company_leader)$",
        message = "角色值不合法，合法值：user / archive_admin / company_leader"
    )
    private String role;

    /** 账号状态：1-启用，0-禁用 */
    private Integer status;
}
