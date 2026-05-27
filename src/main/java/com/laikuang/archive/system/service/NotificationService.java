package com.laikuang.archive.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.system.domain.entity.SysNotification;

import java.util.List;

/**
 * 系统通知服务接口。
 */
public interface NotificationService {

    /**
     * 发送通知（幂等：同一 refId + type + userId 已存在则跳过）。
     */
    void sendNotification(Long userId, String title, String content, Integer type, Long refId);

    /**
     * 查询当前用户的未读通知列表。
     */
    List<SysNotification> listUnread(Long userId);

    /**
     * 分页查询当前用户的通知列表。
     */
    IPage<SysNotification> pageNotifications(PageQuery pageQuery, Long userId, Integer isRead);

    /**
     * 标记通知为已读。
     */
    void markAsRead(Long noticeId);

    /**
     * 标记当前用户全部通知为已读。
     */
    void markAllAsRead(Long userId);
}
