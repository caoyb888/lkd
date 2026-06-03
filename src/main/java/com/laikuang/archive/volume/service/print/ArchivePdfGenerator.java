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
        return """
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="UTF-8"/>
            <style>
              @page { size: 210mm 297mm; margin: 0; }
              * { box-sizing: border-box; }
              body { margin: 0; padding: 0; font-family: 'WenQuanYi Zen Hei', 'SimSun', '宋体', serif; font-size: 10pt; color: #000; }
              .page { width: 210mm; height: 297mm; padding: 8mm; page-break-after: always; overflow: hidden; }
              .page:last-child { page-break-after: auto; }
              table { border-collapse: collapse; width: 100%; }
              td, th { vertical-align: middle; }
            </style>
            </head>
            <body>
            %s
            </body>
            </html>
            """.formatted(bodyContent);
    }

    // ═══════════════════════════════════════════════════════════════
    // 封皮
    // ═══════════════════════════════════════════════════════════════

    private String buildCover(ArchiveVolume v) {
        return """
            <div class="page">
              <table style="width:100%%;height:100%%;border:3px solid #000;table-layout:fixed;">
                <tr>
                  <td style="width:22mm;border-right:2px solid #000;background:#F8FAFC;text-align:center;vertical-align:middle;font-size:8pt;line-height:1.8;">
                    <div style="display:inline-block;text-align:center;">
                      <span style="color:#64748B;">全<br>宗<br>名<br>称</span><br><br>
                      <span style="font-size:9pt;font-weight:bold;">莱<br>矿</span><br><br><br>
                      <span style="color:#64748B;">保<br>管<br>期<br>限</span><br><br>
                      <span style="font-size:9pt;font-weight:bold;">%s</span>
                    </div>
                  </td>
                  <td style="padding:12mm 14mm;vertical-align:top;">
                    <div style="margin-bottom:10mm;">
                      <span style="color:#475569;font-size:10pt;">年度 </span>
                      <span style="font-size:12pt;font-weight:bold;border-bottom:1.5px solid #000;padding:0 4px;">%s</span>
                      <span style="margin-left:32px;color:#475569;font-size:10pt;">密级 </span>
                      <span style="font-size:12pt;font-weight:bold;border-bottom:1.5px solid #000;padding:0 4px;">%s</span>
                    </div>
                    <div style="text-align:center;margin:20mm 0 8mm;">
                      <div style="font-size:11pt;color:#64748B;margin-bottom:8px;letter-spacing:2px;">案卷题名</div>
                      <div style="font-size:18pt;font-weight:bold;line-height:1.6;word-break:break-all;">%s</div>
                    </div>
                    <div style="border-top:1.5px solid #000;margin:8mm 0 6mm;"></div>
                    <div style="margin-bottom:6mm;">
                      <span style="color:#475569;font-size:11pt;white-space:nowrap;">档&emsp;&emsp;号 </span>
                      <span style="font-size:13pt;font-weight:bold;border-bottom:1.5px solid #000;padding:0 6px;letter-spacing:1px;">%s</span>
                    </div>
                    <div style="margin-bottom:10mm;">
                      <span style="color:#475569;font-size:10pt;">件数 </span>
                      <strong style="font-size:12pt;border-bottom:1px solid #000;padding:0 6px;">%s</strong>
                      <span style="margin-left:32px;color:#475569;font-size:10pt;">页数 </span>
                      <strong style="font-size:12pt;border-bottom:1px solid #000;padding:0 6px;">%s</strong>
                    </div>
                    <div style="margin-top:40mm;text-align:center;border-top:1.5px solid #000;padding-top:6mm;">
                      <span style="font-size:13pt;font-weight:bold;letter-spacing:4px;">莱矿档案室</span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            """.formatted(
                orDash(v.getRetentionPeriod()),
                orDash(v.getYear()),
                orDash(v.getSecurityLevel()),
                esc(orDash(v.getVolumeTitle())),
                esc(orDash(v.getArchiveNo())),
                v.getCopies() == null ? "—" : v.getCopies(),
                v.getTotalPages() == null ? "—" : v.getTotalPages()
            );
    }

    // ═══════════════════════════════════════════════════════════════
    // 侧脊（每页双脊）
    // ═══════════════════════════════════════════════════════════════

    private String buildSpine(ArchiveVolume v) {
        String title = esc(orDash(v.getVolumeTitle()));
        // 把题名每个字用 <br> 连接，模拟竖排
        StringBuilder titleHtml = new StringBuilder();
        for (char c : title.toCharArray()) {
            titleHtml.append(esc(String.valueOf(c))).append("<br>");
        }

        String spineBlock = """
            <div style="width:22mm;height:calc(297mm - 24mm);border:2px solid #000;margin:0 auto;text-align:center;font-size:7pt;line-height:1.6;padding:4mm 2mm;">
              <span style="color:#64748B;">全</span><br>
              <span style="font-size:8pt;font-weight:bold;">%s</span><br><br>
              <span style="color:#64748B;">年</span><br>
              <span style="font-size:8pt;font-weight:bold;">%s</span><br><br>
              <span style="color:#64748B;">号</span><br>
              <span style="font-size:6pt;font-weight:bold;">%s</span><br><br><br>
              <div style="font-size:9pt;font-weight:bold;line-height:1.4;">%s</div><br><br><br>
              <span style="color:#64748B;">件</span><br>
              <span style="font-size:8pt;font-weight:bold;">%s</span>
            </div>
            """.formatted(
                esc(orDash(v.getFondsNo())),
                esc(orDash(v.getYear())),
                esc(orDash(v.getArchiveNo())),
                titleHtml.toString(),
                v.getCopies() == null ? "—" : v.getCopies()
            );

        return """
            <div class="page" style="padding:12mm;">
              <table style="width:100%%;height:100%%;">
                <tr>
                  <td style="width:50%%;text-align:center;vertical-align:top;padding-right:6mm;">
                    %s
                  </td>
                  <td style="width:50%%;text-align:center;vertical-align:top;padding-left:6mm;">
                    %s
                  </td>
                </tr>
              </table>
            </div>
            """.formatted(spineBlock, spineBlock);
    }

    // ═══════════════════════════════════════════════════════════════
    // 案卷目录
    // ═══════════════════════════════════════════════════════════════

    private String buildVolCatalogue(ArchiveVolume v) {
        return """
            <div class="page">
              <div style="padding:12mm 14mm;">
                <h3 style="font-size:16pt;font-weight:bold;text-align:center;margin:0 0 6px;letter-spacing:4px;">案&emsp;卷&emsp;目&emsp;录</h3>
                <p style="font-size:10pt;text-align:center;color:#475569;margin:0 0 8mm;letter-spacing:1px;">
                  全宗号：%s&emsp;年度：%s&emsp;一级类目：%s
                </p>
                <table style="width:100%%;border-collapse:collapse;font-size:10pt;margin-bottom:8mm;">
                  <thead>
                    <tr style="background:#F1F5F9;">
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:8mm;">序号</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:40mm;">档号</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:50mm;">案卷题名</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;">年度</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;">件数</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;">页数</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:16mm;">保管期限</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:14mm;">密级</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:16mm;">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">1</td>
                      <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-family:Consolas,monospace;font-size:9pt;white-space:nowrap;">%s</td>
                      <td style="border:1px solid #000;padding:2px 4px;">%s</td>
                      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                      <td style="border:1px solid #000;padding:2px 4px;">%s</td>
                    </tr>
                  </tbody>
                </table>
                <div style="margin-top:auto;display:flex;gap:24px;font-size:10pt;padding-top:8mm;border-top:1px solid #000;flex-wrap:wrap;">
                  <span>编制单位：%s</span>
                  <span>立卷人：%s</span>
                  <span>立卷日期：%s</span>
                  <span>审核人：%s</span>
                </div>
              </div>
            </div>
            """.formatted(
                esc(orDash(v.getFondsNo())),
                esc(orDash(v.getYear())),
                esc(orDash(v.getCategoryL1())),
                esc(orDash(v.getArchiveNo())),
                esc(orDash(v.getVolumeTitle())),
                esc(orDash(v.getYear())),
                v.getCopies() == null ? "—" : v.getCopies(),
                v.getTotalPages() == null ? "—" : v.getTotalPages(),
                esc(orDash(v.getRetentionPeriod())),
                esc(orDash(v.getSecurityLevel())),
                esc(orDash(v.getNotes())),
                esc(orDash(v.getCompileUnit())),
                esc(orDash(v.getCompiler())),
                esc(orDash(v.getCompileDate())),
                esc(orDash(v.getReviewer()))
            );
    }

    // ═══════════════════════════════════════════════════════════════
    // 卷内文件目录
    // ═══════════════════════════════════════════════════════════════

    private String buildFileCatalogue(ArchiveVolume v, List<ArchiveFile> files) {
        StringBuilder rows = new StringBuilder();
        for (ArchiveFile f : files) {
            rows.append("""
                <tr>
                  <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                  <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-family:Consolas,monospace;font-size:9pt;white-space:nowrap;">%s</td>
                  <td style="border:1px solid #000;padding:2px 4px;">%s</td>
                  <td style="border:1px solid #000;padding:2px 4px;">%s</td>
                  <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                  <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                  <td style="border:1px solid #000;padding:2px 4px;text-align:center;">%s</td>
                  <td style="border:1px solid #000;padding:2px 4px;">%s</td>
                </tr>
                """.formatted(
                    f.getSeqNo() == null ? "—" : f.getSeqNo(),
                    esc(orDash(f.getFileNo())),
                    esc(orDash(f.getFileTitle())),
                    esc(orDash(f.getResponsible())),
                    f.getArchiveDate() != null
                        ? f.getArchiveDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "—",
                    f.getPages() == null ? "—" : f.getPages(),
                    esc(orDash(f.getSecurityLevel())),
                    esc(orDash(f.getRemark()))
                ));
        }

        return """
            <div class="page">
              <div style="padding:12mm 14mm;">
                <h3 style="font-size:16pt;font-weight:bold;text-align:center;margin:0 0 6px;letter-spacing:4px;">卷内文件目录</h3>
                <p style="font-size:10pt;text-align:left;color:#475569;margin:0 0 8mm;letter-spacing:1px;">
                  档号：%s&emsp;案卷题名：%s
                </p>
                <table style="width:100%%;border-collapse:collapse;font-size:10pt;margin-bottom:8mm;">
                  <thead>
                    <tr style="background:#F1F5F9;">
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:10mm;">顺序号</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:24mm;">文件编号</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:50mm;">文件标题</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:20mm;">责任者</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:22mm;">归档日期</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:12mm;">页数</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;width:14mm;">密级</th>
                      <th style="border:1px solid #000;padding:2px 4px;text-align:center;white-space:nowrap;min-width:16mm;">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    %s
                  </tbody>
                </table>
                <div style="margin-top:auto;display:flex;gap:24px;font-size:10pt;padding-top:8mm;border-top:1px solid #000;flex-wrap:wrap;">
                  <span>共 %s 件</span>
                  <span>立卷人：%s</span>
                </div>
              </div>
            </div>
            """.formatted(
                esc(orDash(v.getArchiveNo())),
                esc(orDash(v.getVolumeTitle())),
                rows.toString(),
                files.size(),
                esc(orDash(v.getCompiler()))
            );
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
