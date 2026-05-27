package com.laikuang.archive.volume.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.approve.domain.dto.ArchiveApproveActionDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeUpdateDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveNoPreviewVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeImportResultVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeListVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeImportDTO;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import com.alibaba.excel.EasyExcel;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
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

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/**
 * 案卷级目录管理接口。
 *
 * <pre>
 * 权限说明：
 *   archive:create — 新建/编辑/删除草稿、提交审核、档号预览
 *   archive:view   — 查看已正式归档案卷详情及列表
 * </pre>
 */
@Validated
@RestController
@RequestMapping("/volume")
@RequiredArgsConstructor
public class ArchiveVolumeController {

    private final ArchiveVolumeService volumeService;

    // ==================== 草稿操作（archive:create）====================

    /**
     * POST /api/volume
     * 新建案卷（默认进入草稿状态 status = 0）。
     */
    @PostMapping
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<ArchiveVolumeVO> createVolume(@RequestBody @Validated ArchiveVolumeSaveDTO dto) {
        return Result.success(volumeService.createVolume(dto));
    }

    /**
     * PUT /api/volume/{recordId}?year=2026
     * 更新案卷（仅限草稿态）。
     */
    @PutMapping("/{recordId}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<Void> updateVolume(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveVolumeUpdateDTO dto) {
        volumeService.updateVolume(recordId, year, dto);
        return Result.success();
    }

    /**
     * DELETE /api/volume/{recordId}?year=2026
     * 删除案卷（仅限草稿态，逻辑删除）。
     */
    @DeleteMapping("/{recordId}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<Void> deleteVolume(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year) {
        volumeService.deleteVolume(recordId, year);
        return Result.success();
    }

    /**
     * PUT /api/volume/{recordId}/submit?year=2026
     * 提交审核（草稿 → 待审核）。
     */
    @PutMapping("/{recordId}/submit")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<Void> submitForReview(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year) {
        volumeService.submitForReview(recordId, year);
        return Result.success();
    }

    // ==================== 审批流转（archive:manage）====================

    /**
     * PUT /api/volume/{recordId}/review-pass?year=2026
     * 审核通过（待审核 → 待确认）。
     */
    @PutMapping("/{recordId}/review-pass")
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public Result<Void> reviewPass(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveApproveActionDTO dto) {
        volumeService.reviewPass(recordId, year, dto.getOpinion());
        return Result.success();
    }

    /**
     * PUT /api/volume/{recordId}/review-reject?year=2026
     * 审核驳回（待审核 → 草稿）。
     */
    @PutMapping("/{recordId}/review-reject")
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public Result<Void> reviewReject(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveApproveActionDTO dto) {
        volumeService.reviewReject(recordId, year, dto.getOpinion());
        return Result.success();
    }

    /**
     * PUT /api/volume/{recordId}/archive-confirm?year=2026
     * 确认归档（待确认 → 已正式归档）。
     */
    @PutMapping("/{recordId}/archive-confirm")
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public Result<Void> archiveConfirm(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveApproveActionDTO dto) {
        volumeService.archiveConfirm(recordId, year, dto.getOpinion());
        return Result.success();
    }

    /**
     * PUT /api/volume/{recordId}/archive-back?year=2026
     * 退回上一级（待确认 → 待审核）。
     */
    @PutMapping("/{recordId}/archive-back")
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public Result<Void> archiveBack(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveApproveActionDTO dto) {
        volumeService.archiveBack(recordId, year, dto.getOpinion());
        return Result.success();
    }

    // ==================== 销毁审批（archive:destroy）====================

    /**
     * PUT /api/volume/{recordId}/destroy-apply?year=2026
     * 提交销毁申请（仅限已正式归档案卷）。
     */
    @PutMapping("/{recordId}/destroy-apply")
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public Result<Void> applyDestroy(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveApproveActionDTO dto) {
        volumeService.applyDestroy(recordId, year, dto.getOpinion());
        return Result.success();
    }

    /**
     * PUT /api/volume/{recordId}/destroy-approve?year=2026
     * 审批通过销毁（公司领导）。
     */
    @PutMapping("/{recordId}/destroy-approve")
    @SaCheckPermission(PermissionConstants.ARCHIVE_DESTROY)
    public Result<Void> approveDestroy(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveApproveActionDTO dto) {
        volumeService.approveDestroy(recordId, year, dto.getOpinion());
        return Result.success();
    }

    /**
     * PUT /api/volume/{recordId}/destroy-reject?year=2026
     * 审批驳回销毁（公司领导）。
     */
    @PutMapping("/{recordId}/destroy-reject")
    @SaCheckPermission(PermissionConstants.ARCHIVE_DESTROY)
    public Result<Void> rejectDestroy(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year,
            @RequestBody @Validated ArchiveApproveActionDTO dto) {
        volumeService.rejectDestroy(recordId, year, dto.getOpinion());
        return Result.success();
    }

