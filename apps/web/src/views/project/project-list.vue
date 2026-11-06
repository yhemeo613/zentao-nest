<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { projectApi, type ProjectVo } from '../../api/project.js';
import { programApi } from '../../api/program.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';

// 项目列表（多模型 scrum/waterfall/kanban；multiple=0 自动影子迭代）
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const statusFilter = ref<'all' | ProjectVo['status']>('all');
const query = useQuery({ queryKey: ['projects'], queryFn: () => projectApi.list() });
const programs = useQuery({ queryKey: ['programs'], queryFn: () => programApi.list() });

const programName = (programId: number): string =>
  (programs.data.value ?? []).find((p) => p.id === programId)?.name ?? '-';

const filtered = computed(() => {
  const list = query.data.value ?? [];
  if (statusFilter.value === 'all') return list;
  return list.filter((p) => p.status === statusFilter.value);
});
const paged = usePagination(filtered, 20);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['projects'] })];

/** 状态流转（start 向上传播项目集；close 需关闭原因） */
async function transition(
  row: ProjectVo,
  action: 'start' | 'suspend' | 'close' | 'activate',
): Promise<void> {
  const label = { start: '启动', suspend: '挂起', close: '关闭', activate: '激活' }[action];
  await confirmAction({
    title: label,
    message: `确定${label}项目「${row.name}」吗？`,
    run: () => projectApi.transition(row.id, action, action === 'close' ? 'done' : undefined),
    successMsg: `${label}成功`,
    invalidate,
  });
}

async function handleDelete(row: ProjectVo): Promise<void> {
  await confirmAction({
    title: '删除项目',
    message: `确定删除「${row.name}」吗？（存在执行时将被拒绝）`,
    danger: true,
    run: () => projectApi.remove(row.id),
    successMsg: '已删除',
    invalidate,
  });
}

// ---- 新建/编辑弹窗 ----
const dialogOpen = ref(false);
const editing = ref<ProjectVo | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({
  programId: 0,
  name: '',
  code: '',
  model: 'scrum' as ProjectVo['model'],
  begin: '',
  end: '',
  pmId: '',
  multiple: 0 as 0 | 1,
  desc: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入项目编码（唯一）', trigger: 'blur' }],
  begin: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    programId: 0,
    name: '',
    code: '',
    model: 'scrum',
    begin: '',
    end: '',
    pmId: '',
    multiple: 0,
    desc: '',
  });
  dialogOpen.value = true;
}

function openEdit(row: ProjectVo): void {
  editing.value = row;
  Object.assign(form, {
    programId: row.programId,
    name: row.name,
    code: row.code,
    model: row.model,
    begin: row.begin ?? '',
    end: row.end ?? '',
    pmId: row.pmId ?? '',
    multiple: (row.multiple as 0 | 1) ?? 0,
    desc: row.desc ?? '',
  });
  dialogOpen.value = true;
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    if (editing.value) {
      await projectApi.update(editing.value.id, {
        name: form.name,
        pmId: form.pmId,
        end: form.end,
        desc: form.desc,
      });
      ElMessage.success('保存成功');
    } else {
      await projectApi.create({ ...form });
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
    <PageHeader title="项目" description="scrum / waterfall / kanban 多模型；点击名称进入详情">
      <template #actions>
        <el-button
          v-permission="PERMS.project.create"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          新建项目
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3 flex items-center gap-2">
      <el-radio-group v-model="statusFilter">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="wait">未开始</el-radio-button>
        <el-radio-button value="doing">进行中</el-radio-button>
        <el-radio-button value="suspended">已挂起</el-radio-button>
        <el-radio-button value="closed">已关闭</el-radio-button>
      </el-radio-group>
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无项目"
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
            @click="router.push(`/projects/${row.id}`)"
          >
            {{ row.name }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="编码" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.code }}</span></template
        >
      </el-table-column>
      <el-table-column label="模型" width="90">
        <template #default="{ row }"
          ><el-tag size="small" effect="plain">{{ row.model }}</el-tag></template
        >
      </el-table-column>
      <el-table-column label="所属项目集" min-width="130">
        <template #default="{ row }">{{ programName(row.programId) }}</template>
      </el-table-column>
      <el-table-column label="进度" width="90">
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
        <template #default="{ row }"><StatusDot entity="project" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'wait'"
            v-permission="PERMS.project.start"
            link
            type="primary"
            size="small"
            @click="transition(row, 'start')"
            >启动</el-button
          >
          <el-button
            v-if="row.status === 'doing'"
            v-permission="PERMS.project.suspend"
            link
            type="warning"
            size="small"
            @click="transition(row, 'suspend')"
            >挂起</el-button
          >
          <el-button
            v-if="row.status === 'suspended'"
            v-permission="PERMS.project.activate"
            link
            type="primary"
            size="small"
            @click="transition(row, 'activate')"
            >激活</el-button
          >
          <el-button
            v-if="row.status !== 'closed'"
            v-permission="PERMS.project.close"
            link
            type="danger"
            size="small"
            @click="transition(row, 'close')"
            >关闭</el-button
          >
          <el-button v-permission="PERMS.project.edit" link size="small" @click="openEdit(row)"
            >编辑</el-button
          >
          <el-button
            v-permission="PERMS.project.delete"
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

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑项目' : '新建项目'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item v-if="!editing" label="所属项目集">
          <el-select v-model="form.programId" class="!w-full">
            <el-option :value="0" label="（无）" />
            <el-option
              v-for="p in programs.data.value ?? []"
              :key="p.id"
              :value="p.id"
              :label="p.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" :disabled="!!editing" placeholder="唯一" />
        </el-form-item>
        <el-form-item v-if="!editing" label="管理模型">
          <el-radio-group v-model="form.model">
            <el-radio-button value="scrum">scrum</el-radio-button>
            <el-radio-button value="waterfall">waterfall</el-radio-button>
            <el-radio-button value="kanban">kanban</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!editing" label="执行模式">
          <el-radio-group v-model="form.multiple">
            <el-radio :value="0">单执行（自动创建影子迭代）</el-radio>
            <el-radio :value="1">多执行（手动管理迭代）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="项目经理">
          <el-input v-model="form.pmId" placeholder="账号，可选" />
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
        <el-form-item label="描述">
          <el-input v-model="form.desc" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
