package com.laikuang.archive.volume.service.print;

import jakarta.servlet.http.HttpServletResponse;

/**
 * 档案 Word 套打业务接口。
 *
 * <p>基于 poi-tl 引擎，将案卷及卷内文件数据渲染为 Word 文档，
 * 包含：档案盒封皮、侧脊、案卷信息页、卷内文件目录。</p>
 */
public interface ArchivePrintService {

    /**
     * 打印单个案卷的全套 Word 文档（封皮 + 侧脊 + 案卷信息 + 卷内目录）。
     *
     * @param recordId 案卷 record_id
     * @param year     案卷年度（分区键）
     * @param response HTTP 响应，直接写入二进制文件流
     */
    void printVolume(Long recordId, String year, HttpServletResponse response);
}
