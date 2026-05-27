package com.laikuang.archive.system.domain.vo;

import lombok.Data;

/**
 * 登录成功响应 VO。
 * 前端后续请求将 token 放入 Header: satoken: {token}
 */
@Data
public class LoginVO {

    /** Sa-Token 颁发的 JWT Token 值 */
    private String  token;

    /** Token 对应的 Header 名称，固定为 "satoken" */
    private String  tokenName;

    private Long    userId;
    private String  username;
    private String  nickname;

    /** 角色标识：user / archive_admin / company_leader */
    private String  role;
}
