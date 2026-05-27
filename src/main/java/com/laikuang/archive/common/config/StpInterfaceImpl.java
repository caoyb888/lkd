package com.laikuang.archive.common.config;

import cn.dev33.satoken.stp.StpInterface;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.laikuang.archive.common.constant.PermissionConstants;
import com.laikuang.archive.common.constant.RoleConstants;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Sa-Token 权限数据加载器。
 * Sa-Token 在执行 @SaCheckPermission / @SaCheckRole 时回调此接口，
 * 从数据库查询当前 loginId 对应的角色列表与权限码列表。
 */
@Component
@RequiredArgsConstructor
public class StpInterfaceImpl implements StpInterface {

    private final SysUserMapper sysUserMapper;

    /**
     * 角色 -> 权限码映射表（静态，避免每次鉴权都 query DB）。
     * 业务权限如有调整，仅修改此处即可。
     */
    private static final Map<String, List<String>> ROLE_PERMISSIONS = Map.of(
        RoleConstants.USER, List.of(
            PermissionConstants.ARCHIVE_VIEW,
            PermissionConstants.ARCHIVE_CREATE,
            PermissionConstants.BORROW_APPLY,
            PermissionConstants.BORROW_HISTORY_DEPT
        ),
        RoleConstants.ARCHIVE_ADMIN, List.of(
            PermissionConstants.ARCHIVE_VIEW,
            PermissionConstants.ARCHIVE_CREATE,
            PermissionConstants.ARCHIVE_MANAGE,
            PermissionConstants.BORROW_APPLY,
            PermissionConstants.BORROW_APPROVE,
            PermissionConstants.BORROW_HISTORY_DEPT,
            PermissionConstants.BORROW_HISTORY_ALL,
            PermissionConstants.USER_MANAGE
        ),
        RoleConstants.COMPANY_LEADER, List.of(
            PermissionConstants.ARCHIVE_VIEW,
            PermissionConstants.ARCHIVE_CREATE,
            PermissionConstants.ARCHIVE_MANAGE,
            PermissionConstants.ARCHIVE_DESTROY,
            PermissionConstants.BORROW_APPLY,
            PermissionConstants.BORROW_APPROVE,
            PermissionConstants.BORROW_HISTORY_DEPT,
            PermissionConstants.BORROW_HISTORY_ALL,
            PermissionConstants.USER_MANAGE
        )
    );

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        String role = loadRole(loginId);
        return ROLE_PERMISSIONS.getOrDefault(role, Collections.emptyList());
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        String role = loadRole(loginId);
        return role.isEmpty() ? Collections.emptyList() : List.of(role);
    }

    private String loadRole(Object loginId) {
        Long userId = Long.parseLong(loginId.toString());
        SysUser user = sysUserMapper.selectOne(
            new LambdaQueryWrapper<SysUser>()
                .select(SysUser::getRole)
                .eq(SysUser::getUserId, userId)
        );
        return user != null && user.getRole() != null ? user.getRole() : "";
    }
}
