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

    function getDictLabel(dictCode: string, itemValue: string): string {
      const items = dictMap.value[dictCode] ?? []
      return items.find(item => item.itemValue === itemValue)?.itemLabel ?? itemValue
    }

    function reset() {
      dictMap.value = {}
      loaded.value = false
    }

    return { dictMap, loaded, loadAll, getDictItems, getDictLabel, reset }
  },
  {
    persist: {
      key: 'lkda_dict',
      storage: localStorage,
      pick: ['dictMap', 'loaded'],
    },
  },
)
