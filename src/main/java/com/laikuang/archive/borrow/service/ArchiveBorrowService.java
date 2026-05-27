package com.laikuang.archive.borrow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.borrow.domain.dto.ArchiveBorrowApplyDTO;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowListVO;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowVO;
import com.laikuang.archive.common.domain.PageQuery;

/**
 * 档案借阅业务接口。
 */
public interface ArchiveBorrowService {

    /**
     * 发起借阅申请。
     * 校验：档案已正式归档、未被销毁、仍有库存、无重复申请。
     */
    ArchiveBorrowVO apply(ArchiveBorrowApplyDTO dto);

    /**
     * 批准借阅（管理员）。
     * 原子更新档案在库状态与已借出份数。
     */
    void approve(Long borrowId, Integer borrowDays, String opinion);

    /**
     * 驳回借阅（管理员）。
     */
    void reject(Long borrowId, String opinion);

    /**
     * 归还借阅（借阅人本人）。
     * 水平越权校验：只能归还自己的借阅单。
     */
    void returnBorrow(Long borrowId);

    /**
     * 管理员登记归还（可代任意借阅人办理归还）。
     * 不校验借阅人身份，需 borrow:approve 权限。
     */
    void adminReturn(Long borrowId, String opinion);

    /**
     * 分页查询当前用户的借阅记录。
     * @param status 可选状态过滤
     */
    IPage<ArchiveBorrowListVO> pageMyBorrows(PageQuery pageQuery, Integer status);

    /**
     * 分页查询待审批借阅列表（管理员）。
     * @param keyword 可选关键词（档号/申请部门模糊匹配）
     */
    IPage<ArchiveBorrowListVO> pagePendingApprovals(PageQuery pageQuery, String keyword);

    /**
     * 借阅单详情。
     */
    ArchiveBorrowVO getBorrowDetail(Long borrowId);

    /**
     * 扫描逾期借阅：将已超期未还的记录状态更新为逾期，并发送系统通知。
     * 由定时任务每日凌晨调用。
     */
    void scanOverdue();

    /**
     * 分页查询本部门借阅历史（已结束状态：已归还/已驳回/已逾期）。
     */
    IPage<ArchiveBorrowListVO> pageDeptHistory(PageQuery pageQuery, Integer status);

    /**
     * 分页查询全局借阅历史（管理员）。
     */
    IPage<ArchiveBorrowListVO> pageAllHistory(PageQuery pageQuery, String deptName, Integer status);
}
