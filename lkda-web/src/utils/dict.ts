import { useDictStore } from '@/stores/dict'
import type { DictItemVO } from '@/types/vo'

export function getDictItems(dictCode: string): DictItemVO[] {
  const dictStore = useDictStore()
  return dictStore.dictMap[dictCode]?.filter(item => item.status === 1) ?? []
}

export function getDictLabel(dictCode: string, itemValue: string): string {
  const dictStore = useDictStore()
  const items = dictStore.dictMap[dictCode] ?? []
  return items.find(item => item.itemValue === itemValue)?.itemLabel ?? itemValue
}
