package com.laikuang.archive.volume.service.print;

import com.deepoove.poi.XWPFTemplate;
import com.deepoove.poi.xwpf.NiceXWPFDocument;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.file.mapper.ArchiveFileMapper;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.BreakType;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.MDC;

/**
 * 档案 Word 套打业务实现。
 *
 * <p>基于 poi-tl 引擎，动态生成 4 个模板（封皮、侧脊、案卷信息、卷内目录），
 * 分别渲染后合并为单个 Word 文档输出。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchivePrintServiceImpl implements ArchivePrintService {

    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveFileMapper   fileMapper;

    @Override
    public void printVolume(Long recordId, String year, HttpServletResponse response) {
        // 1. 查询案卷
        ArchiveVolume volume = volumeMapper.selectById(recordId);
        if (volume == null || !year.equals(volume.getYear())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "案卷不存在");
        }

        // 2. 查询卷内文件（按 seq_no 排序）
        List<ArchiveFile> files = fileMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ArchiveFile>()
                        .eq(ArchiveFile::getVolumeNo, volume.getVolumeNo())
                        .eq(ArchiveFile::getYear, year)
                        .eq(ArchiveFile::getDestroyFlag, 0)
                        .orderByAsc(ArchiveFile::getSeqNo));

        // 3. 分别渲染 4 个模板
        NiceXWPFDocument coverDoc  = renderCover(volume);
        NiceXWPFDocument spineDoc  = renderSpine(volume);
        NiceXWPFDocument catalogDoc = renderCatalog(volume);
        NiceXWPFDocument fileDoc   = renderFileCatalog(volume, files);

        // 4. 合并为单个文档（每个部分之间加分页符）
        try {
            NiceXWPFDocument merged = coverDoc;
            merged = appendWithPageBreak(merged, spineDoc);
            merged = appendWithPageBreak(merged, catalogDoc);
            merged = appendWithPageBreak(merged, fileDoc);

            // 5. 写入响应流
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            merged.write(out);
            byte[] bytes = out.toByteArray();

            String fileName = URLEncoder.encode(
                    volume.getArchiveNo() + "_打印.docx", StandardCharsets.UTF_8);
            response.setContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            response.setHeader("Content-Disposition", "attachment; filename=" + fileName);
            response.setContentLength(bytes.length);
            response.getOutputStream().write(bytes);
            response.getOutputStream().flush();

            log.info("[AUDIT-PRINT] 案卷Word套打，recordId={}, year={}, archiveNo={}, 文件数={}, ip={}, traceId={}",
                    recordId, year, volume.getArchiveNo(), files.size(), MDC.get("clientIP"), MDC.get("traceId"));
        } catch (Exception e) {
            log.error("[PRINT] Word渲染或合并失败", e);
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "Word文档生成失败");
        }
    }

    // ==================== 模板渲染 ====================

    private NiceXWPFDocument renderCover(ArchiveVolume volume) {
        XWPFDocument template = createCoverTemplate();
        Map<String, Object> data = new HashMap<>();
        data.put("fonds_no", orDefault(volume.getFondsNo()));
        data.put("year", orDefault(volume.getYear()));
        data.put("category_code", orDefault(volume.getCategoryCode()));
        data.put("retention_period", orDefault(volume.getRetentionPeriod()));
        data.put("security_level", orDefault(volume.getSecurityLevel()));
        data.put("archive_no", orDefault(volume.getArchiveNo()));
        data.put("volume_title", orDefault(volume.getVolumeTitle()));
        return renderTemplate(template, data);
    }

    private NiceXWPFDocument renderSpine(ArchiveVolume volume) {
        XWPFDocument template = createSpineTemplate();
        Map<String, Object> data = new HashMap<>();
        data.put("year", orDefault(volume.getYear()));
        data.put("archive_no", orDefault(volume.getArchiveNo()));
        data.put("volume_title", orDefault(volume.getVolumeTitle()));
        return renderTemplate(template, data);
    }

    private NiceXWPFDocument renderCatalog(ArchiveVolume volume) {
        XWPFDocument template = createCatalogTemplate();
        Map<String, Object> data = new HashMap<>();
        data.put("fonds_no", orDefault(volume.getFondsNo()));
        data.put("year", orDefault(volume.getYear()));
        data.put("category_code", orDefault(volume.getCategoryCode()));
        data.put("archive_no", orDefault(volume.getArchiveNo()));
        data.put("volume_title", orDefault(volume.getVolumeTitle()));
        data.put("compile_unit", orDefault(volume.getCompileUnit()));
        data.put("compiler", orDefault(volume.getCompiler()));
        data.put("reviewer", orDefault(volume.getReviewer()));
        data.put("compile_date", orDefault(volume.getCompileDate()));
        data.put("total_pages", String.valueOf(volume.getTotalPages() == null ? 0 : volume.getTotalPages()));
        return renderTemplate(template, data);
    }

    private NiceXWPFDocument renderFileCatalog(ArchiveVolume volume, List<ArchiveFile> files) {
        XWPFDocument template = createFileCatalogTemplate();

        Map<String, Object> data = new HashMap<>();
        data.put("archive_no", orDefault(volume.getArchiveNo()));
        data.put("volume_title", orDefault(volume.getVolumeTitle()));

        NiceXWPFDocument doc = renderTemplate(template, data);

        // 使用 Apache POI 直接在文档末尾插入卷内文件目录表格
        insertFileTable(doc, files);
        return doc;
    }

    private void insertFileTable(NiceXWPFDocument doc, List<ArchiveFile> files) {
        doc.createParagraph().setSpacingAfter(200);

        XWPFTable table = doc.createTable(1 + files.size(), 7);
        table.setWidth("100%");

        // 表头
        String[] headers = {"序号", "文件编号", "责任者", "文件标题", "日期", "页数", "备注"};
        XWPFTableRow headerRow = table.getRow(0);
        for (int i = 0; i < headers.length; i++) {
            setTableCellText(headerRow.getCell(i), headers[i], true);
        }

        // 数据行
        int seq = 1;
        for (int i = 0; i < files.size(); i++) {
            ArchiveFile f = files.get(i);
            XWPFTableRow row = table.getRow(i + 1);
            setTableCellText(row.getCell(0), String.valueOf(seq++), false);
            setTableCellText(row.getCell(1), orDefault(f.getFileNo()), false);
            setTableCellText(row.getCell(2), orDefault(f.getResponsible()), false);
            setTableCellText(row.getCell(3), orDefault(f.getFileTitle()), false);
            setTableCellText(row.getCell(4),
                    f.getArchiveDate() != null
                            ? f.getArchiveDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                            : "", false);
            setTableCellText(row.getCell(5), f.getPages() == null ? "" : String.valueOf(f.getPages()), false);
            setTableCellText(row.getCell(6), orDefault(f.getRemark()), false);
        }
    }

    private void setTableCellText(XWPFTableCell cell, String text, boolean bold) {
        cell.removeParagraph(0);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(bold);
        run.setFontSize(10);
        run.setFontFamily("宋体");
    }

    // ==================== 模板创建（Apache POI） ====================

    private XWPFDocument createCoverTemplate() {
        XWPFDocument doc = new XWPFDocument();

        XWPFParagraph title = doc.createParagraph();
        title.setAlignment(ParagraphAlignment.CENTER);
        title.setSpacingBefore(800);
        XWPFRun run = title.createRun();
        run.setText("莱矿集团档案盒");
        run.setBold(true);
        run.setFontSize(28);
        run.setFontFamily("宋体");

        addBlankParagraph(doc, 600);

        addCoverInfoRow(doc, "全  宗  号", "{{fonds_no}}", "年      度", "{{year}}");
        addCoverInfoRow(doc, "分  类  号", "{{category_code}}", "保管期限", "{{retention_period}}");
        addCoverInfoRow(doc, "密      级", "{{security_level}}", "", "");
        addCoverInfoRow(doc, "档      号", "{{archive_no}}", "", "");

        addBlankParagraph(doc, 400);

        XWPFParagraph vp = doc.createParagraph();
        vp.setAlignment(ParagraphAlignment.LEFT);
        vp.setIndentationLeft(600);
        XWPFRun vr = vp.createRun();
        vr.setText("案卷题名：");
        vr.setFontSize(14);
        vr.setFontFamily("宋体");
        vr = vp.createRun();
        vr.setText("{{volume_title}}");
        vr.setBold(true);
        vr.setFontSize(14);
        vr.setFontFamily("宋体");
        vr.setUnderline(UnderlinePatterns.SINGLE);

        return doc;
    }

    private void addCoverInfoRow(XWPFDocument doc, String label1, String val1, String label2, String val2) {
        XWPFTable table = doc.createTable(1, 4);
        table.setWidth("100%");
        XWPFTableRow row = table.getRow(0);
        setCellText(row.getCell(0), label1, true);
        setCellText(row.getCell(1), val1, false);
        setCellText(row.getCell(2), label2, true);
        setCellText(row.getCell(3), val2, false);
        addBlankParagraph(doc, 200);
    }

    private void setCellText(XWPFTableCell cell, String text, boolean bold) {
        cell.removeParagraph(0);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(bold);
        run.setFontSize(12);
        run.setFontFamily("宋体");
    }

    private XWPFDocument createSpineTemplate() {
        XWPFDocument doc = new XWPFDocument();

        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBefore(1200);
        XWPFRun run = p.createRun();
        run.setText("年度：{{year}}");
        run.setFontSize(14);
        run.setFontFamily("宋体");

        p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBefore(400);
        run = p.createRun();
        run.setText("档号：{{archive_no}}");
        run.setFontSize(14);
        run.setFontFamily("宋体");

        p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBefore(400);
        run = p.createRun();
        run.setText("题名：{{volume_title}}");
        run.setFontSize(14);
        run.setFontFamily("宋体");

        return doc;
    }

    private XWPFDocument createCatalogTemplate() {
        XWPFDocument doc = new XWPFDocument();

        XWPFParagraph title = doc.createParagraph();
        title.setAlignment(ParagraphAlignment.CENTER);
        title.setSpacingBefore(400);
        XWPFRun run = title.createRun();
        run.setText("案 卷 目 录");
        run.setBold(true);
        run.setFontSize(22);
        run.setFontFamily("宋体");

        addBlankParagraph(doc, 300);

        addCatalogLine(doc, "全宗号：", "{{fonds_no}}", "年度：", "{{year}}", "分类号：", "{{category_code}}");
        addCatalogLine(doc, "档号：", "{{archive_no}}", "", "", "", "");
        addCatalogLine(doc, "案卷题名：", "{{volume_title}}", "", "", "", "");
        addCatalogLine(doc, "编制单位：", "{{compile_unit}}", "", "", "", "");
        addCatalogLine(doc, "立 卷 人：", "{{compiler}}", "", "", "", "");
        addCatalogLine(doc, "审 核 人：", "{{reviewer}}", "", "", "", "");
        addCatalogLine(doc, "编制日期：", "{{compile_date}}", "", "", "", "");
        addCatalogLine(doc, "总 页 数：", "{{total_pages}}", "", "", "", "");

        return doc;
    }

    private void addCatalogLine(XWPFDocument doc, String label1, String val1,
                                 String label2, String val2,
                                 String label3, String val3) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setIndentationLeft(600);
        XWPFRun run = p.createRun();
        run.setText(label1);
        run.setFontSize(12);
        run.setFontFamily("宋体");
        run = p.createRun();
        run.setText(val1);
        run.setFontSize(12);
        run.setFontFamily("宋体");
        run.setUnderline(UnderlinePatterns.SINGLE);

        if (StringUtils.hasText(label2)) {
            run = p.createRun();
            run.setText("    " + label2);
            run.setFontSize(12);
            run.setFontFamily("宋体");
            run = p.createRun();
            run.setText(val2);
            run.setFontSize(12);
            run.setFontFamily("宋体");
            run.setUnderline(UnderlinePatterns.SINGLE);
        }

        if (StringUtils.hasText(label3)) {
            run = p.createRun();
            run.setText("    " + label3);
            run.setFontSize(12);
            run.setFontFamily("宋体");
            run = p.createRun();
            run.setText(val3);
            run.setFontSize(12);
            run.setFontFamily("宋体");
            run.setUnderline(UnderlinePatterns.SINGLE);
        }
    }

    private XWPFDocument createFileCatalogTemplate() {
        XWPFDocument doc = new XWPFDocument();

        XWPFParagraph title = doc.createParagraph();
        title.setAlignment(ParagraphAlignment.CENTER);
        title.setSpacingBefore(400);
        XWPFRun run = title.createRun();
        run.setText("卷 内 文 件 目 录");
        run.setBold(true);
        run.setFontSize(22);
        run.setFontFamily("宋体");

        addBlankParagraph(doc, 200);

        XWPFParagraph info = doc.createParagraph();
        info.setAlignment(ParagraphAlignment.LEFT);
        XWPFRun ir = info.createRun();
        ir.setText("档号：");
        ir.setFontSize(12);
        ir.setFontFamily("宋体");
        ir = info.createRun();
        ir.setText("{{archive_no}}");
        ir.setFontSize(12);
        ir.setFontFamily("宋体");
        ir.setUnderline(UnderlinePatterns.SINGLE);
        ir = info.createRun();
        ir.setText("          案卷题名：");
        ir.setFontSize(12);
        ir.setFontFamily("宋体");
        ir = info.createRun();
        ir.setText("{{volume_title}}");
        ir.setFontSize(12);
        ir.setFontFamily("宋体");
        ir.setUnderline(UnderlinePatterns.SINGLE);

        addBlankParagraph(doc, 200);

        return doc;
    }

    // ==================== 内部工具 ====================

    private NiceXWPFDocument renderTemplate(XWPFDocument template, Map<String, Object> data) {
        try {
            XWPFTemplate xwpf = XWPFTemplate.compile(template).render(data);
            return xwpf.getXWPFDocument();
        } catch (Exception e) {
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "Word模板渲染失败");
        }
    }

    private NiceXWPFDocument appendWithPageBreak(NiceXWPFDocument base, NiceXWPFDocument append) {
        try {
            base.createParagraph().createRun().addBreak(org.apache.poi.xwpf.usermodel.BreakType.PAGE);
            return base.merge(append);
        } catch (Exception e) {
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "Word文档合并失败");
        }
    }

    private void addBlankParagraph(XWPFDocument doc, int spacingAfter) {
        XWPFParagraph p = doc.createParagraph();
        p.setSpacingAfter(spacingAfter);
    }

    private String orDefault(String value) {
        return StringUtils.hasText(value) ? value : "";
    }
}
