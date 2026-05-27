package com.laikuang.archive.common.exception;

import com.laikuang.archive.common.constant.ResultCode;

/**
 * 越权与未登录异常：Token 失效、无领导审批权限、水平越权访问他人档案等场景。
 */
public class UnauthorizedException extends BaseException {

    public UnauthorizedException(String message) {
        super(ResultCode.UNAUTHORIZED, message);
    }

    public UnauthorizedException(int code, String message) {
        super(code, message);
    }
}
