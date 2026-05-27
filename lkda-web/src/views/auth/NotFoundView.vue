<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
<template>
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px">
    <h2 style="font-size:48px;color:#14B8A6">404</h2>
    <p style="color:#64748B">页面不存在</p>
    <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
  </div>
</template>
