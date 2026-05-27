package com.laikuang.archive.borrow.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.borrow.domain.dto.ArchiveBorrowApplyDTO;
import com.laikuang.archive.borrow.domain.dto.ArchiveBorrowApproveDTO;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowListVO;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowVO;
import com.laikuang.archive.borrow.service.ArchiveBorrowService;
import com.laikuang.archive.common.constant.ApproveAction;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.result.Result;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 档案借阅管理接口。
 */
@Validated
@RestController
@RequestMapping("/borrow")
@RequiredArgsConstructor
public class ArchiveBorrowController {

    private final ArchiveBorrowService borrowService;

    // ==================== 借阅申请（borrow:apply）====================

    /**
     * POST /api/borrow/apply
     */
    @PostMapping("/apply")
    @SaCheckPermission(PermissionConstants.BORROW_APPLY)
    public Result<ArchiveBorrowVO> apply(@RequestBody @Validated ArchiveBorrowApplyDTO dto) {
        return Result.success(borrowService.apply(dto));
    }

    /**
     * GET /api/borrow/my-page?current=1&pageSize=10&status=1
     */
    @GetMapping("/my-page")
    @SaCheckPermission(PermissionConstants.BORROW_APPLY)
    public Result<IPage<ArchiveBorrowListVO>> pageMyBorrows(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) Integer status) {
        return Result.success(borrowService.pageMyBorrows(pageQuery, status));
    }

    /**
     * PUT /api/borrow/{borrowId}/return
     * 借阅人自主归还。
     */
    @PutMapping("/{borrowId}/return")
    @SaCheckPermission(PermissionConstants.BORROW_APPLY)
    public Result<Void> returnBorrow(
            @PathVariable @NotNull(message = "借阅ID不能为空") Long borrowId) {
        borrowService.returnBorrow(borrowId);
        return Result.success();
    }

    // ==================== 借阅审批（borrow:approve）====================

    /**
     * GET /api/borrow/pending-page?current=1&pageSize=10&keyword=xxx
     */
    @GetMapping("/pending-page")
    @SaCheckPermission(PermissionConstants.BORROW_APPROVE)
    public Result<IPage<ArchiveBorrowListVO>> pagePendingApprovals(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String keyword) {
        return Result.success(borrowService.pagePendingApprovals(pageQuery, keyword));
    }

    /**
     * PUT /api/borrow/{borrowId}/approve
     */
    @PutMapping("/{borrowId}/approve")
    @SaCheckPermission(PermissionConstants.BORROW_APPROVE)
    public Result<Void> approve(
            @PathVariable @NotNull(message = "借阅ID不能为空") Long borrowId,
            @RequestBody @Validated ArchiveBorrowApproveDTO dto) {
        if (!ApproveAction.PASS.equals(dto.getAction())) {
            return Result.fail("审批动作必须为 PASS");
        }
        borrowService.approve(borrowId, dto.getBorrowDays(), dto.getOpinion());
        return Result.success();
    }

    /**
     * PUT /api/borrow/{borrowId}/reject
     */
    @PutMapping("/{borrowId}/reject")
    @SaCheckPermission(PermissionConstants.BORROW_APPROVE)
    public Result<Void> reject(
            @PathVariable @NotNull(message = "借阅ID不能为空") Long borrowId,
            @RequestBody @Validated ArchiveBorrowApproveDTO dto) {
        if (!ApproveAction.REJECT.equals(dto.getAction())) {
            return Result.fail("审批动作必须为 REJECT");
        }
        borrowService.reject(borrowId, dto.getOpinion());
        return Result.success();
    }

    /**
     * PUT /api/borrow/{borrowId}/admin-return
     * 管理员代办归还（可对任意借阅人的借阅单登记归还）。
     */
    @PutMapping("/{borrowId}/admin-return")
    @SaCheckPermission(PermissionConstants.BORROW_APPROVE)
    public Result<Void> adminReturn(
            @PathVariable @NotNull(message = "借阅ID不能为空") Long borrowId,
            @RequestBody(required = false) ArchiveBorrowApproveDTO dto) {
        String opinion = (dto != null) ? dto.getOpinion() : null;
        borrowService.adminReturn(borrowId, opinion);
        return Result.success();
    }

    // ==================== 查询 ====================

    /**
     * GET /api/borrow/{borrowId}
     */
    @GetMapping("/{borrowId}")
    @SaCheckPermission(PermissionConstants.BORROW_APPLY)
    public Result<ArchiveBorrowVO> getBorrowDetail(
            @PathVariable @NotNull(message = "借阅ID不能为空") Long borrowId) {
        return Result.success(borrowService.getBorrowDetail(borrowId));
    }

    // ==================== 借阅历史 ====================

    /**
     * GET /api/borrow/dept-history?current=1&pageSize=10&status=3
     */
    @GetMapping("/dept-history")
    @SaCheckPermission(PermissionConstants.BORROW_HISTORY_DEPT)
    public Result<IPage<ArchiveBorrowListVO>> pageDeptHistory(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) Integer status) {
        return Result.success(borrowService.pageDeptHistory(pageQuery, status));
    }

    /**
     * GET /api/borrow/all-history?current=1&pageSize=10&deptName=xxx&status=3
     */
    @GetMapping("/all-history")
    @SaCheckPermission(PermissionConstants.BORROW_HISTORY_ALL)
    public Result<IPage<ArchiveBorrowListVO>> pageAllHistory(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String deptName,
            @RequestParam(required = false) Integer status) {
        return Result.success(borrowService.pageAllHistory(pageQuery, deptName, status));
    }
}
