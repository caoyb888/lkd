package com.laikuang.archive.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 1 — S1-05：密码工具类黑盒测试。
 * 覆盖 Argon2id 哈希、密码强度规则、手机号脱敏。
 * 验收标准：密码强度限制黑盒测试拦截率 100%。
 */
class PasswordUtilTest {

    // ==================== Argon2id 哈希 ====================

    @Test
    @DisplayName("encode: 明文密码应生成非空 Argon2id 哈希")
    void encodeShouldGenerateNonEmptyHash() {
        String hash = PasswordUtil.encode("Admin@123");
        assertNotNull(hash);
        assertTrue(hash.length() > 20);
        assertTrue(hash.startsWith("$argon2id$"));
    }

    @Test
    @DisplayName("matches: 正确密码应匹配哈希")
    void matchesWithCorrectPassword() {
        String hash = PasswordUtil.encode("Test@456");
        assertTrue(PasswordUtil.matches("Test@456", hash));
    }

    @Test
    @DisplayName("matches: 错误密码不应匹配哈希")
    void matchesWithWrongPassword() {
        String hash = PasswordUtil.encode("Test@456");
        assertFalse(PasswordUtil.matches("Wrong@789", hash));
    }

    @Test
    @DisplayName("matches: 相同明文两次 encode 应生成不同哈希（随机盐）")
    void encodeGeneratesDifferentHashesForSamePassword() {
        String hash1 = PasswordUtil.encode("Same@123");
        String hash2 = PasswordUtil.encode("Same@123");
        assertNotEquals(hash1, hash2);
        assertTrue(PasswordUtil.matches("Same@123", hash1));
        assertTrue(PasswordUtil.matches("Same@123", hash2));
    }

    // ==================== 密码强度规则 ====================

    @ParameterizedTest(name = "合法密码: {0}")
    @ValueSource(strings = {
        "Admin@123",
        "a1#aaaa",
        "Test1!",
        "Hello@2026",
        "P@ssw0rd",
        "A1$bcd"
    })
    @DisplayName("isStrong: 合法密码应通过强度校验")
    void strongPasswordShouldPass(String password) {
        assertTrue(PasswordUtil.isStrong(password),
            "密码 '" + password + "' 应被视为强密码");
    }

    @ParameterizedTest(name = "非法密码: {0}")
    @ValueSource(strings = {
        "",           // 空
        "12345",      // 不足6位
        "abcdef",     // 无数字、无特殊字符
        "123456",     // 无字母、无特殊字符
        "abc123",     // 无特殊字符
        "abc!@#",     // 无数字
        "123!@#",     // 无字母
        "A1#",        // 不足6位
        "A1#bc",      // 刚好5位
    })
    @DisplayName("isStrong: 非法密码应被强度校验拦截")
    void weakPasswordShouldFail(String password) {
        assertFalse(PasswordUtil.isStrong(password),
            "密码 '" + password + "' 应被视为弱密码");
    }

    // ==================== 手机号脱敏 ====================

    @ParameterizedTest(name = "脱敏: {0} -> {1}")
    @CsvSource({
        "13800138000, 138****8000",
        "15012345678, 150****5678",
        "1391234567,  139****4567",
        "138001,      138001",
        "138,         138",
        "'',''",
    })
    @DisplayName("desensitizePhone: 手机号脱敏规则校验")
    void desensitizePhoneShouldMaskMiddleDigits(String input, String expected) {
        assertEquals(expected, PasswordUtil.desensitizePhone(input));
    }
}
