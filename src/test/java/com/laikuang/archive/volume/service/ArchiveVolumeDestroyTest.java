package com.laikuang.archive.volume.service;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.approve.service.ArchiveApproveService;
import com.laikuang.archive.borrow.domain.dto.ArchiveBorrowApplyDTO;
import com.laikuang.archive.borrow.service.ArchiveBorrowService;
import com.laikuang.archive.common.constant.ApproveAction;
import com.laikuang.archive.common.constant.ApproveBusinessType;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 4 — S4-01：高危操作（删除/销毁）及领导审批集成测试。
 *
 * <p>覆盖销毁申请、领导终审通过/驳回、已销毁档案对日常检索及借阅的不可见性。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchiveVolumeDestroyTest {

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveApproveService approveService;

    @Autowired
    private ArchiveBorrowService borrowService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    private Long adminUserId;
    private Long archiveAdminId;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        // 创建档案管理员（archive_admin 角色，有 archive:manage 但无 archive:destroy）
        SysUser archAdmin = new SysUser();
        archAdmin.setUsername("archive_admin_user");
        archAdmin.setPassword(PasswordUtil.encode("Admin@123"));
        archAdmin.setNickname("档案管理员");
        archAdmin.setDeptId(1L);
        archAdmin.setRole("archive_admin");
        archAdmin.setStatus(1);
        userMapper.insert(archAdmin);
        archiveAdminId = archAdmin.getUserId();
    }

    // ==================== 正常销毁流程 ====================

    @Test
    @DisplayName("【S4-01】销毁申请：管理员对已归档案卷提交销毁申请，应写入 APPLY 日志")
    void applyDestroyShouldCreateApprovalLog() {
        ArchiveVolumeVO volume = createArchivedVolume();

        StpUtil.login(archiveAdminId);
        volumeService.applyDestroy(volume.getRecordId(), volume.getYear(), "该档案已超过保管期限");

        var logs = approveService.listLogsByTarget(volume.getRecordId(), ApproveBusinessType.DESTROY_APPROVE);
        assertEquals(1, logs.size());
        assertEquals(ApproveAction.APPLY, logs.get(0).getAction());
        assertEquals("该档案已超过保管期限", logs.get(0).getOpinion());
    }

    @Test
    @DisplayName("【S4-01】销毁通过：领导审批通过后，案卷 destroy_flag = 1 且不可借阅")
    void approveDestroyShouldSetDestroyFlagAndCreateLog() {
        ArchiveVolumeVO volume = createArchivedVolume();

        // 档案管理员提交销毁申请
        StpUtil.login(archiveAdminId);
        volumeService.applyDestroy(volume.getRecordId(), volume.getYear(), "申请销毁");

        // 公司领导审批通过
        StpUtil.login(adminUserId);
        volumeService.approveDestroy(volume.getRecordId(), volume.getYear(), "同意销毁");

        // 验证审批日志
        var logs = approveService.listLogsByTarget(volume.getRecordId(), ApproveBusinessType.DESTROY_APPROVE);
        assertEquals(2, logs.size(), "应包含 APPLY 和 PASS 两条日志");
        assertTrue(logs.stream().anyMatch(l -> ApproveAction.PASS.equals(l.getAction())));

        // 验证案卷已不可见（@TableLogic 自动过滤）
        var after = volumeMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, volume.getYear()));
        assertNull(after, "已销毁案卷应在标准查询中不可见");

        // 验证已销毁案卷不可借阅
        SysUser normal = createNormalUser();
        StpUtil.login(normal.getUserId());
        ArchiveBorrowApplyDTO dto = new ArchiveBorrowApplyDTO();
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setYear(volume.getYear());
        dto.setBorrowDays(7);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowService.apply(dto));
        assertEquals(ResultCode.PARAM_ERROR, ex.getCode());
        assertTrue(ex.getMessage().contains("不存在") || ex.getMessage().contains("已销毁"));
    }

    @Test
    @DisplayName("【S4-01】销毁驳回：领导审批驳回后，案卷仍保持未销毁状态且可借阅")
    void rejectDestroyShouldKeepVolumeVisible() {
        ArchiveVolumeVO volume = createArchivedVolume();

        // 档案管理员提交销毁申请
        StpUtil.login(archiveAdminId);
        volumeService.applyDestroy(volume.getRecordId(), volume.getYear(), "申请销毁");

        // 公司领导审批驳回
        StpUtil.login(adminUserId);
        volumeService.rejectDestroy(volume.getRecordId(), volume.getYear(), "该档案仍有保存价值");

        // 验证审批日志
        var logs = approveService.listLogsByTarget(volume.getRecordId(), ApproveBusinessType.DESTROY_APPROVE);
        assertEquals(2, logs.size(), "应包含 APPLY 和 REJECT 两条日志");
        assertTrue(logs.stream().anyMatch(l -> ApproveAction.REJECT.equals(l.getAction())));

        // 验证案卷仍然可见且可借阅
        var after = volumeMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                        .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, volume.getYear()));
        assertNotNull(after);
        assertEquals(0, after.getDestroyFlag());

        SysUser normal = createNormalUser();
        StpUtil.login(normal.getUserId());
        var borrow = borrowService.apply(buildApplyDto(volume.getArchiveNo(), volume.getYear()));
        assertNotNull(borrow.getBorrowId());
    }

    // ==================== 非法操作拦截 ====================

    @Test
    @DisplayName("【S4-01】销毁申请：草稿态案卷应被拦截")
    void applyDestroyOnDraftShouldFail() {
        ArchiveVolumeVO volume = volumeService.createVolume(buildVolumeDto());

        StpUtil.login(archiveAdminId);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.applyDestroy(volume.getRecordId(), volume.getYear(), "试图销毁"));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("【S4-01】销毁申请：已销毁案卷不可重复提交")
    void applyDestroyOnAlreadyDestroyedShouldFail() {
        ArchiveVolumeVO volume = createArchivedVolume();

        // 先销毁
        StpUtil.login(archiveAdminId);
        volumeService.applyDestroy(volume.getRecordId(), volume.getYear(), "申请销毁");
        StpUtil.login(adminUserId);
        volumeService.approveDestroy(volume.getRecordId(), volume.getYear(), "同意销毁");

        // 再次尝试申请销毁（由于 @TableLogic，案卷已不可见）
        StpUtil.login(archiveAdminId);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.applyDestroy(volume.getRecordId(), volume.getYear(), "重复销毁"));
        assertEquals(ResultCode.PARAM_ERROR, ex.getCode());
    }

    @Test
    @DisplayName("【S4-01】已销毁案卷：在分页查询中不可见")
    void destroyedVolumeShouldNotAppearInPageVolumes() {
        // 创建两条已归档案卷
        ArchiveVolumeVO volumeA = createArchivedVolume();
        ArchiveVolumeVO volumeB = createArchivedVolume();

        // 销毁其中一条
        StpUtil.login(archiveAdminId);
        volumeService.applyDestroy(volumeA.getRecordId(), volumeA.getYear(), "申请销毁");
        StpUtil.login(adminUserId);
        volumeService.approveDestroy(volumeA.getRecordId(), volumeA.getYear(), "同意销毁");

        // 分页查询应只返回未销毁的案卷
        var page = volumeService.pageVolumes(
                new com.laikuang.archive.common.domain.PageQuery(),
                "2026", null, "8", null, null, null,
                null, null, null, null, null);
        assertTrue(page.getRecords().stream()
                .anyMatch(r -> r.getRecordId().equals(volumeB.getRecordId())),
                "未销毁案卷应可见");
        assertTrue(page.getRecords().stream()
                .noneMatch(r -> r.getRecordId().equals(volumeA.getRecordId())),
                "已销毁案卷不可见");
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
        dto.setVolumeTitle("销毁测试案卷-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }

    private ArchiveVolumeVO createArchivedVolume() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        volumeService.submitForReview(vo.getRecordId(), vo.getYear());
        volumeService.reviewPass(vo.getRecordId(), vo.getYear(), "通过");
        volumeService.archiveConfirm(vo.getRecordId(), vo.getYear(), "归档");
        return vo;
    }

    private SysUser createNormalUser() {
        SysUser user = new SysUser();
        user.setUsername("normal_user_" + System.currentTimeMillis());
        user.setPassword(PasswordUtil.encode("Pass@123"));
        user.setNickname("普通用户");
        user.setDeptId(1L);
        user.setRole("user");
        user.setStatus(1);
        userMapper.insert(user);
        return user;
    }

    private ArchiveBorrowApplyDTO buildApplyDto(String archiveNo, String year) {
        ArchiveBorrowApplyDTO dto = new ArchiveBorrowApplyDTO();
        dto.setArchiveNo(archiveNo);
        dto.setYear(year);
        dto.setBorrowDays(7);
        return dto;
    }
}
