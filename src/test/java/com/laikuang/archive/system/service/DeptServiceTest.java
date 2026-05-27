package com.laikuang.archive.system.service;

import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.system.domain.dto.CreateDeptDTO;
import com.laikuang.archive.system.domain.dto.UpdateDeptDTO;
import com.laikuang.archive.system.domain.entity.SysDept;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.domain.vo.DeptTreeVO;
import com.laikuang.archive.system.mapper.SysDeptMapper;
import com.laikuang.archive.system.mapper.SysUserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 1 — S1-05：部门管理集成测试。
 * 覆盖树形结构、循环层级检测、删除约束（有子部门/有用户时拒绝）。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DeptServiceTest {

    @Autowired
    private DeptService deptService;

    @Autowired
    private SysDeptMapper deptMapper;

    @Autowired
    private SysUserMapper userMapper;

    private Long rootDeptId;
    private Long childDeptId;

    @BeforeEach
    void setUp() {
        // 创建根部门
        CreateDeptDTO rootDto = new CreateDeptDTO();
        rootDto.setDeptName("测试集团");
        rootDto.setParentId(0L);
        rootDto.setSortOrder(0);
        deptService.createDept(rootDto);
        rootDeptId = deptMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysDept>()
                        .eq(SysDept::getDeptName, "测试集团")).getDeptId();

        // 创建子部门
        CreateDeptDTO childDto = new CreateDeptDTO();
        childDto.setDeptName("测试子部门");
        childDto.setParentId(rootDeptId);
        childDto.setSortOrder(1);
        deptService.createDept(childDto);
        childDeptId = deptMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysDept>()
                        .eq(SysDept::getDeptName, "测试子部门")).getDeptId();
    }

    @Test
    @DisplayName("获取部门树：应正确组装层级结构")
    void getDeptTreeShouldBuildHierarchy() {
        List<DeptTreeVO> tree = deptService.getDeptTree();
        assertFalse(tree.isEmpty());

        // 找到根节点
        DeptTreeVO root = tree.stream()
                .filter(d -> d.getDeptName().equals("测试集团"))
                .findFirst().orElse(null);
        assertNotNull(root);
        assertNotNull(root.getChildren());
        assertTrue(root.getChildren().stream()
                .anyMatch(c -> c.getDeptName().equals("测试子部门")));
    }

    @Test
    @DisplayName("创建部门-父部门不存在：应拦截")
    void createDeptWithNonExistentParent() {
        CreateDeptDTO dto = new CreateDeptDTO();
        dto.setDeptName("孤儿部门");
        dto.setParentId(99999L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> deptService.createDept(dto));
        assertEquals("上级部门不存在", ex.getMessage());
    }

    @Test
    @DisplayName("更新部门-将自身设为父节点：应拦截")
    void updateDeptSetSelfAsParent() {
        UpdateDeptDTO dto = new UpdateDeptDTO();
        dto.setDeptName("测试集团改名");
        dto.setParentId(rootDeptId); // 自身设为父节点

        BusinessException ex = assertThrows(BusinessException.class,
                () -> deptService.updateDept(rootDeptId, dto));
        assertEquals("不能将自身设为上级部门", ex.getMessage());
    }

    @Test
    @DisplayName("更新部门-将下级设为上级：应拦截循环层级")
    void updateDeptSetDescendantAsParent() {
        // 尝试将 rootDeptId 的父节点设为 childDeptId（下级变上级 -> 循环）
        UpdateDeptDTO dto = new UpdateDeptDTO();
        dto.setDeptName("测试集团改名");
        dto.setParentId(childDeptId);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> deptService.updateDept(rootDeptId, dto));
        assertEquals("不能将下级部门设为上级部门", ex.getMessage());
    }

    @Test
    @DisplayName("删除部门-存在子部门：应拒绝删除")
    void deleteDeptWithChildren() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> deptService.deleteDept(rootDeptId));
        assertTrue(ex.getMessage().contains("存在子部门"));
    }

    @Test
    @DisplayName("删除部门-存在归属用户：应拒绝删除")
    void deleteDeptWithUsers() {
        // 给子部门添加一个用户
        SysUser user = new SysUser();
        user.setUsername("dept_user");
        user.setPassword("PLACEHOLDER");
        user.setNickname("部门用户");
        user.setDeptId(childDeptId);
        user.setRole("user");
        user.setStatus(1);
        userMapper.insert(user);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> deptService.deleteDept(childDeptId));
        assertTrue(ex.getMessage().contains("存在") && ex.getMessage().contains("用户"));
    }

    @Test
    @DisplayName("删除部门-无子部门且无用户：应成功删除")
    void deleteDeptSuccess() {
        // 创建一个无子部门且无用户的部门
        CreateDeptDTO dto = new CreateDeptDTO();
        dto.setDeptName("可删除部门");
        dto.setParentId(rootDeptId);
        deptService.createDept(dto);

        SysDept dept = deptMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysDept>()
                        .eq(SysDept::getDeptName, "可删除部门"));

        assertDoesNotThrow(() -> deptService.deleteDept(dept.getDeptId()));
        assertNull(deptMapper.selectById(dept.getDeptId()));
    }
}
