package com.laikuang.archive.common.interceptor;

import com.laikuang.archive.common.util.IpUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

/**
 * TraceId + ClientIP 注入拦截器。
 * 每个请求在进入 Controller 前生成唯一 UUID 并提取客户端真实 IP 写入 MDC，
 * 确保 Controller -> Service -> DB 全链路日志携带相同的 traceId 和 clientIP，便于排障与审计追溯。
 * 请求结束后清理 MDC，防止线程池复用导致串号。
 */
@Component
public class TraceIdInterceptor implements HandlerInterceptor {

    private static final String TRACE_ID  = "traceId";
    private static final String CLIENT_IP = "clientIP";

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {
        MDC.put(TRACE_ID, UUID.randomUUID().toString().replace("-", ""));
        MDC.put(CLIENT_IP, IpUtil.getClientIp(request));
        return true;
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request,
                                @NonNull HttpServletResponse response,
                                @NonNull Object handler,
                                Exception ex) {
        MDC.remove(TRACE_ID);
        MDC.remove(CLIENT_IP);
    }
}
