package com.laikuang.archive.common.handler;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotPermissionException;
import cn.dev33.satoken.exception.NotRoleException;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BaseException;
import com.laikuang.archive.common.result.Result;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常拦截器。
 * 策略：主动防御、集中拦截，严禁向前端暴露任何 Java 堆栈信息。
 * 所有异常均通过此类统一返回标准化 Result 报文。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 业务自定义异常（BusinessException / SystemException / UnauthorizedException） */
    @ExceptionHandler(BaseException.class)
    public Result<Void> handleBaseException(BaseException e) {
        log.warn("[BaseException] code={}, msg={}", e.getCode(), e.getMessage());
        return Result.fail(e.getCode(), e.getMessage());
    }

    /** @Validated / @Valid 参数校验失败（请求体 DTO 校验） */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        BindingResult br  = e.getBindingResult();
        FieldError    err = br.getFieldError();
        String msg = err != null
                ? String.format("字段[%s]：%s", err.getField(), err.getDefaultMessage())
                : "请求参数校验失败";
        log.warn("[ParamValidation] {}", msg);
        return Result.fail(ResultCode.PARAM_ERROR, msg);
    }

    /** @Validated 路径变量 / 请求参数校验失败 */
    @ExceptionHandler(ConstraintViolationException.class)
    public Result<Void> handleConstraintViolation(ConstraintViolationException e) {
        String msg = e.getConstraintViolations().iterator().next().getMessage();
        log.warn("[ConstraintViolation] {}", msg);
        return Result.fail(ResultCode.PARAM_ERROR, msg);
    }

    /** 必填请求参数缺失 */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public Result<Void> handleMissingParam(MissingServletRequestParameterException e) {
        String msg = String.format("缺少必填参数：%s", e.getParameterName());
        log.warn("[MissingParam] {}", msg);
        return Result.fail(ResultCode.PARAM_MISSING, msg);
    }

    /** Sa-Token：未登录或 Token 失效 */
    @ExceptionHandler(NotLoginException.class)
    public Result<Void> handleNotLogin(NotLoginException e) {
        log.warn("[NotLogin] type={}", e.getType());
        return Result.fail(ResultCode.UNAUTHORIZED, "未登录或登录已过期，请重新登录");
    }

    /** Sa-Token：无对应权限 */
    @ExceptionHandler(NotPermissionException.class)
    public Result<Void> handleNotPermission(NotPermissionException e) {
        log.warn("[NotPermission] permission={}", e.getPermission());
        return Result.fail(ResultCode.FORBIDDEN, "无权限执行该操作：" + e.getPermission());
    }

    /** Sa-Token：无对应角色 */
    @ExceptionHandler(NotRoleException.class)
    public Result<Void> handleNotRole(NotRoleException e) {
        log.warn("[NotRole] role={}", e.getRole());
        return Result.fail(ResultCode.FORBIDDEN, "当前角色无权执行该操作");
    }

    /** 兜底：所有未预期异常，记录完整堆栈，不向前端暴露细节 */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e) {
        log.error("[SystemException] 未预期异常", e);
        return Result.fail(ResultCode.SYSTEM_ERROR, "系统繁忙，请稍后重试");
    }
}
