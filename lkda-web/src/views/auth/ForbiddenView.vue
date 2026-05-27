<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
<template>
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px">
    <h2 style="font-size:48px;color:#FB923C">403</h2>
    <p style="color:#64748B">您没有权限访问该页面</p>
    <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
  </div>
</template>
