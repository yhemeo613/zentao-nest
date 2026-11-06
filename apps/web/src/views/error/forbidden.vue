<script setup lang="ts">
import { useRouter } from 'vue-router';

// 403（守卫权限拦截兜底页，docs/05 §5.2）
const router = useRouter();
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center">
    <el-result icon="warning" title="403" sub-title="您没有访问该页面的功能权限">
      <template #extra>
        <el-button type="primary" @click="router.push({ name: 'dashboard' })"
          >返回我的地盘</el-button
        >
      </template>
    </el-result>
  </div>
</template>
