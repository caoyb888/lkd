<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
  breadcrumbs?: Array<{ label: string; path?: string }>
  showBack?: boolean
}>()

const router = useRouter()
</script>

<template>
  <div class="page-header">
    <div class="page-header__left">
      <el-button
        v-if="showBack"
        link
        class="back-btn"
        @click="router.back()"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2 class="page-title">{{ title }}</h2>
    </div>
    <el-breadcrumb v-if="breadcrumbs?.length" separator="/">
      <el-breadcrumb-item
        v-for="crumb in breadcrumbs"
        :key="crumb.label"
        :to="crumb.path ? { path: crumb.path } : undefined"
      >
        {{ crumb.label }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ECFDF5;

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .back-btn {
    color: var(--color-primary);
    font-size: 14px;
  }

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-title);
  }
}
</style>
