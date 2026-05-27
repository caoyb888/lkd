package com.laikuang.archive.volume.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeUpdateDTO;
import com.laikuang.archive.volume.domain.vo.ArchiveNoPreviewVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeImportResultVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeListVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import org.springframework.web.multipart.MultipartFile;

/**
 * 案卷级目录业务接口。
 */
public interface ArchiveVolumeService {

    /**
     * 新建案卷（默认草稿状态）。
     */
    ArchiveVolumeVO createVolume(ArchiveVolumeSaveDTO dto);

    /**
     * 更新案卷（仅限草稿态且立卷人本人）。
     */
    void updateVolume(Long recordId, String year, ArchiveVolumeUpdateDTO dto);

    /**
     * 删除案卷（仅限草稿态且立卷人本人，逻辑删除）。
     */
    void deleteVolume(Long recordId, String year);

    /**
     * 提交审核（草稿 → 待审核）。
     */
    void submitForReview(Long recordId, String year);

    /**
     * 审核通过（待审核 → 待确认）。
     */
    void reviewPass(Long recordId, String year, String opinion);

    /**
     * 审核驳回（待审核 → 草稿）。
     */
    void reviewReject(Long recordId, String year, String opinion);

    /**
     * 确认归档（待确认 → 已正式归档）。
     */
    void archiveConfirm(Long recordId, String year, String opinion);

    /**
     * 退回上一级（待确认 → 待审核）。
     */
    void archiveBack(Long recordId, String year, String opinion);

    /**
     * 案卷详情。
     */
    ArchiveVolumeVO getVolumeDetail(Long recordId, String year);

    /**
     * 分页查询案卷（多维组合筛选）。
     * status 默认为 3（已正式归档），传入 -1 表示查询全部状态。
     */
    IPage<ArchiveVolumeListVO> pageVolumes(PageQuery pageQuery, String year,
                                           String fondsNo, String categoryL1,
                                           String categoryL2, String categoryL3,
                                           String deviceCode, Integer status,
                                           String securityLevel, Integer inStock,
                                           String archiveNo, String keyword);

    /**
     * 分页查询当前用户的草稿箱（status = 0）。
     */
    IPage<ArchiveVolumeListVO> pageDrafts(PageQuery pageQuery);

    /**
     * 预览档号：根据分类组合查询当前最大案卷号并 +1 拼接返回。
     */
    ArchiveNoPreviewVO previewArchiveNo(String year, String fondsNo,
                                        String categoryL1, String categoryL2,
                                        String categoryL3, String deviceCode);

    /**
     * Excel 批量导入案卷目录。
     * 严格校验后全单入库，状态自动初始化为待审核（status = 1）。
     * 任一行校验失败即全单回滚，并返回精确到【第X行第Y列】的错误信息。
     */
    ArchiveVolumeImportResultVO importVolumes(org.springframework.web.multipart.MultipartFile file);

    // ==================== 销毁审批（archive:destroy）====================

    /**
     * 提交销毁申请（仅限已正式归档案卷）。
     * 写入审批日志，等待公司领导终审。
     */
    void applyDestroy(Long recordId, String year, String opinion);

    /**
     * 审批通过销毁（公司领导）。
     * 执行逻辑软删除：destroy_flag = 1。
     */
    void approveDestroy(Long recordId, String year, String opinion);

    /**
     * 审批驳回销毁（公司领导）。
     */
    void rejectDestroy(Long recordId, String year, String opinion);

    /**
     * 根据档号查询案卷（档号全局唯一，优先查最近年度）。
     */
    ArchiveVolumeVO getVolumeByArchiveNo(String archiveNo);

    /**
     * 分页查询待销毁审批的案卷（pending_destroy = 1）。
     */
    IPage<ArchiveVolumeListVO> pageDestroyPending(PageQuery pageQuery, String keyword);
}
