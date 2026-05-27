package com.laikuang.archive.volume.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.volume.service.print.ArchivePrintService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 档案 Word 套打接口。
 *
 * <p>URL 前缀：/api/print</p>
 */
@Validated
@RestController
@RequestMapping("/print")
@RequiredArgsConstructor
public class ArchivePrintController {

    private final ArchivePrintService printService;

    /**
     * GET /api/print/volume/{recordId}?year=2026
     * 案卷 Word 套打（封皮 + 侧脊 + 案卷信息 + 卷内目录）。
     * 直接返回二进制文件流，前端下载 .docx。
     */
    @GetMapping("/volume/{recordId}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public void printVolume(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            HttpServletResponse response) {
        printService.printVolume(recordId, year, response);
    }
}
