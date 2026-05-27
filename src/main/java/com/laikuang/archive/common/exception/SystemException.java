package com.laikuang.archive.common.exception;

import com.laikuang.archive.common.constant.ResultCode;

/**
 * 系统级内部异常：文件存储丢失、外部系统超时、数据库崩溃等不可恢复场景。
 */
public class SystemException extends BaseException {

    public SystemException(String message) {
        super(ResultCode.SYSTEM_ERROR, message);
    }

    public SystemException(String message, Throwable cause) {
        super(ResultCode.SYSTEM_ERROR, message, cause);
    }
}
