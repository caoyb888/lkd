package com.laikuang.archive.volume.service;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.approve.domain.vo.ArchiveApproveLogVO;
import com.laikuang.archive.approve.service.ArchiveApproveService;
import com.laikuang.archive.common.constant.ApproveAction;
import com.laikuang.archive.common.constant.ApproveBusinessType;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeUpdateDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 3 — S3-01：档案归档审批状态机流转集成测试。
 * 覆盖审核通过、审核驳回、确认归档、退回上一级、状态校验拦截、审批日志写入、查询权限隔离。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchiveVolumeApprovalTest {

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveApproveService approveService;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    private Long adminUserId;
    private Long normalUserId;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        // 登录 admin（company_leader，拥有 archive:manage 权限）
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        // 创建普通用户（user 角色，无 archive:manage 权限）
        SysUser normal = new SysUser();
        normal.setUsername("normal_user");
        normal.setPassword(PasswordUtil.encode("Normal@123"));
        normal.setNickname("普通用户");
        normal.setDeptId(1L);
        normal.setRole("user");
        normal.setStatus(1);
        userMapper.insert(normal);
        normalUserId = normal.getUserId();
    }

    // ==================== 正常状态流转 ====================

    @Test
    @DisplayName("审核通过：待审核 → 待确认，并写入审批日志")
    void reviewPassShouldChangeToPendingConfirm() {
        ArchiveVolumeVO vo = createAndSubmitVolume();

        volumeService.reviewPass(vo.getRecordId(), vo.getYear(), "审核通过，进入归档确认");

        ArchiveVolumeVO after = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(2, after.getStatus());

        List<ArchiveApproveLogVO> logs = approveService.listLogsByTarget(
                vo.getRecordId(), ApproveBusinessType.ARCHIVE_REVIEW, ApproveBusinessType.ARCHIVE_CONFIRM);
        assertFalse(logs.isEmpty());
        assertEquals(ApproveAction.PASS, logs.get(0).getAction());
        assertEquals("审核通过，进入归档确认", logs.get(0).getOpinion());
    }

    @Test
    @DisplayName("审核驳回：待审核 → 草稿，并写入审批日志")
    void reviewRejectShouldChangeToDraft() {
        ArchiveVolumeVO vo = createAndSubmitVolume();

        volumeService.reviewReject(vo.getRecordId(), vo.getYear(), "资料不全，请补充");

        ArchiveVolumeVO after = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(0, after.getStatus());

        List<ArchiveApproveLogVO> logs = approveService.listLogsByTarget(
                vo.getRecordId(), ApproveBusinessType.ARCHIVE_REVIEW);
        assertFalse(logs.isEmpty());
        assertEquals(ApproveAction.REJECT, logs.get(0).getAction());
    }

    @Test
    @DisplayName("确认归档：待确认 → 已正式归档，并写入审批日志")
    void archiveConfirmShouldChangeToArchived() {
        ArchiveVolumeVO vo = createSubmitAndPassVolume();

        volumeService.archiveConfirm(vo.getRecordId(), vo.getYear(), "确认归档");

        ArchiveVolumeVO after = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(3, after.getStatus());
        assertNotNull(after.getArchiveDate());

        List<ArchiveApproveLogVO> logs = approveService.listLogsByTarget(
                vo.getRecordId(), ApproveBusinessType.ARCHIVE_CONFIRM);
        assertFalse(logs.isEmpty());
        assertEquals(ApproveAction.PASS, logs.get(0).getAction());
    }

    @Test
    @DisplayName("退回上一级：待确认 → 待审核，并写入审批日志")
    void archiveBackShouldChangeToPendingReview() {
        ArchiveVolumeVO vo = createSubmitAndPassVolume();

        volumeService.archiveBack(vo.getRecordId(), vo.getYear(), "格式不符合要求，退回审核");

        ArchiveVolumeVO after = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(1, after.getStatus());

        List<ArchiveApproveLogVO> logs = approveService.listLogsByTarget(
                vo.getRecordId(), ApproveBusinessType.ARCHIVE_CONFIRM);
        assertFalse(logs.isEmpty());
        assertEquals(ApproveAction.BACK, logs.get(0).getAction());
    }

    @Test
    @DisplayName("完整审批流：草稿→待审核→待确认→已正式归档")
    void fullApprovalFlowShouldSuccess() {
        ArchiveVolumeVO vo = createAndSubmitVolume();

        // 审核通过
        volumeService.reviewPass(vo.getRecordId(), vo.getYear(), "通过");
        ArchiveVolumeVO afterPass = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(2, afterPass.getStatus());

        // 确认归档
        volumeService.archiveConfirm(vo.getRecordId(), vo.getYear(), "归档");
        ArchiveVolumeVO afterConfirm = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(3, afterConfirm.getStatus());

        // 已归档不可再修改
        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("试图修改");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    // ==================== 非法状态流转拦截 ====================

    @Test
    @DisplayName("审核通过：草稿状态应拦截")
    void reviewPassOnDraftShouldFail() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.reviewPass(vo.getRecordId(), vo.getYear(), "通过"));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("审核驳回：已归档状态应拦截")
    void reviewRejectOnArchivedShouldFail() {
        ArchiveVolumeVO vo = createArchivedVolume();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.reviewReject(vo.getRecordId(), vo.getYear(), "驳回"));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("确认归档：待审核状态应拦截")
    void archiveConfirmOnPendingReviewShouldFail() {
        ArchiveVolumeVO vo = createAndSubmitVolume();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.archiveConfirm(vo.getRecordId(), vo.getYear(), "归档"));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("退回上一级：草稿状态应拦截")
    void archiveBackOnDraftShouldFail() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.archiveBack(vo.getRecordId(), vo.getYear(), "退回"));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    // ==================== 查询权限隔离 ====================

    @Test
    @DisplayName("待审核状态：立卷人可只读查看")
    void pendingReviewVisibleToCompiler() {
        ArchiveVolumeVO vo = createAndSubmitVolume();

        // admin 是立卷人，应可查看
        ArchiveVolumeVO detail = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertNotNull(detail);
    }

    @Test
    @DisplayName("待审核状态：普通用户（非立卷人非管理员）应被拦截")
    void pendingReviewInvisibleToNormalUser() {
        ArchiveVolumeVO vo = createAndSubmitVolume();

        StpUtil.login(normalUserId);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("待确认状态：普通用户（非立卷人非管理员）应被拦截")
    void pendingConfirmInvisibleToNormalUser() {
        ArchiveVolumeVO vo = createSubmitAndPassVolume();

        StpUtil.login(normalUserId);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("审核驳回后：立卷人应可重新修改并再次提交")
    void afterRejectCompilerCanEditAndResubmit() {
        ArchiveVolumeVO vo = createAndSubmitVolume();
        volumeService.reviewReject(vo.getRecordId(), vo.getYear(), "驳回");

        // 重新编辑
        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("补充后的题名");
        assertDoesNotThrow(() -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));

        // 再次提交
        assertDoesNotThrow(() -> volumeService.submitForReview(vo.getRecordId(), vo.getYear()));

        ArchiveVolumeVO after = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(1, after.getStatus());
    }

    // ==================== 工具方法 ====================

    private ArchiveVolumeVO createAndSubmitVolume() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        volumeService.submitForReview(vo.getRecordId(), vo.getYear());
        return vo;
    }

    private ArchiveVolumeVO createSubmitAndPassVolume() {
        ArchiveVolumeVO vo = createAndSubmitVolume();
        volumeService.reviewPass(vo.getRecordId(), vo.getYear(), "通过");
        return vo;
    }

    private ArchiveVolumeVO createArchivedVolume() {
        ArchiveVolumeVO vo = createSubmitAndPassVolume();
        volumeService.archiveConfirm(vo.getRecordId(), vo.getYear(), "归档");
        return vo;
    }

    private ArchiveVolumeSaveDTO buildVolumeDto() {
        ArchiveVolumeSaveDTO dto = new ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle("审批测试案卷-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }
}
