package com.laikuang.archive.system.domain.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 数据字典 VO（列表 / 详情通用）。
 * items 仅在详情查询时填充，列表场景下为 null 不序列化。
 */
@Data
public class DictVO {

    private Long          dictId;
    private String        dictCode;
    private String        dictName;
    /** 状态：1-启用，0-停用 */
    private Integer       status;
    private LocalDateTime createdAt;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<DictItemVO> items;
}
