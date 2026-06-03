package com.laikuang.archive.volume.service.print;

import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 档案打印 PDF 生成器（OpenHTMLToPDF）。
 * 用 HTML/CSS 模板渲染后转 PDF，确保与前端打印预览格式一致。
 */
@Component
public class ArchivePdfGenerator {

    private static final String TYPE_COVER          = "cover";
    private static final String TYPE_SPINE          = "spine";
    private static final String TYPE_VOL_CATALOGUE  = "volume-catalogue";
    private static final String TYPE_FILE_CATALOGUE = "file-catalogue";

    /** 系统中文黑体路径（Linux 常见） */
    private static final String FONT_PATH = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc";

    public byte[] generate(ArchiveVolume v, List<ArchiveFile> files, String type) throws Exception {
        String html = buildHtml(v, files, type);
        return htmlToPdf(html);
    }

    // ── HTML 组装 ────────────────────────────────────────────────

    private String buildHtml(ArchiveVolume v, List<ArchiveFile> files, String type) {
        StringBuilder body = new StringBuilder();
        switch (type) {
            case TYPE_COVER          -> body.append(buildCover(v));
            case TYPE_SPINE          -> body.append(buildSpine(v));
            case TYPE_VOL_CATALOGUE  -> body.append(buildVolCatalogue(v));
            case TYPE_FILE_CATALOGUE -> body.append(buildFileCatalogue(v, files));
            default -> {
                body.append(buildCover(v))
                    .append(buildSpine(v))
                    .append(buildVolCatalogue(v))
                    .append(buildFileCatalogue(v, files));
            }
        }
        return wrapHtml(body.toString());
    }

    private String wrapHtml(String bodyContent) {
        return "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"UTF-8\"/>\n<style>\n"
            + "  @page { size: 210mm 297mm; margin: 0; }\n"
            + "  * { box-sizing: border-box; }\n"
            + "  body { margin: 0; padding: 0; font-family: 'WenQuanYi Zen Hei', 'SimSun', '宋体', serif; font-size: 10pt; color: #000; }\n"
            + "  .page { width: 210mm; height: 297mm; padding: 8mm; page-break-after: always; overflow: hidden; }\n"
            + "  .page:last-child { page-break-after: auto; }\n"
            + "  table { border-collapse: collapse; width: 100%; }\n"
            + "  td, th { vertical-align: middle; }\n"
            + "</style>\n</head>\n<body>\n"
            + bodyContent
            + "\n</body>\n</html>";
    }

    // ═══════════════════════════════════════════════════════════════
    // 封皮
    // ═══════════════════════════════════════════════════════════════

