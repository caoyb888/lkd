package com.laikuang.archive.dashboard.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.dashboard.domain.vo.DashboardOverviewVO;
import com.laikuang.archive.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dashboard 数据概览接口。
 */
@Validated
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * GET /api/dashboard/overview
     * 获取 Dashboard 概览统计数据。
     */
    @GetMapping("/overview")
    @SaCheckLogin
    public Result<DashboardOverviewVO> getOverview() {
        return Result.success(dashboardService.getOverview());
    }
}
