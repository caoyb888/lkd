package com.laikuang.archive.approve.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.approve.domain.converter.ArchiveApproveConverter;
import com.laikuang.archive.approve.domain.entity.ArchiveApproveLog;
import com.laikuang.archive.approve.domain.vo.ArchiveApproveLogVO;
import com.laikuang.archive.approve.mapper.ArchiveApproveLogMapper;
import com.laikuang.archive.approve.service.ArchiveApproveService;
import com.laikuang.archive.common.constant.ApproveAction;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

/**
 * 审批日志服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveApproveServiceImpl implements ArchiveApproveService {

    private final ArchiveApproveLogMapper approveLogMapper;
    private final ArchiveApproveConverter converter;
    private final SysUserMapper sysUserMapper;
    private final ArchiveVolumeMapper volumeMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveLog(Integer businessType, Long targetId, String action, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();

        ArchiveApproveLog entity = new ArchiveApproveLog();
        entity.setBusinessType(businessType);
        entity.setTargetId(targetId);
        entity.setApproverId(currentUserId);
        entity.setAction(action);
        entity.setOpinion(opinion);
        approveLogMapper.insert(entity);
    }

    @Override
    public List<ArchiveApproveLogVO> listLogsByTarget(Long targetId, Integer... businessTypes) {
        LambdaQueryWrapper<ArchiveApproveLog> wrapper = new LambdaQueryWrapper<ArchiveApproveLog>()
                .eq(ArchiveApproveLog::getTargetId, targetId);

        if (businessTypes != null && businessTypes.length > 0) {
            wrapper.in(ArchiveApproveLog::getBusinessType, Arrays.asList(businessTypes));
        }

        wrapper.orderByDesc(ArchiveApproveLog::getCreatedAt);

        List<ArchiveApproveLog> list = approveLogMapper.selectList(wrapper);
        List<ArchiveApproveLogVO> voList = converter.toVO(list);

        // 补充审批人姓名
        for (ArchiveApproveLogVO vo : voList) {
            var user = sysUserMapper.selectById(vo.getApproverId());
            if (user != null) {
                vo.setApproverName(user.getNickname());
            }
            vo.setActionName(resolveActionName(vo.getAction()));
        }
        return voList;
    }

    @Override
    public IPage<ArchiveApproveLogVO> historyPage(PageQuery pageQuery, Integer businessType,
                                                  String approverName, String keyword,
                                                  String dateFrom, String dateTo) {
        Page<ArchiveApproveLog> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveApproveLog> wrapper = new LambdaQueryWrapper<ArchiveApproveLog>()
                .eq(businessType != null, ArchiveApproveLog::getBusinessType, businessType)
                .orderByDesc(ArchiveApproveLog::getCreatedAt);

        if (StringUtils.hasText(dateFrom)) {
            wrapper.ge(ArchiveApproveLog::getCreatedAt,
                    LocalDateTime.of(LocalDate.parse(dateFrom), LocalTime.MIN));
        }
        if (StringUtils.hasText(dateTo)) {
            wrapper.le(ArchiveApproveLog::getCreatedAt,
                    LocalDateTime.of(LocalDate.parse(dateTo), LocalTime.MAX));
        }

        IPage<ArchiveApproveLogVO> result = approveLogMapper.selectPage(page, wrapper)
                .convert(converter::toVO);

        // 补充审批人姓名与目标档号，并过滤 approverName / keyword
        var records = result.getRecords();
        if (StringUtils.hasText(approverName)) {
            records.removeIf(vo -> vo.getApproverName() == null || !vo.getApproverName().contains(approverName));
        }
        if (StringUtils.hasText(keyword)) {
            records.removeIf(vo -> vo.getTargetArchiveNo() == null || !vo.getTargetArchiveNo().contains(keyword));
        }

        for (ArchiveApproveLogVO vo : records) {
            var user = sysUserMapper.selectById(vo.getApproverId());
            if (user != null) {
                vo.setApproverName(user.getNickname());
            }
            vo.setActionName(resolveActionName(vo.getAction()));
            vo.setBusinessTypeLabel(resolveBusinessTypeLabel(vo.getBusinessType()));

            // 尝试查询目标档号（仅对 volume 相关审批）
            if (vo.getBusinessType() != null && vo.getBusinessType() != 4) {
                ArchiveVolume volume = volumeMapper.selectById(vo.getTargetId());
                if (volume != null) {
                    vo.setTargetArchiveNo(volume.getArchiveNo());
                }
            }
        }
        return result;
    }

    private String resolveBusinessTypeLabel(Integer businessType) {
        return switch (businessType) {
            case 1 -> "归档审核";
            case 2 -> "归档确认";
            case 3 -> "借阅审批";
            case 4 -> "销毁审批";
            default -> "审批";
        };
    }

    private String resolveActionName(String action) {
        return switch (action) {
            case ApproveAction.PASS -> "通过";
            case ApproveAction.REJECT -> "驳回";
            case ApproveAction.BACK -> "退回";
            default -> action;
        };
    }
}
