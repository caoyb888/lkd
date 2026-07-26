package com.laikuang.archive.system;

import com.laikuang.archive.system.service.DataGeneratorService;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 演示数据生成器（@Rollback(false) 会真实提交数据）。
 * 不是单元测试：仅在需要手工生成演示数据时临时去掉 @Disabled 运行，
 * 否则每次跑测试套件都会向数据库重复灌入 150 用户/150 借阅/100 通知并污染业务表。
 */
@Disabled("会提交真实数据污染数据库，仅供手动生成演示数据使用")
@SpringBootTest
@Transactional
@Rollback(false)
public class DataGeneratorTest {

    @Autowired
    private DataGeneratorService dataGeneratorService;

    @Test
    public void generateAllTestData() {
        Map<String, Integer> stats = dataGeneratorService.generateAll();
        System.out.println("========== 测试数据生成结果 ==========");
        stats.forEach((k, v) -> System.out.println(k + ": " + v));
        System.out.println("======================================");
    }
}
