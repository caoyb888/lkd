package com.laikuang.archive.volume.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 案卷级主目录 Mapper。
 * 基础 CRUD 由 MyBatis-Plus BaseMapper 提供。
 * 复杂多表联查 SQL 在对应 ArchiveVolumeMapper.xml 中维护。
 */
@Mapper
public interface ArchiveVolumeMapper extends BaseMapper<ArchiveVolume> {

    /**
     * 获取当前分类下最大案卷号（用于档号自动生成 +1 逻辑）。
     * 由 Service 层调用，结合前缀拼接生成新档号后返回前端预览，
     * 正式归档时再次校验唯一索引 uk_archive_no_year。
     */
    String selectMaxVolumeNo(@Param("year")       String year,
                             @Param("fondsNo")    String fondsNo,
                             @Param("categoryL1") String categoryL1,
                             @Param("categoryL2") String categoryL2,
                             @Param("categoryL3") String categoryL3,
                             @Param("deviceCode") String deviceCode);
}
