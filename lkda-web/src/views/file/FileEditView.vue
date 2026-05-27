<script setup lang="ts">
// 文件表单以 Drawer 形式内嵌在 FileListView，此页面不直接使用
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => router.replace('/volume/list'))
</script>

<template>
  <div />
</template>
