package com.laikuang.archive.dashboard.domain.vo;

import lombok.Data;

import java.util.List;

/**
 * Dashboard 数据概览 VO。
 */
@Data
public class DashboardOverviewVO {

    /** 总案卷数（未销毁） */
    private long totalVolumeCount;

    /** 已正式归档数 */
    private long archivedCount;

    /** 当前借出数 */
    private long currentBorrowedCount;

    /** 待处理审批数（归档待审核 + 待确认 + 借阅待审批） */
    private long pendingApproveCount;

    /** 年度归档趋势（近5年） */
    private List<YearArchiveStat> yearTrend;

    /** 档案状态分布 */
    private List<StatusDistribution> statusDistribution;

    @Data
    public static class YearArchiveStat {
        private String year;
        private long count;
    }

    @Data
    public static class StatusDistribution {
        private int status;
        private String statusName;
        private long count;
    }
}