    /**
     * GET /api/volume/archive-no/preview
     * 档号预览：根据分类组合返回推荐案卷号及完整档号。
     */
    @GetMapping("/archive-no/preview")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<ArchiveNoPreviewVO> previewArchiveNo(
            @RequestParam @NotBlank String year,
            @RequestParam @NotBlank String fondsNo,
            @RequestParam @NotBlank String categoryL1,
            @RequestParam(required = false) String categoryL2,
            @RequestParam(required = false) String categoryL3,
            @RequestParam(required = false) String deviceCode) {
        return Result.success(volumeService.previewArchiveNo(year, fondsNo, categoryL1,
                categoryL2, categoryL3, deviceCode));
    }

    /**
     * POST /api/volume/import
     * Excel 批量导入案卷目录（严格格式校验，全单回滚）。
     * 导入成功后状态自动初始化为待审核（status = 1）。
     */
    @PostMapping("/import")
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public Result<ArchiveVolumeImportResultVO> importVolumes(
            @RequestParam("file") MultipartFile file) {
        return Result.success(volumeService.importVolumes(file));
    }

    /**
     * GET /api/volume/import-template
     * 下载案卷目录 Excel 导入模板（仅表头 + 一行示例数据）。
     */
    @GetMapping("/import-template")
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        String fileName = URLEncoder.encode("案卷目录导入模板", StandardCharsets.UTF_8)
                .replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");

        // 一行示例数据（帮助用户理解填写格式）
        ArchiveVolumeImportDTO example = new ArchiveVolumeImportDTO();
        example.setYear("2026");
        example.setFondsNo("01");
        example.setCategoryName("文书档案");
        example.setCategoryL1("8");
        example.setCategoryL2("01");
        example.setCategoryL3("0101");
        example.setDeviceCode("01");
        example.setVolumeTitle("示例案卷题名（请按实际填写）");
        example.setFileCount(10);
        example.setTotalPages(150);
        example.setCompileUnit("编制单位示例");
        example.setCompileDate("2026-01-15");
        example.setRetentionPeriod("30_years");
        example.setSecurityLevel("internal");
        example.setCompiler("张三");
        example.setCompileDateActual("2026-01-15");
        example.setReviewer("李四");
        example.setInspectDate("2026-02-01");
        example.setArchiveDate("2026-03-01");
        example.setNotes("备考说明示例");
        example.setRemark("备注示例");
        example.setCategoryCode("分类号示例");
        example.setLocationNo("A-01-02");
        example.setCopies(2);
        example.setOrganization("莱矿档案室");

        EasyExcel.write(response.getOutputStream(), ArchiveVolumeImportDTO.class)
                .sheet("案卷目录")
                .doWrite(Collections.singletonList(example));
    }

    // ==================== 查询（archive:view / archive:create）====================

    /**
     * GET /api/volume/{recordId}?year=2026
     * 案卷详情（含卷内文件列表）。
     * 草稿态仅限立卷人本人查看。
     */
    @GetMapping("/{recordId}")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<ArchiveVolumeVO> getVolumeDetail(
            @PathVariable Long recordId,
            @RequestParam @NotBlank(message = "年度不能为空") String year) {
        return Result.success(volumeService.getVolumeDetail(recordId, year));
    }

    /**
     * GET /api/volume/page?current=1&pageSize=10&year=2026&categoryL1=8&keyword=xxx
     * 分页查询案卷（多维组合筛选，status 默认 3，传 -1 查全部）。
     */
    @GetMapping("/page")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<IPage<ArchiveVolumeListVO>> pageVolumes(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String fondsNo,
            @RequestParam(required = false) String categoryL1,
            @RequestParam(required = false) String categoryL2,
            @RequestParam(required = false) String categoryL3,
            @RequestParam(required = false) String deviceCode,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String securityLevel,
            @RequestParam(required = false) Integer inStock,
            @RequestParam(required = false) String archiveNo,
            @RequestParam(required = false) String keyword) {
        return Result.success(volumeService.pageVolumes(pageQuery, year, fondsNo,
                categoryL1, categoryL2, categoryL3, deviceCode, status,
                securityLevel, inStock, archiveNo, keyword));
    }

    /**
     * GET /api/volume/draft-page?current=1&pageSize=10
     * 分页查询当前用户的草稿箱（status = 0）。
     */
    @GetMapping("/draft-page")
    @SaCheckPermission(PermissionConstants.ARCHIVE_CREATE)
    public Result<IPage<ArchiveVolumeListVO>> pageDrafts(@Valid PageQuery pageQuery) {
        return Result.success(volumeService.pageDrafts(pageQuery));
    }

    /**
     * GET /api/volume/destroy-pending-page?current=1&pageSize=10&keyword=xxx
     * 分页查询待销毁审批的案卷（pending_destroy = 1）。
     */
    @GetMapping("/destroy-pending-page")
    @SaCheckPermission(PermissionConstants.ARCHIVE_DESTROY)
    public Result<IPage<ArchiveVolumeListVO>> pageDestroyPending(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String keyword) {
        return Result.success(volumeService.pageDestroyPending(pageQuery, keyword));
    }

    /**
     * GET /api/volume/by-archive-no?archiveNo=xxx
     * 根据档号查询案卷（用于借阅申请前查询可借数量）。
     */
    @GetMapping("/by-archive-no")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<ArchiveVolumeVO> getVolumeByArchiveNo(
            @RequestParam @NotBlank(message = "档号不能为空") String archiveNo) {
        return Result.success(volumeService.getVolumeByArchiveNo(archiveNo));
    }
}
