package com.laikuang.archive.system.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.laikuang.archive.common.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long    userId;
    private String  username;

    /** 密码字段序列化时屏蔽，禁止通过接口返回给前端 */
    @JsonIgnore
    private String  password;

    private String  nickname;

    /** 手机号禁止直接通过 Entity 序列化暴露给前端，必须通过 VO 脱敏后返回 */
    @JsonIgnore
    private String  phone;

    private Long    deptId;

    /** 角色：user / archive_admin / company_leader */
    private String  role;

    /** 账号状态：1-正常，0-禁用 */
    private Integer status;
}
