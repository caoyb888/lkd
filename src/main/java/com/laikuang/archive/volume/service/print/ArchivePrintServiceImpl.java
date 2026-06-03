package com.laikuang.archive.volume.service.print;

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
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblWidth;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.MDC;

/**
 * 档案 Word 套打业务实现。
 * 支持按 type 参数分段或全量生成，布局与前端打印预览保持一致。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchivePrintServiceImpl implements ArchivePrintService {

    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveFileMapper   fileMapper;

    private static final String TYPE_COVER          = "cover";
    private static final String TYPE_SPINE          = "spine";
    private static final String TYPE_VOL_CATALOGUE  = "volume-catalogue";
    private static final String TYPE_FILE_CATALOGUE = "file-catalogue";

    @Override
    public void printVolume(Long recordId, String year, String type, HttpServletResponse response) {
        ArchiveVolume volume = volumeMapper.selectById(recordId);
        if (volume == null || !year.equals(volume.getYear())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "案卷不存在");
        }

        List<ArchiveFile> files = fileMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ArchiveFile>()
                        .eq(ArchiveFile::getVolumeNo, volume.getVolumeNo())
                        .eq(ArchiveFile::getYear, year)
                        .eq(ArchiveFile::getDestroyFlag, 0)
                        .orderByAsc(ArchiveFile::getSeqNo));

        try {
            NiceXWPFDocument doc = buildDocument(volume, files, type);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            byte[] bytes = out.toByteArray();

            String suffix = typeSuffix(type);
            String fileName = URLEncoder.encode(
                    volume.getArchiveNo() + suffix + ".docx", StandardCharsets.UTF_8);
            response.setContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            response.setHeader("Content-Disposition", "attachment; filename=" + fileName);
            response.setContentLength(bytes.length);
            response.getOutputStream().write(bytes);
            response.getOutputStream().flush();

            log.info("[AUDIT-PRINT] recordId={}, year={}, type={}, archiveNo={}, files={}, traceId={}",
                    recordId, year, type, volume.getArchiveNo(), files.size(), MDC.get("traceId"));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[PRINT] Word生成失败", e);
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "Word文档生成失败");
        }
    }

    // ── 根据 type 组装文档 ────────────────────────────────────────

    private NiceXWPFDocument buildDocument(ArchiveVolume v, List<ArchiveFile> files, String type) throws Exception {
        return switch (type) {
            case TYPE_COVER          -> buildCover(v);
            case TYPE_SPINE          -> buildSpine(v);
            case TYPE_VOL_CATALOGUE  -> buildVolCatalogue(v);
            case TYPE_FILE_CATALOGUE -> buildFileCatalogue(v, files);
            default -> {
                NiceXWPFDocument merged = buildCover(v);
                merged = appendWithPageBreak(merged, buildSpine(v));
                merged = appendWithPageBreak(merged, buildVolCatalogue(v));
                merged = appendWithPageBreak(merged, buildFileCatalogue(v, files));
                yield merged;
            }
        };
    }

    // ── 封皮 ──────────────────────────────────────────────────────

    private NiceXWPFDocument buildCover(ArchiveVolume v) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        addCenteredParagraph(doc, "莱矿集团档案盒", 28, true, 800, 0);
        addBlank(doc, 600);

        addTwoColRow(doc, "全  宗  号", orDash(v.getFondsNo()),    "年      度", orDash(v.getYear()));
        addTwoColRow(doc, "分  类  号", orDash(v.getCategoryCode()), "保管期限",   orDash(v.getRetentionPeriod()));
        addTwoColRow(doc, "密      级", orDash(v.getSecurityLevel()), "",         "");
        addTwoColRow(doc, "档      号", orDash(v.getArchiveNo()),   "",           "");

        addBlank(doc, 400);

        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setIndentationLeft(600);
        addRun(p, "案卷题名：", 14, false, false);
        addRun(p, orDash(v.getVolumeTitle()), 14, true, true);

        return doc;
    }

    private void addTwoColRow(NiceXWPFDocument doc, String l1, String v1, String l2, String v2) {
        XWPFTable tbl = doc.createTable(1, 4);
        setTableFullWidth(tbl);
        XWPFTableRow row = tbl.getRow(0);
        setCellBold(row.getCell(0), l1, 12);
        setCellText(row.getCell(1), v1, 12);
        setCellBold(row.getCell(2), l2, 12);
        setCellText(row.getCell(3), v2, 12);
        addBlank(doc, 200);
    }

    // ── 侧脊 ──────────────────────────────────────────────────────

    private NiceXWPFDocument buildSpine(ArchiveVolume v) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        addCenteredParagraph(doc, "年度：" + orDash(v.getYear()), 14, false, 1200, 0);
        addCenteredParagraph(doc, "档号：" + orDash(v.getArchiveNo()), 14, false, 400, 0);
        addCenteredParagraph(doc, "题名：" + orDash(v.getVolumeTitle()), 14, false, 400, 0);

        return doc;
    }

    // ── 案卷目录（表格，与前端预览一致） ──────────────────────────

    private NiceXWPFDocument buildVolCatalogue(ArchiveVolume v) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        addCenteredParagraph(doc, "案  卷  目  录", 22, true, 400, 300);

        // 副标题
        XWPFParagraph sub = doc.createParagraph();
        sub.setAlignment(ParagraphAlignment.CENTER);
        addRun(sub, "全宗号：" + orDash(v.getFondsNo())
                + "    年度：" + orDash(v.getYear())
                + "    一级类目：" + orDash(v.getCategoryL1()),
                10, false, false);
        addBlank(doc, 200);

        // 表格：序号 | 档号 | 案卷题名 | 年度 | 件数 | 页数 | 保管期限 | 密级 | 备注
        String[] headers = {"序号", "档号", "案卷题名", "年度", "件数", "页数", "保管期限", "密级", "备注"};
        XWPFTable tbl = doc.createTable(2, headers.length);
        setTableFullWidth(tbl);

        XWPFTableRow hRow = tbl.getRow(0);
        for (int i = 0; i < headers.length; i++) {
            setCellBold(hRow.getCell(i), headers[i], 10);
        }

        XWPFTableRow dRow = tbl.getRow(1);
        setCellText(dRow.getCell(0), "1", 10);
        setCellText(dRow.getCell(1), orDash(v.getArchiveNo()), 10);
        setCellText(dRow.getCell(2), orDash(v.getVolumeTitle()), 10);
        setCellText(dRow.getCell(3), orDash(v.getYear()), 10);
        setCellText(dRow.getCell(4), v.getCopies() == null ? "—" : String.valueOf(v.getCopies()), 10);
        setCellText(dRow.getCell(5), v.getTotalPages() == null ? "—" : String.valueOf(v.getTotalPages()), 10);
        setCellText(dRow.getCell(6), orDash(v.getRetentionPeriod()), 10);
        setCellText(dRow.getCell(7), orDash(v.getSecurityLevel()), 10);
        setCellText(dRow.getCell(8), orDash(v.getNotes()), 10);

        addBlank(doc, 400);

        // 页脚
        XWPFParagraph footer = doc.createParagraph();
        footer.setAlignment(ParagraphAlignment.LEFT);
        addRun(footer, "编制单位：" + orDash(v.getCompileUnit())
                + "    立卷人：" + orDash(v.getCompiler())
                + "    立卷日期：" + orDash(v.getCompileDate())
                + "    审核人：" + orDash(v.getReviewer()),
                10, false, false);

        return doc;
    }

    // ── 卷内文件目录（与前端预览一致） ────────────────────────────

    private NiceXWPFDocument buildFileCatalogue(ArchiveVolume v, List<ArchiveFile> files) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        addCenteredParagraph(doc, "卷  内  文  件  目  录", 22, true, 400, 300);

        XWPFParagraph info = doc.createParagraph();
        info.setAlignment(ParagraphAlignment.LEFT);
        addRun(info, "档号：", 12, false, false);
        addRun(info, orDash(v.getArchiveNo()), 12, false, true);
        addRun(info, "    案卷题名：", 12, false, false);
        addRun(info, orDash(v.getVolumeTitle()), 12, false, true);
        addBlank(doc, 200);

        // 表格：顺序号 | 文件编号 | 文件标题 | 责任者 | 归档日期 | 页数 | 密级 | 备注
        String[] headers = {"顺序号", "文件编号", "文件标题", "责任者", "归档日期", "页数", "密级", "备注"};
        XWPFTable tbl = doc.createTable(1 + files.size(), headers.length);
        setTableFullWidth(tbl);

        XWPFTableRow hRow = tbl.getRow(0);
        for (int i = 0; i < headers.length; i++) {
            setCellBold(hRow.getCell(i), headers[i], 10);
        }

        for (int i = 0; i < files.size(); i++) {
            ArchiveFile f = files.get(i);
            XWPFTableRow row = tbl.getRow(i + 1);
            setCellText(row.getCell(0), String.valueOf(f.getSeqNo() == null ? i + 1 : f.getSeqNo()), 10);
            setCellText(row.getCell(1), orDash(f.getFileNo()), 10);
            setCellText(row.getCell(2), orDash(f.getFileTitle()), 10);
            setCellText(row.getCell(3), orDash(f.getResponsible()), 10);
            setCellText(row.getCell(4),
                    f.getArchiveDate() != null
                            ? f.getArchiveDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                            : "—", 10);
            setCellText(row.getCell(5), f.getPages() == null ? "—" : String.valueOf(f.getPages()), 10);
            setCellText(row.getCell(6), orDash(f.getSecurityLevel()), 10);
            setCellText(row.getCell(7), orDash(f.getRemark()), 10);
        }

        addBlank(doc, 400);
        XWPFParagraph footer = doc.createParagraph();
        footer.setAlignment(ParagraphAlignment.LEFT);
        addRun(footer, "共 " + files.size() + " 件    立卷人：" + orDash(v.getCompiler()), 10, false, false);

        return doc;
    }

    // ── 工具方法 ──────────────────────────────────────────────────

    private NiceXWPFDocument appendWithPageBreak(NiceXWPFDocument base, NiceXWPFDocument append) {
        try {
            base.createParagraph().createRun().addBreak(org.apache.poi.xwpf.usermodel.BreakType.PAGE);
            return base.merge(append);
        } catch (Exception e) {
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "Word文档合并失败");
        }
    }

    private void addCenteredParagraph(XWPFDocument doc, String text, int fontSize,
                                      boolean bold, int spacingBefore, int spacingAfter) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBefore(spacingBefore);
        p.setSpacingAfter(spacingAfter);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(bold);
        run.setFontSize(fontSize);
        run.setFontFamily("宋体");
    }

    private void addBlank(XWPFDocument doc, int spacingAfter) {
        doc.createParagraph().setSpacingAfter(spacingAfter);
    }

    private XWPFRun addRun(XWPFParagraph p, String text, int fontSize, boolean bold, boolean underline) {
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(fontSize);
        run.setFontFamily("宋体");
        run.setBold(bold);
        if (underline) run.setUnderline(UnderlinePatterns.SINGLE);
        return run;
    }

    private void setCellText(XWPFTableCell cell, String text, int fontSize) {
        cell.removeParagraph(0);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(fontSize);
        run.setFontFamily("宋体");
    }

    private void setCellBold(XWPFTableCell cell, String text, int fontSize) {
        cell.removeParagraph(0);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(true);
        run.setFontSize(fontSize);
        run.setFontFamily("宋体");
    }

    private void setTableFullWidth(XWPFTable tbl) {
        CTTblWidth tblWidth = tbl.getCTTbl().addNewTblPr().addNewTblW();
        tblWidth.setType(STTblWidth.PCT);
        tblWidth.setW(BigInteger.valueOf(5000));
    }

    private String orDash(String value) {
        return StringUtils.hasText(value) ? value : "—";
    }

    private String typeSuffix(String type) {
        return switch (type) {
            case TYPE_COVER          -> "_封皮";
            case TYPE_SPINE          -> "_侧脊";
            case TYPE_VOL_CATALOGUE  -> "_案卷目录";
            case TYPE_FILE_CATALOGUE -> "_卷内文件目录";
            default                  -> "_打印";
        };
    }
}
