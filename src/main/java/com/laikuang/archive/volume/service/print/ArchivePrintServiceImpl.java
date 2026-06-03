package com.laikuang.archive.volume.service.print;

import com.laikuang.archive.common.constant.ResultCode;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.file.mapper.ArchiveFileMapper;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.slf4j.MDC;

/**
 * 档案打印业务实现（PDF）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchivePrintServiceImpl implements ArchivePrintService {

    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveFileMapper   fileMapper;
    private final ArchivePdfGenerator pdfGenerator;

    private static final String TYPE_COVER          = "cover";
    private static final String TYPE_SPINE          = "spine";
    private static final String TYPE_VOL_CATALOGUE  = "volume-catalogue";
    private static final String TYPE_FILE_CATALOGUE = "file-catalogue";

    @Override
    public void printVolume(Long recordId, String year, String type, HttpServletResponse response) {
        ArchiveVolume volume = volumeMapper.selectById(recordId);
        if (volume == null || !year.equals(volume.getYear())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "案卷不存在");
        }

        List<ArchiveFile> files = fileMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ArchiveFile>()
                        .eq(ArchiveFile::getVolumeNo, volume.getVolumeNo())
                        .eq(ArchiveFile::getYear, year)
                        .eq(ArchiveFile::getDestroyFlag, 0)
                        .orderByAsc(ArchiveFile::getSeqNo));

        try {
            byte[] bytes = pdfGenerator.generate(volume, files, type);

            String suffix = typeSuffix(type);
            String fileName = URLEncoder.encode(
                    volume.getArchiveNo() + suffix + ".pdf", StandardCharsets.UTF_8);
            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename=" + fileName);
            response.setContentLength(bytes.length);
            response.getOutputStream().write(bytes);
            response.getOutputStream().flush();

            log.info("[AUDIT-PRINT] recordId={}, year={}, type={}, archiveNo={}, files={}, traceId={}",
                    recordId, year, type, volume.getArchiveNo(), files.size(), MDC.get("traceId"));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[PRINT] PDF生成失败", e);
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "PDF文档生成失败");
        }
    }

    private String orDash(String value) {
        return StringUtils.hasText(value) ? value : "—";
    }

    private String typeSuffix(String type) {
        return switch (type) {
            case TYPE_COVER          -> "_封皮";
            case TYPE_SPINE          -> "_侧脊";
            case TYPE_VOL_CATALOGUE  -> "_案卷目录";
            case TYPE_FILE_CATALOGUE -> "_卷内文件目录";
            default                  -> "_打印";
        };
    }
}
