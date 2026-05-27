package com.laikuang.archive.volume.domain.converter;

import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeUpdateDTO;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.domain.vo.ArchiveFileBriefVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeListVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

/**
 * 案卷级目录 MapStruct 转换器。
 */
@Mapper(componentModel = "spring")
public interface ArchiveVolumeConverter {

    @Mapping(target = "recordId", ignore = true)
    @Mapping(target = "volumeNo", ignore = true)
    @Mapping(target = "archiveNo", ignore = true)
    @Mapping(target = "inStock", ignore = true)
    @Mapping(target = "registerDate", ignore = true)
    @Mapping(target = "destroyFlag", ignore = true)
    @Mapping(target = "borrowedCopies", ignore = true)
    @Mapping(target = "sourceFile", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "compiler", ignore = true)
    @Mapping(target = "compilerId", ignore = true)
    ArchiveVolume toEntity(ArchiveVolumeSaveDTO dto);

    @Mapping(target = "recordId", ignore = true)
    @Mapping(target = "year", ignore = true)
    @Mapping(target = "volumeNo", ignore = true)
    @Mapping(target = "archiveNo", ignore = true)
    @Mapping(target = "inStock", ignore = true)
    @Mapping(target = "registerDate", ignore = true)
    @Mapping(target = "destroyFlag", ignore = true)
    @Mapping(target = "borrowedCopies", ignore = true)
    @Mapping(target = "sourceFile", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "compiler", ignore = true)
    @Mapping(target = "compilerId", ignore = true)
    void updateEntity(@MappingTarget ArchiveVolume entity, ArchiveVolumeUpdateDTO dto);

    ArchiveVolumeVO toVO(ArchiveVolume entity);

    ArchiveVolumeListVO toListVO(ArchiveVolume entity);

    List<ArchiveVolumeListVO> toListVO(List<ArchiveVolume> list);

    ArchiveFileBriefVO toFileBriefVO(ArchiveFile entity);

    List<ArchiveFileBriefVO> toFileBriefVO(List<ArchiveFile> list);
}
