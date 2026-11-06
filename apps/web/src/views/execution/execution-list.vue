<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { executionApi, type ExecutionVo } from '../../api/execution.js';
import { projectApi } from '../../api/project.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';

// 执行列表（GET /executions 的 projectId 必填——先选项目再加载，2026-11-06 源码核实）
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const projectId = ref<number | undefined>();
const statusFilter = ref<'all' | ExecutionVo['status']>('all');

const projects = useQuery({ queryKey: ['projects'], queryFn: () => projectApi.list() });
const projectName = (pid: number): string =>
  (projects.data.value ?? []).find((p) => p.id === pid)?.name ?? '-';

const query = useQuery({
  queryKey: ['executions', projectId],
  queryFn: () => executionApi.list(projectId.value!),
  enabled: computed(() => projectId.value != null),
});

const filtered = computed(() => {
  const list = query.data.value ?? [];
  if (statusFilter.value === 'all') return list;
  return list.filter((e) => e.status === statusFilter.value);
});
const paged = usePagination(filtered, 20);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['executions'] })];

async function transition(
  row: ExecutionVo,
  action: 'start' | 'suspend' | 'activate' | 'close',
): Promise<void> {
  const label = { start: '启动', suspend: '挂起', activate: '激活', close: '关闭' }[action];
  await confirmAction({
    title: label,
    message: `确定${label}执行「${row.name}」吗？`,
    run: () => executionApi.transition(row.id, action, action === 'close' ? 'done' : undefined),
    successMsg: `${label}成功`,
    invalidate,
  });
}

async function handleDelete(row: ExecutionVo): Promise<void> {
  await confirmAction({
    title: '删除执行',
    message: `确定删除「${row.name}」吗？`,
    danger: true,
    run: () => executionApi.remove(row.id),
    successMsg: '已删除',
    invalidate,
  });
}

// ---- 新建/编辑弹窗 ----
const dialogOpen = ref(false);
const editing = ref<ExecutionVo | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({
  projectId: '' as string,
  name: '',
  begin: '',
  end: '',
  sprintGoal: '',
  attribute: 'mix' as 'mix' | 'request' | 'design' | 'dev' | 'qa' | 'release' | 'review' | 'other',
});

const rules: FormRules = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入执行名称', trigger: 'blur' }],
  begin: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    projectId: projectId.value ? String(projectId.value) : '',
    name: '',
    begin: '',
    end: '',
    sprintGoal: '',
    attribute: 'mix',
  });
  dialogOpen.value = true;
}

function openEdit(row: ExecutionVo): void {
  editing.value = row;
  Object.assign(form, {
    projectId: String(row.projectId),
    name: row.name,
    begin: row.begin ?? '',
    end: row.end ?? '',
    sprintGoal: row.sprintGoal ?? '',
    attribute: 'mix',
  });
  dialogOpen.value = true;
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    if (editing.value) {
      await executionApi.update(editing.value.id, {
        name: form.name,
        end: form.end,
        sprintGoal: form.sprintGoal,
      });
      ElMessage.success('保存成功');
    } else {
      await executionApi.create({ ...form });
      ElMessage.success('创建成功');
    }
    dialogOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader title="执行" description="迭代 / 阶段 / 看板执行；启动将向上传播项目与项目集">
      <template #actions>
        <el-button
          v-permission="PERMS.execution.create"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          新建执行
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <el-select
        v-model="projectId"
        placeholder="选择项目以加载执行"
        filterable
        class="!w-72"
        clearable
      >
        <el-option
          v-for="p in projects.data.value ?? []"
          :key="p.id"
          :value="p.id"
          :label="p.name"
        />
      </el-select>
      <el-radio-group v-model="statusFilter">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="wait">未开始</el-radio-button>
        <el-radio-button value="doing">进行中</el-radio-button>
        <el-radio-button value="suspended">已挂起</el-radio-button>
        <el-radio-button value="closed">已关闭</el-radio-button>
      </el-radio-group>
    </div>

    <el-alert
      v-if="projectId == null"
      type="info"
      :closable="false"
      title="请先选择项目"
      description="后端按项目维度提供执行列表，选择项目后加载数据。"
      class="mb-3"
    />

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无执行"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.id }}</span></template
        >
      </el-table-column>
      <el-table-column label="名称" min-width="200">
        <template #default="{ row }">
          <span
            class="cursor-pointer text-primary hover:underline"
            @click="router.push(`/executions/${row.id}`)"
          >
            {{ row.name }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="所属项目" min-width="150">
        <template #default="{ row }">{{ projectName(row.projectId) }}</template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }"
          ><el-tag size="small" effect="plain">{{ row.type }}</el-tag></template
        >
      </el-table-column>
      <el-table-column label="进度" width="80">
        <template #default="{ row }"
          ><span class="num">{{ row.progress || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="起止" width="180">
        <template #default="{ row }"
          ><span class="num">{{ row.begin || '-' }} ~ {{ row.end || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"
          ><StatusDot entity="execution" :status="row.status"
        /></template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'wait'"
            v-permission="PERMS.execution.start"
            link
            type="primary"
            size="small"
            @click="transition(row, 'start')"
            >启动</el-button
          >
          <el-button
            v-if="row.status === 'doing'"
            v-permission="PERMS.execution.suspend"
            link
            type="warning"
            size="small"
            @click="transition(row, 'suspend')"
            >挂起</el-button
          >
          <el-button
            v-if="row.status === 'suspended'"
            v-permission="PERMS.execution.activate"
            link
            type="primary"
            size="small"
            @click="transition(row, 'activate')"
            >激活</el-button
          >
          <el-button
            v-if="row.status !== 'closed'"
            v-permission="PERMS.execution.close"
            link
            type="danger"
            size="small"
            @click="transition(row, 'close')"
            >关闭</el-button
          >
          <el-button v-permission="PERMS.execution.edit" link size="small" @click="openEdit(row)"
            >编辑</el-button
          >
          <el-button
            v-permission="PERMS.execution.delete"
            link
            type="danger"
            size="small"
            @click="handleDelete(row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="paged.page.value"
      v-model:page-size="paged.pageSize.value"
      :total="paged.total.value"
      layout="total, prev, pager, next, sizes"
      class="mt-3"
      small
    />

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑执行' : '新建执行'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item v-if="!editing" label="所属项目" prop="projectId">
          <el-select v-model="form.projectId" filterable class="!w-full">
            <el-option
              v-for="p in projects.data.value ?? []"
              :key="p.id"
              :value="String(p.id)"
              :label="p.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item v-if="!editing" label="阶段属性">
          <el-select v-model="form.attribute" class="!w-full">
            <el-option value="mix" label="综合" />
            <el-option value="request" label="需求" />
            <el-option value="design" label="设计" />
            <el-option value="dev" label="研发" />
            <el-option value="qa" label="测试" />
            <el-option value="release" label="发布" />
            <el-option value="review" label="评审" />
            <el-option value="other" label="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="begin">
          <el-date-picker
            v-model="form.begin"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled="!!editing"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="end">
          <el-date-picker v-model="form.end" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="迭代目标">
          <el-input v-model="form.sprintGoal" type="textarea" :rows="3" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
