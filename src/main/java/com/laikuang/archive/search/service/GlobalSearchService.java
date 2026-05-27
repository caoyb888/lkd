package com.laikuang.archive.search.service;

import com.laikuang.archive.search.domain.vo.GlobalSearchVO;

/**
 * 全局模糊检索业务接口。
 */
public interface GlobalSearchService {

    /**
     * 全局模糊检索。
     * 关键词同时在案卷题名、文件标题、主题词中匹配，返回前 50 条案卷与前 50 条文件。
     *
     * @param keyword   检索关键词（必填）
     * @param year      年度（可选，精准筛选）
     * @param categoryL1 一级类目（可选，精准筛选）
     * @return 检索结果（案卷 + 文件）
     */
    GlobalSearchVO globalSearch(String keyword, String year, String categoryL1);
}
