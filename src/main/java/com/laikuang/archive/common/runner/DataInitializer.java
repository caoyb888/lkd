package com.laikuang.archive.common.runner;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.laikuang.archive.common.constant.RoleConstants;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 应用启动后执行一次性数据初始化。
 * 主要职责：若 admin 账号密码仍为 SQL 占位符，则使用 Argon2id 计算真实哈希并写入。
 * 这样初始密码从不以明文存储于数据库，首次启动后即为强哈希。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private static final String PLACEHOLDER       = "INIT_CHANGE_ON_FIRST_DEPLOY";
    private static final String DEFAULT_PASSWORD   = "Admin@123";
    private static final String DEFAULT_ADMIN_USER = "admin";

    private final SysUserMapper sysUserMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void run(ApplicationArguments args) {
        initAdminPassword();
    }

    private void initAdminPassword() {
        SysUser admin = sysUserMapper.selectOne(
            new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, DEFAULT_ADMIN_USER)
        );

        if (admin == null) {
            log.warn("[DataInit] 未找到默认管理员账号 '{}'，跳过密码初始化", DEFAULT_ADMIN_USER);
            return;
        }

        if (!PLACEHOLDER.equals(admin.getPassword())) {
            // 密码已初始化，无需操作
            return;
        }

        if (!RoleConstants.COMPANY_LEADER.equals(admin.getRole())) {
            admin.setRole(RoleConstants.COMPANY_LEADER);
        }

        admin.setPassword(PasswordUtil.encode(DEFAULT_PASSWORD));
        sysUserMapper.updateById(admin);

        log.warn("[DataInit] ======================================================");
        log.warn("[DataInit] 管理员账号 [{}] 初始密码已设置为: {}", DEFAULT_ADMIN_USER, DEFAULT_PASSWORD);
        log.warn("[DataInit] 请立即登录并通过「修改密码」接口变更为强密码！");
        log.warn("[DataInit] ======================================================");
    }
}
