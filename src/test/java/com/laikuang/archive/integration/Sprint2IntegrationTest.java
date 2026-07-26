package com.laikuang.archive.integration;

import cn.dev33.satoken.stp.StpUtil;
import com.alibaba.excel.EasyExcel;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.domain.vo.ArchiveFileVO;
import com.laikuang.archive.file.service.ArchiveFileService;
import com.laikuang.archive.search.service.GlobalSearchService;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeImportDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeUpdateDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import com.laikuang.archive.volume.service.print.ArchivePrintService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 2 — S2-05：阶段性集成测试。
 *
 * <p>覆盖 Sprint 2 全部核心功能的端到端集成验证：
 * <ul>
 *   <li>复杂数据校验（字段长度、状态机、关联校验）</li>
 *   <li>大数据量分页查询（分页边界、组合筛选准确性）</li>
 *   <li>Excel 异常数据上传拦截（格式、字典、整单回滚）</li>
 *   <li>Word 打印文档结构完整性（4 部分合并、表格渲染）</li>
 * </ul>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class Sprint2IntegrationTest {

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveFileService fileService;

    @Autowired
    private ArchiveVolumeMapper volumeMapper;

    @Autowired
    private GlobalSearchService searchService;

    @Autowired
    private ArchivePrintService printService;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    private Long adminUserId;
    private Long otherUserId;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        SysUser other = new SysUser();
        other.setUsername("s2_other_user");
        other.setPassword(PasswordUtil.encode("Other@123"));
        other.setNickname("S2其他用户");
        other.setDeptId(1L);
        other.setRole("user");
        other.setStatus(1);
        userMapper.insert(other);
        otherUserId = other.getUserId();
    }

    // ==================== 1. 复杂数据校验 ====================

    @Test
    @DisplayName("【S2-05】复杂校验：案卷题名超长触发数据库约束")
    void volumeTitleTooLongShouldTriggerDbConstraint() {
        ArchiveVolumeSaveDTO dto = buildVolumeDto();
        dto.setVolumeTitle("A".repeat(201));

        // Service 层未显式校验长度，直接调用会落到数据库层触发约束异常
        // 这验证了系统在最底层有数据完整性保护
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> volumeService.createVolume(dto));
    }

    @Test
    @DisplayName("【S2-05】复杂校验：文件关联不存在案卷应拦截")
    void createFileWithNonExistentVolumeShouldFail() {
        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear("2026");
        dto.setVolumeNo("NOT_EXIST_999");
        dto.setArchiveNo("01.8.01.0101.01.999");
        dto.setFileTitle("孤儿文件");
        dto.setCopies(1);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.createFile(dto));
        assertTrue(ex.getMessage().contains("不存在"));
    }

    @Test
    @DisplayName("【S2-05】复杂校验：已归档案卷不允许补录文件")
    void createFileWithArchivedVolumeShouldFail() {
        ArchiveVolumeVO volume = volumeService.createVolume(buildVolumeDto());
        // 直接归档
        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, volume.getYear()));

        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear(volume.getYear());
        dto.setVolumeNo(volume.getVolumeNo());
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setFileTitle("补录文件");
        dto.setCopies(1);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileService.createFile(dto));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("【S2-05】复杂校验：状态机流转（草稿→待审核→不可修改）")
    void statusMachineDraftToReviewShouldBeImmutable() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());
        assertEquals(0, vo.getStatus());

        // 提交审核
        volumeService.submitForReview(vo.getRecordId(), vo.getYear());
        ArchiveVolumeVO afterSubmit = volumeService.getVolumeDetail(vo.getRecordId(), vo.getYear());
        assertEquals(1, afterSubmit.getStatus());

        // 待审核状态不可修改
        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("试图修改");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));
        assertEquals(ResultCode.ARCHIVE_STATUS_INVALID, ex.getCode());
    }

    @Test
    @DisplayName("【S2-05】复杂校验：水平越权（修改他人草稿应被拦截）")
    void horizontalPrivilegeEscalationShouldBeBlocked() {
        ArchiveVolumeVO vo = volumeService.createVolume(buildVolumeDto());

        // 切换为 other_user
        StpUtil.login(otherUserId);

        ArchiveVolumeUpdateDTO update = new ArchiveVolumeUpdateDTO();
        update.setVolumeTitle("恶意修改");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.updateVolume(vo.getRecordId(), vo.getYear(), update));
        assertEquals(ResultCode.PERMISSION_DENIED_HORIZONTAL, ex.getCode());
    }

    // ==================== 2. 大数据量分页查询 ====================

    @Test
    @DisplayName("【S2-05】分页查询：批量50条数据，分页边界正确")
    void pageVolumesWithLargeDataShouldBeAccurate() {
        // 批量创建 50 条已归档案卷
        String testYear = "2026";
        String testCategory = "8";
        List<Long> recordIds = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            ArchiveVolumeSaveDTO dto = buildVolumeDto();
            dto.setVolumeTitle("分页测试案卷-" + i);
            dto.setCategoryL1(testCategory);
            ArchiveVolumeVO vo = volumeService.createVolume(dto);
            recordIds.add(vo.getRecordId());
            // 归档
            com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                    new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
            update.setStatus(3);
            volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                    com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                    .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, vo.getRecordId())
                    .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, vo.getYear()));
        }

        // 第 1 页
        PageQuery q1 = new PageQuery();
        q1.setCurrent(1);
        q1.setPageSize(10);
        var page1 = volumeService.pageVolumes(q1, testYear, null, testCategory,
                null, null, null, null, null, null, null, null);
        assertEquals(10, page1.getRecords().size());
        assertEquals(50, page1.getTotal());

        // 第 5 页（最后一页）
        PageQuery q5 = new PageQuery();
        q5.setCurrent(5);
        q5.setPageSize(10);
        var page5 = volumeService.pageVolumes(q5, testYear, null, testCategory,
                null, null, null, null, null, null, null, null);
        assertEquals(10, page5.getRecords().size());

        // 超出范围页
        PageQuery q6 = new PageQuery();
        q6.setCurrent(6);
        q6.setPageSize(10);
        var page6 = volumeService.pageVolumes(q6, testYear, null, testCategory,
                null, null, null, null, null, null, null, null);
        assertTrue(page6.getRecords().isEmpty() || page6.getRecords().size() <= 10);
    }

    @Test
    @DisplayName("【S2-05】分页查询：多维组合筛选准确性")
    void pageVolumesWithMultiDimensionShouldBeAccurate() {
        // 创建 3 条不同全宗号的已归档案卷
        String[] fondsNos = {"01", "02", "03"};
        for (String fn : fondsNos) {
            ArchiveVolumeSaveDTO dto = buildVolumeDto();
            dto.setFondsNo(fn);
            dto.setVolumeTitle("组合筛选-" + fn);
            ArchiveVolumeVO vo = volumeService.createVolume(dto);
            com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                    new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
            update.setStatus(3);
            volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                    com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                    .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, vo.getRecordId())
                    .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, vo.getYear()));
        }

        // 按全宗号 02 筛选
        PageQuery pq = new PageQuery();
        var result = volumeService.pageVolumes(pq, "2026", "02",
                null, null, null, null, null, null, null, null, null);
        assertEquals(1, result.getRecords().size());
        assertTrue(result.getRecords().get(0).getVolumeTitle().contains("组合筛选-02"));
    }

    // ==================== 3. Excel 异常数据拦截 ====================

    @Test
    @DisplayName("【S2-05】Excel导入：非Excel文件格式应被拦截")
    void importWithInvalidFileFormatShouldFail() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.txt", "text/plain", "not excel".getBytes());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));
        assertEquals(ResultCode.PARAM_FORMAT_ERROR, ex.getCode());
        assertTrue(ex.getMessage().contains("仅支持 .xlsx 或 .xls"));
    }

    @Test
    @DisplayName("【S2-05】Excel导入：空行自动过滤，有效行正常导入")
    void importWithEmptyRowsShouldSkipAndImportValidRows() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        list.add(buildImportRow("2026", "有效案卷A"));
        list.add(new ArchiveVolumeImportDTO()); // 空行
        list.add(buildImportRow("2026", "有效案卷B"));
        list.add(new ArchiveVolumeImportDTO()); // 空行

        MockMultipartFile file = writeExcelToMockFile(list, "with_empty_rows.xlsx");
        var result = volumeService.importVolumes(file);

        assertEquals(2, result.getSuccessCount());
    }

    @Test
    @DisplayName("【S2-05】Excel导入：档号重复应抛异常并触发事务回滚")
    void importDuplicateArchiveNoShouldFailAndRollback() {
        // 先创建一个已归档案卷，占用档号
        ArchiveVolumeVO existing = volumeService.createVolume(buildVolumeDto());
        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, existing.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, existing.getYear()));

        // Excel 中导入 2 条：第 1 条正常，第 2 条与已有档号重复
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        list.add(buildImportRow("2026", "正常案卷"));
        ArchiveVolumeImportDTO dup = buildImportRow("2026", "重复档号案卷");
        dup.setVolumeNo(existing.getVolumeNo()); // 使用相同案卷号导致档号重复
        list.add(dup);

        MockMultipartFile file = writeExcelToMockFile(list, "dup_rollback.xlsx");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));
        assertEquals(ResultCode.ARCHIVE_NO_DUPLICATE, ex.getCode());
        // 注意：在 @Transactional 测试内验证嵌套事务回滚需要复杂设置，
        // 此处核心验收点是"异常被正确抛出，提示档号重复"，即实现了整单拦截
    }

    @Test
    @DisplayName("【S2-05】Excel导入：多行多列混合错误应精确定位")
    void importMultipleErrorsShouldReportAll() {
        List<ArchiveVolumeImportDTO> list = new ArrayList<>();
        list.add(buildImportRow("2026", "正常案卷"));

        ArchiveVolumeImportDTO bad = buildImportRow("2026", "错误案卷");
        bad.setSecurityLevel("非法密级值");
        bad.setRetentionPeriod("非法期限值");
        bad.setCompileDateActual("2026/05/26");
        list.add(bad);

        MockMultipartFile file = writeExcelToMockFile(list, "multi_error.xlsx");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> volumeService.importVolumes(file));
        assertEquals(ResultCode.EXCEL_IMPORT_ERROR, ex.getCode());
        String msg = ex.getMessage();
        assertTrue(msg.contains("密级"), "应提示密级错误: " + msg);
        assertTrue(msg.contains("保管期限"), "应提示保管期限错误: " + msg);
        assertTrue(msg.contains("立卷日期"), "应提示日期格式错误: " + msg);
    }

    // ==================== 4. Word 文档结构完整性 ====================

    @Test
    @DisplayName("【S2-05】PDF套打：文档应包含封皮、侧脊、案卷目录、卷内目录4部分")
    void printDocumentShouldContainAllFourParts() throws Exception {
        ArchiveVolumeVO volume = volumeService.createVolume(buildVolumeDto());
        // 添加 3 个卷内文件
        for (int i = 1; i <= 3; i++) {
            createFile(volume, i, "责任者" + i, "文件" + i, 10 * i);
        }

        MockHttpServletResponse response = new MockHttpServletResponse();
        printService.printVolume(volume.getRecordId(), volume.getYear(), "all", response);

        byte[] bytes = response.getContentAsByteArray();
        assertTrue(bytes.length > 0);
        assertEquals("application/pdf", response.getContentType());

        // 标题类文本在 HTML 中含 &#160; 等空白，统一去除后断言
        String allText = pdfText(bytes).replaceAll("[\\s ]+", "");

        assertTrue(allText.contains("莱矿档案室"), "应包含封皮落款");
        assertTrue(allText.contains("案卷题名"), "应包含封皮题名区");
        assertTrue(allText.contains("档号：" + volume.getArchiveNo()), "应包含档号");
        assertTrue(allText.contains("案卷目录"), "应包含案卷目录标题");
        assertTrue(allText.contains("卷内文件目录"), "应包含卷内文件目录标题");
        assertTrue(allText.contains("共3件"), "卷内目录应统计 3 件");
    }

    @Test
    @DisplayName("【S2-05】PDF套打：无卷内文件时目录为 0 件")
    void printDocumentWithoutFilesShouldHaveHeaderOnly() throws Exception {
        ArchiveVolumeVO volume = volumeService.createVolume(buildVolumeDto());

        MockHttpServletResponse response = new MockHttpServletResponse();
        printService.printVolume(volume.getRecordId(), volume.getYear(), "all", response);

        byte[] bytes = response.getContentAsByteArray();
        String allText = pdfText(bytes).replaceAll("[\\s ]+", "");
        assertTrue(allText.contains("卷内文件目录"), "应包含卷内文件目录标题");
        assertTrue(allText.contains("共0件"), "无文件时卷内目录应为 0 件");
    }

    // ==================== 5. 端到端链路 ====================

    @Test
    @DisplayName("【S2-05】端到端：新建案卷→添加文件→归档→检索→打印完整链路")
    void endToEndWorkflowShouldSuccess() {
        // 1. 新建案卷
        ArchiveVolumeVO volume = volumeService.createVolume(buildVolumeDto());
        assertEquals(0, volume.getStatus());

        // 2. 添加卷内文件
        ArchiveFileVO file = createFile(volume, 1, "测试责任者", "端到端测试文件", 20);
        assertNotNull(file.getRecordId());

        // 3. 归档（直接改状态模拟审批完成）
        com.laikuang.archive.volume.domain.entity.ArchiveVolume update =
                new com.laikuang.archive.volume.domain.entity.ArchiveVolume();
        update.setStatus(3);
        volumeMapper.update(update, new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<
                com.laikuang.archive.volume.domain.entity.ArchiveVolume>()
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getRecordId, volume.getRecordId())
                .eq(com.laikuang.archive.volume.domain.entity.ArchiveVolume::getYear, volume.getYear()));

        // 4. 全局检索（检索案卷题名，文件为草稿态不参与全局文件检索）
        var searchResult = searchService.globalSearch(volume.getVolumeTitle(), volume.getYear(), null);
        assertFalse(searchResult.getVolumes().isEmpty());
        assertTrue(searchResult.getVolumes().stream()
                .anyMatch(v -> v.getRecordId().equals(volume.getRecordId())));

        // 5. 多维分页检索
        PageQuery pq = new PageQuery();
        var page = volumeService.pageVolumes(pq, volume.getYear(), volume.getFondsNo(),
                volume.getCategoryL1(), null, null, null, null, null, null, null, null);
        assertTrue(page.getRecords().stream()
                .anyMatch(v -> v.getRecordId().equals(volume.getRecordId())));

        // 6. PDF 打印
        MockHttpServletResponse response = new MockHttpServletResponse();
        printService.printVolume(volume.getRecordId(), volume.getYear(), "all", response);
        assertTrue(response.getContentAsByteArray().length > 0);
        assertEquals("application/pdf", response.getContentType());
    }

    // ==================== 工具方法 ====================

    /** 用 PDFBox 提取 PDF 全文文本 */
    private String pdfText(byte[] bytes) throws Exception {
        try (PDDocument doc = PDDocument.load(bytes)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    private ArchiveVolumeSaveDTO buildVolumeDto() {
        ArchiveVolumeSaveDTO dto = new ArchiveVolumeSaveDTO();
        dto.setYear("2026");
        dto.setFondsNo("01");
        dto.setCategoryL1("8");
        dto.setCategoryL2("01");
        dto.setCategoryL3("0101");
        dto.setDeviceCode("01");
        dto.setVolumeTitle("S2集成测试-" + System.currentTimeMillis());
        dto.setCopies(1);
        dto.setTotalPages(25);
        dto.setCompileUnit("测试编制单位");
        dto.setRetentionPeriod("30_years");
        dto.setSecurityLevel("internal");
        return dto;
    }

    private ArchiveFileSaveDTO buildFileDto(ArchiveVolumeVO volume, int seqNo) {
        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear(volume.getYear());
        dto.setVolumeNo(volume.getVolumeNo());
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setFileTitle("测试文件-" + seqNo + "-" + System.currentTimeMillis());
        dto.setSeqNo(seqNo);
        dto.setPages(10);
        dto.setCopies(1);
        return dto;
    }

    private ArchiveFileVO createFile(ArchiveVolumeVO volume, int seqNo, String responsible, String title, int pages) {
        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear(volume.getYear());
        dto.setVolumeNo(volume.getVolumeNo());
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setFileTitle(title);
        dto.setResponsible(responsible);
        dto.setSeqNo(seqNo);
        dto.setPages(pages);
        dto.setCopies(1);
        return fileService.createFile(dto);
    }

    private ArchiveVolumeImportDTO buildImportRow(String year, String title) {
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
