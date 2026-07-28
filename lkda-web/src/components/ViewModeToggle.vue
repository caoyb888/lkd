<script setup lang="ts">
import type { ViewMode } from '@/composables/useViewMode'

defineProps<{
  modelValue: ViewMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ViewMode]
}>()
</script>

<template>
  <div class="view-toggle">
    <el-tooltip content="表格视图" placement="top">
      <el-button
        :type="modelValue === 'table' ? 'primary' : 'default'"
        circle
        size="small"
        @click="emit('update:modelValue', 'table')"
      >
        <el-icon><List /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip content="卡片视图" placement="top">
      <el-button
        :type="modelValue === 'card' ? 'primary' : 'default'"
        circle
        size="small"
        @click="emit('update:modelValue', 'card')"
      >
        <el-icon><Grid /></el-icon>
      </el-button>
    </el-tooltip>
  </div>
</template>

<style scoped lang="scss">
.view-toggle {
  display: flex;
  gap: 6px;

  .el-button {
    border-radius: 8px;
  }
}
</style>
