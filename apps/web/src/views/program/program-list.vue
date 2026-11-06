<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { programApi, type ProgramVo } from '../../api/program.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';

// 项目集列表：树形表格 + 状态流转（docs/10 §4）
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const keyword = ref('');
const query = useQuery({ queryKey: ['programs'], queryFn: () => programApi.list() });

type ProgramNode = ProgramVo & { children: ProgramNode[] };

/** 扁平 → 树（parentId 挂接；后端按 sortNo 排序返回） */
const tree = computed<ProgramNode[]>(() => {
  const list = query.data.value ?? [];
  const nodes = new Map<number, ProgramNode>();
  for (const p of list) nodes.set(p.id, { ...p, children: [] });
  const roots: ProgramNode[] = [];
  for (const p of list) {
    const node = nodes.get(p.id)!;
    const parent = p.parentId ? nodes.get(p.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
});

const filteredTree = computed<ProgramNode[]>(() => {
  if (!keyword.value) return tree.value;
  const kw = keyword.value.toLowerCase();
  // 命中节点与其祖先链保留
  const keep = new Set<number>();
  const visit = (node: ProgramNode): boolean => {
    const self =
      node.name.toLowerCase().includes(kw) || (node.code ?? '').toLowerCase().includes(kw);
    const childHit = node.children.map(visit).some(Boolean);
    if (self || childHit) keep.add(node.id);
    return self || childHit;
  };
  tree.value.forEach(visit);
  const pick = (node: ProgramNode): ProgramNode => ({
    ...node,
    children: node.children.filter((c) => keep.has(c.id)).map(pick),
  });
  return tree.value.filter((n) => keep.has(n.id)).map(pick);
});

const paged = usePagination(filteredTree, 50);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['programs'] })];

/** 动作前置状态（后端 3006 兜底，前端只渲染合法项） */
function rowActions(
  row: ProgramVo,
): Array<{ key: string; label: string; perm: string; run: () => Promise<void> }> {
  const actions: Array<{ key: string; label: string; perm: string; run: () => Promise<void> }> = [];
  const t = (action: 'start' | 'suspend' | 'close' | 'activate', label: string, perm: string) =>
    actions.push({
      key: action,
      label,
      perm,
      run: async () => {
        await confirmAction({
          title: label,
          message: `确定${label}项目集「${row.name}」吗？`,
          run: () => programApi.transition(row.id, action, action === 'close' ? 'done' : undefined),
          successMsg: `${label}成功`,
          invalidate,
        });
      },
    });
  if (row.status === 'wait') t('start', '启动', PERMS.program.start);
  if (row.status === 'doing') {
    t('suspend', '挂起', PERMS.program.suspend);
    t('close', '关闭', PERMS.program.close);
  }
  if (row.status === 'suspended') {
    t('activate', '激活', PERMS.program.activate);
    t('close', '关闭', PERMS.program.close);
  }
  if (row.status === 'closed') t('activate', '激活', PERMS.program.activate);
  return actions;
}

// ---- 新建/编辑弹窗 ----
const dialogOpen = ref(false);
const editing = ref<ProgramVo | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({
  parentId: 0,
  name: '',
  code: '',
  pmId: '',
  budget: undefined as number | undefined,
  budgetUnit: 'CNY',
  begin: '',
  end: '',
  desc: '',
});

const parentOptions = computed(() => [
  { id: 0, name: '（根项目集）' },
  ...(query.data.value ?? [])
    .filter((p) => p.status !== 'closed')
    .map((p) => ({ id: p.id, name: `${'　'.repeat(Math.max(0, p.grade - 1))}${p.name}` })),
]);

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  begin: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    parentId: 0,
    name: '',
    code: '',
    pmId: '',
    budget: undefined,
    budgetUnit: 'CNY',
    begin: '',
    end: '',
    desc: '',
  });
  dialogOpen.value = true;
}

function openEdit(row: ProgramVo): void {
  editing.value = row;
  Object.assign(form, {
    parentId: row.parentId,
    name: row.name,
    code: row.code ?? '',
    pmId: row.pmId ?? '',
    budget: row.budget ?? undefined,
    budgetUnit: row.budgetUnit,
    begin: row.begin ?? '',
    end: row.end ?? '',
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
      const { name, code, pmId, budget, end, desc } = form;
      await programApi.update(editing.value.id, { name, code, pmId, budget, end, desc });
      ElMessage.success('保存成功');
    } else {
      await programApi.create({ ...form });
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

async function handleDelete(row: ProgramVo): Promise<void> {
  await confirmAction({
    title: '删除项目集',
    message: `确定删除「${row.name}」吗？（存在下级时将被拒绝）`,
    danger: true,
    run: () => programApi.remove(row.id),
    successMsg: '已删除',
    invalidate,
  });
}
</script>

<template>
  <div>
    <PageHeader title="项目集" description="统筹多项目、多产品与预算；点击名称进入详情">
      <template #actions>
        <el-button
          v-permission="PERMS.program.create"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          新建项目集
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3">
      <el-input v-model="keyword" placeholder="搜索名称 / 编码" clearable class="!w-64" />
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      row-key="id"
      :tree-props="{ children: 'children' }"
      default-expand-all
      size="small"
      class="table-hairline"
      empty-text="暂无项目集"
    >
      <el-table-column label="名称" min-width="260">
        <template #default="{ row }">
          <span
            class="cursor-pointer text-primary hover:underline"
            @click="router.push(`/programs/${row.id}`)"
          >
            {{ row.name }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="编码" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.code || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="负责人" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.pmId || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="预算" width="130">
        <template #default="{ row }">
          <span class="num">{{
            row.budget != null ? `${row.budget} ${row.budgetUnit}` : '-'
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="起止" width="190">
        <template #default="{ row }">
          <span class="num">{{ row.begin || '-' }} ~ {{ row.end || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="program" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button
            v-for="action in rowActions(row)"
            v-permission="action.perm"
            :key="action.key"
            link
            type="primary"
            size="small"
            @click="action.run"
          >
            {{ action.label }}
          </el-button>
          <el-button v-permission="PERMS.program.edit" link size="small" @click="openEdit(row)"
            >编辑</el-button
          >
          <el-button
            v-permission="PERMS.program.delete"
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

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑项目集' : '新建项目集'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item v-if="!editing" label="上级">
          <el-select v-model="form.parentId" class="!w-full">
            <el-option
              v-for="opt in parentOptions"
              :key="opt.id"
              :value="opt.id"
              :label="opt.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="90" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.code" maxlength="45" placeholder="可选" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.pmId" placeholder="账号，可选" />
        </el-form-item>
        <el-form-item label="预算">
          <div class="flex w-full gap-2">
            <el-input-number v-model="form.budget" :min="0" :controls="false" class="!w-40" />
            <el-select v-model="form.budgetUnit" class="!w-24">
              <el-option label="CNY" value="CNY" />
              <el-option label="USD" value="USD" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="开始日期" prop="begin">
          <el-date-picker
            v-model="form.begin"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="开始"
            :disabled="!!editing"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="end">
          <el-date-picker
            v-model="form.end"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="结束"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.desc" type="textarea" :rows="3" maxlength="2000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
