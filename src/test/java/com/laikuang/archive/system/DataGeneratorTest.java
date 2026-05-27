package com.laikuang.archive.system;

import com.laikuang.archive.system.service.DataGeneratorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

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
