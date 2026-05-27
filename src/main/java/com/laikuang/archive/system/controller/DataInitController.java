package com.laikuang.archive.system.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.result.Result;
import com.laikuang.archive.system.service.DataGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 测试数据初始化接口。
 * 仅供管理员一次性触发，为系统全部模块生成测试数据。
 */
@Slf4j
@RestController
@RequestMapping("/system/data-init")
@RequiredArgsConstructor
public class DataInitController {

    private final DataGeneratorService dataGeneratorService;

    /**
     * 生成全部模块测试数据。
     * 需要 archive:manage 权限。
     */
    @PostMapping
    @SaCheckPermission(PermissionConstants.ARCHIVE_MANAGE)
    public Result<Map<String, Integer>> generateAll() {
        log.info("管理员触发测试数据生成...");
        Map<String, Integer> stats = dataGeneratorService.generateAll();
        log.info("测试数据生成结果: {}", stats);
        return Result.success(stats);
    }
}
