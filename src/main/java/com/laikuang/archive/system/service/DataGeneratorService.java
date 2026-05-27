package com.laikuang.archive.system.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.laikuang.archive.approve.domain.entity.ArchiveApproveLog;
import com.laikuang.archive.approve.mapper.ArchiveApproveLogMapper;
import com.laikuang.archive.borrow.domain.entity.ArchiveBorrow;
import com.laikuang.archive.borrow.mapper.ArchiveBorrowMapper;
import com.laikuang.archive.common.util.PasswordUtil;
import com.laikuang.archive.file.domain.entity.ArchiveFile;
import com.laikuang.archive.file.mapper.ArchiveFileMapper;
import com.laikuang.archive.system.domain.entity.SysDept;
import com.laikuang.archive.system.domain.entity.SysDict;
import com.laikuang.archive.system.domain.entity.SysDictItem;
import com.laikuang.archive.system.domain.entity.SysNotification;
import com.laikuang.archive.system.domain.entity.SysUser;
import com.laikuang.archive.system.mapper.SysDeptMapper;
import com.laikuang.archive.system.mapper.SysDictItemMapper;
import com.laikuang.archive.system.mapper.SysDictMapper;
import com.laikuang.archive.system.mapper.SysNotificationMapper;
import com.laikuang.archive.system.mapper.SysUserMapper;
import com.laikuang.archive.volume.domain.entity.ArchiveVolume;
import com.laikuang.archive.volume.mapper.ArchiveVolumeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 测试数据生成服务。
 * 为系统全部模块生成不少于100条的测试数据，用于功能测试。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataGeneratorService {

    private final SysDeptMapper deptMapper;
    private final SysUserMapper userMapper;
    private final SysDictMapper dictMapper;
    private final SysDictItemMapper dictItemMapper;
    private final ArchiveVolumeMapper volumeMapper;
    private final ArchiveFileMapper fileMapper;
    private final ArchiveBorrowMapper borrowMapper;
    private final ArchiveApproveLogMapper approveLogMapper;
    private final SysNotificationMapper notificationMapper;

    private static final int BATCH_SIZE = 50;

    // 预计算的通用密码哈希（明文：Test@123）
    private static volatile String DEFAULT_PASSWORD_HASH = null;

    private String getDefaultPassword() {
        if (DEFAULT_PASSWORD_HASH == null) {
            synchronized (DataGeneratorService.class) {
                if (DEFAULT_PASSWORD_HASH == null) {
                    DEFAULT_PASSWORD_HASH = PasswordUtil.encode("Test@123");
                }
            }
        }
        return DEFAULT_PASSWORD_HASH;
    }

    /**
     * 生成全部测试数据，返回各模块统计。
     */
    @Transactional(rollbackFor = Exception.class)
    public java.util.Map<String, Integer> generateAll() {
        java.util.Map<String, Integer> stats = new java.util.LinkedHashMap<>();

        log.info("========== 开始生成测试数据 ==========");

        // 1. 部门
        int deptCount = generateDepts();
        stats.put("sys_dept", deptCount);
        log.info("生成部门 {} 条", deptCount);

        // 2. 用户
        int userCount = generateUsers();
        stats.put("sys_user", userCount);
        log.info("生成用户 {} 条", userCount);

        // 3. 字典
        int dictCount = generateDicts();
        stats.put("sys_dict", dictCount);
        log.info("生成字典 {} 条", dictCount);

        // 4. 字典项
        int dictItemCount = generateDictItems();
        stats.put("sys_dict_item", dictItemCount);
        log.info("生成字典项 {} 条", dictItemCount);

        // 5. 案卷
        int volumeCount = generateVolumes();
        stats.put("archive_volume", volumeCount);
        log.info("生成案卷 {} 条", volumeCount);

        // 6. 文件
        int fileCount = generateFiles();
        stats.put("archive_file", fileCount);
        log.info("生成文件 {} 条", fileCount);

        // 7. 借阅
        int borrowCount = generateBorrows();
        stats.put("archive_borrow", borrowCount);
        log.info("生成借阅 {} 条", borrowCount);

        // 8. 审批日志
        int logCount = generateApproveLogs();
        stats.put("archive_approve_log", logCount);
        log.info("生成审批日志 {} 条", logCount);

        // 9. 通知
        int noticeCount = generateNotifications();
        stats.put("sys_notification", noticeCount);
        log.info("生成通知 {} 条", noticeCount);

        log.info("========== 测试数据生成完成 ==========");
        return stats;
    }

    // ---------- 部门 ----------
    private int generateDepts() {
        List<SysDept> list = new ArrayList<>();
        // 一级部门（parent=1）
        String[] firstLevel = {"生产技术部", "安全监察部", "机电管理部", "通风防尘部", "地质测量部",
                "人力资源部", "财务部", "物资供应部", "综合办公室", "工会办公室"};
        for (int i = 0; i < firstLevel.length; i++) {
            SysDept d = new SysDept();
            d.setDeptName(firstLevel[i]);
            d.setParentId(1L);
            d.setSortOrder(i + 1);
            list.add(d);
        }
        // 二级部门
        String[][] secondLevel = {
                {"采煤一队", "采煤二队", "掘进一队", "掘进二队"},
                {"安全培训科", "隐患排查科", "应急指挥科"},
                {"电气维修班", "机械维修班", "自动化控制科"},
                {"通风科", "防尘科", "瓦斯监测科"},
                {"地质勘探科", "测量绘图科", "储量管理科"},
                {"招聘培训科", "薪酬福利科", "绩效考核科", "劳动关系科"},
                {"会计核算科", "资金管理科", "成本管理科", "税务管理科"},
                {"采购科", "仓储管理科", "物流配送科"},
                {"行政科", "文秘科", "接待科", "档案科"},
                {"宣传科", "文体科", "女工委员会", "职工帮扶中心"}
        };
        for (int i = 0; i < secondLevel.length; i++) {
            for (int j = 0; j < secondLevel[i].length; j++) {
                SysDept d = new SysDept();
                d.setDeptName(secondLevel[i][j]);
                d.setParentId((long) (i + 3)); // 一级部门从3开始（1=总公司, 2=档案管理部）
                d.setSortOrder(j + 1);
                list.add(d);
            }
        }
        // 三级部门（每个二级部门下2个）
        int secondStart = 3 + firstLevel.length; // 二级部门起始id
        int secondCount = 0;
        for (String[] arr : secondLevel) secondCount += arr.length;
        int groupIdx = 0;
        for (int i = 0; i < secondLevel.length; i++) {
            for (int j = 0; j < secondLevel[i].length; j++) {
                long parentId = secondStart + groupIdx;
                for (int k = 0; k < 2; k++) {
                    SysDept d = new SysDept();
                    d.setDeptName(secondLevel[i][j] + "_" + (k + 1) + "组");
                    d.setParentId(parentId);
                    d.setSortOrder(k + 1);
                    list.add(d);
                }
                groupIdx++;
            }
        }
        saveBatch(deptMapper, list);
        return list.size();
    }

    // ---------- 用户 ----------
    private int generateUsers() {
        List<SysUser> list = new ArrayList<>();
        String pwd = getDefaultPassword();
        String[] surnames = {"张", "王", "李", "刘", "陈", "杨", "赵", "黄", "周", "吴",
                "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗"};
        String[] names = {"伟", "芳", "娜", "敏", "静", "强", "磊", "军", "洋", "勇",
                "艳", "杰", "涛", "明", "超", "秀英", "华", "鹏", "飞", "婷"};
        // 部门范围：2(档案管理部) ~ 102
        long deptMin = 2, deptMax = 102;
        for (int i = 0; i < 150; i++) {
            SysUser u = new SysUser();
            String surname = surnames[i % surnames.length];
            String name = names[i % names.length];
            if (i >= names.length) {
                name += String.valueOf(i / names.length);
            }
            u.setUsername("user" + String.format("%03d", i + 2));
            u.setPassword(pwd);
            u.setNickname(surname + name);
            u.setPhone("13" + String.format("%09d", ThreadLocalRandom.current().nextInt(1000000000)));
            u.setDeptId(deptMin + ThreadLocalRandom.current().nextInt((int) (deptMax - deptMin + 1)));
            double r = ThreadLocalRandom.current().nextDouble();
            if (r < 0.05) u.setRole("company_leader");
            else if (r < 0.20) u.setRole("archive_admin");
            else u.setRole("user");
            u.setStatus(1);
            list.add(u);
        }
        saveBatch(userMapper, list);
        return list.size();
    }

    // ---------- 字典 ----------
    private int generateDicts() {
        List<SysDict> list = new ArrayList<>();
        String[][] dicts = {
                {"project_type", "项目类型"},
                {"device_type", "设备类型"},
                {"drawing_size", "图幅规格"},
                {"file_category", "文件类别"},
                {"location_area", "存放区域"},
                {"compile_unit", "编制单位"},
                {"fonds_category", "全宗类别"}
        };
        for (String[] d : dicts) {
            SysDict dict = new SysDict();
            dict.setDictCode(d[0]);
            dict.setDictName(d[1]);
            dict.setStatus(1);
            list.add(dict);
        }
        saveBatch(dictMapper, list);
        return list.size();
    }

    // ---------- 字典项 ----------
    private int generateDictItems() {
        List<SysDictItem> list = new ArrayList<>();
        String[][][] items = {
                // project_type
                {{"mining", "采煤项目"}, {"tunneling", "掘进项目"}, {"ventilation", "通风项目"},
                        {"electrical", "电气项目"}, {"mechanical", "机械项目"}, {"safety", "安全项目"},
                        {"geology", "地质项目"}, {"survey", "测量项目"}, {"training", "培训项目"}, {"other", "其他项目"}},
                // device_type
                {{"drill", "钻机"}, {"conveyor", "输送机"}, {"pump", "水泵"}, {"fan", "风机"},
                        {"crusher", "破碎机"}, {"hoist", "提升机"}, {"monitor", "监控设备"}, {"sensor", "传感器"},
                        {"switch", "开关柜"}, {"transformer", "变压器"}},
                // drawing_size
                {{"A0", "A0"}, {"A1", "A1"}, {"A2", "A2"}, {"A3", "A3"}, {"A4", "A4"},
                        {"A5", "A5"}, {"B4", "B4"}, {"B5", "B5"}},
                // file_category
                {{"design", "设计文件"}, {"construction", "施工文件"}, {"acceptance", "验收文件"},
                        {"operation", "运行文件"}, {"maintenance", "维护文件"}, {"report", "报告文件"},
                        {"drawing", "图纸文件"}, {"contract", "合同文件"}, {"meeting", "会议记录"}, {"regulation", "规章制度"}},
                // location_area
                {{"A区", "A区"}, {"B区", "B区"}, {"C区", "C区"}, {"D区", "D区"}, {"E区", "E区"},
                        {"F区", "F区"}, {"G区", "G区"}, {"H区", "H区"}},
                // compile_unit
                {{"生产技术部", "生产技术部"}, {"安全监察部", "安全监察部"}, {"机电管理部", "机电管理部"},
                        {"通风防尘部", "通风防尘部"}, {"地质测量部", "地质测量部"}, {"综合办公室", "综合办公室"}},
                // fonds_category
                {{"administrative", "行政管理类"}, {"production", "生产技术类"}, {"scientific", "科学研究类"},
                        {"infrastructure", "基本建设类"}, {"equipment", "设备仪器类"}, {"accounting", "会计档案类"},
                        {"personnel", "人事档案类"}, {"audio_visual", "声像档案类"}, {"electronic", "电子档案类"}, {"other", "其他档案类"}}
        };
        int sort = 1;
        String[] dictCodes = {"project_type", "device_type", "drawing_size", "file_category", "location_area", "compile_unit", "fonds_category"};
        for (int i = 0; i < dictCodes.length; i++) {
            for (int j = 0; j < items[i].length; j++) {
                SysDictItem item = new SysDictItem();
                item.setDictCode(dictCodes[i]);
                item.setItemValue(items[i][j][0]);
                item.setItemLabel(items[i][j][1]);
                item.setSortOrder(j + 1);
                item.setStatus(1);
                list.add(item);
            }
        }
        saveBatch(dictItemMapper, list);
        return list.size();
    }

    // ---------- 案卷 ----------
    private int generateVolumes() {
        List<ArchiveVolume> list = new ArrayList<>();
        String[] years = {"2020", "2021", "2022", "2023", "2024", "2025", "2026"};
        String[] fondsNos = {"LK-001", "LK-002", "LK-003", "LK-004", "LK-005"};
        String[] l1s = {"01", "02", "03", "04", "05"};
        String[] l2s = {"A", "B", "C", "D"};
        String[] l3s = {"01", "02", "03"};
        String[] devices = {"DJ-01", "DJ-02", "TJ-01", "TJ-02", "KT-01", "KT-02", "DQ-01", "DQ-02"};
        String[] periods = {"permanent", "30_years", "10_years"};
        String[] secs = {"public", "internal", "confidential", "secret"};
        String[] titles = {"采煤工作面设计", "掘进巷道施工", "通风系统改造", "机电设备检修",
                "安全规程编制", "地质勘探报告", "测量成果汇编", "人员培训记录",
                "物资采购合同", "年度生产计划", "月度安全检查", "瓦斯监测数据",
                "排水系统维护", "供电系统改造", "运输系统优化", "巷道支护方案",
                "设备操作手册", "应急预案演练", "职业病防治", "环保监测报告"};

        // 获取已生成的用户ID范围（admin=1 + 新生成的150个用户）
        long userMin = 1, userMax = 151;

        for (int i = 0; i < 200; i++) {
            ArchiveVolume v = new ArchiveVolume();
            String year = years[ThreadLocalRandom.current().nextInt(years.length)];
            String fonds = fondsNos[ThreadLocalRandom.current().nextInt(fondsNos.length)];
            String l1 = l1s[ThreadLocalRandom.current().nextInt(l1s.length)];
            String l2 = l2s[ThreadLocalRandom.current().nextInt(l2s.length)];
            String l3 = l3s[ThreadLocalRandom.current().nextInt(l3s.length)];
            String dev = devices[ThreadLocalRandom.current().nextInt(devices.length)];
            String volNo = "V-" + year + "-" + String.format("%04d", i + 1);

            v.setYear(year);
            v.setFondsNo(fonds);
            v.setCategoryL1(l1);
            v.setCategoryL2(l2);
            v.setCategoryL3(l3);
            v.setDeviceCode(dev);
            v.setVolumeNo(volNo);
            v.setVolumeTitle(titles[i % titles.length] + "_" + (i + 1));
            v.setFileCount(ThreadLocalRandom.current().nextInt(3, 15));
            v.setTotalPages(ThreadLocalRandom.current().nextInt(10, 500));
            v.setRetentionPeriod(periods[ThreadLocalRandom.current().nextInt(periods.length)]);
            v.setSecurityLevel(secs[ThreadLocalRandom.current().nextInt(secs.length)]);
            v.setCompilerId(userMin + ThreadLocalRandom.current().nextInt((int) (userMax - userMin + 1)));
            v.setCompileDateActual(randomDate(Integer.parseInt(year) - 1, Integer.parseInt(year)));
            v.setInspectDate(randomDate(Integer.parseInt(year), Integer.parseInt(year) + 1));
            v.setArchiveDate(randomDate(Integer.parseInt(year), Integer.parseInt(year) + 1));
            v.setArchiveNo(fonds + "." + l1 + "." + l2 + "." + l3 + "." + dev + "." + volNo);
            v.setLocationNo(String.valueOf((char) ('A' + ThreadLocalRandom.current().nextInt(8))) + "-" + ThreadLocalRandom.current().nextInt(1, 50));
            v.setInStock(ThreadLocalRandom.current().nextInt(2)); // 0或1
            // v.setPendingDestroy(0); // 数据库表暂无此字段
            v.setCopies(ThreadLocalRandom.current().nextInt(1, 5));
            v.setBorrowedCopies(0);
            v.setStatus(ThreadLocalRandom.current().nextInt(4)); // 0-3
            v.setCompileUnit("莱矿集团");
            v.setCompiler("立卷人" + (i + 1));
            list.add(v);
        }
        saveBatch(volumeMapper, list);
        return list.size();
    }

    // ---------- 文件 ----------
    private int generateFiles() {
        List<ArchiveFile> list = new ArrayList<>();
        // 获取所有案卷
        List<ArchiveVolume> volumes = volumeMapper.selectList(null);
        if (volumes.isEmpty()) return 0;

        String[] fileTitles = {"设计说明书", "施工图纸", "验收报告", "操作规程", "安全协议",
                "检测记录", "维修日志", "变更通知", "会议纪要", "培训教材",
                "采购清单", "质量检验", "环评报告", "应急预案", "设备台账"};
        String[] responsibles = {"张三", "李四", "王五", "赵六", "孙七", "周八", "吴九", "郑十"};
        String[] periods = {"permanent", "30_years", "10_years"};
        String[] secs = {"public", "internal", "confidential", "secret"};
        String[] sizes = {"A0", "A1", "A2", "A3", "A4"};

        int seq = 0;
        for (ArchiveVolume vol : volumes) {
            int fileCount = ThreadLocalRandom.current().nextInt(2, 5);
            for (int j = 0; j < fileCount; j++) {
                ArchiveFile f = new ArchiveFile();
                f.setYear(vol.getYear());
                f.setFondsNo(vol.getFondsNo());
                f.setCategoryL1(vol.getCategoryL1());
                f.setCategoryL2(vol.getCategoryL2());
                f.setCategoryL3(vol.getCategoryL3());
                f.setDeviceCode(vol.getDeviceCode());
                f.setVolumeNo(vol.getVolumeNo());
                f.setSeqNo(j + 1);
                f.setFileNo("F-" + vol.getYear() + "-" + String.format("%05d", ++seq));
                f.setFileTitle(fileTitles[ThreadLocalRandom.current().nextInt(fileTitles.length)] + "_" + seq);
                f.setResponsible(responsibles[ThreadLocalRandom.current().nextInt(responsibles.length)]);
                f.setPages(ThreadLocalRandom.current().nextInt(1, 100));
                f.setArchiveDate(randomDate(Integer.parseInt(vol.getYear()), Integer.parseInt(vol.getYear()) + 1));
                f.setSecurityLevel(secs[ThreadLocalRandom.current().nextInt(secs.length)]);
                f.setArchiveNo(vol.getArchiveNo());
                f.setCompilerId(vol.getCompilerId());
                f.setRetentionPeriod(periods[ThreadLocalRandom.current().nextInt(periods.length)]);
                f.setDrawingSize(sizes[ThreadLocalRandom.current().nextInt(sizes.length)]);
                f.setA4Equivalent(String.valueOf(ThreadLocalRandom.current().nextInt(1, 10)));
                f.setCabinetNo(String.valueOf(ThreadLocalRandom.current().nextInt(1, 100)));
                f.setLocationNo(vol.getLocationNo());
                f.setInStock(vol.getInStock());
                f.setCopies(ThreadLocalRandom.current().nextInt(1, 5));
                f.setBorrowedCopies(0);
                f.setStatus(vol.getStatus());
                f.setOrganization("莱矿集团");
                list.add(f);
                if (list.size() >= 500) break;
            }
            if (list.size() >= 500) break;
        }
        saveBatch(fileMapper, list);
        return list.size();
    }

    // ---------- 借阅 ----------
    private int generateBorrows() {
        List<ArchiveBorrow> list = new ArrayList<>();
        List<ArchiveVolume> volumes = volumeMapper.selectList(null);
        if (volumes.isEmpty()) return 0;

        String[] reasons = {"查阅技术参数", "编写工作报告", "设备检修参考", "安全检查复核",
                "项目验收准备", "培训教学使用", "审计核查需要", "历史数据比对",
                "事故原因分析", "技术改进研究"};

        for (int i = 0; i < 150; i++) {
            ArchiveBorrow b = new ArchiveBorrow();
            ArchiveVolume vol = volumes.get(ThreadLocalRandom.current().nextInt(volumes.size()));
            long borrowerId = 1 + ThreadLocalRandom.current().nextInt(151);

            b.setBorrowerId(borrowerId);
            b.setBorrowerDept("档案管理部");
            b.setArchiveNo(vol.getArchiveNo());
            b.setApplyCount(ThreadLocalRandom.current().nextInt(1, vol.getCopies() + 1));
            b.setReason(reasons[ThreadLocalRandom.current().nextInt(reasons.length)]);

            int status = ThreadLocalRandom.current().nextInt(5);
            b.setStatus(status);

            LocalDateTime now = LocalDateTime.now();
            if (status >= 1) {
                b.setBorrowDate(now.minusDays(ThreadLocalRandom.current().nextInt(1, 60)));
                b.setPlanReturnDate(b.getBorrowDate().plusDays(ThreadLocalRandom.current().nextInt(7, 30)));
                if (status == 3) {
                    b.setActualReturnDate(b.getPlanReturnDate().minusDays(ThreadLocalRandom.current().nextInt(0, 5)));
                } else if (status == 4) {
                    b.setPlanReturnDate(now.minusDays(ThreadLocalRandom.current().nextInt(1, 30)));
                }
            }
            list.add(b);
        }
        saveBatch(borrowMapper, list);
        return list.size();
    }

    // ---------- 审批日志 ----------
    private int generateApproveLogs() {
        List<ArchiveApproveLog> list = new ArrayList<>();
        List<ArchiveVolume> volumes = volumeMapper.selectList(null);
        List<ArchiveBorrow> borrows = borrowMapper.selectList(null);

        String[] opinions = {"同意", "资料完整，予以通过", "不符合归档要求，退回修改",
                "经审核无误，批准", "缺少必要附件，驳回", "内容详实，同意", "格式不规范，请重新提交"};
        String[] actions = {"PASS", "REJECT", "BACK"};

        for (int i = 0; i < 200; i++) {
            ArchiveApproveLog log = new ArchiveApproveLog();
            int businessType = 1 + ThreadLocalRandom.current().nextInt(4);
            log.setBusinessType(businessType);

            if (businessType <= 3 && !volumes.isEmpty()) {
                log.setTargetId(volumes.get(ThreadLocalRandom.current().nextInt(volumes.size())).getRecordId());
            } else if (!borrows.isEmpty()) {
                log.setTargetId(borrows.get(ThreadLocalRandom.current().nextInt(borrows.size())).getBorrowId());
            } else if (!volumes.isEmpty()) {
                log.setTargetId(volumes.get(ThreadLocalRandom.current().nextInt(volumes.size())).getRecordId());
            }

            log.setApproverId((long) (1 + ThreadLocalRandom.current().nextInt(151)));
            log.setAction(actions[ThreadLocalRandom.current().nextInt(actions.length)]);
            log.setOpinion(opinions[ThreadLocalRandom.current().nextInt(opinions.length)]);
            log.setCreatedAt(LocalDateTime.now().minusDays(ThreadLocalRandom.current().nextInt(1, 180)));
            list.add(log);
        }
        saveBatch(approveLogMapper, list);
        return list.size();
    }

    // ---------- 通知 ----------
    private int generateNotifications() {
        List<SysNotification> list = new ArrayList<>();
        List<ArchiveBorrow> borrows = borrowMapper.selectList(null);

        String[] titles = {"借阅即将到期提醒", "借阅已逾期通知", "档案归还提醒", "借阅审批通过通知"};
        String[] contents = {"您借阅的档案即将到期，请及时归还。", "您借阅的档案已逾期，请尽快归还。",
                "请在规定时间内归还所借档案。", "您的借阅申请已审批通过，请前往领取。"};

        for (int i = 0; i < 100; i++) {
            SysNotification n = new SysNotification();
            n.setUserId((long) (1 + ThreadLocalRandom.current().nextInt(151)));
            n.setType(1 + ThreadLocalRandom.current().nextInt(2));
            n.setTitle(titles[ThreadLocalRandom.current().nextInt(titles.length)]);
            n.setContent(contents[ThreadLocalRandom.current().nextInt(contents.length)]);
            if (!borrows.isEmpty()) {
                n.setRefId(borrows.get(ThreadLocalRandom.current().nextInt(borrows.size())).getBorrowId());
            }
            n.setIsRead(ThreadLocalRandom.current().nextInt(2));
            list.add(n);
        }
        saveBatch(notificationMapper, list);
        return list.size();
    }

    // ---------- 工具方法 ----------
    private LocalDate randomDate(int yearStart, int yearEnd) {
        int year = yearStart + ThreadLocalRandom.current().nextInt(yearEnd - yearStart + 1);
        int month = 1 + ThreadLocalRandom.current().nextInt(12);
        int day = 1 + ThreadLocalRandom.current().nextInt(28);
        return LocalDate.of(year, month, day);
    }

    private <T> void saveBatch(com.baomidou.mybatisplus.core.mapper.BaseMapper<T> mapper, List<T> list) {
        if (list.isEmpty()) return;
        for (int i = 0; i < list.size(); i += BATCH_SIZE) {
            List<T> batch = list.subList(i, Math.min(i + BATCH_SIZE, list.size()));
            for (T item : batch) {
                mapper.insert(item);
            }
        }
    }
}
