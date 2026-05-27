package com.laikuang.archive.volume.domain.dto;

import com.alibaba.excel.annotation.ExcelProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 案卷目录 Excel 批量导入数据模型。
 *
 * <p>对应 Excel 模板列，使用 EasyExcel 读取。字段校验规则：
 * <ul>
 *   <li>年度、全宗号、一级类目、案卷题名 —— 必填</li>
 *   <li>保管期限、密级 —— 若填写必须在数据字典范围内</li>
 *   <li>案卷号 —— 可选填；不填时系统按分类组合自动递增生成</li>
 * </ul>
 */
@Data
public class ArchiveVolumeImportDTO {

    @ExcelProperty("年度")
    @NotBlank(message = "年度不能为空")
    @Pattern(regexp = "\\d{4}", message = "年度必须为4位数字，如2026")
    private String year;

    @ExcelProperty("全宗号")
    @NotBlank(message = "全宗号不能为空")
    private String fondsNo;

    @ExcelProperty("分类名称")
    private String categoryName;

    @ExcelProperty("一级类目")
    @NotBlank(message = "一级类目不能为空")
    private String categoryL1;

    @ExcelProperty("二级类目")
    private String categoryL2;

    @ExcelProperty("三级类目")
    private String categoryL3;

    @ExcelProperty("设备代号")
    private String deviceCode;

    @ExcelProperty("案卷号")
    private String volumeNo;

    @ExcelProperty("案卷题名")
    @NotBlank(message = "案卷题名不能为空")
    @Size(max = 200, message = "案卷题名长度不能超过200")
    private String volumeTitle;

    @ExcelProperty("卷内文件件数")
    private Integer fileCount;

    @ExcelProperty("案卷总页数")
    private Integer totalPages;

    @ExcelProperty("编制单位")
    private String compileUnit;

    @ExcelProperty("编制日期")
    private String compileDate;

    @ExcelProperty("保管期限")
    private String retentionPeriod;

    @ExcelProperty("密级")
    private String securityLevel;

    @ExcelProperty("立卷人")
    private String compiler;

    @ExcelProperty("立卷日期")
    private String compileDateActual;

    @ExcelProperty("审核人")
    private String reviewer;

    @ExcelProperty("检查日期")
    private String inspectDate;

    @ExcelProperty("归档日期")
    private String archiveDate;

    @ExcelProperty("备考说明")
    private String notes;

    @ExcelProperty("备注")
    private String remark;

    @ExcelProperty("分类号")
    private String categoryCode;

    @ExcelProperty("库位号")
    private String locationNo;

    @ExcelProperty("总份数")
    private Integer copies;

    @ExcelProperty("编制机构")
    private String organization;
}
