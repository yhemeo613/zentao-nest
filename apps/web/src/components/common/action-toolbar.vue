<script setup lang="ts">
import type { Component } from 'vue';
import { usePermissionStore } from '../../stores/permission.js';

/** 动作条动作定义：权限点 × 前置状态由页面计算（isClickable 前端镜像，docs/10 §3） */
export interface ToolbarAction {
  key: string;
  label: string;
  icon?: Component;
  permission?: string | string[];
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';
  disabled?: boolean;
  run: () => unknown;
}

const props = defineProps<{ actions: ToolbarAction[] }>();
const permission = usePermissionStore();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <template v-for="action in props.actions" :key="action.key">
      <el-button
        v-if="!action.permission || permission.has(action.permission)"
        size="small"
        :type="action.type ?? 'default'"
        :disabled="action.disabled"
        @click="action.run()"
      >
        <el-icon v-if="action.icon" class="mr-1"><component :is="action.icon" /></el-icon>
        {{ action.label }}
      </el-button>
    </template>
  </div>
</template>
