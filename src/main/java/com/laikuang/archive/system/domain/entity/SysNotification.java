package com.laikuang.archive.system.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.laikuang.archive.common.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 系统通知及待办消息实体。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_notification")
public class SysNotification extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long    noticeId;

    private Long    userId;
    private String  title;
    private String  content;

    /** 通知类型：1-借阅到期提醒，2-借阅逾期提醒 */
    private Integer type;

    /** 关联业务ID（如 borrow_id） */
    private Long    refId;

    /** 是否已读：0-未读，1-已读 */
    private Integer isRead;
}
