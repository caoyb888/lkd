package com.laikuang.archive.system.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.laikuang.archive.common.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_dict_item")
public class SysDictItem extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long    itemId;
    private String  dictCode;
    private String  itemValue;
    private String  itemLabel;
    private Integer sortOrder;
    /** 父级字典项值（树形关联用，如 category_l2 的 parent_value = category_l1 的 item_value），NULL=顶级 */
    private String  parentValue;
    /** 状态：1-启用，0-停用 */
    private Integer status;
}
