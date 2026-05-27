package com.laikuang.archive.approve.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.approve.domain.vo.ArchiveApproveLogVO;
import com.laikuang.archive.common.domain.PageQuery;

import java.util.List;

/**
 * 审批日志服务接口。
 */
public interface ArchiveApproveService {

    /**
     * 保存审批日志。
     *
     * @param businessType 业务类型
     * @param targetId     目标业务ID
     * @param action       审批动作
     * @param opinion      审批意见
     */
    void saveLog(Integer businessType, Long targetId, String action, String opinion);

    /**
     * 按目标ID与业务类型范围查询审批日志（按时间倒序）。
     *
     * @param targetId      目标业务ID
     * @param businessTypes 业务类型范围
     * @return 审批日志列表
     */
    List<ArchiveApproveLogVO> listLogsByTarget(Long targetId, Integer... businessTypes);

    /**
     * 分页查询审批历史（全量，管理员/领导可见）。
     *
     * @param pageQuery    分页参数
     * @param businessType 业务类型筛选
     * @param approverName 审批人姓名模糊
     * @param keyword      档号关键词模糊
     * @param dateFrom     开始日期（yyyy-MM-dd）
     * @param dateTo       结束日期（yyyy-MM-dd）
     * @return 审批历史分页
     */
    IPage<ArchiveApproveLogVO> historyPage(PageQuery pageQuery, Integer businessType,
                                             String approverName, String keyword,
                                             String dateFrom, String dateTo);
}
