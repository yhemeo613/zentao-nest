<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { oaApi, type TodoVo } from '../../api/oa.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import { fmtDate } from '../../lib/format.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';

// 待办（四态 wait/doing/done/closed；type≠custom 须带 objectId，5101）
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const statusTab = ref('all');
const query = useQuery({
  queryKey: ['todos', statusTab],
  queryFn: () => oaApi.todos(statusTab.value === 'all' ? undefined : statusTab.value),
});

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'wait', label: '未开始' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'closed', label: '已关闭' },
];

const paged = usePagination(
  computed(() => query.data.value ?? []),
  20,
);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['todos'] })];

const typeLabels: Record<string, string> = {
  custom: '自定义',
  task: '任务',
  bug: 'Bug',
  story: '需求',
  test: '测试',
  cycle: '循环',
};

/** 对象跳转 */
function goto(todo: TodoVo): void {
  const map: Record<string, string> = {
    task: '/tasks/',
    bug: '/bugs/',
    story: '/stories/',
    test: '/testtasks/',
  };
  const path = map[todo.type];
  if (path && todo.objectId > 0) void router.push(path + todo.objectId);
}

const can = (todo: TodoVo, action: string): boolean => {
  const s = todo.status;
  return (
    (action === 'start' && s === 'wait') ||
    (action === 'finish' && (s === 'wait' || s === 'doing')) ||
    (action === 'close' && s !== 'closed') ||
    (action === 'activate' && (s === 'done' || s === 'closed'))
  );
};

async function transition(
  todo: TodoVo,
  action: 'start' | 'finish' | 'close' | 'activate',
): Promise<void> {
  const label = { start: '开始', finish: '完成', close: '关闭', activate: '激活' }[action];
  await confirmAction({
    title: label,
    message: `确定${label}待办「${todo.name}」吗？`,
    run: () => oaApi.todoAction(todo.id, action),
    successMsg: `${label}成功`,
    invalidate,
  });
}

async function handleDelete(todo: TodoVo): Promise<void> {
  await confirmAction({
    title: '删除待办',
    message: `确定删除「${todo.name}」吗？`,
    danger: true,
    run: () => oaApi.deleteTodo(todo.id),
    successMsg: '已删除',
    invalidate,
  });
}

// ---- 新建/编辑 ----
const dialogOpen = ref(false);
const editing = ref<TodoVo | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({
  type: 'custom' as TodoVo['type'],
  objectId: '' as string,
  name: '',
  pri: 3,
  date: '',
  desc: '',
});

const rules: FormRules = {
  name: [
    {
      validator: (_r, value: string, cb) => {
        if (form.type === 'custom' && !value) cb(new Error('自定义待办必须填写名称'));
        else cb();
      },
      trigger: 'blur',
    },
  ],
  objectId: [
    {
      validator: (_r, value: string, cb) => {
        if (form.type !== 'custom' && !value) cb(new Error('关联待办必须填写对象 ID（5101）'));
        else cb();
      },
      trigger: 'blur',
    },
  ],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    type: 'custom',
    objectId: '',
    name: '',
    pri: 3,
    date: new Date().toISOString().slice(0, 10),
    desc: '',
  });
  dialogOpen.value = true;
}

function openEdit(todo: TodoVo): void {
  editing.value = todo;
  Object.assign(form, {
    type: todo.type,
    objectId: String(todo.objectId),
    name: todo.name,
    pri: todo.pri,
    date: todo.date ?? '',
    desc: todo.desc ?? '',
  });
  dialogOpen.value = true;
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    if (editing.value) {
      await oaApi.updateTodo(editing.value.id, {
        name: form.name,
        pri: form.pri,
        date: form.date || undefined,
        desc: form.desc || undefined,
      });
      ElMessage.success('已保存');
    } else {
      await oaApi.createTodo({
        type: form.type,
        objectId: form.type === 'custom' ? undefined : form.objectId,
        name: form.name || undefined,
        pri: form.pri,
        date: form.date || undefined,
        desc: form.desc || undefined,
      });
      ElMessage.success('待办已创建');
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
    <PageHeader title="待办" description="我的待办（指派给我或我创建）；四态流转">
      <template #actions>
        <el-button v-permission="PERMS.todo.create" type="primary" :icon="Plus" @click="openCreate"
          >新建待办</el-button
        >
      </template>
    </PageHeader>

    <div class="mb-3">
      <el-radio-group v-model="statusTab">
        <el-radio-button v-for="tab in statusTabs" :key="tab.key" :value="tab.key">{{
          tab.label
        }}</el-radio-button>
      </el-radio-group>
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无待办"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.id }}</span></template
        >
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ typeLabels[row.type] ?? row.type }}</template>
      </el-table-column>
      <el-table-column label="名称" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="cursor-pointer hover:text-primary" @click="goto(row)">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="优先级" width="70">
        <template #default="{ row }"
          ><span class="num">P{{ row.pri }}</span></template
        >
      </el-table-column>
      <el-table-column label="日期" width="100">
        <template #default="{ row }"
          ><span class="num">{{ fmtDate(row.date) }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"
          ><StatusDot entity="task" :status="row.status === 'closed' ? 'closed' : row.status"
        /></template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="can(row, 'start')"
            v-permission="PERMS.todo.start"
            link
            type="primary"
            size="small"
            @click="transition(row, 'start')"
            >开始</el-button
          >
          <el-button
            v-if="can(row, 'finish')"
            v-permission="PERMS.todo.finish"
            link
            type="success"
            size="small"
            @click="transition(row, 'finish')"
            >完成</el-button
          >
          <el-button
            v-if="can(row, 'activate')"
            v-permission="PERMS.todo.activate"
            link
            type="primary"
            size="small"
            @click="transition(row, 'activate')"
            >激活</el-button
          >
          <el-button
            v-if="can(row, 'close')"
            v-permission="PERMS.todo.close"
            link
            type="warning"
            size="small"
            @click="transition(row, 'close')"
            >关闭</el-button
          >
          <el-button v-permission="PERMS.todo.edit" link size="small" @click="openEdit(row)"
            >编辑</el-button
          >
          <el-button
            v-permission="PERMS.todo.delete"
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

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑待办' : '新建待办'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item v-if="!editing" label="类型">
          <el-select
            v-model="form.type"
            class="!w-full"
            @change="
              form.objectId = '';
              form.name = '';
            "
          >
            <el-option
              v-for="(label, value) in typeLabels"
              :key="value"
              :value="value"
              :label="label"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.type === 'custom'" label="名称" prop="name">
          <el-input v-model="form.name" maxlength="150" />
        </el-form-item>
        <el-form-item v-else label="对象 ID" prop="objectId">
          <el-input v-model="form.objectId" placeholder="关联对象的数字 ID" class="!w-48" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.pri">
            <el-radio :value="1">1</el-radio>
            <el-radio :value="2">2</el-radio>
            <el-radio :value="3">3</el-radio>
            <el-radio :value="4">4</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.desc" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
