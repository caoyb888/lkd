package com.laikuang.archive.common.domain;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * 通用分页查询参数。作为 Controller 方法入参使用时，
 * 需在 Controller 类上添加 @Validated 且方法参数上添加 @Valid。
 */
@Data
public class PageQuery {

    @Min(value = 1, message = "页码最小为1")
    private long current = 1;

    @Min(value = 1, message = "每页条数最小为1")
    @Max(value = 100, message = "每页条数最大为100")
    private long pageSize = 10;

    /**
     * 兼容前端使用 size 作为分页大小参数名。
     */
    public void setSize(long size) {
        this.pageSize = size;
    }
}
