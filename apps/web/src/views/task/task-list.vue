<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, TaskStatus } from '@zentao/shared';
import { taskApi } from '../../api/task.js';
import { projectApi } from '../../api/project.js';
import { executionApi } from '../../api/execution.js';
import { usePagination } from '../../composables/usePagination.js';
import { useUrlFilter } from '../../composables/useUrlFilter.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';
import AssignCell from '../../components/common/assign-cell.vue';
import TaskCreateDialog from '../../components/common/task-create-dialog.vue';

// 任务列表（复刻禅道 execution/task：featureBar 页签 + 列序 + 行内指派，docs/10 §7）
const router = useRouter();
const queryClient = useQueryClient();

// 筛选状态同步 URL（禅道基线，docs/10 §6.2）
const castId = (raw: string): number | undefined => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const projectId = useUrlFilter<number | undefined>('projectId', undefined, castId);
const executionId = useUrlFilter<number | undefined>('executionId', undefined, castId);
const statusTab = useUrlFilter<string>('status', 'all', (raw) => raw);
const assignedTo = ref('');
const createOpen = ref(false);

const projects = useQuery({ queryKey: ['projects'], queryFn: () => projectApi.list() });
const executions = useQuery({
  queryKey: ['executions', projectId],
  queryFn: () => executionApi.list(projectId.value!),
  enabled: computed(() => projectId.value != null),
});

function onProjectChange(): void {
  executionId.value = undefined;
}

const query = useQuery({
  queryKey: ['tasks', { projectId, executionId, statusTab, assignedTo }],
  queryFn: () =>
    taskApi.list({
      projectId: projectId.value,
      executionId: executionId.value,
      status: ['all', 'unclosed', 'assignedme', 'doingme', 'finishedme', 'changing'].includes(
        statusTab.value,
      )
        ? undefined
        : statusTab.value,
      assignedTo: assignedTo.value || undefined,
    }),
});

/** 功能页签（禅道 execution featureBar['task']） */
const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'unclosed', label: '未关闭' },
  { key: 'assignedme', label: '指派给我' },
  { key: 'doingme', label: '由我参与' },
  { key: 'finishedme', label: '我完成' },
  { key: TaskStatus.Wait, label: '未开始' },
  { key: TaskStatus.Doing, label: '进行中' },
  { key: TaskStatus.Done, label: '已完成' },
  { key: TaskStatus.Pause, label: '已暂停' },
  { key: TaskStatus.Closed, label: '已关闭' },
  { key: TaskStatus.Cancel, label: '已取消' },
];

const paged = usePagination(
  computed(() => query.data.value ?? []),
  20,
);

/** 进度 = consumed / (consumed + left) */
const progress = (row: { consumed: number; left: number }): string => {
  const total = row.consumed + row.left;
  return total > 0 ? `${Math.round((row.consumed / total) * 100)}%` : '-';
};

function invalidateTasks(): void {
  void queryClient.invalidateQueries({ queryKey: ['tasks'] });
}

function openCreate(): void {
  if (projectId.value == null || executionId.value == null) {
    ElMessage.warning('请先选择项目与执行，再新建任务');
    return;
  }
  createOpen.value = true;
}

const priType = (pri: number): 'danger' | 'warning' | 'primary' | 'info' =>
  pri === 1 ? 'danger' : pri === 2 ? 'warning' : pri === 3 ? 'primary' : 'info';
</script>

<template>
  <div>
    <PageHeader title="任务" description="全部 / 未关闭 / 指派给我 / 由我参与 / 我完成 / 各状态">
      <template #actions>
        <el-button v-permission="PERMS.task.create" type="primary" :icon="Plus" @click="openCreate"
          >建任务</el-button
        >
      </template>
    </PageHeader>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <el-select
        v-model="projectId"
        placeholder="按项目筛选"
        clearable
        filterable
        class="!w-56"
        @change="onProjectChange"
      >
        <el-option
          v-for="p in projects.data.value ?? []"
          :key="p.id"
          :value="p.id"
          :label="p.name"
        />
      </el-select>
      <el-select v-model="executionId" placeholder="按执行筛选" clearable filterable class="!w-56">
        <el-option
          v-for="e in executions.data.value ?? []"
          :key="e.id"
          :value="e.id"
          :label="e.name"
        />
      </el-select>
      <div class="flex flex-wrap items-center gap-1">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          class="rounded px-3 py-1 text-[13px] transition-colors"
          :class="
            statusTab === tab.key
              ? 'bg-primary text-white font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          "
          @click="statusTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <el-input v-model="assignedTo" placeholder="按指派账号筛选" clearable class="!w-44" />
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂时没有任务。"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }">
          <span class="num cursor-pointer text-primary" @click="router.push(`/tasks/${row.id}`)">{{
            row.id
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="任务名称" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">
          <span
            class="cursor-pointer text-primary hover:underline"
            @click="router.push(`/tasks/${row.id}`)"
            >{{ row.name }}</span
          >
        </template>
      </el-table-column>
      <el-table-column label="P" width="56">
        <template #default="{ row }">
          <el-tag :type="priType(row.pri)" size="small" effect="plain" disable-transitions
            >P{{ row.pri }}</el-tag
          >
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="task" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="指派给" width="110">
        <template #default="{ row }">
          <AssignCell
            v-permission="PERMS.task.assign"
            :value="row.assignedTo"
            :root-type="'execution'"
            :root-id="row.executionId"
            :save="(u: string) => taskApi.assign(row.id, { assignedTo: u })"
            @success="invalidateTasks"
          />
        </template>
      </el-table-column>
      <el-table-column label="完成者" width="100">
        <template #default="{ row }"
          ><span class="num">{{ row.finishedBy || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="截止" width="100">
        <template #default="{ row }"
          ><span class="num">{{ row.deadline || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="预计" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.estimate }}</span></template
        >
      </el-table-column>
      <el-table-column label="消耗" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.consumed }}</span></template
        >
      </el-table-column>
      <el-table-column label="剩余" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.left }}</span></template
        >
      </el-table-column>
      <el-table-column label="进度" width="90">
        <template #default="{ row }">
          <el-progress
            :percentage="parseFloat(progress(row)) || 0"
            :stroke-width="6"
            :show-text="false"
            class="!pt-2"
          />
          <span class="num text-xs text-muted-foreground">{{ progress(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="需求" width="80">
        <template #default="{ row }">
          <el-link
            v-if="row.storyId"
            type="primary"
            :underline="false"
            @click="router.push(`/stories/${row.storyId}`)"
          >
            <span class="num">#{{ row.storyId }}</span>
          </el-link>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :image-size="60" description="暂时没有任务。">
          <el-button
            v-permission="PERMS.task.create"
            type="primary"
            size="small"
            @click="openCreate"
            >建任务</el-button
          >
        </el-empty>
      </template>
    </el-table>

    <div class="mt-3 flex items-center justify-between">
      <span class="num text-xs text-muted-foreground">共 {{ paged.total.value }} 条</span>
      <el-pagination
        v-model:current-page="paged.page.value"
        v-model:page-size="paged.pageSize.value"
        :total="paged.total.value"
        layout="prev, pager, next, sizes"
        small
      />
    </div>

    <TaskCreateDialog
      v-model:open="createOpen"
      :project-id="projectId"
      :execution-id="executionId"
      @success="invalidateTasks"
    />
  </div>
</template>
