package com.laikuang.archive.borrow.domain.converter;

import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowListVO;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowVO;
import org.mapstruct.Mapper;

import java.util.List;

/**
 * 借阅单 MapStruct 转换器。
 */
@Mapper(componentModel = "spring")
public interface ArchiveBorrowConverter {

    ArchiveBorrowVO toVO(ArchiveBorrow entity);

    ArchiveBorrowListVO toListVO(ArchiveBorrow entity);

    List<ArchiveBorrowListVO> toListVO(List<ArchiveBorrow> list);
}
