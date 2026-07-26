package com.laikuang.archive.borrow.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.approve.service.ArchiveApproveService;
import com.laikuang.archive.borrow.domain.converter.ArchiveBorrowConverter;
import com.laikuang.archive.borrow.domain.dto.ArchiveBorrowApplyDTO;
import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowListVO;
import com.laikuang.archive.borrow.domain.vo.ArchiveBorrowVO;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.borrow.service.ArchiveBorrowService;
import com.laikuang.archive.common.constant.*;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysDeptMapper;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.NotificationService;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.MDC;

/**
 * 档案借阅业务实现。
 *
 * 安全关键点：
 *   1. 申请时校验档案状态、库存及重复申请。
 *   2. 批准时通过乐观锁（borrowed_copies 条件）原子扣减库存，防止并发超卖。
 *   3. 普通归还时校验借阅人身份，防止水平越权；管理员归还走独立方法。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveBorrowServiceImpl implements ArchiveBorrowService {

    private final ArchiveBorrowMapper borrowMapper;
    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveBorrowConverter converter;
    private final ArchiveApproveService approveService;
    private final SysUserMapper sysUserMapper;
    private final SysDeptMapper sysDeptMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveBorrowVO apply(ArchiveBorrowApplyDTO dto) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        String currentDept = getCurrentUserDept(currentUserId);
        int applyCount = dto.getApplyCount() == null ? 1 : dto.getApplyCount();

        // 1. 校验档案存在且已正式归档
        ArchiveVolume volume = selectVolumeByArchiveNoAndYear(dto.getArchiveNo(), dto.getYear());
        if (!Integer.valueOf(ArchiveStatus.ARCHIVED).equals(volume.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID, "仅已正式归档案卷支持借阅");
        }
        if (Integer.valueOf(1).equals(volume.getDestroyFlag())) {
            throw new BusinessException(ResultCode.ARCHIVE_DESTROYED, "该档案已标记销毁，不可借阅");
        }

        // 2. 校验库存：已借出份数 + 申请份数 <= 总份数
        int currentBorrowed = volume.getBorrowedCopies() == null ? 0 : volume.getBorrowedCopies();
        int copies = volume.getCopies() == null ? 1 : volume.getCopies();
        if (currentBorrowed + applyCount > copies) {
            throw new BusinessException(ResultCode.ARCHIVE_STOCK_EMPTY,
                    String.format("该档案剩余可借份数不足，当前在库 %d 份，申请 %d 份", copies - currentBorrowed, applyCount));
        }

        // 3. 校验重复申请：同一申请人对同一档案不能有待审批或已借出记录
        Long existingCount = borrowMapper.selectCount(
                new LambdaQueryWrapper<ArchiveBorrow>()
                        .eq(ArchiveBorrow::getBorrowerId, currentUserId)
                        .eq(ArchiveBorrow::getArchiveNo, dto.getArchiveNo())
                        .in(ArchiveBorrow::getStatus, BorrowStatus.PENDING, BorrowStatus.BORROWED));
        if (existingCount > 0) {
            throw new BusinessException(ResultCode.BORROW_REPEAT, "您已存在该档案的待审批或已借出记录，不可重复申请");
        }

        // 4. 解析计划归还日期
        LocalDateTime planReturnDate = null;
        if (dto.getPlanReturnDate() != null && !dto.getPlanReturnDate().isBlank()) {
            try {
                planReturnDate = java.time.LocalDate.parse(dto.getPlanReturnDate())
                        .atTime(23, 59, 59);
            } catch (Exception e) {
                throw new BusinessException(ResultCode.PARAM_FORMAT_ERROR, "计划归还日期格式错误，应为 yyyy-MM-dd");
            }
        } else if (dto.getBorrowDays() != null) {
            planReturnDate = LocalDateTime.now().plusDays(dto.getBorrowDays()).withHour(23).withMinute(59).withSecond(59);
        }

        // 5. 创建借阅申请
        ArchiveBorrow borrow = new ArchiveBorrow();
        borrow.setBorrowerId(currentUserId);
        borrow.setBorrowerDept(currentDept);
        borrow.setArchiveNo(dto.getArchiveNo());
        borrow.setApplyCount(applyCount);
        borrow.setReason(dto.getReason());
        borrow.setPlanReturnDate(planReturnDate);
        borrow.setStatus(BorrowStatus.PENDING);
        borrowMapper.insert(borrow);

        log.info("[AUDIT-BORROW] 用户发起借阅申请，userId={}, borrowId={}, archiveNo={}, applyCount={}, ip={}, traceId={}",
                currentUserId, borrow.getBorrowId(), dto.getArchiveNo(), applyCount, MDC.get("clientIP"), MDC.get("traceId"));

        return enrichBorrowVO(borrow);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void approve(Long borrowId, Integer borrowDays, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveBorrow borrow = selectBorrowById(borrowId);

        if (!Integer.valueOf(BorrowStatus.PENDING).equals(borrow.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID, "仅待审批状态支持批准操作");
        }

        ArchiveVolume volume = selectVolumeByArchiveNo(borrow.getArchiveNo());

        int applyCount = borrow.getApplyCount() == null ? 1 : borrow.getApplyCount();
        int currentBorrowed = volume.getBorrowedCopies() == null ? 0 : volume.getBorrowedCopies();
        int newBorrowed = currentBorrowed + applyCount;

        if (newBorrowed > volume.getCopies()) {
            throw new BusinessException(ResultCode.ARCHIVE_STOCK_EMPTY, "档案库存不足");
        }

        ArchiveVolume updateVolume = new ArchiveVolume();
        updateVolume.setBorrowedCopies(newBorrowed);
        updateVolume.setInStock(newBorrowed >= volume.getCopies() ? 0 : 1);

        int affected = volumeMapper.update(updateVolume,
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getRecordId, volume.getRecordId())
                        .eq(ArchiveVolume::getYear, volume.getYear())
                        .eq(ArchiveVolume::getBorrowedCopies, currentBorrowed));

        if (affected == 0) {
            throw new BusinessException(ResultCode.ARCHIVE_STOCK_EMPTY, "档案库存不足或并发冲突，请重试");
        }

        LocalDateTime now = LocalDateTime.now();
        ArchiveBorrow updateBorrow = new ArchiveBorrow();
        updateBorrow.setBorrowId(borrowId);
        updateBorrow.setStatus(BorrowStatus.BORROWED);
        updateBorrow.setBorrowDate(now);

        if (borrow.getPlanReturnDate() != null) {
            updateBorrow.setPlanReturnDate(borrow.getPlanReturnDate());
        } else if (borrowDays != null) {
            updateBorrow.setPlanReturnDate(now.plusDays(borrowDays).withHour(23).withMinute(59).withSecond(59));
        }
        borrowMapper.updateById(updateBorrow);

        approveService.saveLog(ApproveBusinessType.BORROW_APPROVE, borrowId, ApproveAction.PASS, opinion);

        log.info("[AUDIT-BORROW] 管理员批准借阅，approverId={}, borrowId={}, archiveNo={}, applyCount={}, opinion={}, ip={}, traceId={}",
                currentUserId, borrowId, borrow.getArchiveNo(), applyCount, opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reject(Long borrowId, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveBorrow borrow = selectBorrowById(borrowId);

        if (!Integer.valueOf(BorrowStatus.PENDING).equals(borrow.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID, "仅待审批状态支持驳回操作");
        }

        ArchiveBorrow update = new ArchiveBorrow();
        update.setBorrowId(borrowId);
        update.setStatus(BorrowStatus.REJECTED);
        borrowMapper.updateById(update);

        approveService.saveLog(ApproveBusinessType.BORROW_APPROVE, borrowId, ApproveAction.REJECT, opinion);

        log.info("[AUDIT-BORROW] 管理员驳回借阅，approverId={}, borrowId={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, borrowId, borrow.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void returnBorrow(Long borrowId) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveBorrow borrow = selectBorrowById(borrowId);

        if (!Integer.valueOf(BorrowStatus.BORROWED).equals(borrow.getStatus())
                && !Integer.valueOf(BorrowStatus.OVERDUE).equals(borrow.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID, "仅已借出或逾期状态支持归还操作");
        }

        // 水平越权校验：只能归还自己的借阅单
        if (!currentUserId.equals(borrow.getBorrowerId())) {
            throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL, "无权归还他人的借阅记录");
        }

        doReturn(borrow, currentUserId, "用户自主归还");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adminReturn(Long borrowId, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveBorrow borrow = selectBorrowById(borrowId);

        if (!Integer.valueOf(BorrowStatus.BORROWED).equals(borrow.getStatus())
                && !Integer.valueOf(BorrowStatus.OVERDUE).equals(borrow.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID, "仅已借出或逾期状态支持归还操作");
        }

        doReturn(borrow, currentUserId, opinion != null ? opinion : "管理员登记归还");
    }

    private void doReturn(ArchiveBorrow borrow, Long operatorId, String note) {
        ArchiveVolume volume = selectVolumeByArchiveNo(borrow.getArchiveNo());

        int currentBorrowed = volume.getBorrowedCopies() == null ? 0 : volume.getBorrowedCopies();
        int applyCount = borrow.getApplyCount() == null ? 1 : borrow.getApplyCount();
        int newBorrowed = Math.max(0, currentBorrowed - applyCount);

        ArchiveVolume updateVolume = new ArchiveVolume();
        updateVolume.setBorrowedCopies(newBorrowed);
        updateVolume.setInStock(1);

        int affected = volumeMapper.update(updateVolume,
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getRecordId, volume.getRecordId())
                        .eq(ArchiveVolume::getYear, volume.getYear())
                        .eq(ArchiveVolume::getBorrowedCopies, currentBorrowed));

        if (affected == 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "归还失败，档案状态可能已被其他操作修改，请重试");
        }

        ArchiveBorrow updateBorrow = new ArchiveBorrow();
        updateBorrow.setBorrowId(borrow.getBorrowId());
        updateBorrow.setStatus(BorrowStatus.RETURNED);
        updateBorrow.setActualReturnDate(LocalDateTime.now());
        borrowMapper.updateById(updateBorrow);

        log.info("[AUDIT-BORROW] 归还档案，operatorId={}, borrowId={}, archiveNo={}, note={}, ip={}, traceId={}",
                operatorId, borrow.getBorrowId(), borrow.getArchiveNo(), note, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    public IPage<ArchiveBorrowListVO> pageMyBorrows(PageQuery pageQuery, Integer status) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        Page<ArchiveBorrow> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveBorrow> wrapper = new LambdaQueryWrapper<ArchiveBorrow>()
                .eq(ArchiveBorrow::getBorrowerId, currentUserId)
                .eq(status != null, ArchiveBorrow::getStatus, status)
                .orderByDesc(ArchiveBorrow::getCreatedAt);
        return borrowMapper.selectPage(page, wrapper).convert(this::enrichListVO);
    }

    @Override
    public IPage<ArchiveBorrowListVO> pagePendingApprovals(PageQuery pageQuery, String keyword) {
        Page<ArchiveBorrow> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveBorrow> wrapper = new LambdaQueryWrapper<ArchiveBorrow>()
                .eq(ArchiveBorrow::getStatus, BorrowStatus.PENDING)
                .and(StringUtils.hasText(keyword), w ->
                        w.like(ArchiveBorrow::getArchiveNo, keyword)
                         .or()
                         .like(ArchiveBorrow::getBorrowerDept, keyword))
                .orderByDesc(ArchiveBorrow::getCreatedAt);
        return borrowMapper.selectPage(page, wrapper).convert(this::enrichListVO);
    }

    @Override
    public ArchiveBorrowVO getBorrowDetail(Long borrowId) {
        ArchiveBorrow borrow = selectBorrowById(borrowId);
        Long currentUserId = StpUtil.getLoginIdAsLong();

        boolean isAdmin = StpUtil.hasPermission(PermissionConstants.BORROW_APPROVE);
        if (!currentUserId.equals(borrow.getBorrowerId()) && !isAdmin) {
            throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL, "无权查看该借阅记录");
        }

        return enrichBorrowVO(borrow);
    }

    @Override
    public IPage<ArchiveBorrowListVO> pageDeptHistory(PageQuery pageQuery, Integer status) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        var currentUser = sysUserMapper.selectById(currentUserId);
        if (currentUser == null || currentUser.getDeptId() == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "当前用户部门信息缺失");
        }

        List<Long> deptUserIds = sysUserMapper.selectList(
                        new LambdaQueryWrapper<SysUser>()
                                .eq(SysUser::getDeptId, currentUser.getDeptId())
                                .select(SysUser::getUserId))
                .stream()
                .map(SysUser::getUserId)
                .toList();

        if (deptUserIds.isEmpty()) {
            return new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        }

        Page<ArchiveBorrow> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveBorrow> wrapper = buildHistoryWrapper(status)
                .in(ArchiveBorrow::getBorrowerId, deptUserIds)
                .orderByDesc(ArchiveBorrow::getCreatedAt);
        return borrowMapper.selectPage(page, wrapper).convert(this::enrichListVO);
    }

    @Override
    public IPage<ArchiveBorrowListVO> pageAllHistory(PageQuery pageQuery, String deptName, Integer status) {
        Page<ArchiveBorrow> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveBorrow> wrapper = buildHistoryWrapper(status)
                .eq(StringUtils.hasText(deptName), ArchiveBorrow::getBorrowerDept, deptName)
                .orderByDesc(ArchiveBorrow::getCreatedAt);
        return borrowMapper.selectPage(page, wrapper).convert(this::enrichListVO);
    }

    private LambdaQueryWrapper<ArchiveBorrow> buildHistoryWrapper(Integer status) {
        LambdaQueryWrapper<ArchiveBorrow> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(ArchiveBorrow::getStatus, status);
        } else {
            wrapper.in(ArchiveBorrow::getStatus,
                    BorrowStatus.RETURNED, BorrowStatus.REJECTED, BorrowStatus.OVERDUE);
        }
        return wrapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void scanOverdue() {
        LocalDateTime now = LocalDateTime.now();

        LambdaQueryWrapper<ArchiveBorrow> overdueWrapper = new LambdaQueryWrapper<ArchiveBorrow>()
                .eq(ArchiveBorrow::getStatus, BorrowStatus.BORROWED)
                .lt(ArchiveBorrow::getPlanReturnDate, now);
        List<ArchiveBorrow> overdueList = borrowMapper.selectList(overdueWrapper);

        for (ArchiveBorrow borrow : overdueList) {
            ArchiveBorrow update = new ArchiveBorrow();
            update.setBorrowId(borrow.getBorrowId());
            update.setStatus(BorrowStatus.OVERDUE);
            borrowMapper.updateById(update);

            notificationService.sendNotification(
                    borrow.getBorrowerId(),
                    "借阅逾期提醒",
                    String.format("您借阅的档案 [%s] 已逾期未归还，请尽快处理。", borrow.getArchiveNo()),
                    2,
                    borrow.getBorrowId());

            log.info("[AUDIT-OVERDUE] 借阅单逾期状态更新，borrowId={}, archiveNo={}, ip={}, traceId={}",
                    borrow.getBorrowId(), borrow.getArchiveNo(), MDC.get("clientIP"), MDC.get("traceId"));
        }

        LocalDateTime threeDaysLater = now.plusDays(3);
        LambdaQueryWrapper<ArchiveBorrow> remindWrapper = new LambdaQueryWrapper<ArchiveBorrow>()
                .eq(ArchiveBorrow::getStatus, BorrowStatus.BORROWED)
                .ge(ArchiveBorrow::getPlanReturnDate, now)
                .le(ArchiveBorrow::getPlanReturnDate, threeDaysLater);
        List<ArchiveBorrow> remindList = borrowMapper.selectList(remindWrapper);

        for (ArchiveBorrow borrow : remindList) {
            long remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), borrow.getPlanReturnDate().toLocalDate());
            notificationService.sendNotification(
                    borrow.getBorrowerId(),
                    "借阅到期提醒",
                    String.format("您借阅的档案 [%s] 将于 %d 天后到期，请及时归还。",
                            borrow.getArchiveNo(), remainingDays),
                    1,
                    borrow.getBorrowId());
        }

        log.info("[AUDIT-SCAN] 借阅逾期扫描完成，逾期数量={}, 到期提醒数量={}, ip={}, traceId={}",
                overdueList.size(), remindList.size(), MDC.get("clientIP"), MDC.get("traceId"));
    }

    // ==================== 内部工具 ====================

    private ArchiveBorrow selectBorrowById(Long borrowId) {
        ArchiveBorrow borrow = borrowMapper.selectById(borrowId);
        if (borrow == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "借阅记录不存在");
        }
        return borrow;
    }

    private ArchiveVolume selectVolumeByArchiveNoAndYear(String archiveNo, String year) {
        ArchiveVolume volume = volumeMapper.selectOne(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getArchiveNo, archiveNo)
                        .eq(ArchiveVolume::getYear, year)
                        .eq(ArchiveVolume::getDestroyFlag, 0)
                        , false);
        if (volume == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "档案不存在或已销毁");
        }
        return volume;
    }

    private ArchiveVolume selectVolumeByArchiveNo(String archiveNo) {
        ArchiveVolume volume = volumeMapper.selectOne(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getArchiveNo, archiveNo)
                        .eq(ArchiveVolume::getDestroyFlag, 0)
                        , false);
        if (volume == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "档案不存在或已销毁");
        }
        return volume;
    }

    private String getCurrentUserDept(Long userId) {
        var user = sysUserMapper.selectById(userId);
        if (user == null || user.getDeptId() == null) {
            return "";
        }
        var dept = sysDeptMapper.selectById(user.getDeptId());
        return dept != null ? dept.getDeptName() : "";
    }

    private ArchiveBorrowVO enrichBorrowVO(ArchiveBorrow borrow) {
        ArchiveBorrowVO vo = converter.toVO(borrow);
        vo.setStatusName(resolveBorrowStatusName(borrow.getStatus()));
        computeRemindInfo(vo, borrow.getPlanReturnDate(), borrow.getStatus());

        var user = sysUserMapper.selectById(borrow.getBorrowerId());
        if (user != null) {
            vo.setBorrowerName(user.getNickname());
            vo.setBorrowerPhone(PasswordUtil.desensitizePhone(user.getPhone()));
        }

        ArchiveVolume volume = volumeMapper.selectOne(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getArchiveNo, borrow.getArchiveNo())
                        .eq(ArchiveVolume::getDestroyFlag, 0)
                        , false);
        if (volume != null) {
            vo.setVolumeTitle(volume.getVolumeTitle());
            int copies = volume.getCopies() == null ? 0 : volume.getCopies();
            int borrowed = volume.getBorrowedCopies() == null ? 0 : volume.getBorrowedCopies();
            vo.setVolumeCopies(copies);
            vo.setVolumeAvailable(Math.max(0, copies - borrowed));
        }
        return vo;
    }

    private ArchiveBorrowListVO enrichListVO(ArchiveBorrow borrow) {
        ArchiveBorrowListVO vo = converter.toListVO(borrow);
        vo.setStatusName(resolveBorrowStatusName(borrow.getStatus()));
        computeRemindInfo(vo, borrow.getPlanReturnDate(), borrow.getStatus());

        var user = sysUserMapper.selectById(borrow.getBorrowerId());
        if (user != null) {
            vo.setBorrowerName(user.getNickname());
            vo.setBorrowerPhone(PasswordUtil.desensitizePhone(user.getPhone()));
        }

        ArchiveVolume volume = volumeMapper.selectOne(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getArchiveNo, borrow.getArchiveNo())
                        .eq(ArchiveVolume::getDestroyFlag, 0)
                        , false);
        if (volume != null) {
            vo.setVolumeTitle(volume.getVolumeTitle());
            int copies = volume.getCopies() == null ? 0 : volume.getCopies();
            int borrowed = volume.getBorrowedCopies() == null ? 0 : volume.getBorrowedCopies();
            vo.setVolumeCopies(copies);
            vo.setVolumeAvailable(Math.max(0, copies - borrowed));
        }
        return vo;
    }

    private void computeRemindInfo(Object vo, LocalDateTime planReturnDate, Integer status) {
        if (planReturnDate == null || Integer.valueOf(BorrowStatus.RETURNED).equals(status)
                || Integer.valueOf(BorrowStatus.REJECTED).equals(status)
                || Integer.valueOf(BorrowStatus.PENDING).equals(status)) {
            setRemindFields(vo, null, 0);
            return;
        }

        long days = ChronoUnit.DAYS.between(LocalDate.now(), planReturnDate.toLocalDate());
        int remainingDays = (int) days;
        int remindLevel;
        if (days < 0) {
            remindLevel = 2;
        } else if (days <= 3) {
            remindLevel = 1;
        } else {
            remindLevel = 0;
        }
        setRemindFields(vo, remainingDays, remindLevel);
    }

    private void setRemindFields(Object vo, Integer remainingDays, Integer remindLevel) {
        if (vo instanceof ArchiveBorrowVO v) {
            v.setRemainingDays(remainingDays);
            v.setRemindLevel(remindLevel);
        } else if (vo instanceof ArchiveBorrowListVO v) {
            v.setRemainingDays(remainingDays);
            v.setRemindLevel(remindLevel);
        }
    }

    private String resolveBorrowStatusName(Integer status) {
        if (status == null) return "未知";
        return switch (status) {
            case BorrowStatus.PENDING -> "待审批";
            case BorrowStatus.BORROWED -> "已借出";
            case BorrowStatus.REJECTED -> "已驳回";
            case BorrowStatus.RETURNED -> "已归还";
            case BorrowStatus.OVERDUE -> "逾期未归还";
            default -> "未知";
        };
    }
}
