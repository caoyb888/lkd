package com.laikuang.archive.system.domain.vo;

import lombok.Data;

/**
 * 当前登录用户信息 VO。
 * 敏感字段已脱敏：手机号格式为 138****5678，密码不返回。
 */
@Data
public class UserInfoVO {

    private Long   userId;
    private String username;
    private String nickname;

    /** 手机号（脱敏处理：138****5678） */
    private String phone;

    private Long   deptId;

    /** 角色标识 */
    private String role;

    /** 账号状态：1-正常，0-禁用 */
    private Integer status;
}
