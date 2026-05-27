package com.laikuang.archive.common.constant;

/**
 * 统一错误码规范。
 * 2000        — 操作成功
 * 4000-4019   — 参数校验异常
 * 4020-4050   — 业务逻辑冲突
 * 401 / 403   — 鉴权与越权
 * 5000        — 系统未知异常
 */
public interface ResultCode {

    // ---- 成功 ----
    int SUCCESS = 2000;

    // ---- 参数校验异常 4000-4019 ----
    int PARAM_ERROR          = 4000;
    int PARAM_MISSING        = 4001;
    int PARAM_FORMAT_ERROR   = 4002;
    int PASSWORD_RULE_INVALID = 4003;

    // ---- 业务逻辑冲突 4020-4050 ----
    int BUSINESS_ERROR               = 4020;
    int ARCHIVE_NO_DUPLICATE         = 4021;
    int BORROW_DAYS_EXCEEDED         = 4022;
    int ARCHIVE_ALREADY_BORROWED     = 4023;
    int ARCHIVE_STOCK_EMPTY          = 4024;
    int ARCHIVE_STATUS_INVALID       = 4025;
    int PERMISSION_DENIED_HORIZONTAL = 4026;
    int ARCHIVE_DESTROYED            = 4027;
    int BORROW_REPEAT                = 4028;
    int EXCEL_IMPORT_ERROR           = 4029;

    // ---- 鉴权 ----
    int UNAUTHORIZED = 401;
    int FORBIDDEN    = 403;

    // ---- 系统异常 ----
    int SYSTEM_ERROR = 5000;
}
