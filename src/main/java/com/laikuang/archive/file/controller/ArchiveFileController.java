package com.laikuang.archive.file.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.domain.dto.ArchiveFileSortDTO;
import com.laikuang.archive.file.domain.dto.ArchiveFileUpdateDTO;
import com.laikuang.archive.file.domain.vo.ArchiveFileListVO;
import com.laikuang.archive.file.domain.vo.ArchiveFileVO;
import com.laikuang.archive.file.service.ArchiveFileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 文件级明细目录管理接口。
 *
 * <pre>
 * 权限说明：
 *   archive:create — 新建/编辑/删除草稿文件
 *   archive:view   — 查看已正式归档文件详情及列表
 * </pre>
 */
@Validated
@RestController
@RequestMapping("/file")
@RequiredArgsConstructor
public class ArchiveFileController {

    private final ArchiveFileService fileService;

    // ==================== 草稿操作（archive:create）====================

    /**
     * POST /api/file
     * 新建文件（默认草稿状态，须关联已存在的案卷）。
     */
    @PostMapping
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<ArchiveFileVO> createFile(@RequestBody @Validated ArchiveFileSaveDTO dto) {
        return Result.success(fileService.createFile(dto));
    }

    /**
     * PUT /api/file/{recordId}?year=2026
     * 更新文件（仅限草稿态）。
     */
    @PutMapping("/{recordId}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<Void> updateFile(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveFileUpdateDTO dto) {
        fileService.updateFile(recordId, year, dto);
        return Result.success();
    }

    /**
     * DELETE /api/file/{recordId}?year=2026
     * 删除文件（仅限草稿态，逻辑删除）。
     */
    @DeleteMapping("/{recordId}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<Void> deleteFile(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year) {
        fileService.deleteFile(recordId, year);
        return Result.success();
    }

    // ==================== 查询（archive:view / archive:create）====================

    /**
     * GET /api/file/{recordId}?year=2026
     * 文件详情。
     * 草稿态仅限立卷人本人查看。
     */
    @GetMapping("/{recordId}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<ArchiveFileVO> getFileDetail(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year) {
        return Result.success(fileService.getFileDetail(recordId, year));
    }

    /**
     * GET /api/file/page?current=1&pageSize=10&year=2026&volumeNo=xxx&keyword=xxx
     * 分页查询文件（多维组合筛选，status 默认 3，传 -1 查全部）。
     */
    @GetMapping("/page")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<IPage<ArchiveFileListVO>> pageFiles(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String fondsNo,
            @RequestParam(required = false) String categoryL1,
            @RequestParam(required = false) String categoryL2,
            @RequestParam(required = false) String categoryL3,
            @RequestParam(required = false) String volumeNo,
            @RequestParam(required = false) String archiveNo,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String securityLevel,
            @RequestParam(required = false) Integer inStock,
            @RequestParam(required = false) String keyword) {
        return Result.success(fileService.pageFiles(pageQuery, year, fondsNo,
                categoryL1, categoryL2, categoryL3, volumeNo, archiveNo,
                status, securityLevel, inStock, keyword));
    }

    /**
     * GET /api/file/draft-page?current=1&pageSize=10
     * 分页查询当前用户的草稿文件。
     */
    @GetMapping("/draft-page")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<IPage<ArchiveFileListVO>> pageDraftFiles(@Valid PageQuery pageQuery) {
        return Result.success(fileService.pageDraftFiles(pageQuery));
    }

    /**
     * GET /api/file/volume/{volumeNo}?year=2026
     * 按案卷号查询卷内文件列表（按 seq_no 升序）。
     */
    @GetMapping("/volume/{archiveNo}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<List<ArchiveFileListVO>> listFilesByVolume(
            @PathVariable String archiveNo,
            @RequestParam @NotBlank(message = "年度不能为空") String year) {
        return Result.success(fileService.listFilesByVolume(archiveNo, year));
    }

    /**
     * PUT /api/file/sort
     * 批量更新卷内文件顺序号（拖拽排序）。
     */
    @PutMapping("/sort")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<Void> batchSort(
            @RequestBody @Validated List<ArchiveFileSortDTO> items) {
        fileService.batchSort(items);
        return Result.success();
    }

    // ==================== 电子原文 ====================

    /**
     * POST /api/file/{recordId}/original?year=2026
     * 上传电子原文（仅限草稿态且立卷人本人）。
     */
    @PostMapping("/{recordId}/original")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<String> uploadOriginal(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestParam("file") MultipartFile file) {
        return Result.success(fileService.uploadOriginal(recordId, year, file));
    }

    /**
     * GET /api/file/{recordId}/original?year=2026
     * 下载电子原文（草稿态仅限立卷人本人，权限同详情接口）。
     */
    @GetMapping("/{recordId}/original")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public ResponseEntity<Resource> downloadOriginal(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year) {
        // getFileDetail 内含草稿水平越权校验
        ArchiveFileVO detail = fileService.getFileDetail(recordId, year);
        Resource resource = fileService.loadOriginal(detail.getOriginalPath());
        // 存储名为 {recordId}_{原始文件名}，下载时还原原始文件名
        String stored = detail.getOriginalPath();
        String downloadName = stored != null && stored.startsWith(recordId + "_")
                ? stored.substring((recordId + "_").length()) : stored;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + UriUtils.encode(downloadName, StandardCharsets.UTF_8))
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
