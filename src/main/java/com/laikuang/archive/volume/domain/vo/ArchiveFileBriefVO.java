package com.laikuang.archive.volume.domain.vo;

import lombok.Data;

/**
 * 案卷详情中卷内文件简要 VO。
 */
@Data
public class ArchiveFileBriefVO {

    private Long recordId;
    private String year;
    private String fileNo;
    private String fileTitle;
    private String responsible;
    private Integer pages;
    private Integer seqNo;
    private String archiveNo;
}
