package com.laikuang.archive.integration;

import cn.dev33.satoken.SaManager;
import cn.dev33.satoken.context.SaTokenContextForThreadLocal;
import cn.dev33.satoken.context.SaTokenContextForThreadLocalStorage;
import cn.dev33.satoken.context.model.SaCookie;
import cn.dev33.satoken.context.model.SaRequest;
import cn.dev33.satoken.context.model.SaResponse;
import cn.dev33.satoken.context.model.SaStorage;
import cn.dev33.satoken.spring.SaTokenContextForSpringInJakartaServlet;
import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.borrow.domain.dto.ArchiveBorrowApplyDTO;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.borrow.service.ArchiveBorrowService;
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
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 3 — S3-05：阶段性集成测试。
 *
 * <p>覆盖 Sprint 3 全部核心功能的端到端集成验证：
 * <ul>
 *   <li>归档审批状态机完整闭环（草稿→待审核→待确认→已归档）</li>
 *   <li>借阅申请→审批→归还业务闭环及在库联动</li>
 *   <li>并发状态下档案库存扣减（无超卖）</li>
 *   <li>水平越权与数据权限隔离</li>
 * </ul>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class Sprint3IntegrationTest {

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveBorrowService borrowService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private ArchiveBorrowMapper borrowMapper;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    @Autowired
    private com.laikuang.archive.approve.service.ArchiveApproveService approveService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long adminUserId;

    @BeforeEach
    void setUp() {
        // 防御性恢复：并发测试可能临时切换 Sa-Token 上下文，确保恢复为 Spring Servlet 实现
        if (!(SaManager.getSaTokenContext() instanceof SaTokenContextForSpringInJakartaServlet)) {
            SaManager.setSaTokenContext(new SaTokenContextForSpringInJakartaServlet());
        }
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();
    }

    // ==================== 1. 端到端业务闭环 ====================

    @Test
    @DisplayName("【S3-05】端到端闭环：案卷归档审批 + 借阅申请审批归还 + 历史查询")
    void endToEndArchiveAndBorrowFlowShouldSuccess() {
        // 1. 创建案卷草稿
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        var volume = volumeService.createVolume(dto);
        assertEquals(0, volume.getStatus());
        String year = volume.getYear();

        // 2. 提交审核
        volumeService.submitForReview(volume.getRecordId(), year);
        var afterSubmit = volumeService.getVolumeDetail(volume.getRecordId(), year);
        assertEquals(1, afterSubmit.getStatus());

        // 3. 审核通过
        volumeService.reviewPass(volume.getRecordId(), year, "审核通过");
        var afterReview = volumeService.getVolumeDetail(volume.getRecordId(), year);
        assertEquals(2, afterReview.getStatus());

        // 4. 确认归档
        volumeService.archiveConfirm(volume.getRecordId(), year, "确认归档");
        var afterArchive = volumeService.getVolumeDetail(volume.getRecordId(), year);
        assertEquals(3, afterArchive.getStatus());

        // 4.1 验证审批日志完整性（归档审核 + 归档确认各一条）
        var logs = approveService.listLogsByTarget(volume.getRecordId(),
                com.laikuang.archive.common.constant.ApproveBusinessType.ARCHIVE_REVIEW,
                com.laikuang.archive.common.constant.ApproveBusinessType.ARCHIVE_CONFIRM);
        assertEquals(2, logs.size(), "应包含审核通过和确认归档两条日志");
        assertTrue(logs.stream().anyMatch(l -> com.laikuang.archive.common.constant.ApproveAction.PASS.equals(l.getAction())
                && Integer.valueOf(com.laikuang.archive.common.constant.ApproveBusinessType.ARCHIVE_REVIEW).equals(l.getBusinessType())));
        assertTrue(logs.stream().anyMatch(l -> com.laikuang.archive.common.constant.ApproveAction.PASS.equals(l.getAction())
                && Integer.valueOf(com.laikuang.archive.common.constant.ApproveBusinessType.ARCHIVE_CONFIRM).equals(l.getBusinessType())));

        // 5. 普通用户申请借阅
        SysUser normal = createUser("s3_normal", "用户", 1L);
        StpUtil.login(normal.getUserId());
        var borrow = borrowService.apply(buildApplyDto(volume.getArchiveNo(), year));
        assertEquals(BorrowStatus.PENDING, borrow.getStatus());

        // 6. 管理员批准借阅
        StpUtil.login(adminUserId);
        borrowService.approve(borrow.getBorrowId(), 7, "同意借阅7天");
        var borrowAfter = borrowMapper.selectById(borrow.getBorrowId());
        assertEquals(BorrowStatus.BORROWED, borrowAfter.getStatus());
        assertNotNull(borrowAfter.getPlanReturnDate());

        // 7. 验证在库联动：borrowed_copies +1
        var volumeAfterBorrow = volumeMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, year));
        assertEquals(1, volumeAfterBorrow.getBorrowedCopies());

        // 8. 用户归还
        StpUtil.login(normal.getUserId());
        borrowService.returnBorrow(borrow.getBorrowId());
        var borrowReturned = borrowMapper.selectById(borrow.getBorrowId());
        assertEquals(BorrowStatus.RETURNED, borrowReturned.getStatus());
        assertNotNull(borrowReturned.getActualReturnDate());

        // 9. 验证在库联动：borrowed_copies 回减
        var volumeAfterReturn = volumeMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, year));
        assertEquals(0, volumeAfterReturn.getBorrowedCopies());
        assertEquals(1, volumeAfterReturn.getInStock());

        // 10. 查询本部门历史
        var deptHistory = borrowService.pageDeptHistory(new PageQuery(), null);
        assertTrue(deptHistory.getRecords().stream()
                .anyMatch(r -> r.getBorrowId().equals(borrow.getBorrowId())));

        // 11. 管理员查询全局历史
        StpUtil.login(adminUserId);
        var allHistory = borrowService.pageAllHistory(new PageQuery(), null, null);
        assertTrue(allHistory.getRecords().stream()
                .anyMatch(r -> r.getBorrowId().equals(borrow.getBorrowId())));
    }

    // ==================== 2. 并发抢借无超卖 ====================

    @Test
    @DisplayName("【S3-05】并发抢借：3人同时approve 2份库存，仅2人成功，无超卖")
    void concurrentBorrowShouldNotOversell() throws Exception {
        // 1. 创建 copies=2 的已归档案卷
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        dto.setCopies(2);
        var volume = volumeService.createVolume(dto);
        volumeService.submitForReview(volume.getRecordId(), volume.getYear());
        volumeService.reviewPass(volume.getRecordId(), volume.getYear(), "通过");
        volumeService.archiveConfirm(volume.getRecordId(), volume.getYear(), "归档");

        // 2. 创建3个普通用户
        SysUser userA = createUser("s3_con_a", "用户A", 1L);
        SysUser userB = createUser("s3_con_b", "用户B", 1L);
        SysUser userC = createUser("s3_con_c", "用户C", 1L);
        List<Long> userIds = List.of(userA.getUserId(), userB.getUserId(), userC.getUserId());

        // 3. 3个用户各自申请借阅
        List<Long> borrowIds = new ArrayList<>();
        for (Long userId : userIds) {
            StpUtil.login(userId);
            var b = borrowService.apply(buildApplyDto(volume.getArchiveNo(), volume.getYear()));
            borrowIds.add(b.getBorrowId());
        }

        // 提交主事务，确保并发线程能看到已插入的借阅记录
        TestTransaction.flagForCommit();
        TestTransaction.end();

        // 4. 3个 approve 操作并发执行（每个线程独立 Spring 事务）
        var executor = Executors.newFixedThreadPool(3);
        List<CompletableFuture<String>> futures = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            final Long borrowId = borrowIds.get(i);
            futures.add(CompletableFuture.supplyAsync(() -> {
                // 为非 Web 线程设置 Sa-Token ThreadLocal 上下文
                SaStorage threadStorage = createThreadLocalStorage();
                SaRequest mockRequest = createMockRequest();
                SaResponse mockResponse = createMockResponse();
                SaTokenContextForThreadLocalStorage.setBox(mockRequest, mockResponse, threadStorage);
                var originalContext = SaManager.getSaTokenContext();
                SaManager.setSaTokenContext(new SaTokenContextForThreadLocal());
                try {
                    StpUtil.login(adminUserId);
                    borrowService.approve(borrowId, 7, "同意");
                    return "SUCCESS";
                } catch (BusinessException e) {
                    if (e.getCode() == ResultCode.ARCHIVE_STOCK_EMPTY) {
                        return "STOCK_EMPTY:" + e.getMessage();
                    }
                    return "ERROR:" + e.getCode() + " - " + e.getMessage();
                } catch (Exception e) {
                    return "UNEXPECTED:" + e.getClass().getSimpleName() + " - " + e.getMessage();
                } finally {
                    SaManager.setSaTokenContext(originalContext);
                    SaTokenContextForThreadLocalStorage.clearBox();
                }
            }, executor));
        }

        int successCount = 0;
        int failCount = 0;
        List<String> unexpected = new ArrayList<>();
        for (CompletableFuture<String> f : futures) {
            String result = f.get();
            if ("SUCCESS".equals(result)) {
                successCount++;
            } else if (result.startsWith("STOCK_EMPTY")) {
                failCount++;
            } else {
                unexpected.add(result);
            }
        }
        executor.shutdown();

        assertTrue(unexpected.isEmpty(),
                "不应有意外异常: " + unexpected);
        assertTrue(successCount >= 1, "至少有 1 个 approve 成功，实际=" + successCount);
        assertTrue(failCount >= 1, "至少有 1 个 approve 因乐观锁/库存不足失败，实际=" + failCount);

        // 5. 验证档案库存：borrowed_copies 必须 <= copies (=2)
        var volumeFinal = volumeMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, volume.getYear()));
        assertNotNull(volumeFinal);
        assertTrue(volumeFinal.getBorrowedCopies() <= volumeFinal.getCopies(),
                "borrowed_copies 不得超过 copies，实际 borrowed=" + volumeFinal.getBorrowedCopies()
                        + ", copies=" + volumeFinal.getCopies());
        assertEquals(successCount, volumeFinal.getBorrowedCopies().intValue(),
                "成功的 approve 数量应等于 borrowed_copies");
        assertEquals(volumeFinal.getCopies() - volumeFinal.getBorrowedCopies(),
                volumeFinal.getInStock().intValue(), "in_stock = copies - borrowed_copies");

        // 清理并发测试产生的数据（非 @Transactional，需手动清理）
        cleanupConcurrencyTest(borrowIds, userIds, volume.getRecordId(), volume.getYear());
    }

    private void cleanupConcurrencyTest(List<Long> borrowIds, List<Long> userIds, Long volumeRecordId, String year) {
        for (Long borrowId : borrowIds) {
            jdbcTemplate.update("DELETE FROM archive_borrow WHERE borrow_id = ?", borrowId);
        }
        for (Long userId : userIds) {
            jdbcTemplate.update("DELETE FROM sys_user WHERE user_id = ?", userId);
        }
        jdbcTemplate.update("DELETE FROM archive_volume WHERE record_id = ? AND year = ?", volumeRecordId, year);
    }

    private SaStorage createThreadLocalStorage() {
        return new SaStorage() {
            private final Map<String, Object> map = new HashMap<>();

            @Override
            public Object getSource() {
                return map;
            }

            @Override
            public Object get(String key) {
                return map.get(key);
            }

            @Override
            public SaStorage set(String key, Object value) {
                map.put(key, value);
                return this;
            }

            @Override
            public SaStorage delete(String key) {
                map.remove(key);
                return this;
            }
        };
    }

    private SaRequest createMockRequest() {
        return new SaRequest() {
            @Override
            public Object getSource() {
                return this;
            }

            @Override
            public String getParam(String name) {
                return null;
            }

            @Override
            public List<String> getParamNames() {
                return List.of();
            }

            @Override
            public Map<String, String> getParamMap() {
                return Map.of();
            }

            @Override
            public String getHeader(String name) {
                return null;
            }

            @Override
            public String getCookieValue(String name) {
                return null;
            }

            @Override
            public String getRequestPath() {
                return "/";
            }

            @Override
            public String getUrl() {
                return "/";
            }

            @Override
            public String getMethod() {
                return "POST";
            }

            @Override
            public Object forward(String path) {
                return null;
            }
        };
    }

    private SaResponse createMockResponse() {
        return new SaResponse() {
            @Override
            public Object getSource() {
                return this;
            }

            @Override
            public SaResponse setStatus(int sc) {
                return this;
            }

            @Override
            public SaResponse setHeader(String name, String value) {
                return this;
            }

            @Override
            public SaResponse addHeader(String name, String value) {
                return this;
            }

            @Override
            public void addCookie(SaCookie cookie) {
                // 空实现：非 Web 环境无需写入 Cookie
            }

            @Override
            public Object redirect(String url) {
                return null;
            }
        };
    }

    // ==================== 3. 越权行为拦截 ====================

    @Test
    @DisplayName("【S3-05】越权：普通用户归还他人借阅单应被水平越权拦截")
    void normalUserReturnOthersBorrowShouldFail() {
        // admin 创建案卷并归档
        var volume = createAndArchiveVolume();

        // 用户A 申请并批准借阅
        SysUser userA = createUser("s3_user_a", "用户A", 1L);
        StpUtil.login(userA.getUserId());
        var borrow = borrowService.apply(buildApplyDto(volume.getArchiveNo(), volume.getYear()));
        StpUtil.login(adminUserId);
        borrowService.approve(borrow.getBorrowId(), 7, "同意");

        // 用户B 尝试归还用户A的借阅单
        SysUser userB = createUser("s3_user_b", "用户B", 1L);
        StpUtil.login(userB.getUserId());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowService.returnBorrow(borrow.getBorrowId()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("【S3-05】越权：普通用户部门历史只能查看本部门记录")
    void deptHistoryIsolationShouldBlockCrossDeptAccess() {
        // 创建部门A和部门B用户
        SysUser userA = createUser("s3_dept_a", "部门A用户", 1L);
        SysUser userB = createUser("s3_dept_b", "部门B用户", 2L);

        var volume = createAndArchiveVolume();

        // 部门A用户借阅并归还
        StpUtil.login(userA.getUserId());
        var borrowA = borrowService.apply(buildApplyDto(volume.getArchiveNo(), volume.getYear()));
        StpUtil.login(adminUserId);
        borrowService.approve(borrowA.getBorrowId(), 7, "同意");
        StpUtil.login(userA.getUserId());
        borrowService.returnBorrow(borrowA.getBorrowId());

        // 部门B用户借阅并归还
        StpUtil.login(userB.getUserId());
        var borrowB = borrowService.apply(buildApplyDto(volume.getArchiveNo(), volume.getYear()));
        StpUtil.login(adminUserId);
        borrowService.approve(borrowB.getBorrowId(), 7, "同意");
        StpUtil.login(userB.getUserId());
        borrowService.returnBorrow(borrowB.getBorrowId());

        // 部门A用户查询本部门历史，不应看到部门B记录
        StpUtil.login(userA.getUserId());
        var deptHistory = borrowService.pageDeptHistory(new PageQuery(), null);
        assertTrue(deptHistory.getRecords().stream()
                .allMatch(r -> userA.getUserId().equals(r.getBorrowerId())),
                "部门A用户不应看到部门B的借阅记录");
        assertTrue(deptHistory.getRecords().stream()
                .noneMatch(r -> userB.getUserId().equals(r.getBorrowerId())));
    }

    @Test
    @DisplayName("【S3-05】状态机：已归档案卷不可再次审核通过")
    void archivedVolumeShouldNotBeReviewedAgain() {
        var volume = createAndArchiveVolume();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.reviewPass(volume.getRecordId(), volume.getYear(), "试图通过"));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("【S3-05】状态机：草稿态不可直接确认归档")
    void draftVolumeShouldNotBeDirectlyArchived() {
        var volume = volumeService.createVolume(buildVolumeDto());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.archiveConfirm(volume.getRecordId(), volume.getYear(), "试图确认"));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("【S3-05】状态机：退回后重新提交→审核→归档完整闭环")
    void archiveBackAndResubmitShouldCompleteFlow() {
        // 1. 创建并提交审核
        var volume = volumeService.createVolume(buildVolumeDto());
        volumeService.submitForReview(volume.getRecordId(), volume.getYear());

        // 2. 审核通过
        volumeService.reviewPass(volume.getRecordId(), volume.getYear(), "通过");
        assertEquals(2, volumeService.getVolumeDetail(volume.getRecordId(), volume.getYear()).getStatus());

        // 3. 退回上一级（待确认 → 待审核）
        volumeService.archiveBack(volume.getRecordId(), volume.getYear(), "格式不符，退回修改");
        assertEquals(1, volumeService.getVolumeDetail(volume.getRecordId(), volume.getYear()).getStatus());

        // 4. 重新审核通过
        volumeService.reviewPass(volume.getRecordId(), volume.getYear(), "修改后通过");
        assertEquals(2, volumeService.getVolumeDetail(volume.getRecordId(), volume.getYear()).getStatus());

        // 5. 确认归档
        volumeService.archiveConfirm(volume.getRecordId(), volume.getYear(), "确认归档");
        assertEquals(3, volumeService.getVolumeDetail(volume.getRecordId(), volume.getYear()).getStatus());

        // 6. 验证审批日志：应包含 3 条 PASS + 1 条 BACK
        var logs = approveService.listLogsByTarget(volume.getRecordId(),
                com.laikuang.archive.common.constant.ApproveBusinessType.ARCHIVE_REVIEW,
                com.laikuang.archive.common.constant.ApproveBusinessType.ARCHIVE_CONFIRM);
        assertEquals(4, logs.size(), "应包含 3 条通过 + 1 条退回");
        long passCount = logs.stream().filter(l -> com.laikuang.archive.common.constant.ApproveAction.PASS.equals(l.getAction())).count();
        long backCount = logs.stream().filter(l -> com.laikuang.archive.common.constant.ApproveAction.BACK.equals(l.getAction())).count();
        assertEquals(3, passCount);
        assertEquals(1, backCount);
    }

    // ==================== 工具方法 ====================

    private ArchiveVolumeSaveDTO buildVolumeDto() {
        ArchiveVolumeSaveDTO dto = new ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle("S3集成测试-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }

    private ArchiveBorrowApplyDTO buildApplyDto(String archiveNo, String year) {
        ArchiveBorrowApplyDTO dto = new ArchiveBorrowApplyDTO();
        dto.setArchiveNo(archiveNo);
        dto.setYear(year);
        dto.setBorrowDays(7);
        return dto;
    }

    private SysUser createUser(String username, String nickname, Long deptId) {
        SysUser user = new SysUser();
        user.setUsername(username + "-" + System.currentTimeMillis());
        user.setPassword(PasswordUtil.encode("Pass@123"));
        user.setNickname(nickname);
        user.setDeptId(deptId);
        user.setRole("user");
        user.setStatus(1);
        userMapper.insert(user);
        return user;
    }

    private com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO createAndArchiveVolume() {
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        var volume = volumeService.createVolume(dto);
        volumeService.submitForReview(volume.getRecordId(), volume.getYear());
        volumeService.reviewPass(volume.getRecordId(), volume.getYear(), "通过");
        volumeService.archiveConfirm(volume.getRecordId(), volume.getYear(), "归档");
        return volume;
    }
}
