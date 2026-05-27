package com.laikuang.archive.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.system.domain.dto.CreateDictDTO;
import com.laikuang.archive.system.domain.dto.CreateDictItemDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictItemDTO;
import com.laikuang.archive.system.domain.entity.SysDict;
import com.laikuang.archive.system.domain.entity.SysDictItem;
import com.laikuang.archive.system.domain.vo.DictItemVO;
import com.laikuang.archive.system.domain.vo.DictVO;
import com.laikuang.archive.system.mapper.SysDictItemMapper;
import com.laikuang.archive.system.mapper.SysDictMapper;
import com.laikuang.archive.system.service.DictService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 数据字典业务实现。
 * 核心 getAllActiveItems() 通过 JOIN 查询一次性返回所有启用字典项，
 * 供前端页面初始化时整批加载并本地缓存，减少后续多次请求开销。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DictServiceImpl implements DictService {

    private final SysDictMapper     dictMapper;
    private final SysDictItemMapper dictItemMapper;

    // ======== 字典主表 ========

    @Override
    public IPage<DictVO> pageDicts(PageQuery pageQuery, String keyword) {
        Page<SysDict> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<SysDict> wrapper = new LambdaQueryWrapper<SysDict>()
                .and(StringUtils.hasText(keyword), w -> w
                        .like(SysDict::getDictCode, keyword)
                        .or()
                        .like(SysDict::getDictName, keyword))
                .orderByAsc(SysDict::getDictId);
        return dictMapper.selectPage(page, wrapper).convert(this::toDictVO);
    }

    @Override
    public DictVO getDictDetail(Long dictId) {
        SysDict dict = assertDictExists(dictId);
        DictVO vo = toDictVO(dict);

        List<SysDictItem> items = dictItemMapper.selectList(
                new LambdaQueryWrapper<SysDictItem>()
                        .eq(SysDictItem::getDictCode, dict.getDictCode())
                        .orderByAsc(SysDictItem::getSortOrder));
        vo.setItems(items.stream().map(this::toItemVO).collect(Collectors.toList()));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createDict(CreateDictDTO dto) {
        // dictCode 全局唯一
        Long count = dictMapper.selectCount(
                new LambdaQueryWrapper<SysDict>().eq(SysDict::getDictCode, dto.getDictCode()));
        if (count > 0) {
            throw new BusinessException(ResultCode.PARAM_ERROR,
                    "字典编码 [" + dto.getDictCode() + "] 已存在");
        }

        SysDict dict = new SysDict();
        dict.setDictCode(dto.getDictCode());
        dict.setDictName(dto.getDictName());
        dict.setStatus(1);
        dictMapper.insert(dict);

        log.info("[Dict] 创建字典：dictCode={}, dictName={}", dto.getDictCode(), dto.getDictName());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateDict(Long dictId, UpdateDictDTO dto) {
        assertDictExists(dictId);

        SysDict update = new SysDict();
        update.setDictId(dictId);
        update.setDictName(dto.getDictName());
        update.setStatus(dto.getStatus());
        dictMapper.updateById(update);

        log.info("[Dict] 更新字典：dictId={}, status={}", dictId, dto.getStatus());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDict(Long dictId) {
        SysDict dict = assertDictExists(dictId);

        // 只允许删除已停用的字典，防止误删线上正在使用的配置
        if (dict.getStatus() != null && dict.getStatus() == 1) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "请先停用该字典后再执行删除操作");
        }

        // 级联删除所有字典项
        dictItemMapper.delete(
                new LambdaQueryWrapper<SysDictItem>()
                        .eq(SysDictItem::getDictCode, dict.getDictCode()));

        dictMapper.deleteById(dictId);
        log.info("[Dict] 删除字典及其所有字典项：dictId={}, dictCode={}", dictId, dict.getDictCode());
    }

    // ======== 字典项 ========

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createDictItem(CreateDictItemDTO dto) {
        // 校验父字典存在且为启用状态
        SysDict dict = dictMapper.selectOne(
                new LambdaQueryWrapper<SysDict>().eq(SysDict::getDictCode, dto.getDictCode()));
        if (dict == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR,
                    "字典编码 [" + dto.getDictCode() + "] 不存在");
        }
        if (dict.getStatus() == null || dict.getStatus() == 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "字典 [" + dto.getDictCode() + "] 已停用，不能新增字典项");
        }

        // 同一字典下 itemValue 不重复
        Long count = dictItemMapper.selectCount(
                new LambdaQueryWrapper<SysDictItem>()
                        .eq(SysDictItem::getDictCode, dto.getDictCode())
                        .eq(SysDictItem::getItemValue, dto.getItemValue()));
        if (count > 0) {
            throw new BusinessException(ResultCode.PARAM_ERROR,
                    "字典项值 [" + dto.getItemValue() + "] 在该字典下已存在");
        }

        SysDictItem item = new SysDictItem();
        item.setDictCode(dto.getDictCode());
        item.setItemValue(dto.getItemValue());
        item.setItemLabel(dto.getItemLabel());
        item.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
        item.setStatus(1);
        dictItemMapper.insert(item);

        log.info("[Dict] 新增字典项：dictCode={}, itemValue={}", dto.getDictCode(), dto.getItemValue());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateDictItem(Long itemId, UpdateDictItemDTO dto) {
        if (dictItemMapper.selectById(itemId) == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "字典项不存在");
        }

        SysDictItem update = new SysDictItem();
        update.setItemId(itemId);
        update.setItemValue(dto.getItemValue());
        update.setItemLabel(dto.getItemLabel());
        update.setSortOrder(dto.getSortOrder());
        update.setStatus(dto.getStatus());
        dictItemMapper.updateById(update);

        log.info("[Dict] 更新字典项：itemId={}, status={}", itemId, dto.getStatus());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDictItem(Long itemId) {
        if (dictItemMapper.selectById(itemId) == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "字典项不存在");
        }
        dictItemMapper.deleteById(itemId);
        log.info("[Dict] 删除字典项：itemId={}", itemId);
    }

    // ======== 前端下拉数据源 ========

    @Override
    public Map<String, List<DictItemVO>> getAllActiveItems() {
        List<DictItemVO> items = dictItemMapper.selectAllActiveItems();
        return items.stream().collect(Collectors.groupingBy(DictItemVO::getDictCode));
    }

    @Override
    public List<DictItemVO> getActiveItemsByCode(String dictCode) {
        return dictItemMapper.selectActiveItemsByCode(dictCode);
    }

    // ======== 内部工具 ========

    private SysDict assertDictExists(Long dictId) {
        SysDict dict = dictMapper.selectById(dictId);
        if (dict == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "字典不存在");
        }
        return dict;
    }

    private DictVO toDictVO(SysDict dict) {
        DictVO vo = new DictVO();
        vo.setDictId(dict.getDictId());
        vo.setDictCode(dict.getDictCode());
        vo.setDictName(dict.getDictName());
        vo.setStatus(dict.getStatus());
        vo.setCreatedAt(dict.getCreatedAt());
        return vo;
    }

    private DictItemVO toItemVO(SysDictItem item) {
        DictItemVO vo = new DictItemVO();
        vo.setItemId(item.getItemId());
        vo.setDictCode(item.getDictCode());
        vo.setItemValue(item.getItemValue());
        vo.setItemLabel(item.getItemLabel());
        vo.setSortOrder(item.getSortOrder());
        vo.setStatus(item.getStatus());
        return vo;
    }
}
