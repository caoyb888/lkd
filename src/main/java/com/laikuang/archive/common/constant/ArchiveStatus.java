package com.laikuang.archive.common.constant;

/**
 * 档案生命周期状态常量。
 */
public interface ArchiveStatus {

    /** 草稿：仅立卷人可见，可修改/删除 */
    int DRAFT = 0;

    /** 待审核：检查人/审核人可见，立卷人只读 */
    int PENDING_REVIEW = 1;

    /** 待确认：档案管理员可见，可退回或确认 */
    int PENDING_CONFIRM = 2;

    /** 已正式归档：全员可查，不可修改 */
    int ARCHIVED = 3;
}
