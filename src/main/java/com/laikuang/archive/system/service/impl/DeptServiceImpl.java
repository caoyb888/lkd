package com.laikuang.archive.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.system.domain.dto.CreateDeptDTO;
import com.laikuang.archive.system.domain.dto.UpdateDeptDTO;
import com.laikuang.archive.system.domain.entity.SysDept;
import com.laikuang.archive.system.domain.vo.DeptTreeVO;
import com.laikuang.archive.system.mapper.SysDeptMapper;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.DeptService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 部门管理业务实现。
 * 树形结构在 Java 内存中组装（部门数量有限，无需数据库递归 CTE）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeptServiceImpl implements DeptService {

    private final SysDeptMapper deptMapper;
    private final SysUserMapper userMapper;

    @Override
    public List<DeptTreeVO> getDeptTree() {
        List<SysDept> all = deptMapper.selectList(null);
        return buildTree(all, 0L);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createDept(CreateDeptDTO dto) {
        Long parentId = dto.getParentId() == null ? 0L : dto.getParentId();

        // 父部门必须存在（非根节点时校验）
        if (parentId != 0L && deptMapper.selectById(parentId) == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "上级部门不存在");
        }

        SysDept dept = new SysDept();
        dept.setDeptName(dto.getDeptName());
        dept.setParentId(parentId);
        dept.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
        deptMapper.insert(dept);

        log.info("[Dept] 创建部门：deptName={}, parentId={}", dto.getDeptName(), parentId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateDept(Long deptId, UpdateDeptDTO dto) {
        SysDept existing = assertDeptExists(deptId);

        Long parentId = dto.getParentId() == null ? existing.getParentId() : dto.getParentId();

        // 不能将自身设为父节点
        if (deptId.equals(parentId)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不能将自身设为上级部门");
        }

        // 不能将自身下级设为父节点（防止循环层级）
        if (parentId != 0L && isDescendant(deptId, parentId)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不能将下级部门设为上级部门");
        }

        SysDept update = new SysDept();
        update.setDeptId(deptId);
        update.setDeptName(dto.getDeptName());
        update.setParentId(parentId);
        if (dto.getSortOrder() != null) {
            update.setSortOrder(dto.getSortOrder());
        }
        deptMapper.updateById(update);

        log.info("[Dept] 更新部门：deptId={}, deptName={}", deptId, dto.getDeptName());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDept(Long deptId) {
        assertDeptExists(deptId);

        // 1. 有子部门时不允许删除
        Long childCount = deptMapper.selectCount(
                new LambdaQueryWrapper<SysDept>().eq(SysDept::getParentId, deptId));
        if (childCount > 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "该部门下存在子部门，请先删除或迁移子部门后再操作");
        }

        // 2. 有归属用户时不允许删除
        Long userCount = userMapper.selectCount(
                new LambdaQueryWrapper<>(com.laikuang.archive.system.domain.entity.SysUser.class)
                        .eq(com.laikuang.archive.system.domain.entity.SysUser::getDeptId, deptId));
        if (userCount > 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "该部门下存在 " + userCount + " 名用户，请先迁移用户后再操作");
        }

        deptMapper.deleteById(deptId);
        log.info("[Dept] 删除部门：deptId={}", deptId);
    }

    // ======== 内部工具 ========

    /**
     * 递归构建部门树。
     * @param all      全量部门列表
     * @param parentId 当前层级父节点ID（根节点为0）
     */
    private List<DeptTreeVO> buildTree(List<SysDept> all, Long parentId) {
        Map<Long, List<SysDept>> groupByParent = all.stream()
                .collect(Collectors.groupingBy(d -> d.getParentId() == null ? 0L : d.getParentId()));

        return buildChildren(groupByParent, parentId);
    }

    private List<DeptTreeVO> buildChildren(Map<Long, List<SysDept>> groupByParent, Long parentId) {
        List<SysDept> children = groupByParent.get(parentId);
        if (children == null || children.isEmpty()) {
            return null;
        }
        children.sort(Comparator.comparingInt(d -> d.getSortOrder() == null ? 0 : d.getSortOrder()));

        List<DeptTreeVO> result = new ArrayList<>();
        for (SysDept dept : children) {
            DeptTreeVO vo = new DeptTreeVO();
            vo.setDeptId(dept.getDeptId());
            vo.setDeptName(dept.getDeptName());
            vo.setParentId(dept.getParentId());
            vo.setSortOrder(dept.getSortOrder());
            vo.setChildren(buildChildren(groupByParent, dept.getDeptId()));
            result.add(vo);
        }
        return result;
    }

    /**
     * 检查 candidateParentId 是否是 deptId 的后代节点。
     * 用于防止循环层级（将下级设为上级）。
     */
    private boolean isDescendant(Long ancestorId, Long candidateId) {
        List<SysDept> all = deptMapper.selectList(null);
        Map<Long, Long> parentMap = all.stream()
                .filter(d -> d.getParentId() != null && d.getParentId() != 0L)
                .collect(Collectors.toMap(SysDept::getDeptId, SysDept::getParentId));

        Long current = candidateId;
        while (current != null && current != 0L) {
            if (current.equals(ancestorId)) {
                return true;
            }
            current = parentMap.get(current);
        }
        return false;
    }

    private SysDept assertDeptExists(Long deptId) {
        SysDept dept = deptMapper.selectById(deptId);
        if (dept == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "部门不存在");
        }
        return dept;
    }
}
