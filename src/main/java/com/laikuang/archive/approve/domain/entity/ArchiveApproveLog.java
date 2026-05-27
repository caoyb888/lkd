package com.laikuang.archive.approve.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 档案流程审批历史及审计日志实体。
 * 审计日志只有 createdAt，无 updatedAt（写后不可变），不继承 BaseEntity。
 * businessType: 1-归档审核 2-归档确认 3-销毁审批 4-借阅审批
 * action: PASS-通过 REJECT-驳回 BACK-退回
 */
@Data
@TableName("archive_approve_log")
public class ArchiveApproveLog implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long    logId;

    private Integer businessType;
    private Long    targetId;
    private Long    approverId;
    private String  action;
    private String  opinion;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
