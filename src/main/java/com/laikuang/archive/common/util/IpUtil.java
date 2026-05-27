package com.laikuang.archive.common.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * IP 地址获取工具类。
 *
 * <p>支持从反向代理（Nginx）后的请求中解析真实客户端 IP，
 * 依次读取 X-Forwarded-For、X-Real-IP、Proxy-Client-IP、WL-Proxy-Client-IP，
 * 均不存在时回退到 {@link HttpServletRequest#getRemoteAddr()}。
 */
public final class IpUtil {

    private static final String UNKNOWN = "unknown";

    private IpUtil() {}

    /**
     * 获取客户端真实 IP 地址。
     */
    public static String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (isValid(ip)) {
            // X-Forwarded-For 可能包含多级代理，取第一个真实 IP
            int idx = ip.indexOf(',');
            if (idx != -1) {
                ip = ip.substring(0, idx).trim();
            }
            return ip;
        }

        ip = request.getHeader("X-Real-IP");
        if (isValid(ip)) {
            return ip;
        }

        ip = request.getHeader("Proxy-Client-IP");
        if (isValid(ip)) {
            return ip;
        }

        ip = request.getHeader("WL-Proxy-Client-IP");
        if (isValid(ip)) {
            return ip;
        }

        return request.getRemoteAddr();
    }

    private static boolean isValid(String ip) {
        return ip != null && !ip.isBlank() && !UNKNOWN.equalsIgnoreCase(ip);
    }
}