    private String buildCover(ArchiveVolume v) {
        String retention = esc(orDash(v.getRetentionPeriod()));
        String year      = esc(orDash(v.getYear()));
        String security  = esc(orDash(v.getSecurityLevel()));
        String title     = esc(orDash(v.getVolumeTitle()));
        String archiveNo = esc(orDash(v.getArchiveNo()));
        String copies    = v.getCopies() == null ? "—" : String.valueOf(v.getCopies());
        String pages     = v.getTotalPages() == null ? "—" : String.valueOf(v.getTotalPages());

        return "<div class=\"page\">\n"
            + "  <table style=\"width:100%;height:100%;border:3px solid #000;table-layout:fixed;\">\n"
            + "    <tr>\n"
            + "      <td style=\"width:22mm;border-right:2px solid #000;background:#F8FAFC;text-align:center;vertical-align:middle;font-size:8pt;line-height:1.8;\">\n"
            + "        <div style=\"display:inline-block;text-align:center;\">\n"
            + "          <span style=\"color:#64748B;\">全<br/>宗<br/>名<br/>称</span><br/><br/>\n"
            + "          <span style=\"font-size:9pt;font-weight:bold;\">莱<br/>矿</span><br/><br/><br/>\n"
            + "          <span style=\"color:#64748B;\">保<br/>管<br/>期<br/>限</span><br/><br/>\n"
            + "          <span style=\"font-size:9pt;font-weight:bold;\">" + retention + "</span>\n"
            + "        </div>\n"
            + "      </td>\n"
            + "      <td style=\"padding:12mm 14mm;vertical-align:top;\">\n"
            + "        <div style=\"margin-bottom:10mm;\">\n"
            + "          <span style=\"color:#475569;font-size:10pt;\">年度 </span>\n"
            + "          <span style=\"font-size:12pt;font-weight:bold;border-bottom:1.5px solid #000;padding:0 4px;\">" + year + "</span>\n"
            + "          <span style=\"margin-left:32px;color:#475569;font-size:10pt;\">密级 </span>\n"
            + "          <span style=\"font-size:12pt;font-weight:bold;border-bottom:1.5px solid #000;padding:0 4px;\">" + security + "</span>\n"
            + "        </div>\n"
            + "        <div style=\"text-align:center;margin:20mm 0 8mm;\">\n"
            + "          <div style=\"font-size:11pt;color:#64748B;margin-bottom:8px;letter-spacing:2px;\">案卷题名</div>\n"
            + "          <div style=\"font-size:18pt;font-weight:bold;line-height:1.6;word-break:break-all;\">" + title + "</div>\n"
            + "        </div>\n"
            + "        <div style=\"border-top:1.5px solid #000;margin:8mm 0 6mm;\"></div>\n"
            + "        <div style=\"margin-bottom:6mm;\">\n"
            + "          <span style=\"color:#475569;font-size:11pt;white-space:nowrap;\">档&#160;&#160;&#160;&#160;号 </span>\n"
            + "          <span style=\"font-size:13pt;font-weight:bold;border-bottom:1.5px solid #000;padding:0 6px;letter-spacing:1px;\">" + archiveNo + "</span>\n"
            + "        </div>\n"
            + "        <div style=\"margin-bottom:10mm;\">\n"
            + "          <span style=\"color:#475569;font-size:10pt;\">件数 </span>\n"
            + "          <strong style=\"font-size:12pt;border-bottom:1px solid #000;padding:0 6px;\">" + copies + "</strong>\n"
            + "          <span style=\"margin-left:32px;color:#475569;font-size:10pt;\">页数 </span>\n"
            + "          <strong style=\"font-size:12pt;border-bottom:1px solid #000;padding:0 6px;\">" + pages + "</strong>\n"
            + "        </div>\n"
            + "        <div style=\"margin-top:40mm;text-align:center;border-top:1.5px solid #000;padding-top:6mm;\">\n"
            + "          <span style=\"font-size:13pt;font-weight:bold;letter-spacing:4px;\">莱矿档案室</span>\n"
            + "        </div>\n"
            + "      </td>\n"
            + "    </tr>\n"
            + "  </table>\n"
            + "</div>\n";
    }

    // ═══════════════════════════════════════════════════════════════
    // 侧脊（每页双脊）
    // ═══════════════════════════════════════════════════════════════

    private String buildSpine(ArchiveVolume v) {
        String fondsNo  = esc(orDash(v.getFondsNo()));
        String year     = esc(orDash(v.getYear()));
        String archiveNo= esc(orDash(v.getArchiveNo()));
        String copies   = v.getCopies() == null ? "—" : String.valueOf(v.getCopies());

        // 题名每个字换行，模拟竖排
        StringBuilder titleHtml = new StringBuilder();
        for (char c : esc(orDash(v.getVolumeTitle())).toCharArray()) {
            titleHtml.append(esc(String.valueOf(c))).append("<br/>");
        }

        String spineBlock = "<div style=\"width:22mm;height:calc(297mm - 24mm);border:2px solid #000;margin:0 auto;text-align:center;font-size:7pt;line-height:1.6;padding:4mm 2mm;\">\n"
            + "  <span style=\"color:#64748B;\">全</span><br/>\n"
            + "  <span style=\"font-size:8pt;font-weight:bold;\">" + fondsNo + "</span><br/><br/>\n"
            + "  <span style=\"color:#64748B;\">年</span><br/>\n"
            + "  <span style=\"font-size:8pt;font-weight:bold;\">" + year + "</span><br/><br/>\n"
            + "  <span style=\"color:#64748B;\">号</span><br/>\n"
            + "  <span style=\"font-size:6pt;font-weight:bold;\">" + archiveNo + "</span><br/><br/><br/>\n"
            + "  <div style=\"font-size:9pt;font-weight:bold;line-height:1.4;\">" + titleHtml + "</div><br/><br/><br/>\n"
            + "  <span style=\"color:#64748B;\">件</span><br/>\n"
            + "  <span style=\"font-size:8pt;font-weight:bold;\">" + copies + "</span>\n"
            + "</div>";

        return "<div class=\"page\" style=\"padding:12mm;\">\n"
            + "  <table style=\"width:100%;height:100%;\">\n"
            + "    <tr>\n"
            + "      <td style=\"width:50%;text-align:center;vertical-align:top;padding-right:6mm;\">" + spineBlock + "</td>\n"
            + "      <td style=\"width:50%;text-align:center;vertical-align:top;padding-left:6mm;\">" + spineBlock + "</td>\n"
            + "    </tr>\n"
            + "  </table>\n"
            + "</div>\n";
    }

