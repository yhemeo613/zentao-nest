<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { oaApi } from '../../api/oa.js';
import { fmtDateTime } from '../../lib/format.js';

/** 操作记录时间线（禅道详情页右栏标配；objectType 以后端落库为准，case/testtask/execution 无审计不挂载） */
const props = defineProps<{ objectType: string; objectId: number | string }>();

const query = useQuery({
  queryKey: ['actions', props.objectType, props.objectId],
  queryFn: () => oaApi.actions(props.objectType, props.objectId),
});

const ACTION_LABELS: Record<string, string> = {
  opened: '创建',
  created: '创建',
  edited: '编辑',
  started: '启动',
  activated: '激活',
  paused: '暂停',
  resumed: '继续',
  finished: '完成',
  canceled: '取消',
  closed: '关闭',
  assigned: '指派',
  confirmed: '确认',
  resolved: '解决',
  reviewed: '评审',
  changed: '变更',
  recalled: '撤回',
  subdivided: '拆分',
  tostory: '转需求',
  deleted: '删除',
  putoff: '延期',
  started_: '启动',
  backtowait: '退回未开始',
};

const items = computed(() =>
  (query.data.value ?? []).map((a) => ({
    id: a.id,
    actor: a.actor,
    action: ACTION_LABELS[a.action] ?? a.action,
    date: fmtDateTime(a.actionDate),
    comment: a.comment || '',
  })),
);
</script>

<template>
  <div class="border border-border bg-card">
    <div class="border-b border-border px-4 py-2 text-sm font-medium">操作记录</div>
    <div class="p-4">
      <el-empty
        v-if="items.length === 0 && !query.isLoading.value"
        description="暂无操作记录"
        :image-size="60"
      />
      <el-timeline v-else class="max-h-96 overflow-y-auto">
        <el-timeline-item
          v-for="item in items"
          :key="item.id"
          :timestamp="item.date"
          type="primary"
          placement="top"
        >
          <span class="num">{{ item.actor }}</span>
          <span class="ml-1">{{ item.action }}</span>
          <div v-if="item.comment" class="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
            {{ item.comment }}
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>
