package com.laikuang.archive.common.config;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import com.laikuang.archive.common.interceptor.TraceIdInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * MVC 全局拦截器注册。
 * 执行顺序（按注册先后）：
 *   1. TraceIdInterceptor — 注入 MDC traceId，必须最先执行
 *   2. SaInterceptor      — Sa-Token 登录态校验
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final TraceIdInterceptor traceIdInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 1. TraceId 注入（必须首位，使后续所有日志均携带链路ID）
        registry.addInterceptor(traceIdInterceptor)
                .addPathPatterns("/**");

        // 2. Sa-Token 登录校验，放行登录接口
        // SaRouter.notMatch 使用完整请求 URI（含 context-path），Spring excludePathPatterns 使用去掉 context-path 后的路径
        registry.addInterceptor(new SaInterceptor(handle ->
                SaRouter.match("/**")
                        .notMatch("/api/auth/login")
                        .check(r -> StpUtil.checkLogin())
        )).addPathPatterns("/**")
          .excludePathPatterns("/auth/login");
    }
}
