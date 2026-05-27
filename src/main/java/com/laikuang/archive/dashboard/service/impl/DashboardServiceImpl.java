package com.laikuang.archive.dashboard.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.common.constant.ArchiveStatus;
import com.laikuang.archive.common.constant.BorrowStatus;
import com.laikuang.archive.dashboard.domain.vo.DashboardOverviewVO;
import com.laikuang.archive.dashboard.service.DashboardService;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Dashboard 数据概览服务实现。
 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveBorrowMapper borrowMapper;

    @Override
    public DashboardOverviewVO getOverview() {
        DashboardOverviewVO vo = new DashboardOverviewVO();

        // 1. 总案卷数（未销毁）
        vo.setTotalVolumeCount(volumeMapper.selectCount(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getDestroyFlag, 0)));

        // 2. 已正式归档数
        vo.setArchivedCount(volumeMapper.selectCount(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getStatus, ArchiveStatus.ARCHIVED)
                        .eq(ArchiveVolume::getDestroyFlag, 0)));

        // 3. 当前借出数
        vo.setCurrentBorrowedCount(borrowMapper.selectCount(
                new LambdaQueryWrapper<ArchiveBorrow>()
                        .eq(ArchiveBorrow::getStatus, BorrowStatus.BORROWED)));

        // 4. 待处理审批数 = 归档待审核 + 待确认 + 借阅待审批
        long pendingArchive = volumeMapper.selectCount(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .in(ArchiveVolume::getStatus, ArchiveStatus.PENDING_REVIEW, ArchiveStatus.PENDING_CONFIRM)
                        .eq(ArchiveVolume::getDestroyFlag, 0));
        long pendingBorrow = borrowMapper.selectCount(
                new LambdaQueryWrapper<ArchiveBorrow>()
                        .eq(ArchiveBorrow::getStatus, BorrowStatus.PENDING));
        vo.setPendingApproveCount(pendingArchive + pendingBorrow);

        // 5. 年度归档趋势（近5年）
        int currentYear = LocalDate.now().getYear();
        List<DashboardOverviewVO.YearArchiveStat> yearTrend = new ArrayList<>();
        for (int i = 4; i >= 0; i--) {
            String year = String.valueOf(currentYear - i);
            long count = volumeMapper.selectCount(
                    new LambdaQueryWrapper<ArchiveVolume>()
                            .eq(ArchiveVolume::getYear, year)
                            .eq(ArchiveVolume::getStatus, ArchiveStatus.ARCHIVED)
                            .eq(ArchiveVolume::getDestroyFlag, 0));
            DashboardOverviewVO.YearArchiveStat stat = new DashboardOverviewVO.YearArchiveStat();
            stat.setYear(year);
            stat.setCount(count);
            yearTrend.add(stat);
        }
        vo.setYearTrend(yearTrend);

        // 6. 档案状态分布
        List<DashboardOverviewVO.StatusDistribution> statusDistribution = new ArrayList<>();
        statusDistribution.add(buildStatusDist(ArchiveStatus.DRAFT, "草稿"));
        statusDistribution.add(buildStatusDist(ArchiveStatus.PENDING_REVIEW, "待审核"));
        statusDistribution.add(buildStatusDist(ArchiveStatus.PENDING_CONFIRM, "待确认"));
        statusDistribution.add(buildStatusDist(ArchiveStatus.ARCHIVED, "已归档"));
        vo.setStatusDistribution(statusDistribution);

        return vo;
    }

    private DashboardOverviewVO.StatusDistribution buildStatusDist(int status, String statusName) {
        long count = volumeMapper.selectCount(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getStatus, status)
                        .eq(ArchiveVolume::getDestroyFlag, 0));
        DashboardOverviewVO.StatusDistribution dist = new DashboardOverviewVO.StatusDistribution();
        dist.setStatus(status);
        dist.setStatusName(statusName);
        dist.setCount(count);
        return dist;
    }
}
