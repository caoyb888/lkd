package com.laikuang.archive.common.result;

import com.laikuang.archive.common.constant.ResultCode;
import lombok.Getter;
import org.slf4j.MDC;

import java.io.Serial;
import java.io.Serializable;

/**
 * 统一响应封装。所有 HTTP 接口必须通过此类返回。
 */
@Getter
public class Result<T> implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final int    code;
    private final String msg;
    private final T      data;
    private final String traceId;

    private Result(int code, String msg, T data) {
        this.code    = code;
        this.msg     = msg;
        this.data    = data;
        this.traceId = MDC.get("traceId");
    }

    public static <T> Result<T> success(T data) {
        return new Result<>(ResultCode.SUCCESS, "操作成功", data);
    }

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> fail(int code, String msg) {
        return new Result<>(code, msg, null);
    }

    public static <T> Result<T> fail(String msg) {
        return new Result<>(ResultCode.BUSINESS_ERROR, msg, null);
    }
}
