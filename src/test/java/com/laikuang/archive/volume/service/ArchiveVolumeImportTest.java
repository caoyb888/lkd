package com.laikuang.archive.volume.service;

import cn.dev33.satoken.stp.StpUtil;
import com.alibaba.excel.EasyExcel;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeImportDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeImportResultVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 2 — S2-03：案卷目录 Excel 批量导入 Service 层集成测试。
 * 覆盖正常导入、严格校验、整单回滚、字典校验、档号唯一性等场景。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchiveVolumeImportTest {

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

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
    @DisplayName("批量导入：2条有效数据应全部导入成功，状态为待审核")
    void importSuccess() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        list.add(buildValidRow("2026", "导入测试案卷A"));
        list.add(buildValidRow("2026", "导入测试案卷B"));

        MockMultipartFile file = writeExcelToMockFile(list, "import_success.xlsx");
        ArchiveVolumeImportResultVO result = volumeService.importVolumes(file);

        assertEquals(2, result.getTotalCount());
        assertEquals(2, result.getSuccessCount());

        // 验证状态为待审核（status = 1）
        var volumes = volumeMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                        .like(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getVolumeTitle, "导入测试案卷"));
        assertEquals(2, volumes.size());
        assertTrue(volumes.stream().allMatch(v -> v.getStatus() == 1));
        assertTrue(volumes.stream().allMatch(v -> v.getCompilerId().equals(adminUserId)));
    }

    @Test
    @DisplayName("批量导入：空文件应抛异常")
    void importEmptyFileShouldFail() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        MockMultipartFile file = writeExcelToMockFile(list, "empty.xlsx");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));
        assertEquals(ResultCode.PARAM_ERROR, ex.getCode());
    }

    @Test
    @DisplayName("批量导入：必填字段缺失应精确定位行号列名")
    void importMissingRequiredFieldShouldFail() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        ArchiveVolumeImportDTO row = buildValidRow("2026", "正常案卷");
        list.add(row);

        ArchiveVolumeImportDTO badRow = buildValidRow("", "案卷题名存在");
        badRow.setFondsNo(""); // 全宗号缺失
        badRow.setCategoryL1(""); // 一级类目缺失
        list.add(badRow);

        MockMultipartFile file = writeExcelToMockFile(list, "missing_required.xlsx");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));

        assertEquals(ResultCode.EXCEL_IMPORT_ERROR, ex.getCode());
        String msg = ex.getMessage();
        // 第3行（表头1 + 数据从第2行开始，所以badRow在第3行）
        assertTrue(msg.contains("第3行"), "应精确定位到第3行: " + msg);
        assertTrue(msg.contains("年度") || msg.contains("全宗号") || msg.contains("一级类目"),
                "应包含列名信息: " + msg);
    }

    @Test
    @DisplayName("批量导入：字典值不在范围内应报错")
    void importInvalidDictValueShouldFail() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        ArchiveVolumeImportDTO row = buildValidRow("2026", "字典测试案卷");
        row.setRetentionPeriod("invalid_period");
        row.setSecurityLevel("top_secret_level");
        list.add(row);

        MockMultipartFile file = writeExcelToMockFile(list, "invalid_dict.xlsx");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));

        assertEquals(ResultCode.EXCEL_IMPORT_ERROR, ex.getCode());
        String msg = ex.getMessage();
        assertTrue(msg.contains("保管期限"), "应提示保管期限错误: " + msg);
        assertTrue(msg.contains("密级"), "应提示密级错误: " + msg);
    }

    @Test
    @DisplayName("批量导入：日期格式错误应报错")
    void importInvalidDateFormatShouldFail() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        ArchiveVolumeImportDTO row = buildValidRow("2026", "日期测试案卷");
        row.setCompileDateActual("2026/05/26"); // 错误格式
        list.add(row);

        MockMultipartFile file = writeExcelToMockFile(list, "invalid_date.xlsx");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));

        assertEquals(ResultCode.EXCEL_IMPORT_ERROR, ex.getCode());
        assertTrue(ex.getMessage().contains("立卷日期"));
        assertTrue(ex.getMessage().contains("yyyy-MM-dd"));
    }

    @Test
    @DisplayName("批量导入：档号与数据库已存在重复应报错")
    void importDuplicateArchiveNoShouldFail() {
        // 先创建一个已归档案卷，占用档号
        ArchiveVolumeVO existing = volumeService.createVolume(buildVolumeSaveDto());
        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, existing.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, existing.getYear()));

        // 再导入一条相同分类组合且不指定案卷号的数据，系统会自动生成相同档号
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        ArchiveVolumeImportDTO row = buildValidRow(existing.getYear(), "重复档号案卷");
        row.setFondsNo(existing.getFondsNo());
        row.setCategoryL1(existing.getCategoryL1());
        row.setCategoryL2(existing.getCategoryL2());
        row.setCategoryL3(existing.getCategoryL3());
        row.setDeviceCode(existing.getDeviceCode());
        row.setVolumeNo(existing.getVolumeNo()); // 显式使用相同案卷号
        list.add(row);

        MockMultipartFile file = writeExcelToMockFile(list, "duplicate_archive_no.xlsx");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));

        assertEquals(ResultCode.ARCHIVE_NO_DUPLICATE, ex.getCode());
    }

    @Test
    @DisplayName("批量导入：一行出错应整单回滚，数据库无残留")
    void importAllRollbackWhenOneRowError() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        list.add(buildValidRow("2026", "正常案卷A"));
        list.add(buildValidRow("2026", "正常案卷B"));

        ArchiveVolumeImportDTO badRow = buildValidRow("2026", "错误案卷");
        badRow.setSecurityLevel("非法密级");
        list.add(badRow);

        MockMultipartFile file = writeExcelToMockFile(list, "partial_error.xlsx");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));

        assertEquals(ResultCode.EXCEL_IMPORT_ERROR, ex.getCode());

        // 验证整单回滚：前两条正常数据也不应入库
        var volumes = volumeMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                        com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                        .like(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getVolumeTitle, "正常案卷"));
        assertEquals(0, volumes.size(), "整单回滚后不应有任何数据残留");
    }

    // ==================== 工具方法 ====================

    private ArchiveVolumeImportDTO buildValidRow(String year, String title) {
        ArchiveVolumeImportDTO dto = new ArchiveVolumeImportDTO();
        dto.setYear(year);
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle(title);
        dto.setCopies(1);
        dto.setFileCount(0);
        dto.setTotalPages(0);
        return dto;
    }

    private com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO buildVolumeSaveDto() {
        com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO dto =
                new com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle("占位案卷-" + System.currentTimeMillis());
        dto.setCopies(1);
        return dto;
    }

    private MockMultipartFile writeExcelToMockFile(List<ArchiveVolumeImportDTO> data, String fileName) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            EasyExcel.write(out, ArchiveVolumeImportDTO.class).sheet("案卷目录").doWrite(data);
            return new MockMultipartFile(
                    "file",
                    fileName,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    new ByteArrayInputStream(out.toByteArray()));
        } catch (Exception e) {
            throw new RuntimeException("生成测试 Excel 文件失败", e);
        }
    }
}
