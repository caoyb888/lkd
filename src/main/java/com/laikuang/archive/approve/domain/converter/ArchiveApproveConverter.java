package com.laikuang.archive.approve.domain.converter;

import com.laikuang.archive.approve.domain.entity.ArchiveApproveLog;
import com.laikuang.archive.approve.domain.vo.ArchiveApproveLogVO;
import org.mapstruct.Mapper;

import java.util.List;

/**
 * 审批日志 MapStruct 转换器。
 */
@Mapper(componentModel = "spring")
public interface ArchiveApproveConverter {

    ArchiveApproveLogVO toVO(ArchiveApproveLog entity);

    List<ArchiveApproveLogVO> toVO(List<ArchiveApproveLog> list);
}
