<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import { useQuery } from '@tanstack/vue-query';
import { healthApi } from '../../api/health.js';
import PageHeader from '../../components/common/page-header.vue';

// 系统状态：vue-query + http 解包 + 统一响应体（docs/05 §2 数据流规则）
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['health'],
  queryFn: () => healthApi.getHealth(),
  refetchInterval: 15_000,
});
</script>

<template>
  <div>
    <PageHeader title="系统状态" description="后端依赖探活（15 秒自动刷新）">
      <template #actions>
        <el-button :icon="Refresh" @click="() => refetch()">刷新</el-button>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="text-sm text-muted-foreground">检测中…</div>
    <el-alert
      v-else-if="isError || !data"
      type="error"
      :closable="false"
      title="无法连接后端"
      description="请确认 apps/server 已启动（默认 3000 端口）"
    />
    <div v-else class="grid max-w-lg grid-cols-3 gap-3">
      <div class="border border-border bg-card p-4 text-center">
        <div class="mb-1 text-xs text-muted-foreground">MySQL</div>
        <el-tag :type="data.db ? 'success' : 'danger'" size="small">{{
          data.db ? '正常' : '异常'
        }}</el-tag>
      </div>
      <div class="border border-border bg-card p-4 text-center">
        <div class="mb-1 text-xs text-muted-foreground">Redis</div>
        <el-tag :type="data.redis ? 'success' : 'danger'" size="small">{{
          data.redis ? '正常' : '异常'
        }}</el-tag>
      </div>
      <div class="border border-border bg-card p-4 text-center">
        <div class="mb-1 text-xs text-muted-foreground">运行时长</div>
        <div class="num text-sm">{{ Math.floor(data.uptime / 60) }} 分钟</div>
      </div>
    </div>
  </div>
</template>
