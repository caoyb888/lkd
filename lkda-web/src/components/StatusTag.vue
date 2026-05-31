<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'archive' | 'borrow' | 'stock'
  value: number | string
  // 借阅状态额外参数
  remainDays?: number
}>()

interface TagStyle {
  label: string
  bg: string
  color: string
}

const archiveMap: Record<number, TagStyle> = {
  0: { label: '草稿', bg: '#F1F5F9', color: '#64748B' },
  1: { label: '待审核', bg: '#FEF9C3', color: '#854D0E' },
  2: { label: '待确认', bg: '#DBEAFE', color: '#1D4ED8' },
  3: { label: '已归档', bg: 'var(--theme-border-light)', color: '#065F46' },
  10: { label: '销毁待审批', bg: '#EDE9FE', color: '#5B21B6' },
  11: { label: '已销毁', bg: '#FEE2E2', color: '#991B1B' },
}

const stockMap: Record<number, TagStyle> = {
  1: { label: '在库', bg: 'var(--theme-bg-lighter)', color: 'var(--color-primary-dark)' },
  0: { label: '借出', bg: '#FFEDD5', color: '#C2410C' },
}

const tagStyle = computed<TagStyle>(() => {
  if (props.type === 'archive') {
    return archiveMap[Number(props.value)] ?? { label: String(props.value), bg: '#F1F5F9', color: '#64748B' }
  }

  if (props.type === 'stock') {
    return stockMap[Number(props.value)] ?? { label: String(props.value), bg: '#F1F5F9', color: '#64748B' }
  }

  // borrow status
  const status = Number(props.value)
  if (status === 0) return { label: '待审批', bg: '#F1F5F9', color: '#64748B' }
  if (status === 1) {
    const days = props.remainDays ?? 999
    if (days <= 0) return { label: `逾期${Math.abs(days)}天`, bg: '#FEE2E2', color: '#B91C1C' }
    if (days <= 3) return { label: `即将到期·剩余${days}天`, bg: '#FFEDD5', color: '#C2410C' }
    return { label: `已借出·剩余${days}天`, bg: 'var(--theme-bg-lighter)', color: 'var(--color-primary-dark)' }
  }
  if (status === 2) return { label: '已驳回', bg: '#FEE2E2', color: '#991B1B' }
  if (status === 3) return { label: '已归还', bg: 'var(--theme-border-light)', color: '#065F46' }
  if (status === 4) {
    // 若传入 remainDays（负值 = 已逾期天数），则显示具体天数
    if (props.remainDays !== undefined && props.remainDays < 0) {
      return { label: `已逾期 ${Math.abs(props.remainDays)} 天`, bg: '#FEE2E2', color: '#B91C1C' }
    }
    return { label: '逾期未还', bg: '#FEE2E2', color: '#B91C1C' }
  }
  return { label: String(props.value), bg: '#F1F5F9', color: '#64748B' }
})
</script>

<template>
  <span
    class="status-tag"
    :style="{ backgroundColor: tagStyle.bg, color: tagStyle.color }"
  >
    {{ tagStyle.label }}
  </span>
</template>

<style scoped>
.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
</style>
