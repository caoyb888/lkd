package com.laikuang.archive;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * 应用上下文加载冒烟测试。
 * 验证 Spring 容器能正常启动（Bean 注入、配置加载、MyBatis-Plus 映射无误）。
 * 执行前确保 application-test.yml 或 application-dev.yml 中的数据库可连通。
 */
@SpringBootTest
@ActiveProfiles("test")
class ArchiveApplicationTests {

    @Test
    void contextLoads() {
        // 容器能无异常启动即通过
    }
}
