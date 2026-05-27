package com.laikuang.archive.common.util;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

/**
 * 密码工具类。
 * 哈希算法：Argon2id（Spring Security Crypto + BouncyCastle 提供）。
 * 密码规则：最少 6 位，必须同时包含字母、数字和特殊字符（$@!%*#?&）。
 *
 * 使用方式：
 *   String hash = PasswordUtil.encode("Admin@123");
 *   boolean ok  = PasswordUtil.matches("Admin@123", hash);
 */
public final class PasswordUtil {

    /**
     * Argon2id 参数（Spring Security 5.8 默认推荐值）：
     *   saltLength=16, hashLength=32, parallelism=1, memory=16384, iterations=2
     */
    private static final Argon2PasswordEncoder ENCODER =
            Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();

    /** 密码强度正则：6位以上，含字母+数字+特殊字符 */
    private static final String PASSWORD_REGEX =
            "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[$@$!%*#?&])[A-Za-z\\d$@$!%*#?&]{6,}$";

    private PasswordUtil() {}

    /** 对明文密码进行 Argon2id 哈希 */
    public static String encode(String rawPassword) {
        return ENCODER.encode(rawPassword);
    }

    /** 校验明文密码与哈希是否匹配 */
    public static boolean matches(String rawPassword, String encodedPassword) {
        return ENCODER.matches(rawPassword, encodedPassword);
    }

    /**
     * 校验密码强度规则。
     * 规则：最少 6 位，必须同时包含 字母、数字、特殊字符（$@!%*#?&）。
     */
    public static boolean isStrong(String rawPassword) {
        return rawPassword != null && rawPassword.matches(PASSWORD_REGEX);
    }

    /** 手机号脱敏：138****5678 */
    public static String desensitizePhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
