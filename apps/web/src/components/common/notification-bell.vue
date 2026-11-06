<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Bell } from '@element-plus/icons-vue';
import { oaApi } from '../../api/oa.js';
import { fmtDateTime } from '../../lib/format.js';

/** 通知铃铛（未读数 30s 轮询 + 列表 + 单条已读，docs/05 §8 oa 域） */
const router = useRouter();
const queryClient = useQueryClient();
const open = ref(false);

const unread = useQuery({
  queryKey: ['notify-unread'],
  queryFn: () => oaApi.unreadCount(),
  refetchInterval: 30_000,
});

const list = useQuery({
  queryKey: ['notifications'],
  queryFn: () => oaApi.notifications(),
  enabled: computed(() => open.value),
});

async function markRead(id: string): Promise<void> {
  await oaApi.markRead(id);
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  void queryClient.invalidateQueries({ queryKey: ['notify-unread'] });
}

function goto(notify: { objectType: string; objectId: string }): void {
  const map: Record<string, string> = {
    story: '/stories/',
    task: '/tasks/',
    bug: '/bugs/',
    case: '/cases/',
    testtask: '/testtasks/',
    product: '/products/',
    project: '/projects/',
  };
  const path = map[notify.objectType];
  if (path) void router.push(path + notify.objectId);
}
</script>

<template>
  <el-popover v-model:visible="open" trigger="click" width="360">
    <template #reference>
      <el-badge :value="unread.data.value ?? 0" :hidden="!unread.data.value" :max="99">
        <el-icon
          class="cursor-pointer text-lg align-middle text-muted-foreground hover:text-foreground"
        >
          <Bell />
        </el-icon>
      </el-badge>
    </template>
    <div class="max-h-80 overflow-y-auto">
      <el-empty
        v-if="(list.data.value ?? []).length === 0"
        description="暂无通知"
        :image-size="60"
      />
      <div
        v-for="n in list.data.value ?? []"
        :key="n.id"
        class="cursor-pointer border-b border-border/60 px-1 py-2 text-sm last:border-0 hover:bg-accent"
        @click="goto(n)"
      >
        <div class="flex items-center justify-between gap-2">
          <span :class="n.status === 'wait' ? 'font-medium' : 'text-muted-foreground'">{{
            n.subject
          }}</span>
          <el-button
            v-if="n.status === 'wait'"
            link
            type="primary"
            size="small"
            @click.stop="markRead(n.id)"
            >标为已读</el-button
          >
        </div>
        <div class="num mt-0.5 text-xs text-muted-foreground">{{ fmtDateTime(n.createdAt) }}</div>
      </div>
    </div>
  </el-popover>
</template>