    // ═══════════════════════════════════════════════════════════════
    // 案卷目录
    // ═══════════════════════════════════════════════════════════════

    private String buildVolCatalogue(ArchiveVolume v) {
        String fondsNo    = esc(orDash(v.getFondsNo()));
        String year       = esc(orDash(v.getYear()));
        String categoryL1 = esc(orDash(v.getCategoryL1()));
        String archiveNo  = esc(orDash(v.getArchiveNo()));
        String volumeTitle= esc(orDash(v.getVolumeTitle()));
        String copies     = v.getCopies() == null ? "—" : String.valueOf(v.getCopies());
        String totalPages = v.getTotalPages() == null ? "—" : String.valueOf(v.getTotalPages());
        String retention  = esc(orDash(v.getRetentionPeriod()));
        String security   = esc(orDash(v.getSecurityLevel()));
        String notes      = esc(orDash(v.getNotes()));
        String compileUnit= esc(orDash(v.getCompileUnit()));
        String compiler   = esc(orDash(v.getCompiler()));
        String compileDate= esc(orDash(v.getCompileDate()));
        String reviewer   = esc(orDash(v.getReviewer()));

        return "<div class=\"page\">\n"
            + "  <div style=\"padding:12mm 14mm;\">\n"
            + "    <h3 style=\"font-size:16pt;font-weight:bold;text-align:center;margin:0 0 6px;letter-spacing:4px;\">案&#160;&#160;&#160;&#160;卷&#160;&#160;&#160;&#160;目&#160;&#160;&#160;&#160;录</h3>\n"
            + "    <p style=\"font-size:10pt;text-align:center;color:#475569;margin:0 0 8mm;letter-spacing:1px;\">\n"
            + "      全宗号：" + fondsNo + "&#8195;年度：" + year + "&#8195;一级类目：" + categoryL1 + "\n"
            + "    </p>\n"
            + "    <table style=\"width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:8mm;\">\n"
            + "      <thead>\n"
            + "        <tr style=\"background:#F1F5F9;\">\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:8mm;\">序号</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:40mm;\">档号</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:50mm;\">案卷题名</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;\">年度</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;\">件数</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;\">页数</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:16mm;\">保管期限</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:14mm;\">密级</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:16mm;\">备注</th>\n"
            + "        </tr>\n"
            + "      </thead>\n"
            + "      <tbody>\n"
            + "        <tr>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">1</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;font-family:Consolas,monospace;font-size:9pt;white-space:nowrap;\">" + archiveNo + "</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;\">" + volumeTitle + "</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">" + year + "</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">" + copies + "</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">" + totalPages + "</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">" + retention + "</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">" + security + "</td>\n"
            + "          <td style=\"border:1px solid #000;padding:2px 4px;\">" + notes + "</td>\n"
            + "        </tr>\n"
            + "      </tbody>\n"
            + "    </table>\n"
            + "    <div style=\"margin-top:auto;display:flex;gap:24px;font-size:10pt;padding-top:8mm;border-top:1px solid #000;flex-wrap:wrap;\">\n"
            + "      <span>编制单位：" + compileUnit + "</span>\n"
            + "      <span>立卷人：" + compiler + "</span>\n"
            + "      <span>立卷日期：" + compileDate + "</span>\n"
            + "      <span>审核人：" + reviewer + "</span>\n"
            + "    </div>\n"
            + "  </div>\n"
            + "</div>\n";
    }

