package com.laikuang.archive.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.system.domain.dto.CreateDictDTO;
import com.laikuang.archive.system.domain.dto.CreateDictItemDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictItemDTO;
import com.laikuang.archive.system.domain.vo.DictItemVO;
import com.laikuang.archive.system.domain.vo.DictVO;

import java.util.List;
import java.util.Map;

public interface DictService {

    // ---- 字典主表 ----

    /** 分页查询字典列表（可按名称 / 编码模糊搜索） */
    IPage<DictVO> pageDicts(PageQuery pageQuery, String keyword);

    /** 查询指定字典及其所有字典项 */
    DictVO getDictDetail(Long dictId);

    /** 创建字典（dictCode 全局唯一） */
    void createDict(CreateDictDTO dto);

    /** 更新字典名称 / 状态 */
    void updateDict(Long dictId, UpdateDictDTO dto);

    /**
     * 删除字典，同时级联删除该字典下所有字典项。
     * 仅允许删除已停用（status=0）的字典，防止误删正在使用的配置。
     */
    void deleteDict(Long dictId);

    // ---- 字典项 ----

    /** 创建字典项（校验 dictCode 对应的字典存在且为启用状态） */
    void createDictItem(CreateDictItemDTO dto);

    /** 更新字典项 */
    void updateDictItem(Long itemId, UpdateDictItemDTO dto);

    /** 删除单个字典项 */
    void deleteDictItem(Long itemId);

    // ---- 前端下拉数据源接口 ----

    /**
     * 一次性返回所有【启用状态】字典的启用字典项，按 dictCode 分组。
     * 供前端页面初始化时整批加载并缓存，避免多次请求。
     */
    Map<String, List<DictItemVO>> getAllActiveItems();

    /**
     * 按 dictCode 返回该字典下所有启用字典项。
     */
    List<DictItemVO> getActiveItemsByCode(String dictCode);
}
