package com.laikuang.archive.volume.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.laikuang.archive.common.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 案卷级主目录实体。
 * 表 archive_volume 按 year 字段做 RANGE COLUMNS 物理分区，
 * 复合主键 (record_id, year)，此处仅将 recordId 标注为 @TableId。
 *
 * destroyFlag 使用 @TableLogic 逻辑删除：查询时自动追加 destroy_flag = 0 条件。
 * 管理员需查看已销毁档案时，通过 MP 的 @TableLogic 全局逻辑删除旁路方法访问。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("archive_volume")
public class ArchiveVolume extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long    recordId;

    /** 年度（物理分区键），INSERT 时必须显式传入 */
    private String  year;

    private String  fondsNo;
    private String  categoryName;
    private String  categoryL1;
    private String  categoryL2;
    private String  categoryL3;
    private String  deviceCode;
    private String  volumeNo;
    private String  volumeTitle;
    private Integer fileCount;
    private Integer totalPages;
    private String  compileUnit;
    private String  compileDate;
    private String  retentionPeriod;
    private String  securityLevel;
    private String  compiler;
    private Long    compilerId;
    private LocalDate compileDateActual;
    private String  reviewer;
    private LocalDate inspectDate;
    private LocalDate archiveDate;
    private String  notes;
    private String  remark;

    /** 档号（全局唯一标识），格式：全宗号.L1.L2.L3.设备代号.案卷号 */
    private String  archiveNo;

    private String  categoryCode;
    private String  locationNo;

    /** 在库状态：1-在库，0-借出 */
    private Integer inStock;

    private LocalDate registerDate;
    private String  organization;

    /** 销毁标识。@TableLogic：destroy_flag=1 视为逻辑删除，日常查询自动过滤 */
    @TableLogic(value = "0", delval = "1")
    private Integer destroyFlag;

    /** 销毁待审批：0-否，1-是 */
    private Integer pendingDestroy;

    private Integer copies;
    private Integer borrowedCopies;
    private String  sourceFile;

    /** 档案状态：0-草稿，1-待审核，2-待确认，3-已正式归档 */
    private Integer status;
}
