package com.laikuang.archive.volume.domain.vo;

import lombok.Data;

/**
 * 案卷目录 Excel 批量导入结果 VO。
 */
@Data
public class ArchiveVolumeImportResultVO {

    /** 读取到的数据总行数 */
    private int totalCount;

    /** 成功导入行数 */
    private int successCount;

    /** 导入文件名称 */
    private String fileName;
}
