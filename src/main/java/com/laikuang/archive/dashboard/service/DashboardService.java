package com.laikuang.archive.dashboard.service;

import com.laikuang.archive.dashboard.domain.vo.DashboardOverviewVO;

/**
 * Dashboard 数据概览服务接口。
 */
public interface DashboardService {

    /**
     * 获取 Dashboard 概览统计数据。
     */
    DashboardOverviewVO getOverview();
}
