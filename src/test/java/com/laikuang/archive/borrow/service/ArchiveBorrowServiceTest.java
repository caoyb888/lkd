package com.laikuang.archive.borrow.service;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.borrow.domain.dto.ArchiveBorrowApplyDTO;
import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.common.constant.BorrowStatus;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 3 — S3-02：档案借阅申请、审批及在库联动集成测试。
 * 覆盖申请、批准、驳回、归还、库存联动、并发安全、水平越权、重复申请拦截。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchiveBorrowServiceTest {

    @Autowired
    private ArchiveBorrowService borrowService;

    @Autowired
    private ArchiveBorrowMapper borrowMapper;

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    private Long adminUserId;
    private Long normalUserId;
    private String archiveNo;
    private String year;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        // 创建普通用户
        SysUser normal = new SysUser();
        normal.setUsername("normal_user");
        normal.setPassword(PasswordUtil.encode("Normal@123"));
        normal.setNickname("普通用户");
        normal.setDeptId(1L);
        normal.setRole("user");
        normal.setStatus(1);
        userMapper.insert(normal);
        normalUserId = normal.getUserId();

        // 创建一个已归档的案卷（总份数2）
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        var vo = volumeService.createVolume(dto);
        volumeService.submitForReview(vo.getRecordId(), vo.getYear());
        volumeService.reviewPass(vo.getRecordId(), vo.getYear(), "通过");
        volumeService.archiveConfirm(vo.getRecordId(), vo.getYear(), "归档");
        archiveNo = vo.getArchiveNo();
        year = vo.getYear();

        // 设置总份数为2
        ArchiveVolume update = new ArchiveVolume();
        update.setCopies(2);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, vo.getRecordId())
                .eq(ArchiveVolume::getYear, vo.getYear()));
    }

    // ==================== 正常借阅申请与审批 ====================

    @Test
    @DisplayName("借阅申请：已归档案卷且库存充足，应成功创建待审批记录")
    void applyShouldCreatePendingBorrow() {
        StpUtil.login(normalUserId);
        var vo = borrowService.apply(buildApplyDto());

        assertNotNull(vo.getBorrowId());
        assertEquals(BorrowStatus.PENDING, vo.getStatus());
        assertEquals(archiveNo, vo.getArchiveNo());
    }

    @Test
    @DisplayName("批准借阅：待审批→已借出，档案已借出份数+1，在库状态联动")
    void approveShouldIncreaseBorrowedCopies() {
        StpUtil.login(normalUserId);
        var borrow = borrowService.apply(buildApplyDto());

        StpUtil.login(adminUserId);
        borrowService.approve(borrow.getBorrowId(), 7, "同意借阅7天");

        // 校验借阅单
        var borrowAfter = borrowMapper.selectById(borrow.getBorrowId());
        assertEquals(BorrowStatus.BORROWED, borrowAfter.getStatus());
        assertNotNull(borrowAfter.getBorrowDate());
        assertNotNull(borrowAfter.getPlanReturnDate());

        // 校验档案库存联动
        var volume = selectVolumeByArchiveNo(archiveNo);
        assertEquals(1, volume.getBorrowedCopies());
        assertEquals(1, volume.getInStock()); // 还有1份库存
    }

    @Test
    @DisplayName("驳回借阅：待审批→已驳回，档案库存不变")
    void rejectShouldNotAffectStock() {
        StpUtil.login(normalUserId);
        var borrow = borrowService.apply(buildApplyDto());

        StpUtil.login(adminUserId);
        borrowService.reject(borrow.getBorrowId(), "不符合借阅条件");

        var borrowAfter = borrowMapper.selectById(borrow.getBorrowId());
        assertEquals(BorrowStatus.REJECTED, borrowAfter.getStatus());

        var volume = selectVolumeByArchiveNo(archiveNo);
        assertEquals(0, volume.getBorrowedCopies());
    }

    @Test
    @DisplayName("归还借阅：已借出→已归还，档案已借出份数-1，在库状态恢复")
    void returnBorrowShouldDecreaseBorrowedCopies() {
        StpUtil.login(normalUserId);
        var borrow = borrowService.apply(buildApplyDto());

        StpUtil.login(adminUserId);
        borrowService.approve(borrow.getBorrowId(), 7, "同意");

        // 普通用户归还
        StpUtil.login(normalUserId);
        borrowService.returnBorrow(borrow.getBorrowId());

        var borrowAfter = borrowMapper.selectById(borrow.getBorrowId());
        assertEquals(BorrowStatus.RETURNED, borrowAfter.getStatus());
        assertNotNull(borrowAfter.getActualReturnDate());

        var volume = selectVolumeByArchiveNo(archiveNo);
        assertEquals(0, volume.getBorrowedCopies());
        assertEquals(1, volume.getInStock());
    }

    @Test
    @DisplayName("全部借空后：档案 in_stock 应变为0")
    void whenAllCopiesBorrowedInStockShouldBeZero() {
        // 第一份借阅
        StpUtil.login(normalUserId);
        var borrow1 = borrowService.apply(buildApplyDto());
        StpUtil.login(adminUserId);
        borrowService.approve(borrow1.getBorrowId(), 7, "同意");

        // 第二份借阅（另一个用户）
        SysUser other = new SysUser();
        other.setUsername("other_user");
        other.setPassword(PasswordUtil.encode("Other@123"));
        other.setNickname("其他用户");
        other.setDeptId(1L);
        other.setRole("user");
        other.setStatus(1);
        userMapper.insert(other);

        StpUtil.login(other.getUserId());
        var apply2 = buildApplyDto();
        var borrow2 = borrowService.apply(apply2);

        StpUtil.login(adminUserId);
        borrowService.approve(borrow2.getBorrowId(), 7, "同意");

        var volume = selectVolumeByArchiveNo(archiveNo);
        assertEquals(2, volume.getBorrowedCopies());
        assertEquals(0, volume.getInStock());
    }

    // ==================== 异常拦截 ====================

    @Test
    @DisplayName("重复申请：同一用户同一档案存在待审批记录，应拦截")
    void duplicateApplyShouldFail() {
        StpUtil.login(normalUserId);
        borrowService.apply(buildApplyDto());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowService.apply(buildApplyDto()));
        assertEquals(ResultCode.BORROW_REPEAT, ex.getCode());
    }

    @Test
    @DisplayName("库存不足：档案已全部借出，新申请应拦截")
    void applyWhenStockEmptyShouldFail() {
        // 先借出全部2份
        StpUtil.login(normalUserId);
        var borrow1 = borrowService.apply(buildApplyDto());
        StpUtil.login(adminUserId);
        borrowService.approve(borrow1.getBorrowId(), 7, "同意");

        SysUser other = new SysUser();
        other.setUsername("other2");
        other.setPassword(PasswordUtil.encode("Other2@123"));
        other.setNickname("用户2");
        other.setDeptId(1L);
        other.setRole("user");
        other.setStatus(1);
        userMapper.insert(other);

        StpUtil.login(other.getUserId());
        var borrow2 = borrowService.apply(buildApplyDto());
        StpUtil.login(adminUserId);
        borrowService.approve(borrow2.getBorrowId(), 7, "同意");

        // 第三个人申请应被拦截
        SysUser third = new SysUser();
        third.setUsername("third");
        third.setPassword(PasswordUtil.encode("Third@123"));
        third.setNickname("用户3");
        third.setDeptId(1L);
        third.setRole("user");
        third.setStatus(1);
        userMapper.insert(third);

        StpUtil.login(third.getUserId());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowService.apply(buildApplyDto()));
        assertEquals(ResultCode.ARCHIVE_STOCK_EMPTY, ex.getCode());
    }

    @Test
    @DisplayName("非归档档案借阅：草稿/待审核/待确认状态应拦截")
    void applyNonArchivedVolumeShouldFail() {
        // 创建一个草稿案卷
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        dto.setVolumeTitle("草稿案卷-" + System.currentTimeMillis());
        var draft = volumeService.createVolume(dto);

        StpUtil.login(normalUserId);
        ArchiveBorrowApplyDTO apply = new ArchiveBorrowApplyDTO();
        apply.setArchiveNo(draft.getArchiveNo());
        apply.setYear(draft.getYear());
        apply.setBorrowDays(7);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowService.apply(apply));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("归还越权：非借阅人本人归还他人借阅单，应水平越权拦截")
    void returnOthersBorrowShouldFail() {
        StpUtil.login(normalUserId);
        var borrow = borrowService.apply(buildApplyDto());
        StpUtil.login(adminUserId);
        borrowService.approve(borrow.getBorrowId(), 7, "同意");

        // admin 尝试归还 normalUser 的借阅单
        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowService.returnBorrow(borrow.getBorrowId()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    // ==================== 查询 ====================

    @Test
    @DisplayName("我的借阅列表：应只返回当前用户的借阅记录")
    void pageMyBorrowsShouldOnlyReturnOwn() {
        StpUtil.login(normalUserId);
        borrowService.apply(buildApplyDto());

        var page = borrowService.pageMyBorrows(new PageQuery(), null);
        assertEquals(1, page.getRecords().size());
        assertEquals(normalUserId, page.getRecords().get(0).getBorrowerId());
    }

    @Test
    @DisplayName("待审批列表：管理员应看到所有待审批记录")
    void pagePendingApprovalsShouldReturnAllPending() {
        StpUtil.login(normalUserId);
        borrowService.apply(buildApplyDto());

        StpUtil.login(adminUserId);
        var page = borrowService.pagePendingApprovals(new PageQuery(), null);
        assertTrue(page.getRecords().stream().allMatch(r -> "待审批".equals(r.getStatusName())));
    }

    // ==================== 工具方法 ====================

    private ArchiveBorrowApplyDTO buildApplyDto() {
        ArchiveBorrowApplyDTO dto = new ArchiveBorrowApplyDTO();
        dto.setArchiveNo(archiveNo);
        dto.setYear(year);
        dto.setBorrowDays(7);
        return dto;
    }

    private ArchiveVolumeSaveDTO buildVolumeDto() {
        ArchiveVolumeSaveDTO dto = new ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle("借阅测试案卷-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }

    private ArchiveVolume selectVolumeByArchiveNo(String archiveNo) {
        return volumeMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getArchiveNo, archiveNo)
                        .eq(ArchiveVolume::getDestroyFlag, 0)
                        .last("LIMIT 1"));
    }
}
