package com.laikuang.archive.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.laikuang.archive.system.domain.entity.SysDictItem;
import com.laikuang.archive.system.domain.vo.DictItemVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysDictItemMapper extends BaseMapper<SysDictItem> {

    /** 查询所有启用状态的字典项（父字典和字典项均 status=1），用于前端一次性加载下拉缓存 */
    List<DictItemVO> selectAllActiveItems();

    /** 按 dictCode 查询启用状态的字典项 */
    List<DictItemVO> selectActiveItemsByCode(@Param("dictCode") String dictCode);
}
