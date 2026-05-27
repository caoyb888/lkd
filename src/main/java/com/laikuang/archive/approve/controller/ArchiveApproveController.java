package com.laikuang.archive.approve.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.approve.domain.vo.ArchiveApproveLogVO;
import com.laikuang.archive.approve.service.ArchiveApproveService;
import com.laikuang.archive.common.constant.ApproveBusinessType;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.result.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 审批日志查询接口。
 */
@Validated
@RestController
@RequestMapping("/approve")
@RequiredArgsConstructor
public class ArchiveApproveController {

    private final ArchiveApproveService approveService;

    /**
     * GET /api/approve/volume/{targetId}/logs
     * 查询案卷的归档审批历史（包含归档审核与归档确认）。
     */
    @GetMapping("/volume/{targetId}/logs")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<List<ArchiveApproveLogVO>> listVolumeApproveLogs(@PathVariable Long targetId) {
        return Result.success(approveService.listLogsByTarget(
                targetId, ApproveBusinessType.ARCHIVE_REVIEW, ApproveBusinessType.ARCHIVE_CONFIRM));
    }

    /**
     * GET /api/approve/destroy/{targetId}/logs
     * 查询案卷的销毁审批历史。
     */
    @GetMapping("/destroy/{targetId}/logs")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<List<ArchiveApproveLogVO>> listDestroyApproveLogs(@PathVariable Long targetId) {
        return Result.success(approveService.listLogsByTarget(
                targetId, ApproveBusinessType.DESTROY_APPROVE));
    }

    /**
     * GET /api/approve/history/page
     * 审批历史分页查询（全量，管理员/领导可见）。
     */
    @GetMapping("/history/page")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<IPage<ArchiveApproveLogVO>> historyPage(
            @Validated PageQuery pageQuery,
            @RequestParam(required = false) Integer businessType,
            @RequestParam(required = false) String approverName,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        return Result.success(approveService.historyPage(pageQuery, businessType, approverName, keyword, dateFrom, dateTo));
    }
}
