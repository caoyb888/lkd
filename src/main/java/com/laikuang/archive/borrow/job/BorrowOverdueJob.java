package com.laikuang.archive.borrow.job;

import com.laikuang.archive.borrow.service.ArchiveBorrowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 借阅逾期扫描定时任务。
 * 每天凌晨执行，扫描超期未归还的借阅记录并更新状态、发送系统通知。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BorrowOverdueJob {

    private final ArchiveBorrowService borrowService;

    /**
     * 每日凌晨 02:00 执行逾期扫描。
     * cron = 秒 分 时 日 月 周
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void scanOverdue() {
        log.info("[JOB-START] 借阅逾期扫描任务启动");
        try {
            borrowService.scanOverdue();
            log.info("[JOB-END] 借阅逾期扫描任务完成");
        } catch (Exception e) {
            log.error("[JOB-ERROR] 借阅逾期扫描任务异常", e);
        }
    }
}
