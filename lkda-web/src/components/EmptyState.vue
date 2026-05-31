<script setup lang="ts">
defineProps<{
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="30" width="80" height="60" rx="8" fill="var(--theme-bg-light)" stroke="var(--color-primary)" stroke-width="2"/>
      <rect x="30" y="20" width="60" height="55" rx="6" fill="#fff" stroke="var(--color-primary)" stroke-width="1.5"/>
      <line x1="40" y1="38" x2="80" y2="38" stroke="var(--theme-accent-light)" stroke-width="2" stroke-linecap="round"/>
      <line x1="40" y1="48" x2="72" y2="48" stroke="var(--theme-accent-light)" stroke-width="2" stroke-linecap="round"/>
      <line x1="40" y1="58" x2="65" y2="58" stroke="var(--theme-accent-light)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="88" cy="82" r="18" fill="#FB923C" opacity="0.15"/>
      <text x="82" y="88" font-size="18" fill="#FB923C">?</text>
    </svg>
    <p class="empty-desc">{{ description ?? '暂无数据，档案柜正在整理中…' }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
}

.empty-desc {
  color: #94A3B8;
  font-size: 14px;
}
</style>
