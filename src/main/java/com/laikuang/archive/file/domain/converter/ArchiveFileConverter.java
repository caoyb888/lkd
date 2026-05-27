package com.laikuang.archive.file.domain.converter;

import com.laikuang.archive.file.domain.dto.ArchiveFileSaveDTO;
import com.laikuang.archive.file.domain.dto.ArchiveFileUpdateDTO;
import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.file.domain.vo.ArchiveFileListVO;
import com.laikuang.archive.file.domain.vo.ArchiveFileVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

/**
 * 文件级目录 MapStruct 转换器。
 */
@Mapper(componentModel = "spring")
public interface ArchiveFileConverter {

    @Mapping(target = "recordId", ignore = true)
    @Mapping(target = "inStock", ignore = true)
    @Mapping(target = "destroyFlag", ignore = true)
    @Mapping(target = "borrowedCopies", ignore = true)
    @Mapping(target = "sourceFile", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "compilerId", ignore = true)
    ArchiveFile toEntity(ArchiveFileSaveDTO dto);

    @Mapping(target = "recordId", ignore = true)
    @Mapping(target = "year", ignore = true)
    @Mapping(target = "volumeNo", ignore = true)
    @Mapping(target = "archiveNo", ignore = true)
    @Mapping(target = "inStock", ignore = true)
    @Mapping(target = "destroyFlag", ignore = true)
    @Mapping(target = "borrowedCopies", ignore = true)
    @Mapping(target = "sourceFile", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "compilerId", ignore = true)
    void updateEntity(@MappingTarget ArchiveFile entity, ArchiveFileUpdateDTO dto);

    ArchiveFileVO toVO(ArchiveFile entity);

    ArchiveFileListVO toListVO(ArchiveFile entity);

    List<ArchiveFileListVO> toListVO(List<ArchiveFile> list);
}
