package com.laikuang.archive.search.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.search.domain.vo.GlobalSearchVO;
import com.laikuang.archive.search.service.GlobalSearchService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 全局模糊检索接口。
 *
 * <p>URL 前缀：/api/search</p>
 */
@Validated
@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class GlobalSearchController {

    private final GlobalSearchService searchService;

    /**
     * GET /api/search/global?keyword=xxx&year=2026&categoryL1=8
     * 全局模糊检索：同时在案卷题名、文件标题、主题词中匹配。
     */
    @GetMapping("/global")
    @SaCheckPermission(PermissionConstants.ARCHIVE_VIEW)
    public Result<GlobalSearchVO> globalSearch(
            @RequestParam @NotBlank(message = "检索关键词不能为空") String keyword,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String categoryL1) {
        return Result.success(searchService.globalSearch(keyword, year, categoryL1));
    }
}
