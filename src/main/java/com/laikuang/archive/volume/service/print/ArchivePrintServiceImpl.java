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
import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;
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

    // ═══════════════════════════════════════════════════════════════
    // 封皮（与前端 cover 标签一致）
    // ═══════════════════════════════════════════════════════════════

    private NiceXWPFDocument buildCover(ArchiveVolume v) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        // 外框表格：1行2列（左侧竖条 + 右侧主体）
        XWPFTable outerTbl = doc.createTable(1, 2);
        setTableFullWidth(outerTbl);
        // 外框 3pt(24) 黑色，内部竖线 2pt(16) 黑色，内部横线无
        setTableBorders(outerTbl, 24, 24, 24, 24, 0, 16, "000000");

        // 列宽：左约22mm(1245twips)，右剩余
        setColWidth(outerTbl, 0, 1245);
        setColWidth(outerTbl, 1, 8755);

        XWPFTableRow row = outerTbl.getRow(0);
        XWPFTableCell leftCell = row.getCell(0);
        XWPFTableCell rightCell = row.getCell(1);

        // 清除默认段落
        clearCell(leftCell);
        clearCell(rightCell);

        // ── 左侧竖条 ──
        leftCell.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
        setCellBgColor(leftCell, "F8FAFC");
        setCellVerticalText(leftCell);

        // 全宗名称
        XWPFParagraph p = addPara(leftCell, ParagraphAlignment.CENTER, 0, 30);
        addRun(p, "全宗名称", 16, false, "64748B");

        p = addPara(leftCell, ParagraphAlignment.CENTER, 0, 300);
        addRun(p, "莱矿", 18, true, "000000");

        // 保管期限
        p = addPara(leftCell, ParagraphAlignment.CENTER, 300, 30);
        addRun(p, "保管期限", 16, false, "64748B");

        p = addPara(leftCell, ParagraphAlignment.CENTER, 0, 0);
        addRun(p, orDash(v.getRetentionPeriod()), 18, true, "000000");

        // ── 右侧主体 ──
        rightCell.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.TOP);

        // 年度 | 密级
        p = addPara(rightCell, ParagraphAlignment.LEFT, 0, 200);
        addLabelValueRun(p, "年度", 20, orDash(v.getYear()), 24);
        addGapRun(p, "        ");
        addLabelValueRun(p, "密级", 20, orDash(v.getSecurityLevel()), 24);

        // 案卷题名 标签
        p = addPara(rightCell, ParagraphAlignment.CENTER, 600, 40);
        addRun(p, "案卷题名", 22, false, "64748B");

        // 案卷题名 值
        p = addPara(rightCell, ParagraphAlignment.CENTER, 0, 400);
        addRun(p, orDash(v.getVolumeTitle()), 36, true, "000000");

        // 分隔线（段落底部边框模拟）
        p = addPara(rightCell, ParagraphAlignment.CENTER, 0, 300);
        p.setBorderBottom(Borders.SINGLE);

        // 档号
        p = addPara(rightCell, ParagraphAlignment.LEFT, 0, 200);
        addLabelValueRun(p, "档    号", 22, orDash(v.getArchiveNo()), 26);

        // 件数 | 页数
        p = addPara(rightCell, ParagraphAlignment.LEFT, 0, 200);
        addLabelValueRun(p, "件数", 20, v.getCopies() == null ? "—" : String.valueOf(v.getCopies()), 24);
        addGapRun(p, "          ");
        addLabelValueRun(p, "页数", 20, v.getTotalPages() == null ? "—" : String.valueOf(v.getTotalPages()), 24);

        // 撑到底部
        p = addPara(rightCell, ParagraphAlignment.LEFT, 1200, 0);

        // 莱矿档案室（顶部横线）
        p = addPara(rightCell, ParagraphAlignment.CENTER, 200, 100);
        p.setBorderTop(Borders.SINGLE);
        addRun(p, "莱矿档案室", 26, true, "000000");

        return doc;
    }

    // ═══════════════════════════════════════════════════════════════
    // 侧脊（与前端 spine 标签一致）
    // ═══════════════════════════════════════════════════════════════

    private NiceXWPFDocument buildSpine(ArchiveVolume v) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        // 每页两个侧脊，用 1行2列 表格实现
        XWPFTable tbl = doc.createTable(1, 2);
        setTableFullWidth(tbl);
        setTableBorders(tbl, 0, 0, 0, 0, 0, 0, "000000"); // 无外框

        setColWidth(tbl, 0, 5000);
        setColWidth(tbl, 1, 5000);

        XWPFTableRow row = tbl.getRow(0);

        // 左脊
        buildSpineCell(row.getCell(0), v);
        // 右脊
        buildSpineCell(row.getCell(1), v);

        return doc;
    }

    private void buildSpineCell(XWPFTableCell cell, ArchiveVolume v) {
        clearCell(cell);

        // 单元格本身作为侧脊外框（2pt 黑色边框）
        setCellBorders(cell, 16, 16, 16, 16, "000000");
        cell.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
        setCellVerticalText(cell);

        // 全
        XWPFParagraph p = addPara(cell, ParagraphAlignment.CENTER, 100, 20);
        addRun(p, "全", 14, false, "64748B");

        p = addPara(cell, ParagraphAlignment.CENTER, 0, 200);
        addRun(p, orDash(v.getFondsNo()), 16, true, "000000");

        // 年
        p = addPara(cell, ParagraphAlignment.CENTER, 0, 20);
        addRun(p, "年", 14, false, "64748B");

        p = addPara(cell, ParagraphAlignment.CENTER, 0, 200);
        addRun(p, orDash(v.getYear()), 16, true, "000000");

        // 号
        p = addPara(cell, ParagraphAlignment.CENTER, 0, 20);
        addRun(p, "号", 14, false, "64748B");

        p = addPara(cell, ParagraphAlignment.CENTER, 0, 400);
        addRun(p, orDash(v.getArchiveNo()), 12, true, "000000");

        // 题名（竖排模式下整串自动竖向排列）
        p = addPara(cell, ParagraphAlignment.CENTER, 400, 400);
        addRun(p, orDash(v.getVolumeTitle()), 18, true, "000000");

        // 撑开
        p = addPara(cell, ParagraphAlignment.CENTER, 400, 0);

        // 件
        p = addPara(cell, ParagraphAlignment.CENTER, 0, 20);
        addRun(p, "件", 14, false, "64748B");

        p = addPara(cell, ParagraphAlignment.CENTER, 0, 100);
        addRun(p, v.getCopies() == null ? "—" : String.valueOf(v.getCopies()), 16, true, "000000");
    }

    // ═══════════════════════════════════════════════════════════════
    // 案卷目录（与前端 vol-catalogue 标签一致）
    // ═══════════════════════════════════════════════════════════════

    private NiceXWPFDocument buildVolCatalogue(ArchiveVolume v) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        // 标题
        addCenteredParagraph(doc, "案  卷  目  录", 32, true, 200, 60);

        // 副标题
        XWPFParagraph sub = doc.createParagraph();
        sub.setAlignment(ParagraphAlignment.CENTER);
        sub.setSpacingAfter(200);
        addRun(sub, "全宗号：" + orDash(v.getFondsNo())
                + "　　年度：" + orDash(v.getYear())
                + "　　一级类目：" + orDash(v.getCategoryL1()),
                20, false, "475569");

        // 表格
        String[] headers = {"序号", "档号", "案卷题名", "年度", "件数", "页数", "保管期限", "密级", "备注"};
        XWPFTable tbl = doc.createTable(2, headers.length);
        setTableFullWidth(tbl);
        setTableBorders(tbl, 8, 8, 8, 8, 8, 8, "000000");

        // 表头
        XWPFTableRow hRow = tbl.getRow(0);
        for (int i = 0; i < headers.length; i++) {
            setCellBoldCenter(hRow.getCell(i), headers[i], 20);
            hRow.getCell(i).setColor("F1F5F9");
        }

        // 数据行
        XWPFTableRow dRow = tbl.getRow(1);
        setCellTextCenter(dRow.getCell(0), "1", 20);
        setCellTextCenter(dRow.getCell(1), orDash(v.getArchiveNo()), 20);
        setCellTextLeft(dRow.getCell(2), orDash(v.getVolumeTitle()), 20);
        setCellTextCenter(dRow.getCell(3), orDash(v.getYear()), 20);
        setCellTextCenter(dRow.getCell(4), v.getCopies() == null ? "—" : String.valueOf(v.getCopies()), 20);
        setCellTextCenter(dRow.getCell(5), v.getTotalPages() == null ? "—" : String.valueOf(v.getTotalPages()), 20);
        setCellTextCenter(dRow.getCell(6), orDash(v.getRetentionPeriod()), 20);
        setCellTextCenter(dRow.getCell(7), orDash(v.getSecurityLevel()), 20);
        setCellTextLeft(dRow.getCell(8), orDash(v.getNotes()), 20);

        // 页脚
        XWPFParagraph footer = doc.createParagraph();
        footer.setAlignment(ParagraphAlignment.LEFT);
        footer.setBorderTop(Borders.SINGLE);
        footer.setSpacingBefore(600);
        addRun(footer, "编制单位：" + orDash(v.getCompileUnit())
                + "　　立卷人：" + orDash(v.getCompiler())
                + "　　立卷日期：" + orDash(v.getCompileDate())
                + "　　审核人：" + orDash(v.getReviewer()),
                20, false, "475569");

        return doc;
    }

    // ═══════════════════════════════════════════════════════════════
    // 卷内文件目录（与前端 file-catalogue 标签一致）
    // ═══════════════════════════════════════════════════════════════

    private NiceXWPFDocument buildFileCatalogue(ArchiveVolume v, List<ArchiveFile> files) {
        NiceXWPFDocument doc = new NiceXWPFDocument();

        // 标题
        addCenteredParagraph(doc, "卷  内  文  件  目  录", 32, true, 200, 60);

        // 信息行
        XWPFParagraph info = doc.createParagraph();
        info.setAlignment(ParagraphAlignment.LEFT);
        info.setSpacingAfter(200);
        addRun(info, "档号：", 24, false, "475569");
        addRun(info, orDash(v.getArchiveNo()), 24, false, "000000");
        addRun(info, "　　案卷题名：", 24, false, "475569");
        addRun(info, orDash(v.getVolumeTitle()), 24, false, "000000");

        // 表格
        String[] headers = {"顺序号", "文件编号", "文件标题", "责任者", "归档日期", "页数", "密级", "备注"};
        XWPFTable tbl = doc.createTable(1 + files.size(), headers.length);
        setTableFullWidth(tbl);
        setTableBorders(tbl, 8, 8, 8, 8, 8, 8, "000000");

        // 表头
        XWPFTableRow hRow = tbl.getRow(0);
        for (int i = 0; i < headers.length; i++) {
            setCellBoldCenter(hRow.getCell(i), headers[i], 20);
            hRow.getCell(i).setColor("F1F5F9");
        }

        // 数据行
        for (int i = 0; i < files.size(); i++) {
            ArchiveFile f = files.get(i);
            XWPFTableRow row = tbl.getRow(i + 1);
            setCellTextCenter(row.getCell(0), String.valueOf(f.getSeqNo() == null ? i + 1 : f.getSeqNo()), 20);
            setCellTextCenter(row.getCell(1), orDash(f.getFileNo()), 20);
            setCellTextLeft(row.getCell(2), orDash(f.getFileTitle()), 20);
            setCellTextLeft(row.getCell(3), orDash(f.getResponsible()), 20);
            setCellTextCenter(row.getCell(4),
                    f.getArchiveDate() != null
                            ? f.getArchiveDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                            : "—", 20);
            setCellTextCenter(row.getCell(5), f.getPages() == null ? "—" : String.valueOf(f.getPages()), 20);
            setCellTextCenter(row.getCell(6), orDash(f.getSecurityLevel()), 20);
            setCellTextLeft(row.getCell(7), orDash(f.getRemark()), 20);
        }

        // 页脚
        XWPFParagraph footer = doc.createParagraph();
        footer.setAlignment(ParagraphAlignment.LEFT);
        footer.setBorderTop(Borders.SINGLE);
        footer.setSpacingBefore(600);
        addRun(footer, "共 " + files.size() + " 件　　立卷人：" + orDash(v.getCompiler()), 20, false, "475569");

        return doc;
    }

    // ═══════════════════════════════════════════════════════════════
    // 工具方法
    // ═══════════════════════════════════════════════════════════════

    private NiceXWPFDocument appendWithPageBreak(NiceXWPFDocument base, NiceXWPFDocument append) {
        try {
            base.createParagraph().createRun().addBreak(org.apache.poi.xwpf.usermodel.BreakType.PAGE);
            return base.merge(append);
        } catch (Exception e) {
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "Word文档合并失败");
        }
    }

    private void addCenteredParagraph(XWPFDocument doc, String text, int halfPointSize,
                                      boolean bold, int spacingBefore, int spacingAfter) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBefore(spacingBefore);
        p.setSpacingAfter(spacingAfter);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(bold);
        run.setFontSize(halfPointSize);
        run.setFontFamily("宋体");
    }

    /** 在段落中添加一个 Run（标签 + 值，值带下划线） */
    private void addLabelValueRun(XWPFParagraph p, String label, int labelSize,
                                  String value, int valueSize) {
        XWPFRun run = p.createRun();
        run.setText(label + " ");
        run.setFontSize(labelSize);
        run.setFontFamily("宋体");
        run.setColor("475569");

        run = p.createRun();
        run.setText(value);
        run.setFontSize(valueSize);
        run.setFontFamily("宋体");
        run.setBold(true);
        run.setUnderline(UnderlinePatterns.SINGLE);
    }

    private void addGapRun(XWPFParagraph p, String text) {
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(20);
        run.setFontFamily("宋体");
    }

    /** 创建并返回一个设置了基本对齐和间距的段落 */
    private XWPFParagraph addPara(XWPFTableCell cell, ParagraphAlignment align,
                                  int spacingBefore, int spacingAfter) {
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(align);
        p.setSpacingBefore(spacingBefore);
        p.setSpacingAfter(spacingAfter);
        return p;
    }

    /** 向段落中添加一个 Run */
    private void addRun(XWPFParagraph p, String text, int halfPointSize,
                        boolean bold, String color) {
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(halfPointSize);
        run.setFontFamily("宋体");
        run.setBold(bold);
        if (color != null) {
            run.setColor(color);
        }
    }

    private void addRun(XWPFParagraph p, String text, int halfPointSize,
                        boolean bold, String color, boolean underline) {
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(halfPointSize);
        run.setFontFamily("宋体");
        run.setBold(bold);
        if (color != null) {
            run.setColor(color);
        }
        if (underline) {
            run.setUnderline(UnderlinePatterns.SINGLE);
        }
    }

    private void setCellTextCenter(XWPFTableCell cell, String text, int halfPointSize) {
        clearCell(cell);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(halfPointSize);
        run.setFontFamily("宋体");
    }

    private void setCellTextLeft(XWPFTableCell cell, String text, int halfPointSize) {
        clearCell(cell);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(ParagraphAlignment.LEFT);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(halfPointSize);
        run.setFontFamily("宋体");
    }

    private void setCellBoldCenter(XWPFTableCell cell, String text, int halfPointSize) {
        clearCell(cell);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(true);
        run.setFontSize(halfPointSize);
        run.setFontFamily("宋体");
    }

    private void clearCell(XWPFTableCell cell) {
        if (cell.getParagraphs().size() > 0) {
            cell.removeParagraph(0);
        }
    }

    private void setTableFullWidth(XWPFTable tbl) {
        CTTblPr tblPr = tbl.getCTTbl().getTblPr();
        if (tblPr == null) {
            tblPr = tbl.getCTTbl().addNewTblPr();
        }
        CTTblWidth tblWidth = tblPr.getTblW();
        if (tblWidth == null) {
            tblWidth = tblPr.addNewTblW();
        }
        tblWidth.setType(STTblWidth.PCT);
        tblWidth.setW(BigInteger.valueOf(5000));
    }

    /**
     * 设置表格边框（单位：1/8 pt）
     * 例：3pt = 24，2pt = 16，1pt = 8，0 = 无边框
     */
    private void setTableBorders(XWPFTable tbl, int top, int bottom, int left, int right,
                                 int insideH, int insideV, String color) {
        CTTblPr tblPr = tbl.getCTTbl().getTblPr();
        if (tblPr == null) {
            tblPr = tbl.getCTTbl().addNewTblPr();
        }
        CTTblBorders borders = tblPr.getTblBorders();
        if (borders == null) {
            borders = tblPr.addNewTblBorders();
        }

        setBorderProp(borders.isSetTop() ? borders.getTop() : borders.addNewTop(), top, color);
        setBorderProp(borders.isSetBottom() ? borders.getBottom() : borders.addNewBottom(), bottom, color);
        setBorderProp(borders.isSetLeft() ? borders.getLeft() : borders.addNewLeft(), left, color);
        setBorderProp(borders.isSetRight() ? borders.getRight() : borders.addNewRight(), right, color);
        setBorderProp(borders.isSetInsideH() ? borders.getInsideH() : borders.addNewInsideH(), insideH, color);
        setBorderProp(borders.isSetInsideV() ? borders.getInsideV() : borders.addNewInsideV(), insideV, color);
    }

    private void setBorderProp(CTBorder border, int size, String color) {
        if (size <= 0) {
            border.setVal(STBorder.NIL);
        } else {
            border.setVal(STBorder.SINGLE);
            border.setSz(BigInteger.valueOf(size));
            border.setColor(color);
            border.setSpace(BigInteger.ZERO);
        }
    }

    private void setColWidth(XWPFTable tbl, int colIndex, int widthTwips) {
        CTTblGrid grid = tbl.getCTTbl().getTblGrid();
        if (grid == null) {
            grid = tbl.getCTTbl().addNewTblGrid();
        }
        while (grid.sizeOfGridColArray() <= colIndex) {
            grid.addNewGridCol();
        }
        CTTblGridCol gridCol = grid.getGridColArray(colIndex);
        gridCol.setW(BigInteger.valueOf(widthTwips));
    }

    private void setCellBgColor(XWPFTableCell cell, String color) {
        CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
        CTShd shd = tcPr.isSetShd() ? tcPr.getShd() : tcPr.addNewShd();
        shd.setVal(STShd.CLEAR);
        shd.setColor("auto");
        shd.setFill(color);
    }

    private void setCellVerticalText(XWPFTableCell cell) {
        CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
        CTTextDirection textDir = tcPr.isSetTextDirection() ? tcPr.getTextDirection() : tcPr.addNewTextDirection();
        textDir.setVal(STTextDirection.Enum.forString("tbRl"));
    }

    private void setCellBorders(XWPFTableCell cell, int top, int bottom, int left, int right, String color) {
        CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
        CTTcBorders borders = tcPr.isSetTcBorders() ? tcPr.getTcBorders() : tcPr.addNewTcBorders();

        setBorderProp(borders.isSetTop() ? borders.getTop() : borders.addNewTop(), top, color);
        setBorderProp(borders.isSetBottom() ? borders.getBottom() : borders.addNewBottom(), bottom, color);
        setBorderProp(borders.isSetLeft() ? borders.getLeft() : borders.addNewLeft(), left, color);
        setBorderProp(borders.isSetRight() ? borders.getRight() : borders.addNewRight(), right, color);
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
