package com.laikuang.archive.file.domain.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 文件级明细目录列表 VO（精简字段）。
 */
@Data
public class ArchiveFileListVO {

    private Long recordId;
    private String year;
    private String archiveNo;
    private String volumeNo;
    private String fileTitle;
    private String fileNo;
    private Integer seqNo;
    private String responsible;
    private Integer pages;
    private Integer status;
    private Integer inStock;
    private String securityLevel;
    private Long compilerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
