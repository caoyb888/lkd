package com.laikuang.archive.file.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.domain.dto.ArchiveFileUpdateDTO;
import com.laikuang.archive.file.domain.vo.ArchiveFileListVO;
import com.laikuang.archive.file.domain.vo.ArchiveFileVO;

import java.util.List;

/**
 * 文件级明细目录业务接口。
 */
public interface ArchiveFileService {

    /**
     * 新建文件（默认草稿状态）。
     */
    ArchiveFileVO createFile(ArchiveFileSaveDTO dto);

    /**
     * 更新文件（仅限草稿态且立卷人本人）。
     */
    void updateFile(Long recordId, String year, ArchiveFileUpdateDTO dto);

    /**
     * 删除文件（仅限草稿态且立卷人本人，逻辑删除）。
     */
    void deleteFile(Long recordId, String year);

    /**
     * 文件详情。
     */
    ArchiveFileVO getFileDetail(Long recordId, String year);

    /**
     * 分页查询文件（多维组合筛选）。
     * status 默认为 3（已正式归档），传入 -1 表示查询全部状态。
     */
    IPage<ArchiveFileListVO> pageFiles(PageQuery pageQuery, String year,
                                       String fondsNo, String categoryL1,
                                       String categoryL2, String categoryL3,
                                       String volumeNo, String archiveNo,
                                       Integer status, String securityLevel,
                                       Integer inStock, String keyword);

    /**
     * 查询当前用户的草稿文件。
     */
    IPage<ArchiveFileListVO> pageDraftFiles(PageQuery pageQuery);

    /**
     * 按案卷号查询卷内文件列表（按 seq_no 排序）。
     */
    List<ArchiveFileListVO> listFilesByVolume(String archiveNo, String year);

    /**
     * 批量更新卷内文件顺序号（拖拽排序）。
     */
    void batchSort(List<com.laikuang.archive.file.domain.dto.ArchiveFileSortDTO> items);

    /**
     * 上传电子原文（仅限草稿态且立卷人本人）。
     * @return 存储后的 original_path 值
     */
    String uploadOriginal(Long recordId, String year,
                          org.springframework.web.multipart.MultipartFile file);

    /**
     * 按 original_path 加载电子原文资源（下载用，权限由 getFileDetail 先行校验）。
     */
    org.springframework.core.io.Resource loadOriginal(String originalPath);
}
