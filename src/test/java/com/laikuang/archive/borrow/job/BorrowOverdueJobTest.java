package com.laikuang.archive.borrow.job;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.borrow.service.ArchiveBorrowService;
import com.laikuang.archive.common.constant.BorrowStatus;
import com.laikuang.archive.system.domain.entity.SysNotification;
import com.laikuang.archive.system.mapper.SysNotificationMapper;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 3 — S3-03：借阅逾期扫描与到期提醒集成测试。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BorrowOverdueJobTest {

    @Autowired
    private ArchiveBorrowService borrowService;

    @Autowired
    private ArchiveBorrowMapper borrowMapper;

    @Autowired
    private SysNotificationMapper notificationMapper;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private AuthService authService;

    private Long borrowerId;
    private String archiveNo;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        borrowerId = StpUtil.getLoginIdAsLong();

        // 创建已归档案卷
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        var vo = volumeService.createVolume(dto);
        volumeService.submitForReview(vo.getRecordId(), vo.getYear());
        volumeService.reviewPass(vo.getRecordId(), vo.getYear(), "通过");
        volumeService.archiveConfirm(vo.getRecordId(), vo.getYear(), "归档");
        archiveNo = vo.getArchiveNo();
    }

    @Test
    @DisplayName("逾期扫描：已过期的借阅单应更新为逾期状态并发送通知")
    void scanOverdueShouldUpdateStatusAndSendNotification() {
        ArchiveBorrow borrow = createApprovedBorrow(-1);

        borrowService.scanOverdue();

        ArchiveBorrow after = borrowMapper.selectById(borrow.getBorrowId());
        assertEquals(BorrowStatus.OVERDUE, after.getStatus());

        List<SysNotification> notices = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysNotification>()
                        .eq(SysNotification::getUserId, borrowerId)
                        .eq(SysNotification::getType, 2));
        assertFalse(notices.isEmpty());
        assertTrue(notices.get(0).getTitle().contains("逾期"));
    }

    @Test
    @DisplayName("到期提醒扫描：3天内到期的借阅单应发送到期提醒")
    void scanRemindShouldSendNotification() {
        ArchiveBorrow borrow = createApprovedBorrow(2);

        borrowService.scanOverdue();

        List<SysNotification> notices = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysNotification>()
                        .eq(SysNotification::getUserId, borrowerId)
                        .eq(SysNotification::getType, 1));
        assertFalse(notices.isEmpty());
        assertTrue(notices.get(0).getTitle().contains("到期提醒"));
    }

    @Test
    @DisplayName("正常剩余>3天：不应发送到期提醒")
    void scanRemindWithMoreThan3DaysShouldNotNotify() {
        ArchiveBorrow borrow = createApprovedBorrow(5);

        borrowService.scanOverdue();

        List<SysNotification> notices = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysNotification>()
                        .eq(SysNotification::getUserId, borrowerId));
        assertTrue(notices.isEmpty());
    }

    @Test
    @DisplayName("通知幂等：同一借阅单不应重复发送通知")
    void notificationShouldBeIdempotent() {
        ArchiveBorrow borrow = createApprovedBorrow(-1);

        borrowService.scanOverdue();
        borrowService.scanOverdue();

        List<SysNotification> notices = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysNotification>()
                        .eq(SysNotification::getUserId, borrowerId));
        assertEquals(1, notices.size());
    }

    @Test
    @DisplayName("已归还记录：逾期扫描不应处理")
    void returnedBorrowShouldNotBeScanned() {
        ArchiveBorrow borrow = createApprovedBorrow(-1);
        borrow.setStatus(BorrowStatus.RETURNED);
        borrowMapper.updateById(borrow);

        borrowService.scanOverdue();

        List<SysNotification> notices = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysNotification>()
                        .eq(SysNotification::getUserId, borrowerId));
        assertTrue(notices.isEmpty());
    }

    // ==================== 工具方法 ====================

    private ArchiveBorrow createApprovedBorrow(int daysFromNow) {
        ArchiveBorrow borrow = new ArchiveBorrow();
        borrow.setBorrowerId(borrowerId);
        borrow.setBorrowerDept("测试部门");
        borrow.setArchiveNo(archiveNo);
        borrow.setStatus(BorrowStatus.BORROWED);
        borrow.setBorrowDate(LocalDateTime.now().minusDays(7));
        borrow.setPlanReturnDate(LocalDateTime.now().plusDays(daysFromNow));
        borrowMapper.insert(borrow);
        return borrow;
    }

    private ArchiveVolumeSaveDTO buildVolumeDto() {
        ArchiveVolumeSaveDTO dto = new ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle("逾期扫描测试案卷-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }
}
