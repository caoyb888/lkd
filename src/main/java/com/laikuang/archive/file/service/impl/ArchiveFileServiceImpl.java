package com.laikuang.archive.file.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.file.domain.converter.ArchiveFileConverter;
import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.domain.dto.ArchiveFileUpdateDTO;
import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.file.domain.vo.ArchiveFileListVO;
import com.laikuang.archive.file.domain.vo.ArchiveFileVO;
import com.laikuang.archive.file.mapper.ArchiveFileMapper;
import com.laikuang.archive.file.service.ArchiveFileService;
import com.laikuang.archive.system.domain.vo.DictItemVO;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.DictService;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.MDC;

/**
 * 文件级明细目录业务实现。
 *
 * 安全关键点：
 *   1. 文件必须关联到已存在的案卷；若案卷为草稿态，仅限该案卷的立卷人添加卷内文件。
 *   2. 修改/删除文件前校验 status = 0 且 compilerId = currentUserId，防止水平越权。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveFileServiceImpl implements ArchiveFileService {

    private final ArchiveFileMapper   fileMapper;
    private final ArchiveVolumeMapper volumeMapper;
    private final SysUserMapper       userMapper;
    private final DictService         dictService;
    private final ArchiveFileConverter converter;

    /** 电子原文存储目录（lkda.upload-dir，默认 ./uploads） */
    @Value("${lkda.upload-dir:./uploads}")
    private String uploadDir;

    // ==================== 核心 CRUD ====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveFileVO createFile(ArchiveFileSaveDTO dto) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        String nickname = getNickname(currentUserId);

        // 1. 校验关联案卷存在性（档号全库唯一，volume_no 在迁移数据中大量重复，不可作关联条件）
        ArchiveVolume volume = volumeMapper.selectOne(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getArchiveNo, dto.getArchiveNo())
                        .eq(ArchiveVolume::getYear, dto.getYear()));
        if (volume == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR,
                    "关联案卷不存在，请确认档号及年度");
        }

        // 2. 若案卷为草稿，仅限立卷人本人添加文件
        if (Integer.valueOf(0).equals(volume.getStatus())
                && !currentUserId.equals(volume.getCompilerId())) {
            throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL,
                    "无权向他人草稿案卷添加文件");
        }
        // 若案卷已正式归档，S2-01 阶段普通用户暂不允许补录（后续管理员补录在 Sprint 3 扩展）
        if (Integer.valueOf(3).equals(volume.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID,
                    "已正式归档案卷暂不支持补录文件");
        }

        ArchiveFile file = converter.toEntity(dto);
        file.setStatus(0);            // 草稿
        file.setInStock(1);           // 在库
        file.setCopies(file.getCopies() == null ? 1 : file.getCopies());
        file.setBorrowedCopies(0);
        file.setCompilerId(currentUserId);

        fileMapper.insert(file);

        log.info("[AUDIT-FILE] 用户创建文件草稿，userId={}, volumeNo={}, year={}, fileTitle={}, ip={}, traceId={}",
                currentUserId, dto.getVolumeNo(), dto.getYear(), dto.getFileTitle(), MDC.get("clientIP"), MDC.get("traceId"));
        return getFileDetail(file.getRecordId(), dto.getYear());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateFile(Long recordId, String year, ArchiveFileUpdateDTO dto) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveFile file = selectByRecordIdAndYear(recordId, year);
        assertFileEditable(file, currentUserId);

        converter.updateEntity(file, dto);
        fileMapper.update(file, new LambdaQueryWrapper<ArchiveFile>()
                .eq(ArchiveFile::getRecordId, recordId)
                .eq(ArchiveFile::getYear, year));

        log.info("[AUDIT-FILE] 用户更新文件草稿，userId={}, recordId={}, year={}, ip={}, traceId={}",
                currentUserId, recordId, year, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteFile(Long recordId, String year) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveFile file = selectByRecordIdAndYear(recordId, year);
        assertFileEditable(file, currentUserId);

        fileMapper.delete(new LambdaQueryWrapper<ArchiveFile>()
                .eq(ArchiveFile::getRecordId, recordId)
                .eq(ArchiveFile::getYear, year));

        log.info("[AUDIT-FILE] 用户删除文件草稿，userId={}, recordId={}, year={}, ip={}, traceId={}",
                currentUserId, recordId, year, MDC.get("clientIP"), MDC.get("traceId"));
    }

    // ==================== 电子原文 ====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String uploadOriginal(Long recordId, String year, MultipartFile multipart) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveFile file = selectByRecordIdAndYear(recordId, year);
        assertFileEditable(file, currentUserId);

        if (multipart == null || multipart.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "上传文件不能为空");
        }
        String originalName = StringUtils.cleanPath(
                multipart.getOriginalFilename() == null ? "original" : multipart.getOriginalFilename());
        // 存储文件名：{recordId}_{原始文件名}，避免重名覆盖
        String storedName = recordId + "_" + originalName;
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(storedName).normalize();
            if (!target.startsWith(dir)) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "非法文件名");
            }
            multipart.transferTo(target);
        } catch (IOException e) {
            throw new UncheckedIOException("电子原文保存失败", e);
        }

        file.setOriginalPath(storedName);
        fileMapper.update(file, new LambdaQueryWrapper<ArchiveFile>()
                .eq(ArchiveFile::getRecordId, recordId)
                .eq(ArchiveFile::getYear, year));

        log.info("[AUDIT-FILE] 用户上传电子原文，userId={}, recordId={}, year={}, fileName={}, ip={}, traceId={}",
                currentUserId, recordId, year, storedName, MDC.get("clientIP"), MDC.get("traceId"));
        return storedName;
    }

    @Override
    public Resource loadOriginal(String originalPath) {
        if (!StringUtils.hasText(originalPath)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "该文件暂无电子原文");
        }
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path target = dir.resolve(originalPath).normalize();
        if (!target.startsWith(dir) || !Files.exists(target)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "电子原文不存在");
        }
        return new FileSystemResource(target);
    }

    // ==================== 查询 ====================

    @Override
    public ArchiveFileVO getFileDetail(Long recordId, String year) {
        ArchiveFile file = selectByRecordIdAndYear(recordId, year);
        Long currentUserId = StpUtil.getLoginIdAsLong();

        if (Integer.valueOf(0).equals(file.getStatus())
                && !currentUserId.equals(file.getCompilerId())) {
            throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL, "无权查看该草稿文件");
        }
        return converter.toVO(file);
    }

    @Override
    public IPage<ArchiveFileListVO> pageFiles(PageQuery pageQuery, String year,
                                              String fondsNo, String categoryL1,
                                              String categoryL2, String categoryL3,
                                              String volumeNo, String archiveNo,
                                              Integer status, String securityLevel,
                                              Integer inStock, String keyword) {
        Page<ArchiveFile> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        // status 默认 3（已归档），-1 表示不过滤状态
        Integer targetStatus = (status == null) ? 3 : (status == -1 ? null : status);

        LambdaQueryWrapper<ArchiveFile> wrapper = new LambdaQueryWrapper<ArchiveFile>()
                .eq(targetStatus != null, ArchiveFile::getStatus, targetStatus)
                .eq(StringUtils.hasText(year), ArchiveFile::getYear, year)
                .eq(StringUtils.hasText(fondsNo), ArchiveFile::getFondsNo, fondsNo)
                .eq(StringUtils.hasText(categoryL1), ArchiveFile::getCategoryL1, categoryL1)
                .eq(StringUtils.hasText(categoryL2), ArchiveFile::getCategoryL2, categoryL2)
                .eq(StringUtils.hasText(categoryL3), ArchiveFile::getCategoryL3, categoryL3)
                .eq(StringUtils.hasText(volumeNo), ArchiveFile::getVolumeNo, volumeNo)
                .eq(StringUtils.hasText(archiveNo), ArchiveFile::getArchiveNo, archiveNo)
                .eq(StringUtils.hasText(securityLevel), ArchiveFile::getSecurityLevel, securityLevel)
                .eq(inStock != null, ArchiveFile::getInStock, inStock)
                .and(StringUtils.hasText(keyword), w -> w
                        .like(ArchiveFile::getFileTitle, keyword)
                        .or()
                        .like(ArchiveFile::getKeywords, keyword))
                .orderByDesc(ArchiveFile::getCreatedAt);

        IPage<ArchiveFileListVO> result = fileMapper.selectPage(page, wrapper).convert(converter::toListVO);
        fillSecurityLabels(result.getRecords());
        return result;
    }

    @Override
    public IPage<ArchiveFileListVO> pageDraftFiles(PageQuery pageQuery) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        Page<ArchiveFile> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveFile> wrapper = new LambdaQueryWrapper<ArchiveFile>()
                .eq(ArchiveFile::getStatus, 0)
                .eq(ArchiveFile::getCompilerId, currentUserId)
                .orderByDesc(ArchiveFile::getCreatedAt);
        IPage<ArchiveFileListVO> result = fileMapper.selectPage(page, wrapper).convert(converter::toListVO);
        fillSecurityLabels(result.getRecords());
        return result;
    }

    @Override
    public List<ArchiveFileListVO> listFilesByVolume(String archiveNo, String year) {
        // 关联键使用档号（全库唯一）；volume_no 在迁移数据中大量重复，不能作为关联条件
        List<ArchiveFile> list = fileMapper.selectList(
                new LambdaQueryWrapper<ArchiveFile>()
                        .eq(ArchiveFile::getArchiveNo, archiveNo)
                        .eq(ArchiveFile::getYear, year)
                        .eq(ArchiveFile::getDestroyFlag, 0)
                        .orderByAsc(ArchiveFile::getSeqNo));
        List<ArchiveFileListVO> result = converter.toListVO(list);
        fillSecurityLabels(result);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchSort(List<com.laikuang.archive.file.domain.dto.ArchiveFileSortDTO> items) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        for (com.laikuang.archive.file.domain.dto.ArchiveFileSortDTO item : items) {
            ArchiveFile file = selectByRecordIdAndYear(item.getRecordId(), item.getYear());
            assertFileEditable(file, currentUserId);

            ArchiveFile update = new ArchiveFile();
            update.setSeqNo(item.getSeqNo());
            fileMapper.update(update, new LambdaQueryWrapper<ArchiveFile>()
                    .eq(ArchiveFile::getRecordId, item.getRecordId())
                    .eq(ArchiveFile::getYear, item.getYear()));
        }

        log.info("[AUDIT-FILE] 用户批量排序文件，userId={}, count={}, ip={}, traceId={}",
                currentUserId, items.size(), MDC.get("clientIP"), MDC.get("traceId"));
    }

    // ==================== 内部工具 ====================

    private ArchiveFile selectByRecordIdAndYear(Long recordId, String year) {
        ArchiveFile file = fileMapper.selectOne(
                new LambdaQueryWrapper<ArchiveFile>()
                        .eq(ArchiveFile::getRecordId, recordId)
                        .eq(ArchiveFile::getYear, year));
        if (file == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "文件不存在");
        }
        return file;
    }

    private void assertFileEditable(ArchiveFile file, Long currentUserId) {
        if (!Integer.valueOf(0).equals(file.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID,
                    "仅草稿状态支持修改/删除");
        }
        if (!currentUserId.equals(file.getCompilerId())) {
            throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL,
                    "无权操作他人创建的草稿文件");
        }
    }

    private String getNickname(Long userId) {
        var user = userMapper.selectById(userId);
        return user != null ? user.getNickname() : "";
    }

    /**
     * 为文件列表 VO 填充密级的字典中文标签。
     */
    private void fillSecurityLabels(List<ArchiveFileListVO> list) {
        if (list == null || list.isEmpty()) {
            return;
        }
        Map<String, String> securityMap = dictService.getActiveItemsByCode("security_level").stream()
                .collect(Collectors.toMap(DictItemVO::getItemValue, DictItemVO::getItemLabel, (a, b) -> a));
        for (ArchiveFileListVO vo : list) {
            if (vo.getSecurityLevel() != null) {
                vo.setSecurityLevelLabel(securityMap.getOrDefault(vo.getSecurityLevel(), vo.getSecurityLevel()));
            }
        }
    }
}
