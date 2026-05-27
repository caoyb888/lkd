package com.laikuang.archive.common.exception;

import lombok.Getter;

/**
 * 全局异常基类（RuntimeException），子类依业务场景继承。
 */
@Getter
public class BaseException extends RuntimeException {

    private final int code;

    public BaseException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BaseException(int code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}
