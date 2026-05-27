package com.laikuang.archive.approve.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 审批操作提交DTO。
 */
@Data
public class ArchiveApproveActionDTO {

    /** 审批意见 */
    private String opinion;

    /** 审批动作：PASS / REJECT / BACK（ URL 路径已隐含动作，可选） */
    private String action;
}
