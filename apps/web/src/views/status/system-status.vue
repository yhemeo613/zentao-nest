<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { healthApi } from '../../api/health.js';

// P0 联调演示：vue-query + http 解包 + 统一响应体（docs/05 §2 数据流规则）
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['health'],
  queryFn: () => healthApi.getHealth(),
  refetchInterval: 15_000,
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">系统状态</h1>
      <button
        type="button"
        class="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
        @click="() => refetch()"
      >
        刷新
      </button>
    </div>

    <div v-if="isLoading" class="text-sm text-muted-foreground">检测中…</div>
    <div v-else-if="isError || !data" class="text-sm text-destructive">
      无法连接后端（确认 apps/server 已启动）
    </div>
    <div v-else class="grid max-w-md grid-cols-3 gap-3 text-center text-sm">
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="mb-1 text-muted-foreground">MySQL</div>
        <div :class="data.db ? 'text-emerald-600' : 'text-destructive'">
          {{ data.db ? '正常' : '异常' }}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="mb-1 text-muted-foreground">Redis</div>
        <div :class="data.redis ? 'text-emerald-600' : 'text-destructive'">
          {{ data.redis ? '正常' : '异常' }}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="mb-1 text-muted-foreground">运行时长</div>
        <div>{{ Math.floor(data.uptime / 60) }} 分钟</div>
      </div>
    </div>
  </div>
</template>
