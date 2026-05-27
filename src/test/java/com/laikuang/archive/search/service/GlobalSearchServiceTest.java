package com.laikuang.archive.search.service;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.domain.vo.ArchiveFileVO;
import com.laikuang.archive.search.domain.vo.GlobalSearchVO;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import com.laikuang.archive.file.mapper.ArchiveFileMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 2 — S2-02：全局模糊检索 Service 层集成测试。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GlobalSearchServiceTest {

    @Autowired
    private GlobalSearchService searchService;

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private com.laikuang.archive.file.service.ArchiveFileService fileService;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private ArchiveFileMapper fileMapper;

    private Long adminUserId;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();
    }

    @Test
    @DisplayName("全局检索：关键词为空应抛异常")
    void globalSearchWithEmptyKeywordShouldFail() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> searchService.globalSearch("", null, null));
        assertTrue(ex.getMessage().contains("不能为空"));
    }

    @Test
    @DisplayName("全局检索：关键词匹配案卷题名")
    void globalSearchShouldMatchVolumeTitle() {
        ArchiveVolumeVO volume = createVolumeOnly("全局检索测试案卷");
        archiveVolume(volume);

        GlobalSearchVO result = searchService.globalSearch("全局检索测试", volume.getYear(), null);
        assertFalse(result.getVolumes().isEmpty());
        assertTrue(result.getVolumes().stream()
                .anyMatch(v -> v.getRecordId().equals(volume.getRecordId())));
    }

    @Test
    @DisplayName("全局检索：关键词匹配文件标题")
    void globalSearchShouldMatchFileTitle() {
        ArchiveVolumeVO volume = createVolumeOnly("测试案卷");
        ArchiveFileVO file = createFileInVolume(volume, "全局检索测试文件");
        archiveVolume(volume);
        archiveFile(file);

        GlobalSearchVO result = searchService.globalSearch("全局检索测试", volume.getYear(), null);
        assertFalse(result.getFiles().isEmpty());
        assertTrue(result.getFiles().stream()
                .anyMatch(f -> f.getRecordId().equals(file.getRecordId())));
    }

    @Test
    @DisplayName("全局检索：关键词匹配主题词")
    void globalSearchShouldMatchKeywords() {
        ArchiveVolumeVO volume = createVolumeOnly("测试案卷");
        ArchiveFileVO file = createFileWithKeywords(volume, "重要主题词测试");
        archiveVolume(volume);
        archiveFile(file);

        GlobalSearchVO result = searchService.globalSearch("主题词测试", volume.getYear(), null);
        assertFalse(result.getFiles().isEmpty());
        assertTrue(result.getFiles().stream()
                .anyMatch(f -> f.getRecordId().equals(file.getRecordId())));
    }

    @Test
    @DisplayName("全局检索：按年度+类目精准过滤")
    void globalSearchWithYearAndCategoryShouldFilter() {
        ArchiveVolumeVO volume = createVolumeOnly("测试案卷A");
        archiveVolume(volume);

        // 用不同的 categoryL1 检索，应无结果
        GlobalSearchVO result = searchService.globalSearch("测试案卷A", volume.getYear(), "99");
        assertTrue(result.getVolumes().isEmpty());
    }

    // ==================== 工具方法 ====================

    private ArchiveVolumeVO createVolumeOnly(String title) {
        ArchiveVolumeSaveDTO dto = new ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle(title);
        dto.setCopies(1);
        return volumeService.createVolume(dto);
    }

    private void archiveVolume(ArchiveVolumeVO volume) {
        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, volume.getYear()));
    }

    private ArchiveFileVO createFileInVolume(ArchiveVolumeVO volume, String fileTitle) {
        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear(volume.getYear());
        dto.setVolumeNo(volume.getVolumeNo());
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setFileTitle(fileTitle);
        dto.setSeqNo(1);
        dto.setPages(10);
        dto.setCopies(1);
        return fileService.createFile(dto);
    }

    private ArchiveFileVO createFileWithKeywords(ArchiveVolumeVO volume, String keywords) {
        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear(volume.getYear());
        dto.setVolumeNo(volume.getVolumeNo());
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setFileTitle("测试文件-" + System.currentTimeMillis());
        dto.setKeywords(keywords);
        dto.setSeqNo(1);
        dto.setPages(10);
        dto.setCopies(1);
        return fileService.createFile(dto);
    }

    private void archiveFile(ArchiveFileVO file) {
        com.laikuang.archive.file.domain.entity.ArchiveFile update =
                new com.laikuang.archive.file.domain.entity.ArchiveFile();
        update.setStatus(3);
        fileMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.file.domain.entity.ArchiveFile>()
                .eq(com.laikuang.archive.file.domain.entity.ArchiveFile::getRecordId, file.getRecordId())
                .eq(com.laikuang.archive.file.domain.entity.ArchiveFile::getYear, file.getYear()));
    }
}
