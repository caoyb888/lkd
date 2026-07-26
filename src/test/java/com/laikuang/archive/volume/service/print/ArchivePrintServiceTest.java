package com.laikuang.archive.volume.service.print;

import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.service.ArchiveFileService;
import com.laikuang.archive.system.domain.dto.LoginDTO;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.AuthService;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 2 — S2-04：档案 PDF 套打 Service 层集成测试。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ArchivePrintServiceTest {

    @Autowired
    private ArchivePrintService printService;

    @Autowired
    private ArchiveVolumeService volumeService;

    @Autowired
    private ArchiveFileService fileService;

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private AuthService authService;

    private Long adminUserId;
    private ArchiveVolumeVO testVolume;

    @BeforeEach
    void setUp() {
        StpUtil.logout();
        LoginDTO login = new LoginDTO();
        login.setUsername("admin");
        login.setPassword("Admin@123");
        authService.login(login);
        adminUserId = StpUtil.getLoginIdAsLong();

        testVolume = volumeService.createVolume(buildVolumeDto());
    }

    @Test
    @DisplayName("PDF套打：案卷存在且有卷内文件，应成功生成非空pdf")
    void printVolumeWithFilesShouldSuccess() throws Exception {
        // 添加卷内文件
        createFile(testVolume, 1, "责任者A", "测试文件A", 10);
        createFile(testVolume, 2, "责任者B", "测试文件B", 15);

        MockHttpServletResponse response = new MockHttpServletResponse();
        printService.printVolume(testVolume.getRecordId(), testVolume.getYear(), "all", response);

        byte[] bytes = response.getContentAsByteArray();
        assertNotNull(bytes);
        assertTrue(bytes.length > 0, "生成的 PDF 文件不应为空");
        assertEquals("application/pdf", response.getContentType());
        assertTrue(response.getHeader("Content-Disposition").contains(testVolume.getArchiveNo()));
        assertTrue(response.getHeader("Content-Disposition").contains(".pdf"));

        // 用 PDFBox 读取验证内容
        String allText = pdfText(bytes);
        assertTrue(allText.contains(testVolume.getArchiveNo()), "应包含档号");
        assertTrue(allText.contains(testVolume.getVolumeTitle()), "应包含案卷题名");
        assertTrue(allText.contains("测试文件A"), "应包含卷内文件标题");
        assertTrue(allText.contains("测试文件B"), "应包含卷内文件标题");
    }

    @Test
    @DisplayName("PDF套打：案卷不存在应抛异常")
    void printNonExistentVolumeShouldFail() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        BusinessException ex = assertThrows(BusinessException.class,
                () -> printService.printVolume(99999L, "2026", "all", response));
        assertEquals(ResultCode.PARAM_ERROR, ex.getCode());
    }

    @Test
    @DisplayName("PDF套打：年度不匹配应抛异常")
    void printWithMismatchedYearShouldFail() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        BusinessException ex = assertThrows(BusinessException.class,
                () -> printService.printVolume(testVolume.getRecordId(), "2099", "all", response));
        assertEquals(ResultCode.PARAM_ERROR, ex.getCode());
    }

    @Test
    @DisplayName("PDF套打：无卷内文件应仅生成基本信息部分")
    void printVolumeWithoutFilesShouldSuccess() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        printService.printVolume(testVolume.getRecordId(), testVolume.getYear(), "all", response);

        byte[] bytes = response.getContentAsByteArray();
        assertTrue(bytes.length > 0);

        String allText = pdfText(bytes);
        assertTrue(allText.contains(testVolume.getArchiveNo()), "应包含档号");
        assertTrue(allText.contains(testVolume.getVolumeTitle()), "应包含案卷题名");
        // 标题带 letter-spacing，PDF 提取后字符间有空格，去空白后断言
        assertTrue(allText.replaceAll("[\\s ]+", "").contains("卷内文件目录"), "应包含卷内文件目录标题");
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
        dto.setVolumeTitle("打印测试案卷-" + System.currentTimeMillis());
        dto.setCopies(1);
        dto.setTotalPages(25);
        dto.setCompileUnit("测试编制单位");
        dto.setRetentionPeriod("30_years");
        dto.setSecurityLevel("internal");
        return dto;
    }

    private void createFile(ArchiveVolumeVO volume, int seqNo, String responsible, String title, int pages) {
        ArchiveFileSaveDTO dto = new ArchiveFileSaveDTO();
        dto.setYear(volume.getYear());
        dto.setVolumeNo(volume.getVolumeNo());
        dto.setArchiveNo(volume.getArchiveNo());
        dto.setFileTitle(title);
        dto.setResponsible(responsible);
        dto.setSeqNo(seqNo);
        dto.setPages(pages);
        dto.setCopies(1);
        fileService.createFile(dto);
    }
}
