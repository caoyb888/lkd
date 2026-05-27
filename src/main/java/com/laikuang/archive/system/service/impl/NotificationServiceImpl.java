package com.laikuang.archive.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.system.domain.entity.SysNotification;
import com.laikuang.archive.system.mapper.SysNotificationMapper;
import com.laikuang.archive.system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import org.slf4j.MDC;

/**
 * 系统通知服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final SysNotificationMapper notificationMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sendNotification(Long userId, String title, String content, Integer type, Long refId) {
        // 幂等校验：同一业务 refId + type + userId 已存在则不重复发送
        if (refId != null) {
            Long exists = notificationMapper.selectCount(
                    new LambdaQueryWrapper<SysNotification>()
                            .eq(SysNotification::getUserId, userId)
                            .eq(SysNotification::getType, type)
                            .eq(SysNotification::getRefId, refId));
            if (exists > 0) {
                return;
            }
        }

        SysNotification notice = new SysNotification();
        notice.setUserId(userId);
        notice.setTitle(title);
        notice.setContent(content);
        notice.setType(type);
        notice.setRefId(refId);
        notice.setIsRead(0);
        notificationMapper.insert(notice);

        log.info("[AUDIT-NOTIFY] 发送系统通知，userId={}, type={}, refId={}, title={}, ip={}, traceId={}",
                userId, type, refId, title, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    public List<SysNotification> listUnread(Long userId) {
        return notificationMapper.selectList(
                new LambdaQueryWrapper<SysNotification>()
                        .eq(SysNotification::getUserId, userId)
                        .eq(SysNotification::getIsRead, 0)
                        .orderByDesc(SysNotification::getCreatedAt));
    }

    @Override
    public IPage<SysNotification> pageNotifications(PageQuery pageQuery, Long userId, Integer isRead) {
        Page<SysNotification> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<SysNotification> wrapper = new LambdaQueryWrapper<SysNotification>()
                .eq(SysNotification::getUserId, userId)
                .eq(isRead != null, SysNotification::getIsRead, isRead)
                .orderByDesc(SysNotification::getCreatedAt);
        return notificationMapper.selectPage(page, wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markAsRead(Long noticeId) {
        SysNotification update = new SysNotification();
        update.setNoticeId(noticeId);
        update.setIsRead(1);
        notificationMapper.updateById(update);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markAllAsRead(Long userId) {
        SysNotification update = new SysNotification();
        update.setIsRead(1);
        notificationMapper.update(update,
                new LambdaQueryWrapper<SysNotification>()
                        .eq(SysNotification::getUserId, userId)
                        .eq(SysNotification::getIsRead, 0));
    }
}
