package com.laikuang.archive.search.domain.vo;

import com.laikuang.archive.file.domain.vo.ArchiveFileListVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeListVO;
import lombok.Data;

import java.util.List;

/**
 * 全局模糊检索结果 VO。
 * 同时在案卷题名、文件标题、主题词中搜索，返回匹配的案卷列表与文件列表。
 */
@Data
public class GlobalSearchVO {

    /** 匹配关键词的案卷列表（按案卷题名匹配） */
    private List<ArchiveVolumeListVO> volumes;

    /** 匹配关键词的文件列表（按文件标题或主题词匹配） */
    private List<ArchiveFileListVO> files;
}
