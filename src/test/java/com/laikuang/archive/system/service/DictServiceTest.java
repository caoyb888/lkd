package com.laikuang.archive.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.laikuang.archive.common.domain.PageQuery;
import com.laikuang.archive.common.exception.BusinessException;
import com.laikuang.archive.system.domain.dto.CreateDictDTO;
import com.laikuang.archive.system.domain.dto.CreateDictItemDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictDTO;
import com.laikuang.archive.system.domain.dto.UpdateDictItemDTO;
import com.laikuang.archive.system.domain.entity.SysDict;
import com.laikuang.archive.system.domain.entity.SysDictItem;
import com.laikuang.archive.system.domain.vo.DictItemVO;
import com.laikuang.archive.system.domain.vo.DictVO;
import com.laikuang.archive.system.mapper.SysDictItemMapper;
import com.laikuang.archive.system.mapper.SysDictMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sprint 1 — S1-05：数据字典集成测试。
 * 覆盖字典 CRUD、编码唯一性、停用保护、字典项重复值拦截、前端下拉数据源。
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DictServiceTest {

    @Autowired
    private DictService dictService;

    @Autowired
    private SysDictMapper dictMapper;

    @Autowired
    private SysDictItemMapper dictItemMapper;

    private Long testDictId;
    private static final String TEST_DICT_CODE = "test_dict";

    @BeforeEach
    void setUp() {
        CreateDictDTO dto = new CreateDictDTO();
        dto.setDictCode(TEST_DICT_CODE);
        dto.setDictName("测试字典");
        dictService.createDict(dto);

        testDictId = dictMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysDict>()
                        .eq(SysDict::getDictCode, TEST_DICT_CODE)).getDictId();
    }

    // ==================== 字典主表 CRUD ====================

    @Test
    @DisplayName("创建字典-dictCode 重复：应拦截")
    void createDictWithDuplicateCode() {
        CreateDictDTO dto = new CreateDictDTO();
        dto.setDictCode(TEST_DICT_CODE);
        dto.setDictName("重复字典");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> dictService.createDict(dto));
        assertTrue(ex.getMessage().contains("已存在"));
    }

    @Test
    @DisplayName("删除字典-未停用：应拒绝删除")
    void deleteActiveDictShouldFail() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> dictService.deleteDict(testDictId));
        assertTrue(ex.getMessage().contains("停用"));
    }

    @Test
    @DisplayName("删除字典-已停用：应级联删除字典项")
    void deleteInactiveDictShouldSuccess() {
        // 先添加一个字典项
        CreateDictItemDTO itemDto = new CreateDictItemDTO();
        itemDto.setDictCode(TEST_DICT_CODE);
        itemDto.setItemValue("v1");
        itemDto.setItemLabel("值1");
        dictService.createDictItem(itemDto);

        // 再停用字典
        UpdateDictDTO updateDto = new UpdateDictDTO();
        updateDto.setDictName("测试字典");
        updateDto.setStatus(0);
        dictService.updateDict(testDictId, updateDto);

        assertDoesNotThrow(() -> dictService.deleteDict(testDictId));
        assertNull(dictMapper.selectById(testDictId));
    }

    @Test
    @DisplayName("字典分页查询：应支持关键字模糊搜索")
    void pageDictsWithKeyword() {
        PageQuery pageQuery = new PageQuery();
        pageQuery.setCurrent(1);
        pageQuery.setPageSize(10);

        IPage<DictVO> page = dictService.pageDicts(pageQuery, "test_dict");
        assertFalse(page.getRecords().isEmpty());
        assertEquals("test_dict", page.getRecords().get(0).getDictCode());
    }

    @Test
    @DisplayName("字典详情：应包含全部字典项")
    void getDictDetailWithItems() {
        CreateDictItemDTO itemDto = new CreateDictItemDTO();
        itemDto.setDictCode(TEST_DICT_CODE);
        itemDto.setItemValue("detail_v1");
        itemDto.setItemLabel("详情值1");
        itemDto.setSortOrder(1);
        dictService.createDictItem(itemDto);

        DictVO vo = dictService.getDictDetail(testDictId);
        assertNotNull(vo.getItems());
        assertTrue(vo.getItems().stream()
                .anyMatch(i -> i.getItemValue().equals("detail_v1")));
    }

    // ==================== 字典项 CRUD ====================

    @Test
    @DisplayName("创建字典项-父字典已停用：应拦截")
    void createDictItemWithInactiveDict() {
        // 停用字典
        UpdateDictDTO updateDto = new UpdateDictDTO();
        updateDto.setDictName("测试字典");
        updateDto.setStatus(0);
        dictService.updateDict(testDictId, updateDto);

        CreateDictItemDTO dto = new CreateDictItemDTO();
        dto.setDictCode(TEST_DICT_CODE);
        dto.setItemValue("v_stop");
        dto.setItemLabel("停用测试");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> dictService.createDictItem(dto));
        assertTrue(ex.getMessage().contains("停用"));
    }

    @Test
    @DisplayName("创建字典项-同一字典下 itemValue 重复：应拦截")
    void createDictItemWithDuplicateValue() {
        CreateDictItemDTO dto1 = new CreateDictItemDTO();
        dto1.setDictCode(TEST_DICT_CODE);
        dto1.setItemValue("dup_value");
        dto1.setItemLabel("值1");
        dictService.createDictItem(dto1);

        CreateDictItemDTO dto2 = new CreateDictItemDTO();
        dto2.setDictCode(TEST_DICT_CODE);
        dto2.setItemValue("dup_value");
        dto2.setItemLabel("值2");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> dictService.createDictItem(dto2));
        assertTrue(ex.getMessage().contains("已存在"));
    }

    @Test
    @DisplayName("更新字典项：应正确更新字段")
    void updateDictItem() {
        CreateDictItemDTO dto = new CreateDictItemDTO();
        dto.setDictCode(TEST_DICT_CODE);
        dto.setItemValue("update_v");
        dto.setItemLabel("旧标签");
        dto.setSortOrder(1);
        dictService.createDictItem(dto);

        // 用 DictVO 详情来验证
        DictVO detail = dictService.getDictDetail(testDictId);
        Long itemId = detail.getItems().stream()
                .filter(i -> i.getItemValue().equals("update_v"))
                .findFirst().orElseThrow().getItemId();

        UpdateDictItemDTO updateDto = new UpdateDictItemDTO();
        updateDto.setItemValue("update_v");
        updateDto.setItemLabel("新标签");
        updateDto.setSortOrder(2);
        updateDto.setStatus(1);
        dictService.updateDictItem(itemId, updateDto);

        DictVO updatedDetail = dictService.getDictDetail(testDictId);
        DictItemVO updatedItem = updatedDetail.getItems().stream()
                .filter(i -> i.getItemId().equals(itemId))
                .findFirst().orElseThrow();
        assertEquals("新标签", updatedItem.getItemLabel());
        assertEquals(2, updatedItem.getSortOrder());
    }

    @Test
    @DisplayName("删除字典项：应成功移除")
    void deleteDictItem() {
        CreateDictItemDTO dto = new CreateDictItemDTO();
        dto.setDictCode(TEST_DICT_CODE);
        dto.setItemValue("del_v");
        dto.setItemLabel("待删除");
        dictService.createDictItem(dto);

        DictVO detail = dictService.getDictDetail(testDictId);
        Long itemId = detail.getItems().stream()
                .filter(i -> i.getItemValue().equals("del_v"))
                .findFirst().orElseThrow().getItemId();

        assertDoesNotThrow(() -> dictService.deleteDictItem(itemId));

        DictVO afterDelete = dictService.getDictDetail(testDictId);
        assertTrue(afterDelete.getItems() == null ||
                afterDelete.getItems().stream().noneMatch(i -> i.getItemValue().equals("del_v")));
    }

    // ==================== 前端下拉数据源 ====================

    @Test
    @DisplayName("获取所有启用字典项：应按 dictCode 分组返回")
    void getAllActiveItemsShouldGroupByDictCode() {
        CreateDictItemDTO dto1 = new CreateDictItemDTO();
        dto1.setDictCode(TEST_DICT_CODE);
        dto1.setItemValue("group_v1");
        dto1.setItemLabel("分组值1");
        dictService.createDictItem(dto1);

        Map<String, List<DictItemVO>> map = dictService.getAllActiveItems();
        assertNotNull(map);
        assertTrue(map.containsKey(TEST_DICT_CODE));
        assertTrue(map.get(TEST_DICT_CODE).stream()
                .anyMatch(i -> i.getItemValue().equals("group_v1")));
    }

    @Test
    @DisplayName("按编码获取字典项：应只返回该字典的启用项")
    void getActiveItemsByCode() {
        CreateDictItemDTO dto = new CreateDictItemDTO();
        dto.setDictCode(TEST_DICT_CODE);
        dto.setItemValue("code_v1");
        dto.setItemLabel("编码值1");
        dictService.createDictItem(dto);

        List<DictItemVO> items = dictService.getActiveItemsByCode(TEST_DICT_CODE);
        assertFalse(items.isEmpty());
        assertTrue(items.stream().anyMatch(i -> i.getItemValue().equals("code_v1")));
    }

    @Test
    @DisplayName("停用字典后：getAllActiveItems 不应包含该字典的项")
    void inactiveDictItemsShouldNotAppearInActiveItems() {
        CreateDictItemDTO dto = new CreateDictItemDTO();
        dto.setDictCode(TEST_DICT_CODE);
        dto.setItemValue("inactive_v");
        dto.setItemLabel("停用测试值");
        dictService.createDictItem(dto);

        // 停用字典
        UpdateDictDTO updateDto = new UpdateDictDTO();
        updateDto.setDictName("测试字典");
        updateDto.setStatus(0);
        dictService.updateDict(testDictId, updateDto);

        Map<String, List<DictItemVO>> map = dictService.getAllActiveItems();
        // 停用字典的字典项不应出现在启用列表中
        if (map.containsKey(TEST_DICT_CODE)) {
            assertTrue(map.get(TEST_DICT_CODE).isEmpty() ||
                    map.get(TEST_DICT_CODE).stream().noneMatch(i -> i.getItemValue().equals("inactive_v")));
        }
    }
}
