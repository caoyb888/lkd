package com.laikuang.archive.system.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.common.constant.BorrowStatus;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.system.domain.entity.SysNotification;
import com.laikuang.archive.system.domain.vo.NotifyCountVO;
import com.laikuang.archive.system.service.NotificationService;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 系统通知/待办消息接口。
 */
@Validated
@RestController
@RequestMapping("/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final ArchiveBorrowMapper borrowMapper;
    private final ArchiveVolumeMapper volumeMapper;

    /**
     * GET /api/notification/count
     * 查询当前用户的待办汇总数量，用于侧边栏徽标。
     */
    @GetMapping("/count")
    @SaCheckLogin
    public Result<NotifyCountVO> getNotifyCount() {
        Long userId = StpUtil.getLoginIdAsLong();
        boolean isAdmin = StpUtil.hasPermission(PermissionConstants.BORROW_APPROVE);

        // 1. pendingApprove：管理员/检查人可见的待审批队列数量（归档待审核 + 借阅待审批）
        long pendingApprove = 0;
        if (isAdmin) {
            // 待归档审核（status=1）+ 待归档确认（status=2）
            long pendingArchive = volumeMapper.selectCount(
                    new LambdaQueryWrapper<ArchiveVolume>()
                            .in(ArchiveVolume::getStatus, 1, 2)
                            .eq(ArchiveVolume::getDestroyFlag, 0));
            // 待借阅审批（status=0）
            long pendingBorrow = borrowMapper.selectCount(
                    new LambdaQueryWrapper<ArchiveBorrow>()
                            .eq(ArchiveBorrow::getStatus, BorrowStatus.PENDING));
            pendingApprove = pendingArchive + pendingBorrow;
        }

        // 2. overdueCount：当前用户逾期未归还数
        long overdueCount = borrowMapper.selectCount(
                new LambdaQueryWrapper<ArchiveBorrow>()
                        .eq(ArchiveBorrow::getBorrowerId, userId)
                        .eq(ArchiveBorrow::getStatus, BorrowStatus.OVERDUE));

        // 3. myPendingBorrow：当前用户待审批申请数
        long myPendingBorrow = borrowMapper.selectCount(
                new LambdaQueryWrapper<ArchiveBorrow>()
                        .eq(ArchiveBorrow::getBorrowerId, userId)
                        .eq(ArchiveBorrow::getStatus, BorrowStatus.PENDING));

        return Result.success(new NotifyCountVO(pendingApprove, overdueCount, myPendingBorrow));
    }

    /**
     * GET /api/notification/unread
     */
    @GetMapping("/unread")
    @SaCheckLogin
    public Result<List<SysNotification>> listUnread() {
        Long userId = StpUtil.getLoginIdAsLong();
        return Result.success(notificationService.listUnread(userId));
    }

    /**
     * GET /api/notification/page?current=1&pageSize=10&isRead=0
     */
    @GetMapping("/page")
    @SaCheckLogin
    public Result<IPage<SysNotification>> pageNotifications(
            @Validated PageQuery pageQuery,
            @RequestParam(required = false) Integer isRead) {
        Long userId = StpUtil.getLoginIdAsLong();
        return Result.success(notificationService.pageNotifications(pageQuery, userId, isRead));
    }

    /**
     * PUT /api/notification/{noticeId}/read
     */
    @PutMapping("/{noticeId}/read")
    @SaCheckLogin
    public Result<Void> markAsRead(@PathVariable Long noticeId) {
        notificationService.markAsRead(noticeId);
        return Result.success();
    }

    /**
     * PUT /api/notification/read-all
     */
    @PutMapping("/read-all")
    @SaCheckLogin
    public Result<Void> markAllAsRead() {
        Long userId = StpUtil.getLoginIdAsLong();
        notificationService.markAllAsRead(userId);
        return Result.success();
    }
}