    // ═══════════════════════════════════════════════════════════════
    // 卷内文件目录
    // ═══════════════════════════════════════════════════════════════

    private String buildFileCatalogue(ArchiveVolume v, List<ArchiveFile> files) {
        StringBuilder rows = new StringBuilder();
        for (ArchiveFile f : files) {
            String seqNo = f.getSeqNo() == null ? "—" : String.valueOf(f.getSeqNo());
            String fileNo = esc(orDash(f.getFileNo()));
            String fileTitle = esc(orDash(f.getFileTitle()));
            String responsible = esc(orDash(f.getResponsible()));
            String archiveDate = f.getArchiveDate() != null
                ? f.getArchiveDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "—";
            String pages = f.getPages() == null ? "—" : String.valueOf(f.getPages());
            String security = esc(orDash(f.getSecurityLevel()));
            String remark = esc(orDash(f.getRemark()));

            rows.append("<tr>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">").append(seqNo).append("</td>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;font-family:Consolas,monospace;font-size:9pt;white-space:nowrap;\">").append(fileNo).append("</td>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;\">").append(fileTitle).append("</td>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;\">").append(responsible).append("</td>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">").append(archiveDate).append("</td>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">").append(pages).append("</td>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;text-align:center;\">").append(security).append("</td>\n")
                .append("  <td style=\"border:1px solid #000;padding:2px 4px;\">").append(remark).append("</td>\n")
                .append("</tr>\n");
        }

        String archiveNo = esc(orDash(v.getArchiveNo()));
        String volumeTitle = esc(orDash(v.getVolumeTitle()));
        String compiler = esc(orDash(v.getCompiler()));

        return "<div class=\"page\">\n"
            + "  <div style=\"padding:12mm 14mm;\">\n"
            + "    <h3 style=\"font-size:16pt;font-weight:bold;text-align:center;margin:0 0 6px;letter-spacing:4px;\">卷内文件目录</h3>\n"
            + "    <p style=\"font-size:10pt;text-align:left;color:#475569;margin:0 0 8mm;letter-spacing:1px;\">\n"
            + "      档号：" + archiveNo + "&#8195;案卷题名：" + volumeTitle + "\n"
            + "    </p>\n"
            + "    <table style=\"width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:8mm;\">\n"
            + "      <thead>\n"
            + "        <tr style=\"background:#F1F5F9;\">\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:10mm;\">顺序号</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:24mm;\">文件编号</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:50mm;\">文件标题</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:20mm;\">责任者</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:22mm;\">归档日期</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;\">页数</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:14mm;\">密级</th>\n"
            + "          <th style=\"border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:16mm;\">备注</th>\n"
            + "        </tr>\n"
            + "      </thead>\n"
            + "      <tbody>\n"
            + rows.toString()
            + "      </tbody>\n"
            + "    </table>\n"
            + "    <div style=\"margin-top:auto;display:flex;gap:24px;font-size:10pt;padding-top:8mm;border-top:1px solid #000;flex-wrap:wrap;\">\n"
            + "      <span>共 " + files.size() + " 件</span>\n"
            + "      <span>立卷人：" + compiler + "</span>\n"
            + "    </div>\n"
            + "  </div>\n"
            + "</div>\n";
    }

    // ── HTML → PDF ───────────────────────────────────────────────

    private byte[] htmlToPdf(String html) throws Exception {
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        PdfRendererBuilder builder = new PdfRendererBuilder();
        builder.useFastMode();
        builder.withHtmlContent(html, null);
        builder.toStream(os);

        // 注册系统字体，确保中文正常显示
        File fontFile = new File(FONT_PATH);
        if (fontFile.exists()) {
            builder.useFont(fontFile, "WenQuanYi Zen Hei");
            builder.useFont(fontFile, "SimSun");
            builder.useFont(fontFile, "宋体");
        }

        builder.run();
        return os.toByteArray();
    }

    // ── 工具 ─────────────────────────────────────────────────────

    private String orDash(String value) {
        return StringUtils.hasText(value) ? value : "—";
    }

    /** HTML 转义，防止 XSS 和破坏标签结构 */
    private String esc(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
