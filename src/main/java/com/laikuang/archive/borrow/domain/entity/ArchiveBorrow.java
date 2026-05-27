package com.laikuang.archive.borrow.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.laikuang.archive.common.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 档案借阅申请及状态流转实体。
 * status: 0-待审批 1-已借出 2-已驳回 3-已归还 4-逾期未归还
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("archive_borrow")
public class ArchiveBorrow extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long          borrowId;

    /** 借阅申请人ID，关联 sys_user.user_id */
    private Long          borrowerId;

    /** 借阅人部门快照，防止部门变更导致历史数据偏差 */
    private String        borrowerDept;

    private String        archiveNo;
    private Integer       applyCount;
    private String        reason;
    private LocalDateTime borrowDate;
    private LocalDateTime planReturnDate;
    private LocalDateTime actualReturnDate;

    /** 借阅状态：0-待审批，1-已借出，2-已驳回，3-已归还，4-逾期 */
    private Integer       status;
}
