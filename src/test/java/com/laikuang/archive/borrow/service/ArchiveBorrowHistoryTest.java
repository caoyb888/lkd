package com.laikuang.archive.borrow.service;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.common.constant.BorrowStatus;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 3 — S3-04：部门借阅历史、全量历史审计追溯集成测试。
 * 覆盖本部门历史查询、全局历史查询、数据权限隔离、状态筛选。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchiveBorrowHistoryTest {

    @Autowired
    private ArchiveBorrowService borrowService;

    @Autowired
    private ArchiveBorrowMapper borrowMapper;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    private Long adminUserId;
    private Long deptAUserId;
    private Long deptBUserId;
    private static final String ARCHIVE_NO = "01.8.01.0101.01.001";

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        // 创建部门A用户（dept_id = 1，与admin同部门）
        SysUser userA = new SysUser();
        userA.setUsername("dept_a_user");
        userA.setPassword(PasswordUtil.encode("Pass@123"));
        userA.setNickname("部门A用户");
        userA.setDeptId(1L);
        userA.setRole("user");
        userA.setStatus(1);
        userMapper.insert(userA);
        deptAUserId = userA.getUserId();

        // 创建部门B用户（dept_id = 2）
        SysUser userB = new SysUser();
        userB.setUsername("dept_b_user");
        userB.setPassword(PasswordUtil.encode("Pass@123"));
        userB.setNickname("部门B用户");
        userB.setDeptId(2L);
        userB.setRole("user");
        userB.setStatus(1);
        userMapper.insert(userB);
        deptBUserId = userB.getUserId();

        // 为部门A用户创建已归还记录
        createBorrowRecord(deptAUserId, "部门A", ARCHIVE_NO, BorrowStatus.RETURNED);
        // 为部门A用户创建已驳回记录
        createBorrowRecord(deptAUserId, "部门A", ARCHIVE_NO, BorrowStatus.REJECTED);

        // 为部门B用户创建已归还记录
        createBorrowRecord(deptBUserId, "部门B", ARCHIVE_NO, BorrowStatus.RETURNED);
        // 为部门B用户创建已逾期记录
        createBorrowRecord(deptBUserId, "部门B", ARCHIVE_NO, BorrowStatus.OVERDUE);
    }

    @Test
    @DisplayName("本部门历史：部门A用户应只能看到本部门记录")
    void deptUserShouldOnlySeeOwnDeptHistory() {
        StpUtil.login(deptAUserId);
        var page = borrowService.pageDeptHistory(new PageQuery(), null);

        assertEquals(2, page.getRecords().size());
        assertTrue(page.getRecords().stream().allMatch(r -> "部门A".equals(r.getBorrowerDept())));
        assertTrue(page.getRecords().stream().noneMatch(r -> "部门B".equals(r.getBorrowerDept())));
    }

    @Test
    @DisplayName("本部门历史：部门B用户应只能看到本部门记录")
    void deptBUserShouldOnlySeeOwnDeptHistory() {
        StpUtil.login(deptBUserId);
        var page = borrowService.pageDeptHistory(new PageQuery(), null);

        assertEquals(2, page.getRecords().size());
        assertTrue(page.getRecords().stream().allMatch(r -> "部门B".equals(r.getBorrowerDept())));
        assertTrue(page.getRecords().stream().noneMatch(r -> "部门A".equals(r.getBorrowerDept())));
    }

    @Test
    @DisplayName("全局历史：管理员应能看到所有部门记录")
    void adminShouldSeeAllHistory() {
        StpUtil.login(adminUserId);
        var page = borrowService.pageAllHistory(new PageQuery(), null, null);

        assertEquals(4, page.getRecords().size());
    }

    @Test
    @DisplayName("全局历史：管理员按部门名称筛选应生效")
    void adminFilterByDeptNameShouldWork() {
        StpUtil.login(adminUserId);
        var page = borrowService.pageAllHistory(new PageQuery(), "部门A", null);

        assertEquals(2, page.getRecords().size());
        assertTrue(page.getRecords().stream().allMatch(r -> "部门A".equals(r.getBorrowerDept())));
    }

    @Test
    @DisplayName("历史状态筛选：按已归还筛选应只返回已归还记录")
    void filterByReturnedStatusShouldWork() {
        StpUtil.login(adminUserId);
        var page = borrowService.pageAllHistory(new PageQuery(), null, BorrowStatus.RETURNED);

        assertEquals(2, page.getRecords().size());
        assertTrue(page.getRecords().stream().allMatch(r -> BorrowStatus.RETURNED == r.getStatus()));
    }

    @Test
    @DisplayName("历史状态筛选：按已逾期筛选应只返回已逾期记录")
    void filterByOverdueStatusShouldWork() {
        StpUtil.login(adminUserId);
        var page = borrowService.pageAllHistory(new PageQuery(), null, BorrowStatus.OVERDUE);

        assertEquals(1, page.getRecords().size());
        assertEquals(BorrowStatus.OVERDUE, page.getRecords().get(0).getStatus());
    }

    @Test
    @DisplayName("本部门历史不应包含待审批和已借出记录")
    void deptHistoryShouldNotIncludeActiveBorrows() {
        // 给部门A用户增加一个待审批记录
        createBorrowRecord(deptAUserId, "部门A", ARCHIVE_NO, BorrowStatus.PENDING);

        StpUtil.login(deptAUserId);
        var page = borrowService.pageDeptHistory(new PageQuery(), null);

        // 仍然只返回2条历史记录（RETURNED + REJECTED），不包含 PENDING
        assertEquals(2, page.getRecords().size());
        assertTrue(page.getRecords().stream().noneMatch(r -> BorrowStatus.PENDING == r.getStatus()));
    }

    // ==================== 工具方法 ====================

    private void createBorrowRecord(Long borrowerId, String deptName, String archiveNo, int status) {
        ArchiveBorrow borrow = new ArchiveBorrow();
        borrow.setBorrowerId(borrowerId);
        borrow.setBorrowerDept(deptName);
        borrow.setArchiveNo(archiveNo);
        borrow.setStatus(status);
        if (status == BorrowStatus.BORROWED || status == BorrowStatus.RETURNED || status == BorrowStatus.OVERDUE) {
            borrow.setBorrowDate(LocalDateTime.now().minusDays(7));
            borrow.setPlanReturnDate(LocalDateTime.now().plusDays(status == BorrowStatus.OVERDUE ? -1 : 7));
        }
        if (status == BorrowStatus.RETURNED) {
            borrow.setActualReturnDate(LocalDateTime.now());
        }
        borrowMapper.insert(borrow);
    }
}
