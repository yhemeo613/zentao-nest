<script setup lang="ts">
import { useAuthStore } from '../../stores/auth.js';

// F1 最小版：当前用户 + 权限点计数（系统管理页随 F1 后续交付）
const auth = useAuthStore();
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-lg font-semibold">我的概览</h1>
    <div class="grid max-w-lg grid-cols-3 gap-3 text-center text-sm">
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="mb-1 text-muted-foreground">当前用户</div>
        <div>{{ auth.user?.realname ?? auth.user?.account ?? '-' }}</div>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="mb-1 text-muted-foreground">账号</div>
        <div>{{ auth.user?.account ?? '-' }}</div>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="mb-1 text-muted-foreground">权限点</div>
        <div>{{ auth.permissions.length }}</div>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">
      系统管理（用户/角色/部门/ACL）页面随 F1 交付；待办/任务聚合随 P5 我的地盘交付。
    </p>
  </div>
</template>
