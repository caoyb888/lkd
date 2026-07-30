import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DictItemVO } from '@/types/vo'
import http from '@/utils/http'

export const useDictStore = defineStore(
  'dict',
  () => {
    const dictMap = ref<Record<string, DictItemVO[]>>({})
    const loaded = ref(false)

    async function loadAll() {
      const data = await http.get<Record<string, DictItemVO[]>>('/dict/all-items')
      dictMap.value = data
      loaded.value = true
    }

    function getDictItems(dictCode: string): DictItemVO[] {
      return dictMap.value[dictCode]?.filter(item => item.status === 1) ?? []
    }

    /** 树形关联字典：按父级值过滤（如 category_l2 按 category_l1 的值过滤） */
    function getDictItemsByParent(dictCode: string, parentValue?: string): DictItemVO[] {
      const items = getDictItems(dictCode)
      if (!parentValue) return []
      return items.filter(item => !item.parentValue || item.parentValue === parentValue)
    }

    function getDictLabel(dictCode: string, itemValue: string): string {
      const items = dictMap.value[dictCode] ?? []
      return items.find(item => item.itemValue === itemValue)?.itemLabel ?? itemValue
    }

    function reset() {
      dictMap.value = {}
      loaded.value = false
    }

    return { dictMap, loaded, loadAll, getDictItems, getDictItemsByParent, getDictLabel, reset }
  },
  {
    persist: {
      key: 'lkda_dict',
      storage: localStorage,
      pick: ['dictMap', 'loaded'],
    },
  },
)
