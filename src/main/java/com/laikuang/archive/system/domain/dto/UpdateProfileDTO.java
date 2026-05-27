package com.laikuang.archive.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新个人信息 DTO（任意登录用户可调用，仅限修改自己的信息）。
 */
@Data
public class UpdateProfileDTO {

    @NotBlank(message = "昵称不能为空")
    @Size(max = 50, message = "昵称长度不能超过50位")
    private String nickname;

    /**
     * 手机号（可选）。
     * 规则：11位中国大陆手机号（1[3-9]xxxxxxxxx），或空字符串（表示清空手机号）。
     * null 和空字符串均视为"不填写"，后端将字段置空。
     */
    @Pattern(
        regexp = "^$|^1[3-9]\\d{9}$",
        message = "手机号格式不正确，请输入11位手机号"
    )
    private String phone;
}
