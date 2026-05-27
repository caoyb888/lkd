package com.laikuang.archive.file.service;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.domain.dto.ArchiveFileUpdateDTO;
import com.laikuang.archive.file.domain.vo.ArchiveFileVO;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
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
 * Sprint 2 — S2-01：文件级明细目录 Service 层集成测试。
 * 覆盖新建（关联案卷校验）、草稿修改/删除、水平越权、卷内列表查询。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchiveFileServiceTest {

    @Autowired
    private ArchiveFileService fileService;

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private com.laikuang.archive.file.mapper.ArchiveFileMapper fileMapper;

    private Long adminUserId;
    private Long otherUserId;
    private ArchiveVolumeVO testVolume;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        SysUser other = new SysUser();
        other.setUsername("other_user");
        other.setPassword(PasswordUtil.encode("Other@123"));
        other.setNickname("其他用户");
        other.setDeptId(1L);
        other.setRole("user");
        other.setStatus(1);
        userMapper.insert(other);
        otherUserId = other.getUserId();

        // 准备一个草稿案卷
        testVolume = volumeService.createVolume(buildVolumeDto());
    }

    // ==================== 新建文件 ====================

    @Test
    @DisplayName("新建文件：关联自己草稿案卷，应成功且状态为草稿")
    void createFileWithOwnDraftVolumeShouldSuccess() {
        ArchiveFileSaveDTO dto = buildFileDto(testVolume);
        ArchiveFileVO vo = fileService.createFile(dto);

        assertNotNull(vo.getRecordId());
        assertEquals(0, vo.getStatus());
        assertEquals(adminUserId, vo.getCompilerId());
        assertEquals(testVolume.getVolumeNo(), dto.getVolumeNo());
    }

    @Test
    @DisplayName("新建文件：关联他人草稿案卷，应水平越权拦截")
    void createFileWithOthersDraftVolumeShouldFail() {
        StpUtil.login(otherUserId);
        ArchiveFileSaveDTO dto = buildFileDto(testVolume);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.createFile(dto));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("新建文件：关联已归档案卷，应拦截")
    void createFileWithArchivedVolumeShouldFail() {
        // 直接将案卷状态改为已归档（绕过审批流，仅供测试数据准备）
        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, testVolume.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, testVolume.getYear()));

        ArchiveFileSaveDTO dto = buildFileDto(testVolume);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.createFile(dto));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("新建文件：案卷不存在，应拦截")
    void createFileWithNonExistentVolumeShouldFail() {
        ArchiveFileSaveDTO dto = buildFileDto(testVolume);
        dto.setVolumeNo("NOT_EXIST");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.createFile(dto));
        assertTrue(ex.getMessage().contains("不存在"));
    }

    // ==================== 修改与删除 ====================

    @Test
    @DisplayName("更新文件：草稿态且立卷人本人，应成功")
    void updateOwnDraftFileShouldSuccess() {
        ArchiveFileVO vo = fileService.createFile(buildFileDto(testVolume));

        ArchiveFileUpdateDTO update = new ArchiveFileUpdateDTO();
        update.setFileTitle("更新后的文件标题");
        assertDoesNotThrow(() -> fileService.updateFile(vo.getRecordId(), vo.getYear(), update));

        ArchiveFileVO after = fileService.getFileDetail(vo.getRecordId(), vo.getYear());
        assertEquals("更新后的文件标题", after.getFileTitle());
    }

    @Test
    @DisplayName("更新文件：他人草稿，应水平越权拦截")
    void updateOthersDraftFileShouldFail() {
        ArchiveFileVO vo = fileService.createFile(buildFileDto(testVolume));
        StpUtil.login(otherUserId);

        ArchiveFileUpdateDTO update = new ArchiveFileUpdateDTO();
        update.setFileTitle("恶意更新");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.updateFile(vo.getRecordId(), vo.getYear(), update));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("删除文件：草稿态且立卷人本人，应逻辑删除")
    void deleteOwnDraftFileShouldSuccess() {
        ArchiveFileVO vo = fileService.createFile(buildFileDto(testVolume));
        assertDoesNotThrow(() -> fileService.deleteFile(vo.getRecordId(), vo.getYear()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.getFileDetail(vo.getRecordId(), vo.getYear()));
        assertTrue(ex.getMessage().contains("不存在"));
    }

    @Test
    @DisplayName("删除文件：他人草稿，应水平越权拦截")
    void deleteOthersDraftFileShouldFail() {
        ArchiveFileVO vo = fileService.createFile(buildFileDto(testVolume));
        StpUtil.login(otherUserId);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.deleteFile(vo.getRecordId(), vo.getYear()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    // ==================== 查询 ====================

    @Test
    @DisplayName("查看文件详情：立卷人本人应可见")
    void getOwnDraftFileDetailShouldSuccess() {
        ArchiveFileVO vo = fileService.createFile(buildFileDto(testVolume));
        ArchiveFileVO detail = fileService.getFileDetail(vo.getRecordId(), vo.getYear());
        assertNotNull(detail);
    }

    @Test
    @DisplayName("查看文件详情：他人应被拦截")
    void getOthersDraftFileDetailShouldFail() {
        ArchiveFileVO vo = fileService.createFile(buildFileDto(testVolume));
        StpUtil.login(otherUserId);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.getFileDetail(vo.getRecordId(), vo.getYear()));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    @Test
    @DisplayName("卷内文件列表：应按 seq_no 升序")
    void listFilesByVolumeShouldOrdered() {
        fileService.createFile(buildFileDto(testVolume, 2));
        fileService.createFile(buildFileDto(testVolume, 1));

        var list = fileService.listFilesByVolume(testVolume.getVolumeNo(), testVolume.getYear());
        assertEquals(2, list.size());
        assertTrue(list.get(0).getSeqNo() <= list.get(1).getSeqNo());
    }

    @Test
    @DisplayName("草稿文件分页：应只返回当前用户的草稿")
    void pageDraftFilesShouldOnlyReturnOwn() {
        fileService.createFile(buildFileDto(testVolume));

        // other_user 创建自己的案卷及文件
        StpUtil.login(otherUserId);
        ArchiveVolumeVO otherVolume = volumeService.createVolume(buildVolumeDto());
        fileService.createFile(buildFileDto(otherVolume));

        // 切换回 admin 查草稿箱
        StpUtil.login(adminUserId);
        var page = fileService.pageDraftFiles(new PageQuery());
        assertEquals(1, page.getRecords().size());
        assertEquals(adminUserId, page.getRecords().get(0).getCompilerId());
    }

    @Test
    @DisplayName("多维检索：按年度+案卷号+关键词组合筛选文件")
    void pageFilesWithMultiDimensionShouldFilter() {
        ArchiveFileVO file = fileService.createFile(buildFileDto(testVolume));
        // 直接改为已归档状态
        com.laikuang.archive.file.domain.entity.ArchiveFile update =
                new com.laikuang.archive.file.domain.entity.ArchiveFile();
        update.setStatus(3);
        fileMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.file.domain.entity.ArchiveFile>()
                .eq(com.laikuang.archive.file.domain.entity.ArchiveFile::getRecordId, file.getRecordId())
                .eq(com.laikuang.archive.file.domain.entity.ArchiveFile::getYear, file.getYear()));

        // 按案卷号+关键词筛选
        var page = fileService.pageFiles(new PageQuery(), file.getYear(), null,
                null, null, null, testVolume.getVolumeNo(), null, null, null, null,
                "测试文件");
        assertTrue(page.getRecords().stream().anyMatch(r -> r.getRecordId().equals(file.getRecordId())));
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
        dto.setVolumeTitle("测试案卷-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }

    private ArchiveFileSaveDTO buildFileDto(ArchiveVolumeVO volume) {
        return buildFileDto(volume, 1);
    }

    private ArchiveFileSaveDTO buildFileDto(ArchiveVolumeVO volume, int seqNo) {
        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear(volume.getYear());
        dto.setVolumeNo(volume.getVolumeNo());
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setFileTitle("测试文件-" + System.currentTimeMillis() + "-" + seqNo);
        dto.setSeqNo(seqNo);
        dto.setPages(10);
        dto.setCopies(1);
        return dto;
    }
}
