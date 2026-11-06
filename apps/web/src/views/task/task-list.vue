<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, TaskStatus } from '@zentao/shared';
import { taskApi } from '../../api/task.js';
import { useUrlFilter } from '../../composables/useUrlFilter.js';
import { projectApi } from '../../api/project.js';
import { executionApi } from '../../api/execution.js';
import { usePagination } from '../../composables/usePagination.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';
import TaskCreateDialog from '../../components/common/task-create-dialog.vue';
import AssignCell from '../../components/common/assign-cell.vue';

// 任务列表（后端按 executionId/projectId/status/assignedTo 过滤，200 条封顶）
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

// 项目切换后执行下拉失效
function onProjectChange(): void {
  executionId.value = undefined;
}

const query = useQuery({
  queryKey: ['tasks', { projectId, executionId, statusTab, assignedTo }],
  queryFn: () =>
    taskApi.list({
      projectId: projectId.value,
      executionId: executionId.value,
      status: statusTab.value === 'all' ? undefined : statusTab.value,
      assignedTo: assignedTo.value || undefined,
    }),
});

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: TaskStatus.Wait, label: '未开始' },
  { key: TaskStatus.Doing, label: '进行中' },
  { key: TaskStatus.Done, label: '已完成' },
  { key: TaskStatus.Pause, label: '已暂停' },
  { key: TaskStatus.Cancel, label: '已取消' },
  { key: TaskStatus.Closed, label: '已关闭' },
];

const paged = usePagination(
  computed(() => query.data.value ?? []),
  20,
);

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
</script>

<template>
  <div>
    <PageHeader title="任务" description="六态状态机；工时在详情页记录（left=0 隐式完成）">
      <template #actions>
        <el-button v-permission="PERMS.task.create" type="primary" :icon="Plus" @click="openCreate">
          新建任务
        </el-button>
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
      <el-radio-group v-model="statusTab">
        <el-radio-button v-for="tab in statusTabs" :key="tab.key" :value="tab.key">{{
          tab.label
        }}</el-radio-button>
      </el-radio-group>
      <el-input v-model="assignedTo" placeholder="按指派账号筛选" clearable class="!w-44" />
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
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
      <el-table-column prop="name" label="名称" min-width="280" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="task" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }"
          ><span class="num">{{ row.type }}</span></template
        >
      </el-table-column>
      <el-table-column label="优先级" width="70">
        <template #default="{ row }"
          ><span class="num">P{{ row.pri }}</span></template
        >
      </el-table-column>
      <el-table-column label="工时 预/耗/余" width="150">
        <template #default="{ row }"
          ><span class="num"
            >{{ row.estimate }} / {{ row.consumed }} / {{ row.left }}</span
          ></template
        >
      </el-table-column>
      <el-table-column label="指派给" width="120">
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
      <el-table-column label="截止" width="100">
        <template #default="{ row }"
          ><span class="num">{{ row.deadline || '-' }}</span></template
        >
      </el-table-column>
      <template #empty>
        <el-empty :image-size="60" description="暂无任务">
          <el-button
            v-permission="PERMS.task.create"
            type="primary"
            size="small"
            @click="openCreate"
            >新建任务</el-button
          >
        </el-empty>
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="paged.page.value"
      v-model:page-size="paged.pageSize.value"
      :total="paged.total.value"
      layout="total, prev, pager, next, sizes"
      class="mt-3"
      small
    />

    <TaskCreateDialog
      v-model:open="createOpen"
      :project-id="projectId"
      :execution-id="executionId"
      @success="invalidateTasks"
    />
  </div>
</template>
