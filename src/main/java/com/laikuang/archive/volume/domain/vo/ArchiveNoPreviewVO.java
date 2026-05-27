package com.laikuang.archive.volume.domain.vo;

import lombok.Data;

/**
 * 档号预览 VO。
 * 前端选择分类后异步请求，后端返回推荐的完整档号及案卷号供预览。
 */
@Data
public class ArchiveNoPreviewVO {

    /** 推荐案卷号（如 003） */
    private String suggestedVolumeNo;

    /** 拼接后的完整档号（如 01.8.01.0101.01.003） */
    private String archiveNo;
}
