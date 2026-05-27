package com.laikuang.archive.common.exception;

import com.laikuang.archive.common.constant.ResultCode;

/**
 * 核心业务异常：档号已重复、档案已借出、密码规则不匹配等业务冲突场景。
 */
public class BusinessException extends BaseException {

    public BusinessException(String message) {
        super(ResultCode.BUSINESS_ERROR, message);
    }

    public BusinessException(int code, String message) {
        super(code, message);
    }
}
