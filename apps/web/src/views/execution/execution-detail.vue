<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import dayjs from 'dayjs';
import { ArrowLeft, Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { executionApi } from '../../api/execution.js';
import { taskApi } from '../../api/task.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import TeamPanel from '../../components/common/team-panel.vue';
import TaskCreateDialog from '../../components/common/task-create-dialog.vue';

// 执行详情：概览 / 任务 / 团队（docs/10 §4）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const executionId = computed(() => Number(route.params.id));
const activeTab = ref('overview');
const createOpen = ref(false);

const detail = useQuery({
  queryKey: ['executions', executionId.value],
  queryFn: () => executionApi.get(executionId.value),
  enabled: computed(() => Number.isFinite(executionId.value) && executionId.value > 0),
});
const tasks = useQuery({
  queryKey: ['tasks', { executionId: executionId.value }],
  queryFn: () => taskApi.list({ executionId: executionId.value }),
  enabled: computed(() => activeTab.value === 'tasks'),
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['executions'] })];

const actions = computed<ToolbarAction[]>(() => {
  const e = detail.data.value;
  if (!e) return [];
  const list: ToolbarAction[] = [];
  const t = (
    key: 'start' | 'suspend' | 'activate' | 'close',
    label: string,
    perm: string,
    type: ToolbarAction['type'],
  ) =>
    list.push({
      key,
      label,
      permission: perm,
      type,
      run: () =>
        confirmAction({
          title: label,
          message: `确定${label}执行「${e.name}」吗？`,
          run: () => executionApi.transition(e.id, key, key === 'close' ? 'done' : undefined),
          successMsg: `${label}成功`,
          invalidate,
        }),
    });
  if (e.status === 'wait') t('start', '启动', PERMS.execution.start, 'primary');
  if (e.status === 'doing') {
    t('suspend', '挂起', PERMS.execution.suspend, 'warning');
    t('close', '关闭', PERMS.execution.close, 'danger');
  }
  if (e.status === 'suspended') {
    t('activate', '激活', PERMS.execution.activate, 'primary');
    t('close', '关闭', PERMS.execution.close, 'danger');
  }
  if (e.status === 'wait' && !e.realBegan)
    list.push({
      key: 'back-to-wait',
      label: '退回未开始',
      permission: PERMS.execution.edit,
      run: () =>
        confirmAction({
          title: '退回未开始',
          message: '仅未产生工时的执行可退回；确定继续吗？',
          run: () => executionApi.backToWait(e.id),
          invalidate,
        }),
    });
  return list;
});

function fmtDate(value: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD') : '-';
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-button link @click="router.push('/executions')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <h1 class="text-lg font-semibold">{{ detail.data.value.name }}</h1>
        <StatusTag entity="execution" :status="detail.data.value.status" />
        <el-tag size="small" effect="plain">{{ detail.data.value.type }}</el-tag>
      </div>
      <div class="flex items-center gap-2">
        <el-button
          v-permission="PERMS.task.create"
          type="primary"
          size="small"
          :icon="Plus"
          @click="createOpen = true"
          >新建任务</el-button
        >
        <ActionToolbar :actions="actions" />
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="概览" name="overview">
        <div class="grid max-w-2xl grid-cols-4 gap-3">
          <div class="border border-border bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground">进度</div>
            <div class="num mt-1 text-xl font-semibold">
              {{ detail.data.value.progress || '-' }}
            </div>
          </div>
          <div class="border border-border bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground">预计工时</div>
            <div class="num mt-1 text-xl font-semibold">{{ detail.data.value.estimate }}</div>
          </div>
          <div class="border border-border bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground">消耗</div>
            <div class="num mt-1 text-xl font-semibold">{{ detail.data.value.consumed }}</div>
          </div>
          <div class="border border-border bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground">剩余</div>
            <div class="num mt-1 text-xl font-semibold">{{ detail.data.value.left }}</div>
          </div>
        </div>
        <el-descriptions :column="2" border size="small" class="mt-4">
          <el-descriptions-item label="起止">
            <span class="num"
              >{{ fmtDate(detail.data.value.begin) }} ~ {{ fmtDate(detail.data.value.end) }}</span
            >
          </el-descriptions-item>
          <el-descriptions-item label="实际开始"
            ><span class="num">{{
              fmtDate(detail.data.value.realBegan)
            }}</span></el-descriptions-item
          >
          <el-descriptions-item label="迭代目标" :span="2">
            <div class="whitespace-pre-wrap">{{ detail.data.value.sprintGoal || '-' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="任务" name="tasks">
        <el-table
          v-loading="tasks.isLoading.value"
          :data="tasks.data.value ?? []"
          size="small"
          class="table-hairline"
          empty-text="暂无任务"
        >
          <el-table-column label="ID" width="70">
            <template #default="{ row }">
              <span class="num cursor-pointer text-primary" @click="router.push(`/tasks/${row.id}`)"
                >#{{ row.id }}</span
              >
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="240" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag entity="task" :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="工时 预/耗/余" width="150">
            <template #default="{ row }">
              <span class="num">{{ row.estimate }} / {{ row.consumed }} / {{ row.left }}</span>
            </template>
          </el-table-column>
          <el-table-column label="指派给" width="110">
            <template #default="{ row }"
              ><span class="num">{{ row.assignedTo || '-' }}</span></template
            >
          </el-table-column>
          <el-table-column label="截止" width="100">
            <template #default="{ row }"
              ><span class="num">{{ row.deadline || '-' }}</span></template
            >
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="团队" name="team">
        <TeamPanel root-type="execution" :root-id="executionId" />
      </el-tab-pane>
    </el-tabs>

    <TaskCreateDialog
      v-model:open="createOpen"
      :project-id="detail.data.value.projectId"
      :execution-id="executionId"
      @success="() => queryClient.invalidateQueries({ queryKey: ['tasks', { executionId }] })"
    />
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="执行不存在" />
</template>
