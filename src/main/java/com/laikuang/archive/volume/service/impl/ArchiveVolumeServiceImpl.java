package com.laikuang.archive.volume.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.alibaba.excel.EasyExcel;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.laikuang.archive.approve.service.ArchiveApproveService;
import com.laikuang.archive.common.constant.*;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.common.exception.SystemException;
import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.file.mapper.ArchiveFileMapper;
import com.laikuang.archive.system.domain.vo.DictItemVO;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.system.service.DictService;
import com.laikuang.archive.volume.domain.converter.ArchiveVolumeConverter;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeImportDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeSaveDTO;
import com.laikuang.archive.volume.domain.dto.ArchiveVolumeUpdateDTO;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.domain.vo.ArchiveNoPreviewVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeImportResultVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeListVO;
import com.laikuang.archive.volume.domain.vo.ArchiveVolumeVO;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import com.laikuang.archive.volume.service.ArchiveVolumeService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;
import org.slf4j.MDC;

/**
 * 案卷级目录业务实现。
 *
 * 安全关键点：
 *   1. 新建案卷时自动将当前登录用户ID及昵称写入 compilerId / compiler，防止伪造。
 *   2. 修改/删除/提交审核前必须在 DB 层校验 status = 0 且 compilerId = currentUserId，防止水平越权。
 *   3. 档号生成采用"查询最大案卷号 +1"策略，正式保存前再次校验 uk_archive_no_year 唯一索引。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveVolumeServiceImpl implements ArchiveVolumeService {

    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveFileMapper   fileMapper;
    private final SysUserMapper       userMapper;
    private final ArchiveVolumeConverter converter;
    private final DictService         dictService;
    private final ArchiveApproveService approveService;

    // ==================== 核心 CRUD ====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveVolumeVO createVolume(ArchiveVolumeSaveDTO dto) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        String nickname = getNickname(currentUserId);

        // 1. 生成档号与案卷号
        String suggestedVolumeNo = generateNextVolumeNo(
                dto.getYear(), dto.getFondsNo(), dto.getCategoryL1(),
                dto.getCategoryL2(), dto.getCategoryL3(), dto.getDeviceCode());
        String archiveNo = buildArchiveNo(dto, suggestedVolumeNo);

        // 2. 校验档号唯一性（双重保险，依赖数据库 uk_archive_no_year）
        assertArchiveNoUnique(dto.getYear(), archiveNo);

        // 3. DTO -> Entity
        ArchiveVolume volume = converter.toEntity(dto);
        volume.setVolumeNo(suggestedVolumeNo);
        volume.setArchiveNo(archiveNo);
        volume.setStatus(0);          // 草稿
        volume.setInStock(1);         // 在库
        volume.setCopies(volume.getCopies() == null ? 1 : volume.getCopies());
        volume.setBorrowedCopies(0);
        volume.setCompiler(nickname);
        volume.setCompilerId(currentUserId);

        volumeMapper.insert(volume);

        log.info("[AUDIT-VOLUME] 立卷人创建案卷草稿，userId={}, archiveNo={}, year={}, ip={}, traceId={}",
                currentUserId, archiveNo, dto.getYear(), MDC.get("clientIP"), MDC.get("traceId"));
        return getVolumeDetail(volume.getRecordId(), dto.getYear());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateVolume(Long recordId, String year, ArchiveVolumeUpdateDTO dto) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertVolumeEditable(volume, currentUserId);

        converter.updateEntity(volume, dto);
        // 重新拼接档号（因分类或设备代号可能变化）
        String newArchiveNo = buildArchiveNo(volume);
        if (!newArchiveNo.equals(volume.getArchiveNo())) {
            assertArchiveNoUnique(year, newArchiveNo);
            volume.setArchiveNo(newArchiveNo);
        }

        volumeMapper.update(volume, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        log.info("[AUDIT-VOLUME] 立卷人更新案卷草稿，userId={}, recordId={}, year={}, ip={}, traceId={}",
                currentUserId, recordId, year, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteVolume(Long recordId, String year) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertVolumeEditable(volume, currentUserId);

        // 逻辑删除（@TableLogic 自动处理 destroy_flag = 1）
        volumeMapper.delete(new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        log.info("[AUDIT-VOLUME] 立卷人删除案卷草稿，userId={}, recordId={}, year={}, archiveNo={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void submitForReview(Long recordId, String year) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertVolumeEditable(volume, currentUserId);

        // 草稿 → 待审核
        ArchiveVolume update = new ArchiveVolume();
        update.setStatus(ArchiveStatus.PENDING_REVIEW);
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        log.info("[AUDIT-VOLUME] 立卷人提交审核，userId={}, recordId={}, year={}, archiveNo={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reviewPass(Long recordId, String year, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertCanReview(volume);

        // 待审核 → 待确认
        ArchiveVolume update = new ArchiveVolume();
        update.setStatus(ArchiveStatus.PENDING_CONFIRM);
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        approveService.saveLog(ApproveBusinessType.ARCHIVE_REVIEW, recordId, ApproveAction.PASS, opinion);

        log.info("[AUDIT-APPROVE] 审核通过，userId={}, recordId={}, year={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reviewReject(Long recordId, String year, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertCanReview(volume);

        // 待审核 → 草稿
        ArchiveVolume update = new ArchiveVolume();
        update.setStatus(ArchiveStatus.DRAFT);
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        approveService.saveLog(ApproveBusinessType.ARCHIVE_REVIEW, recordId, ApproveAction.REJECT, opinion);

        log.info("[AUDIT-APPROVE] 审核驳回，userId={}, recordId={}, year={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void archiveConfirm(Long recordId, String year, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertCanConfirm(volume);

        // 确认归档时，再次校验档号唯一性（排除自身，防止并发重档）
        assertArchiveNoUnique(year, volume.getArchiveNo(), recordId);

        // 待确认 → 已正式归档
        ArchiveVolume update = new ArchiveVolume();
        update.setStatus(ArchiveStatus.ARCHIVED);
        update.setArchiveDate(LocalDate.now());
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        approveService.saveLog(ApproveBusinessType.ARCHIVE_CONFIRM, recordId, ApproveAction.PASS, opinion);

        log.info("[AUDIT-ARCHIVE] 档案管理员确认归档，userId={}, recordId={}, year={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void archiveBack(Long recordId, String year, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertCanConfirm(volume);

        // 待确认 → 待审核
        ArchiveVolume update = new ArchiveVolume();
        update.setStatus(ArchiveStatus.PENDING_REVIEW);
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        approveService.saveLog(ApproveBusinessType.ARCHIVE_CONFIRM, recordId, ApproveAction.BACK, opinion);

        log.info("[AUDIT-ARCHIVE] 档案管理员退回上一级，userId={}, recordId={}, year={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    // ==================== 销毁审批 ====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void applyDestroy(Long recordId, String year, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        assertCanDestroy(volume);
        if (Integer.valueOf(1).equals(volume.getPendingDestroy())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID, "该档案已处于销毁待审批状态，不可重复申请");
        }

        // 标记销毁待审批
        ArchiveVolume update = new ArchiveVolume();
        update.setPendingDestroy(1);
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        approveService.saveLog(ApproveBusinessType.DESTROY_APPROVE, recordId, ApproveAction.APPLY, opinion);

        log.info("[AUDIT-DESTROY] 管理员提交销毁申请，userId={}, recordId={}, year={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void approveDestroy(Long recordId, String year, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        if (volume == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "案卷不存在");
        }
        if (Integer.valueOf(1).equals(volume.getDestroyFlag())) {
            throw new BusinessException(ResultCode.ARCHIVE_DESTROYED, "该档案已标记销毁");
        }

        // 清除销毁待审批标记
        ArchiveVolume update = new ArchiveVolume();
        update.setPendingDestroy(0);
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        // 执行逻辑软删除（destroy_flag = 1）
        // 由于 @TableLogic 的存在，update 方法不会更新逻辑删除字段，
        // 需使用 delete 方法触发 MP 自动转换：UPDATE ... SET destroy_flag = 1
        int affected = volumeMapper.delete(new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));
        if (affected == 0) {
            throw new BusinessException(ResultCode.ARCHIVE_DESTROYED, "该档案已标记销毁");
        }

        approveService.saveLog(ApproveBusinessType.DESTROY_APPROVE, recordId, ApproveAction.PASS, opinion);

        log.info("[AUDIT-DESTROY] 公司领导审批通过销毁，userId={}, recordId={}, year={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void rejectDestroy(Long recordId, String year, String opinion) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        // 已销毁或已归档均可驳回（只要存在即可）
        if (volume == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "案卷不存在");
        }

        // 清除销毁待审批标记，恢复为正常已归档状态
        ArchiveVolume update = new ArchiveVolume();
        update.setPendingDestroy(0);
        volumeMapper.update(update, new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getRecordId, recordId)
                .eq(ArchiveVolume::getYear, year));

        approveService.saveLog(ApproveBusinessType.DESTROY_APPROVE, recordId, ApproveAction.REJECT, opinion);

        log.info("[AUDIT-DESTROY] 公司领导审批驳回销毁，userId={}, recordId={}, year={}, archiveNo={}, opinion={}, ip={}, traceId={}",
                currentUserId, recordId, year, volume.getArchiveNo(), opinion, MDC.get("clientIP"), MDC.get("traceId"));
    }

    // ==================== 查询 ====================

    @Override
    public ArchiveVolumeVO getVolumeDetail(Long recordId, String year) {
        ArchiveVolume volume = selectByRecordIdAndYear(recordId, year);
        Long currentUserId = StpUtil.getLoginIdAsLong();

        // 草稿状态：仅限立卷人本人查看
        if (Integer.valueOf(ArchiveStatus.DRAFT).equals(volume.getStatus())) {
            if (!currentUserId.equals(volume.getCompilerId())) {
                throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL, "无权查看该草稿");
            }
        }
        // 待审核 / 待确认：立卷人可只读查看，管理员可查看，其他人不可见
        else if (Integer.valueOf(ArchiveStatus.PENDING_REVIEW).equals(volume.getStatus())
                || Integer.valueOf(ArchiveStatus.PENDING_CONFIRM).equals(volume.getStatus())) {
            boolean isCompiler = currentUserId.equals(volume.getCompilerId());
            boolean isAdmin = StpUtil.hasPermission(PermissionConstants.ARCHIVE_MANAGE);
            if (!isCompiler && !isAdmin) {
                throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL, "无权查看该档案");
            }
        }
        // 已正式归档：全员可查（无需额外限制）

        ArchiveVolumeVO vo = converter.toVO(volume);
        fillDetailDictLabels(vo);

        // 加载卷内文件列表（按 seq_no 排序，关联键为唯一档号）
        List<ArchiveFile> files = fileMapper.selectList(
                new LambdaQueryWrapper<ArchiveFile>()
                        .eq(ArchiveFile::getArchiveNo, volume.getArchiveNo())
                        .eq(ArchiveFile::getYear, year)
                        .eq(ArchiveFile::getDestroyFlag, 0)
                        .orderByAsc(ArchiveFile::getSeqNo));
        vo.setFileList(converter.toFileBriefVO(files));
        return vo;
    }

    @Override
    public IPage<ArchiveVolumeListVO> pageVolumes(PageQuery pageQuery, String year,
                                                  String fondsNo, String categoryL1,
                                                  String categoryL2, String categoryL3,
                                                  String deviceCode, Integer status,
                                                  String securityLevel, Integer inStock,
                                                  String archiveNo, String keyword) {
        Page<ArchiveVolume> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        // status 默认 3（已归档），-1 表示不过滤状态
        Integer targetStatus = (status == null) ? 3 : (status == -1 ? null : status);

        LambdaQueryWrapper<ArchiveVolume> wrapper = new LambdaQueryWrapper<ArchiveVolume>()
                .eq(targetStatus != null, ArchiveVolume::getStatus, targetStatus)
                .eq(StringUtils.hasText(year), ArchiveVolume::getYear, year)
                .eq(StringUtils.hasText(fondsNo), ArchiveVolume::getFondsNo, fondsNo)
                .eq(StringUtils.hasText(categoryL1), ArchiveVolume::getCategoryL1, categoryL1)
                .eq(StringUtils.hasText(categoryL2), ArchiveVolume::getCategoryL2, categoryL2)
                .eq(StringUtils.hasText(categoryL3), ArchiveVolume::getCategoryL3, categoryL3)
                .eq(StringUtils.hasText(deviceCode), ArchiveVolume::getDeviceCode, deviceCode)
                .eq(StringUtils.hasText(securityLevel), ArchiveVolume::getSecurityLevel, securityLevel)
                .eq(inStock != null, ArchiveVolume::getInStock, inStock)
                .eq(StringUtils.hasText(archiveNo), ArchiveVolume::getArchiveNo, archiveNo)
                .and(StringUtils.hasText(keyword), w -> w
                        .like(ArchiveVolume::getVolumeTitle, keyword)
                        .or()
                        .like(ArchiveVolume::getArchiveNo, keyword))
                .orderByDesc(ArchiveVolume::getCreatedAt);

        IPage<ArchiveVolumeListVO> result = volumeMapper.selectPage(page, wrapper).convert(converter::toListVO);
        fillDictLabels(result.getRecords());
        return result;
    }

    @Override
    public IPage<ArchiveVolumeListVO> pageDestroyPending(PageQuery pageQuery, String keyword) {
        Page<ArchiveVolume> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveVolume> wrapper = new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getPendingDestroy, 1)
                .eq(ArchiveVolume::getStatus, ArchiveStatus.ARCHIVED)
                .and(StringUtils.hasText(keyword), w -> w
                        .like(ArchiveVolume::getVolumeTitle, keyword)
                        .or()
                        .like(ArchiveVolume::getArchiveNo, keyword))
                .orderByDesc(ArchiveVolume::getUpdatedAt);
        IPage<ArchiveVolumeListVO> result = volumeMapper.selectPage(page, wrapper).convert(converter::toListVO);
        fillDictLabels(result.getRecords());
        return result;
    }

    @Override
    public IPage<ArchiveVolumeListVO> pageDrafts(PageQuery pageQuery) {
        Long currentUserId = StpUtil.getLoginIdAsLong();
        Page<ArchiveVolume> page = new Page<>(pageQuery.getCurrent(), pageQuery.getPageSize());
        LambdaQueryWrapper<ArchiveVolume> wrapper = new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getStatus, 0)
                .eq(ArchiveVolume::getCompilerId, currentUserId)
                .orderByDesc(ArchiveVolume::getCreatedAt);
        IPage<ArchiveVolumeListVO> result = volumeMapper.selectPage(page, wrapper).convert(converter::toListVO);
        fillDictLabels(result.getRecords());
        return result;
    }

    // ==================== Excel 批量导入 ====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveVolumeImportResultVO importVolumes(MultipartFile file) {
        // 1. 文件格式校验
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null
                || (!originalFilename.endsWith(".xlsx") && !originalFilename.endsWith(".xls"))) {
            throw new BusinessException(ResultCode.PARAM_FORMAT_ERROR,
                    "仅支持 .xlsx 或 .xls 格式的 Excel 文件");
        }

        // 2. 读取 Excel
        List<ArchiveVolumeImportDTO> dataList;
        try (InputStream is = file.getInputStream()) {
            dataList = EasyExcel.read(is)
                    .head(ArchiveVolumeImportDTO.class)
                    .sheet()
                    .doReadSync();
        } catch (IOException e) {
            throw new SystemException("读取 Excel 文件失败", e);
        }

        if (dataList == null || dataList.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "Excel 文件为空或没有数据行");
        }

        // 过滤掉所有字段均为空的行（EasyExcel 可能读出空对象）
        dataList = dataList.stream()
                .filter(this::isNotEmptyRow)
                .collect(Collectors.toList());

        if (dataList.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "Excel 文件中未发现有效数据行");
        }

        // 3. 预加载字典值（用于字典范围校验）
        Set<String> retentionPeriodValues = dictService.getActiveItemsByCode("retention_period")
                .stream().map(DictItemVO::getItemValue).collect(Collectors.toSet());
        Set<String> securityLevelValues = dictService.getActiveItemsByCode("security_level")
                .stream().map(DictItemVO::getItemValue).collect(Collectors.toSet());

        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        List<String> errors = new ArrayList<>();
        Set<String> archiveNoInBatch = new HashSet<>();

        // 4. 逐行校验
        for (int i = 0; i < dataList.size(); i++) {
            ArchiveVolumeImportDTO row = dataList.get(i);
            int excelRowNo = i + 2; // 第 1 行为表头，数据从第 2 行开始

            // 4.1 JSR-303 注解校验
            Set<ConstraintViolation<ArchiveVolumeImportDTO>> violations = validator.validate(row);
            for (ConstraintViolation<ArchiveVolumeImportDTO> v : violations) {
                String columnName = FIELD_TO_COLUMN_MAP.getOrDefault(
                        v.getPropertyPath().toString(), v.getPropertyPath().toString());
                errors.add(String.format("第%d行【%s】：%s", excelRowNo, columnName, v.getMessage()));
            }

            // 4.2 字典范围校验
            if (StringUtils.hasText(row.getRetentionPeriod())
                    && !retentionPeriodValues.contains(row.getRetentionPeriod())) {
                errors.add(String.format("第%d行【保管期限】：值[%s]不在字典范围内",
                        excelRowNo, row.getRetentionPeriod()));
            }
            if (StringUtils.hasText(row.getSecurityLevel())
                    && !securityLevelValues.contains(row.getSecurityLevel())) {
                errors.add(String.format("第%d行【密级】：值[%s]不在字典范围内",
                        excelRowNo, row.getSecurityLevel()));
            }

            // 4.3 日期格式校验（yyyy-MM-dd）
            validateDateFormat(row.getCompileDateActual(), "立卷日期", excelRowNo, errors);
            validateDateFormat(row.getInspectDate(), "检查日期", excelRowNo, errors);
            validateDateFormat(row.getArchiveDate(), "归档日期", excelRowNo, errors);
        }

        // 5. 若存在校验错误，直接全单回滚（事务内抛异常）
        if (!errors.isEmpty()) {
            throw new BusinessException(ResultCode.EXCEL_IMPORT_ERROR,
                    "Excel 导入存在以下错误，请修改后重新上传：\n" + String.join("\n", errors));
        }

        // 6. 按分类组合预查数据库最大案卷号，用于批量自动生成
        Map<String, Integer> groupCounter = prepareVolumeNoCounters(dataList);

        Long currentUserId = StpUtil.getLoginIdAsLong();
        String nickname = getNickname(currentUserId);

        // 7. 生成档号并批量保存
        for (int i = 0; i < dataList.size(); i++) {
            ArchiveVolumeImportDTO row = dataList.get(i);
            ArchiveVolume volume = new ArchiveVolume();
            volume.setYear(row.getYear());
            volume.setFondsNo(row.getFondsNo());
            volume.setCategoryName(row.getCategoryName());
            volume.setCategoryL1(row.getCategoryL1());
            volume.setCategoryL2(row.getCategoryL2());
            volume.setCategoryL3(row.getCategoryL3());
            volume.setDeviceCode(row.getDeviceCode());
            volume.setVolumeTitle(row.getVolumeTitle());
            volume.setFileCount(row.getFileCount() == null ? 0 : row.getFileCount());
            volume.setTotalPages(row.getTotalPages() == null ? 0 : row.getTotalPages());
            volume.setCompileUnit(row.getCompileUnit());
            volume.setCompileDate(row.getCompileDate());
            volume.setRetentionPeriod(row.getRetentionPeriod());
            volume.setSecurityLevel(row.getSecurityLevel());
            volume.setCompiler(row.getCompiler());
            volume.setCompilerId(currentUserId);
            volume.setCompileDateActual(parseLocalDate(row.getCompileDateActual()));
            volume.setReviewer(row.getReviewer());
            volume.setInspectDate(parseLocalDate(row.getInspectDate()));
            volume.setArchiveDate(parseLocalDate(row.getArchiveDate()));
            volume.setNotes(row.getNotes());
            volume.setRemark(row.getRemark());
            volume.setCategoryCode(row.getCategoryCode());
            volume.setLocationNo(row.getLocationNo());
            volume.setCopies(row.getCopies() == null ? 1 : row.getCopies());
            volume.setOrganization(row.getOrganization());
            volume.setInStock(1);
            volume.setBorrowedCopies(0);
            volume.setStatus(1); // 导入后初始化为待审核

            // 案卷号：Excel 提供则直接使用，否则按分组计数器自动生成
            String volumeNo;
            if (StringUtils.hasText(row.getVolumeNo())) {
                volumeNo = row.getVolumeNo();
            } else {
                String groupKey = buildGroupKey(row.getYear(), row.getFondsNo(),
                        row.getCategoryL1(), row.getCategoryL2(),
                        row.getCategoryL3(), row.getDeviceCode());
                int next = groupCounter.get(groupKey);
                volumeNo = String.format("%02d", next);
                groupCounter.put(groupKey, next + 1);
            }
            volume.setVolumeNo(volumeNo);

            // 生成档号并校验唯一性
            String archiveNo = buildArchiveNo(row.getYear(), row.getFondsNo(), row.getCategoryL1(),
                    row.getCategoryL2(), row.getCategoryL3(), row.getDeviceCode(), volumeNo);
            volume.setArchiveNo(archiveNo);

            // 批量内档号去重 + 数据库唯一性校验
            String uniqueKey = archiveNo + "#" + row.getYear();
            if (!archiveNoInBatch.add(uniqueKey)) {
                throw new BusinessException(ResultCode.ARCHIVE_NO_DUPLICATE,
                        String.format("Excel 内档号重复：%s（年度：%s）", archiveNo, row.getYear()));
            }
            assertArchiveNoUnique(row.getYear(), archiveNo);

            volumeMapper.insert(volume);
        }

        log.info("[AUDIT-IMPORT] 用户批量导入案卷，userId={}, fileName={}, 导入数量={}, ip={}, traceId={}",
                currentUserId, originalFilename, dataList.size(), MDC.get("clientIP"), MDC.get("traceId"));

        ArchiveVolumeImportResultVO result = new ArchiveVolumeImportResultVO();
        result.setFileName(originalFilename);
        result.setTotalCount(dataList.size());
        result.setSuccessCount(dataList.size());
        return result;
    }

    // ==================== 档号生成 ====================

    @Override
    public ArchiveNoPreviewVO previewArchiveNo(String year, String fondsNo,
                                               String categoryL1, String categoryL2,
                                               String categoryL3, String deviceCode) {
        if (!StringUtils.hasText(year) || !StringUtils.hasText(fondsNo)
                || !StringUtils.hasText(categoryL1)) {
            throw new BusinessException(ResultCode.PARAM_MISSING,
                    "年度、全宗号、一级类目为档号生成必填项");
        }
        String nextVolumeNo = generateNextVolumeNo(year, fondsNo, categoryL1, categoryL2, categoryL3, deviceCode);

        ArchiveNoPreviewVO vo = new ArchiveNoPreviewVO();
        vo.setSuggestedVolumeNo(nextVolumeNo);
        vo.setArchiveNo(buildArchiveNo(year, fondsNo, categoryL1, categoryL2, categoryL3, deviceCode, nextVolumeNo));
        return vo;
    }

    // ==================== 内部工具 ====================

    private ArchiveVolume selectByRecordIdAndYear(Long recordId, String year) {
        ArchiveVolume volume = volumeMapper.selectOne(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getRecordId, recordId)
                        .eq(ArchiveVolume::getYear, year));
        if (volume == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "案卷不存在");
        }
        return volume;
    }

    private void assertVolumeEditable(ArchiveVolume volume, Long currentUserId) {
        if (!Integer.valueOf(ArchiveStatus.DRAFT).equals(volume.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID,
                    "仅草稿状态支持修改/删除/提交操作");
        }
        if (!currentUserId.equals(volume.getCompilerId())) {
            throw new BusinessException(ResultCode.PERMISSION_DENIED_HORIZONTAL,
                    "无权操作他人创建的草稿");
        }
    }

    private void assertCanReview(ArchiveVolume volume) {
        if (!Integer.valueOf(ArchiveStatus.PENDING_REVIEW).equals(volume.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID,
                    "仅待审核状态支持审核操作");
        }
    }

    private void assertCanConfirm(ArchiveVolume volume) {
        if (!Integer.valueOf(ArchiveStatus.PENDING_CONFIRM).equals(volume.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID,
                    "仅待确认状态支持确认/退回操作");
        }
    }

    private void assertCanDestroy(ArchiveVolume volume) {
        if (!Integer.valueOf(ArchiveStatus.ARCHIVED).equals(volume.getStatus())) {
            throw new BusinessException(ResultCode.ARCHIVE_STATUS_INVALID,
                    "仅已正式归档案卷支持销毁申请");
        }
        if (Integer.valueOf(1).equals(volume.getDestroyFlag())) {
            throw new BusinessException(ResultCode.ARCHIVE_DESTROYED,
                    "该档案已标记销毁");
        }
    }

    private void assertArchiveNoUnique(String year, String archiveNo) {
        assertArchiveNoUnique(year, archiveNo, null);
    }

    private void assertArchiveNoUnique(String year, String archiveNo, Long excludeRecordId) {
        LambdaQueryWrapper<ArchiveVolume> wrapper = new LambdaQueryWrapper<ArchiveVolume>()
                .eq(ArchiveVolume::getArchiveNo, archiveNo)
                .eq(ArchiveVolume::getYear, year);
        if (excludeRecordId != null) {
            wrapper.ne(ArchiveVolume::getRecordId, excludeRecordId);
        }
        Long count = volumeMapper.selectCount(wrapper);
        if (count > 0) {
            throw new BusinessException(ResultCode.ARCHIVE_NO_DUPLICATE,
                    "档号 " + archiveNo + " 在当前年度已存在");
        }
    }

    private String generateNextVolumeNo(String year, String fondsNo,
                                        String categoryL1, String categoryL2,
                                        String categoryL3, String deviceCode) {
        String maxVolumeNo = volumeMapper.selectMaxVolumeNo(
                year, fondsNo, categoryL1, categoryL2, categoryL3, deviceCode);

        int next = 1;
        if (StringUtils.hasText(maxVolumeNo)) {
            // 尝试提取末尾数字部分并 +1
            String digits = maxVolumeNo.replaceAll("^.*?(\\d+)$", "$1");
            if (!digits.equals(maxVolumeNo)) {
                try {
                    next = Integer.parseInt(digits) + 1;
                } catch (NumberFormatException ignored) {
                    next = 1;
                }
            } else {
                try {
                    next = Integer.parseInt(maxVolumeNo) + 1;
                } catch (NumberFormatException ignored) {
                    next = 1;
                }
            }
        }
        return String.format("%02d", next);
    }

    private String buildArchiveNo(ArchiveVolumeSaveDTO dto, String volumeNo) {
        return buildArchiveNo(dto.getYear(), dto.getFondsNo(), dto.getCategoryL1(),
                dto.getCategoryL2(), dto.getCategoryL3(), dto.getDeviceCode(), volumeNo);
    }

    private String buildArchiveNo(ArchiveVolume volume) {
        return buildArchiveNo(volume.getYear(), volume.getFondsNo(), volume.getCategoryL1(),
                volume.getCategoryL2(), volume.getCategoryL3(), volume.getDeviceCode(), volume.getVolumeNo());
    }

    private String buildArchiveNo(String year, String fondsNo, String categoryL1,
                                  String categoryL2, String categoryL3,
                                  String deviceCode, String volumeNo) {
        StringBuilder sb = new StringBuilder();
        sb.append(fondsNo).append(".").append(categoryL1);
        if (StringUtils.hasText(categoryL2)) sb.append(".").append(categoryL2);
        if (StringUtils.hasText(categoryL3)) sb.append(".").append(categoryL3);
        if (StringUtils.hasText(deviceCode)) sb.append(".").append(deviceCode);
        sb.append(".").append(volumeNo);
        return sb.toString();
    }

    // ==================== Excel 导入辅助工具 ====================

    private static final Map<String, String> FIELD_TO_COLUMN_MAP = Map.ofEntries(
            Map.entry("year", "年度"),
            Map.entry("fondsNo", "全宗号"),
            Map.entry("categoryName", "分类名称"),
            Map.entry("categoryL1", "一级类目"),
            Map.entry("categoryL2", "二级类目"),
            Map.entry("categoryL3", "三级类目"),
            Map.entry("deviceCode", "设备代号"),
            Map.entry("volumeNo", "案卷号"),
            Map.entry("volumeTitle", "案卷题名"),
            Map.entry("fileCount", "卷内文件件数"),
            Map.entry("totalPages", "案卷总页数"),
            Map.entry("compileUnit", "编制单位"),
            Map.entry("compileDate", "编制日期"),
            Map.entry("retentionPeriod", "保管期限"),
            Map.entry("securityLevel", "密级"),
            Map.entry("compiler", "立卷人"),
            Map.entry("compileDateActual", "立卷日期"),
            Map.entry("reviewer", "审核人"),
            Map.entry("inspectDate", "检查日期"),
            Map.entry("archiveDate", "归档日期"),
            Map.entry("notes", "备考说明"),
            Map.entry("remark", "备注"),
            Map.entry("categoryCode", "分类号"),
            Map.entry("locationNo", "库位号"),
            Map.entry("copies", "总份数"),
            Map.entry("organization", "编制机构")
    );

    private boolean isNotEmptyRow(ArchiveVolumeImportDTO row) {
        return StringUtils.hasText(row.getYear())
                || StringUtils.hasText(row.getFondsNo())
                || StringUtils.hasText(row.getCategoryL1())
                || StringUtils.hasText(row.getVolumeTitle());
    }

    private void validateDateFormat(String dateStr, String columnName, int excelRowNo, List<String> errors) {
        if (!StringUtils.hasText(dateStr)) {
            return;
        }
        try {
            LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (DateTimeParseException e) {
            errors.add(String.format("第%d行【%s】：日期格式必须为 yyyy-MM-dd", excelRowNo, columnName));
        }
    }

    private LocalDate parseLocalDate(String dateStr) {
        if (!StringUtils.hasText(dateStr)) {
            return null;
        }
        try {
            return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private String buildGroupKey(String year, String fondsNo, String categoryL1,
                                  String categoryL2, String categoryL3, String deviceCode) {
        return year + "|" + fondsNo + "|" + categoryL1 + "|"
                + (categoryL2 == null ? "" : categoryL2) + "|"
                + (categoryL3 == null ? "" : categoryL3) + "|"
                + (deviceCode == null ? "" : deviceCode);
    }

    private Map<String, Integer> prepareVolumeNoCounters(List<ArchiveVolumeImportDTO> dataList) {
        // 按分类组合分组，找出所有需要自动生成案卷号的行
        Map<String, List<ArchiveVolumeImportDTO>> groups = dataList.stream()
                .filter(r -> !StringUtils.hasText(r.getVolumeNo()))
                .collect(Collectors.groupingBy(r -> buildGroupKey(
                        r.getYear(), r.getFondsNo(), r.getCategoryL1(),
                        r.getCategoryL2(), r.getCategoryL3(), r.getDeviceCode())));

        Map<String, Integer> counters = new HashMap<>();
        for (Map.Entry<String, List<ArchiveVolumeImportDTO>> entry : groups.entrySet()) {
            ArchiveVolumeImportDTO first = entry.getValue().get(0);
            String maxVolumeNo = volumeMapper.selectMaxVolumeNo(
                    first.getYear(), first.getFondsNo(), first.getCategoryL1(),
                    first.getCategoryL2(), first.getCategoryL3(), first.getDeviceCode());
            int next = 1;
            if (StringUtils.hasText(maxVolumeNo)) {
                String digits = maxVolumeNo.replaceAll("^.*?(\\d+)$", "$1");
                if (!digits.equals(maxVolumeNo)) {
                    try { next = Integer.parseInt(digits) + 1; } catch (NumberFormatException ignored) { }
                } else {
                    try { next = Integer.parseInt(maxVolumeNo) + 1; } catch (NumberFormatException ignored) { }
                }
            }
            counters.put(entry.getKey(), next);
        }
        return counters;
    }

    @Override
    public ArchiveVolumeVO getVolumeByArchiveNo(String archiveNo) {
        ArchiveVolume volume = volumeMapper.selectOne(
                new LambdaQueryWrapper<ArchiveVolume>()
                        .eq(ArchiveVolume::getArchiveNo, archiveNo)
                        .eq(ArchiveVolume::getDestroyFlag, 0)
                        .orderByDesc(ArchiveVolume::getYear)
                        , false);
        if (volume == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "档案不存在或已销毁");
        }
        ArchiveVolumeVO vo = converter.toVO(volume);
        fillDetailDictLabels(vo);
        List<ArchiveFile> files = fileMapper.selectList(
                new LambdaQueryWrapper<ArchiveFile>()
                        .eq(ArchiveFile::getArchiveNo, volume.getArchiveNo())
                        .eq(ArchiveFile::getYear, volume.getYear())
                        .eq(ArchiveFile::getDestroyFlag, 0)
                        .orderByAsc(ArchiveFile::getSeqNo));
        vo.setFileList(converter.toFileBriefVO(files));
        return vo;
    }

    private String getNickname(Long userId) {
        var user = userMapper.selectById(userId);
        return user != null ? user.getNickname() : "";
    }

    /**
     * 为列表 VO 填充一级类目、密级和保管期限的字典中文标签。
     */
    private void fillDictLabels(List<ArchiveVolumeListVO> list) {
        if (list == null || list.isEmpty()) {
            return;
        }
        Map<String, String> categoryL1Map = dictLabelMap("category_l1");
        Map<String, String> securityMap = dictLabelMap("security_level");
        Map<String, String> retentionMap = dictLabelMap("retention_period");
        for (ArchiveVolumeListVO vo : list) {
            if (vo.getCategoryL1() != null) {
                vo.setCategoryL1Label(categoryL1Map.getOrDefault(vo.getCategoryL1(), vo.getCategoryL1()));
            }
            if (vo.getSecurityLevel() != null) {
                vo.setSecurityLevelLabel(securityMap.getOrDefault(vo.getSecurityLevel(), vo.getSecurityLevel()));
            }
            if (vo.getRetentionPeriod() != null) {
                vo.setRetentionPeriodLabel(retentionMap.getOrDefault(vo.getRetentionPeriod(), vo.getRetentionPeriod()));
            }
        }
    }

    /**
     * 为详情 VO 填充一级类目、密级和保管期限的字典中文标签。
     */
    private void fillDetailDictLabels(ArchiveVolumeVO vo) {
        if (vo == null) {
            return;
        }
        if (vo.getCategoryL1() != null) {
            vo.setCategoryL1Label(dictLabelMap("category_l1")
                    .getOrDefault(vo.getCategoryL1(), vo.getCategoryL1()));
        }
        if (vo.getSecurityLevel() != null) {
            vo.setSecurityLevelLabel(dictLabelMap("security_level")
                    .getOrDefault(vo.getSecurityLevel(), vo.getSecurityLevel()));
        }
        if (vo.getRetentionPeriod() != null) {
            vo.setRetentionPeriodLabel(dictLabelMap("retention_period")
                    .getOrDefault(vo.getRetentionPeriod(), vo.getRetentionPeriod()));
        }
    }

    /** 读取字典项并组装 value -> label 映射 */
    private Map<String, String> dictLabelMap(String dictCode) {
        return dictService.getActiveItemsByCode(dictCode).stream()
                .collect(Collectors.toMap(DictItemVO::getItemValue, DictItemVO::getItemLabel, (a, b) -> a));
    }
}
