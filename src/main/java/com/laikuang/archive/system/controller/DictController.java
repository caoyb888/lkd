package com.laikuang.archive.system.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.system.domain.dto.CreateDictDTO;
import com.laikuang.archive.system.domain.dto.CreateDictItemDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictItemDTO;
import com.laikuang.archive.system.domain.vo.DictItemVO;
import com.laikuang.archive.system.domain.vo.DictVO;
import com.laikuang.archive.system.service.DictService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 数据字典管理接口。
 *
 * 查询（任意已登录用户，供档案录入表单使用）：
 *   GET /dict/all-items                — 一次性加载所有启用字典项（前端缓存用）
 *   GET /dict/{dictCode}/items         — 按编码加载单类字典项
 *
 * 管理（需要 user:manage 权限）：
 *   GET    /dict/page                  — 分页查询字典
 *   GET    /dict/{dictId}/detail       — 字典详情（含所有字典项）
 *   POST   /dict                       — 创建字典
 *   PUT    /dict/{dictId}              — 更新字典名称/状态（停用/启用）
 *   DELETE /dict/{dictId}              — 删除字典（须先停用）
 *   POST   /dict/item                  — 创建字典项
 *   PUT    /dict/item/{itemId}         — 更新字典项
 *   DELETE /dict/item/{itemId}         — 删除字典项
 */
@Validated
@RestController
@RequestMapping("/dict")
@RequiredArgsConstructor
public class DictController {

    private final DictService dictService;

    // ---- 前端下拉数据源（任意已登录用户）----

    /**
     * GET /api/dict/all-items
     * 返回所有启用状态字典的启用字典项，按 dictCode 分组为 Map。
     * 供档案录入页面初始化时整批加载并缓存，避免多次请求。
     *
     * 响应示例：
     * { "retention_period": [...], "security_level": [...], ... }
     */
    @GetMapping("/all-items")
    public Result<Map<String, List<DictItemVO>>> getAllActiveItems() {
        return Result.success(dictService.getAllActiveItems());
    }

    /**
     * GET /api/dict/{dictCode}/items
     * 按字典编码返回该字典下所有启用的字典项（适合按需懒加载）。
     */
    @GetMapping("/{dictCode}/items")
    public Result<List<DictItemVO>> getItemsByCode(@PathVariable String dictCode) {
        return Result.success(dictService.getActiveItemsByCode(dictCode));
    }

    // ---- 字典管理（user:manage 权限）----

    /**
     * GET /api/dict/page?current=1&pageSize=10&keyword=xxx
     * 分页查询字典列表，支持按 dictCode / dictName 模糊搜索。
     */
    @GetMapping("/page")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<IPage<DictVO>> pageDicts(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String keyword) {
        return Result.success(dictService.pageDicts(pageQuery, keyword));
    }

    /**
     * GET /api/dict/{dictId}/detail
     * 查询字典详情（包含该字典下所有字典项）。
     */
    @GetMapping("/{dictId}/detail")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<DictVO> getDictDetail(@PathVariable Long dictId) {
        return Result.success(dictService.getDictDetail(dictId));
    }

    /**
     * POST /api/dict
     * 创建字典（dictCode 全局唯一，格式：小写字母+数字+下划线）。
     */
    @PostMapping
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> createDict(@RequestBody @Validated CreateDictDTO dto) {
        dictService.createDict(dto);
        return Result.success();
    }

    /**
     * PUT /api/dict/{dictId}
     * 更新字典名称或切换启用/停用状态（status: 1-启用 0-停用）。
     */
    @PutMapping("/{dictId}")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> updateDict(
            @PathVariable Long dictId,
            @RequestBody @Validated UpdateDictDTO dto) {
        dictService.updateDict(dictId, dto);
        return Result.success();
    }

    /**
     * DELETE /api/dict/{dictId}
     * 删除字典及其所有字典项（须先将字典设为停用状态才能删除）。
     */
    @DeleteMapping("/{dictId}")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> deleteDict(@PathVariable Long dictId) {
        dictService.deleteDict(dictId);
        return Result.success();
    }

    // ---- 字典项管理（user:manage 权限）----

    /**
     * POST /api/dict/item
     * 新增字典项（父字典须存在且为启用状态）。
     */
    @PostMapping("/item")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> createDictItem(@RequestBody @Validated CreateDictItemDTO dto) {
        dictService.createDictItem(dto);
        return Result.success();
    }

    /**
     * PUT /api/dict/item/{itemId}
     * 更新字典项（可修改显示名、排序、停用/启用）。
     */
    @PutMapping("/item/{itemId}")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> updateDictItem(
            @PathVariable Long itemId,
            @RequestBody @Validated UpdateDictItemDTO dto) {
        dictService.updateDictItem(itemId, dto);
        return Result.success();
    }

    /**
     * DELETE /api/dict/item/{itemId}
     * 删除单个字典项。
     */
    @DeleteMapping("/item/{itemId}")
    @SaCheckPermission(PermissionConstants.USER_MANAGE)
    public Result<Void> deleteDictItem(@PathVariable Long itemId) {
        dictService.deleteDictItem(itemId);
        return Result.success();
    }
}
