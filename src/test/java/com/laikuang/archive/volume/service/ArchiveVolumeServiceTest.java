package com.laikuang.archive.volume.service;

import cn.dev33.satoken.stp.StpUtil;
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
import com.laikuang.archive.volume.domain.vo.ArchiveNoPreviewVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeListVO;
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
 * Sprint 2 — S2-01：案卷级目录 Service 层集成测试。
 * 覆盖新建、档号生成、草稿修改/删除/提交、水平越权拦截、分页查询。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchiveVolumeServiceTest {

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    private Long adminUserId;
    private Long otherUserId;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        // 登录 admin（已存在初始数据）
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        // 创建另一个普通用户，用于水平越权测试
        SysUser other = new SysUser();
        other.setUsername("other_user");
        other.setPassword(PasswordUtil.encode("Other@123"));
        other.setNickname("其他用户");
        other.setDeptId(1L);
        other.setRole("user");
        other.setStatus(1);
        userMapper.insert(other);
        otherUserId = other.getUserId();
    }

    // ==================== 新建与档号生成 ====================

    @Test
    @DisplayName("新建案卷：应进入草稿状态，档号自动拼接")
    void createVolumeShouldBeDraft() {
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        ArchiveVolumeVO vo = volumeService.createVolume(dto);

        assertNotNull(vo.getRecordId());
        assertEquals(0, vo.getStatus());
        assertEquals(adminUserId, vo.getCompilerId());
        assertNotNull(vo.getArchiveNo());
        assertTrue(vo.getArchiveNo().contains(dto.getFondsNo()));
        assertTrue(vo.getArchiveNo().contains(dto.getCategoryL1()));
    }

    @Test
    @DisplayName("档号预览：同一分类组合应递增案卷号")
    void previewArchiveNoShouldIncrement() {
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        volumeService.createVolume(dto);

        ArchiveNoPreviewVO preview = volumeService.previewArchiveNo(
                dto.getYear(), dto.getFondsNo(), dto.getCategoryL1(),
                dto.getCategoryL2(), dto.getCategoryL3(), dto.getDeviceCode());

        assertNotNull(preview.getSuggestedVolumeNo());
        assertNotNull(preview.getArchiveNo());
        // 已存在一个案卷，推荐案卷号应为 002
        assertEquals("002", preview.getSuggestedVolumeNo());
    }

    // ==================== 草稿修改与删除 ====================

    @Test
    @DisplayName("更新案卷：草稿态且立卷人本人，应成功")
    void updateOwnDraftShouldSuccess() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());

        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("更新后的题名");
        assertDoesNotThrow(() -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));

        ArchiveVolumeVO after = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals("更新后的题名", after.getVolumeTitle());
    }

    @Test
    @DisplayName("更新案卷：他人草稿，应水平越权拦截")
    void updateOthersDraftShouldFail() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());

        // 切换为 other_user
        StpUtil.login(otherUserId);

        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("恶意更新");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("更新案卷：非草稿状态，应拦截")
    void updateNonDraftShouldFail() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        volumeService.submitForReview(vo.getRecordId(), vo.getYear());

        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("恶意更新");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("删除案卷：草稿态且立卷人本人，应逻辑删除")
    void deleteOwnDraftShouldSuccess() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        assertDoesNotThrow(() -> volumeService.deleteVolume(vo.getRecordId(), vo.getYear()));

        // 逻辑删除后，常规查询应查不到
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear()));
        assertTrue(ex.getMessage().contains("不存在"));
    }

    @Test
    @DisplayName("删除案卷：他人草稿，应水平越权拦截")
    void deleteOthersDraftShouldFail() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        StpUtil.login(otherUserId);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.deleteVolume(vo.getRecordId(), vo.getYear()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    // ==================== 提交审核 ====================

    @Test
    @DisplayName("提交审核：草稿→待审核，成功后不可再修改")
    void submitForReviewShouldChangeStatus() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        volumeService.submitForReview(vo.getRecordId(), vo.getYear());

        ArchiveVolumeVO after = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(1, after.getStatus());

        // 待审核状态不可修改
        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("试图修改");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("提交审核：他人草稿，应水平越权拦截")
    void submitOthersDraftShouldFail() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        StpUtil.login(otherUserId);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.submitForReview(vo.getRecordId(), vo.getYear()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    // ==================== 查询 ====================

    @Test
    @DisplayName("查看草稿详情：立卷人本人应可见")
    void getOwnDraftDetailShouldSuccess() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        ArchiveVolumeVO detail = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertNotNull(detail);
    }

    @Test
    @DisplayName("查看草稿详情：他人应被拦截")
    void getOthersDraftDetailShouldFail() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        StpUtil.login(otherUserId);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("草稿箱分页：应只返回当前用户的草稿")
    void pageDraftsShouldOnlyReturnOwn() {
        volumeService.createVolume(buildVolumeDto());
        // other_user 创建一个案卷
        StpUtil.login(otherUserId);
        volumeService.createVolume(buildVolumeDto());

        // 切换回 admin 查草稿箱
        StpUtil.login(adminUserId);
        var page = volumeService.pageDrafts(new PageQuery());
        assertEquals(1, page.getRecords().size());
        assertEquals(adminUserId, page.getRecords().get(0).getCompilerId());
    }

    @Test
    @DisplayName("已归档分页：应只返回 status = 3 的案卷")
    void pageVolumesShouldOnlyReturnArchived() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        // 草稿不应出现在已归档列表
        var page = volumeService.pageVolumes(new PageQuery(), vo.getYear(), null,
                null, null, null, null, null, null, null, null, null);
        assertTrue(page.getRecords().stream().noneMatch(r -> r.getRecordId().equals(vo.getRecordId())));
    }

    @Test
    @DisplayName("多维检索：按全宗号+类目+状态组合筛选")
    void pageVolumesWithMultiDimensionShouldFilter() {
        // 创建两个不同全宗号/类目的案卷并直接改为已归档
        ArchiveVolumeSaveDTO dto1 = buildVolumeDto();
        ArchiveVolumeVO vo1 = volumeService.createVolume(dto1);

        ArchiveVolumeSaveDTO dto2 = buildVolumeDto();
        dto2.setFondsNo("02");
        dto2.setCategoryL1("9");
        dto2.setVolumeTitle("不同案卷-" + System.currentTimeMillis());
        ArchiveVolumeVO vo2 = volumeService.createVolume(dto2);

        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, vo1.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, vo1.getYear()));
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, vo2.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, vo2.getYear()));

        // 按 vo1 的全宗号和一级类目筛选，应只返回 vo1
        var page = volumeService.pageVolumes(new PageQuery(), vo1.getYear(), vo1.getFondsNo(),
                vo1.getCategoryL1(), null, null, null, null, null, null, null, null);
        assertTrue(page.getRecords().stream().anyMatch(r -> r.getRecordId().equals(vo1.getRecordId())));
        assertTrue(page.getRecords().stream().noneMatch(r -> r.getRecordId().equals(vo2.getRecordId())));
    }

    @Test
    @DisplayName("多维检索：关键词模糊匹配案卷题名")
    void pageVolumesWithKeywordShouldFuzzyMatch() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, vo.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, vo.getYear()));

        String keyword = "测试案卷题名";
        var page = volumeService.pageVolumes(new PageQuery(), vo.getYear(), null,
                null, null, null, null, null, null, null, null, keyword);
        assertTrue(page.getRecords().stream().anyMatch(r -> r.getRecordId().equals(vo.getRecordId())));
    }

    // ==================== 工具 ====================

    private ArchiveVolumeSaveDTO buildVolumeDto() {
        ArchiveVolumeSaveDTO dto = new ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle("测试案卷题名-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }
}
