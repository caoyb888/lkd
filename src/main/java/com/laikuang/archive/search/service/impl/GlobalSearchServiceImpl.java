package com.laikuang.archive.search.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.file.domain.converter.ArchiveFileConverter;
import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.file.mapper.ArchiveFileMapper;
import com.laikuang.archive.search.domain.vo.GlobalSearchVO;
import com.laikuang.archive.search.service.GlobalSearchService;
import com.laikuang.archive.volume.domain.converter.ArchiveVolumeConverter;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 全局模糊检索业务实现。
 *
 * <p>性能说明：数据量在十万级以下，直接使用 MySQL LIKE 配合索引字段先行过滤，
 * 无需引入 Elasticsearch。精确筛选条件（year、category_l1）优先命中复合索引
 * idx_composite_search，避免全表扫描。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GlobalSearchServiceImpl implements GlobalSearchService {

    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveFileMapper fileMapper;
    private final ArchiveVolumeConverter volumeConverter;
    private final ArchiveFileConverter fileConverter;

    @Override
    public GlobalSearchVO globalSearch(String keyword, String year, String categoryL1) {
        if (!StringUtils.hasText(keyword)) {
            throw new BusinessException(ResultCode.PARAM_MISSING, "检索关键词不能为空");
        }

        String likePattern = "%" + keyword + "%";

        // 1. 检索案卷：匹配案卷题名（status = 3 且未销毁）
        LambdaQueryWrapper<ArchiveVolume> volumeWrapper = new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getStatus, 3)
                .eq(StringUtils.hasText(year), ArchiveVolume::getYear, year)
                .eq(StringUtils.hasText(categoryL1), ArchiveVolume::getCategoryL1, categoryL1)
                .and(w -> w.like(ArchiveVolume::getVolumeTitle, keyword)
                           .or()
                           .like(ArchiveVolume::getArchiveNo, keyword))
                .orderByDesc(ArchiveVolume::getCreatedAt);

        // 用分页插件截取前 50 条（方言无关，兼容 MySQL/SQL Server）
        List<ArchiveVolume> volumeList = volumeMapper.selectPage(new Page<>(1, 50), volumeWrapper).getRecords();

        // 2. 检索文件：匹配文件标题或主题词（status = 3 且未销毁）
        LambdaQueryWrapper<ArchiveFile> fileWrapper = new LambdaQueryWrapper<ArchiveFile>()
                .eq(ArchiveFile::getStatus, 3)
                .eq(StringUtils.hasText(year), ArchiveFile::getYear, year)
                .eq(StringUtils.hasText(categoryL1), ArchiveFile::getCategoryL1, categoryL1)
                .and(w -> w.like(ArchiveFile::getFileTitle, keyword)
                           .or()
                           .like(ArchiveFile::getKeywords, keyword))
                .orderByDesc(ArchiveFile::getCreatedAt);

        List<ArchiveFile> fileList = fileMapper.selectPage(new Page<>(1, 50), fileWrapper).getRecords();

        GlobalSearchVO vo = new GlobalSearchVO();
        vo.setVolumes(volumeConverter.toListVO(volumeList));
        vo.setFiles(fileConverter.toListVO(fileList));

        log.info("[SEARCH-GLOBAL] 用户全局检索，keyword={}, year={}, categoryL1={}, " +
                 "匹配案卷数={}, 匹配文件数={}",
                keyword, year, categoryL1, volumeList.size(), fileList.size());
        return vo;
    }
}
