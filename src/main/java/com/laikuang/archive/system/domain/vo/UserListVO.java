package com.laikuang.archive.system.domain.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户列表 VO（管理员视图）。
 * 手机号已做脱敏处理（138****5678），密码字段不返回。
 */
@Data
public class UserListVO {

    private Long          userId;
    private String        username;
    private String        nickname;

    /** 手机号（脱敏） */
    private String        phone;

    /** 手机号（原始值，仅编辑时使用） */
    private String        phoneRaw;

    private Long          deptId;
    private String        deptName;
    private List<String>  roles;

    /** 账号状态：1-正常，0-禁用 */
    private Integer       status;

    private LocalDateTime createdAt;
}
