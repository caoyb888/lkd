package com.laikuang.archive.system.domain.vo;

import lombok.Data;

/**
 * 字典项 VO。用于前端下拉框数据源展示。
 */
@Data
public class DictItemVO {

    private Long    itemId;
    private String  dictCode;
    private String  itemValue;
    private String  itemLabel;
    private Integer sortOrder;
    /** 状态：1-启用，0-停用 */
    private Integer status;
}
