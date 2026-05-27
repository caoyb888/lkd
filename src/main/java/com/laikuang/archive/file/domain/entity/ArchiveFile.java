package com.laikuang.archive.file.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.laikuang.archive.common.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 文件级明细目录实体。
 * 表 archive_file 同样按 year 做 RANGE COLUMNS 物理分区，
 * 复合主键 (record_id, year)。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("archive_file")
public class ArchiveFile extends BaseEntity {

    @TableId(type = IdType.AUTO)
    private Long    recordId;

    private String  fondsNo;
    private String  categoryName;

    /** 年度（物理分区键），INSERT 时必须显式传入 */
    private String  year;

    private String  categoryL1;
    private String  categoryL2;
    private String  categoryL3;
    private String  deviceCode;

    /** 关联案卷号，关联 archive_volume.volume_no */
    private String  volumeNo;

    private Integer seqNo;
    private String  fileNo;
    private String  fileTitle;
    private String  responsible;
    private Integer pages;
    private String  compileDate;
    private String  keywords;
    private LocalDate archiveDate;
    private String  securityLevel;
    private String  originalPath;
    private String  archiveNo;
    private Long    compilerId;
    private String  remark;
    private String  retentionPeriod;
    private String  categoryCode;
    private String  drawingSize;
    private String  a4Equivalent;
    private String  cabinetNo;
    private String  changeRecord;
    private String  projectName;
    private String  drawerNo;
    private String  pageStart;
    private String  archiveStatus;
    private String  locationNo;
    private Integer inStock;
    private String  organization;
    private String  relatedFlag;

    /** 销毁标识。@TableLogic：destroy_flag=1 视为逻辑删除 */
    @TableLogic(value = "0", delval = "1")
    private Integer destroyFlag;

    private Integer copies;
    private Integer borrowedCopies;
    private String  sourceFile;

    /** 文件状态：0-草稿，1-待审核，2-待确认，3-已正式归档 */
    private Integer status;
}
