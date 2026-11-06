<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { productApi, type ProductVo } from '../../api/product.js';
import { programApi } from '../../api/program.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';

// 产品列表（docs/10 §4；close/activate 后端同权限点 product.close）
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);
const statusFilter = ref<'all' | 'active' | 'closed'>('all');

const query = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const programs = useQuery({ queryKey: ['programs'], queryFn: () => programApi.list() });

const programName = (programId: number): string =>
  (programs.data.value ?? []).find((p) => p.id === programId)?.name ?? '-';

const filtered = computed(() => {
  const list = query.data.value ?? [];
  if (statusFilter.value === 'all') return list;
  return list.filter((p) => p.status === statusFilter.value);
});
const paged = usePagination(filtered, 20);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['products'] })];

async function handleClose(row: ProductVo): Promise<void> {
  await confirmAction({
    title: '关闭产品',
    message: `确定关闭「${row.name}」吗？`,
    run: () => productApi.close(row.id),
    invalidate,
  });
}

async function handleActivate(row: ProductVo): Promise<void> {
  await confirmAction({
    title: '激活产品',
    message: `确定激活「${row.name}」吗？`,
    run: () => productApi.activate(row.id),
    invalidate,
  });
}

// ---- 新建/编辑弹窗 ----
const dialogOpen = ref(false);
const editing = ref<ProductVo | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({
  programId: 0,
  name: '',
  code: '',
  poId: '',
  qdId: '',
  rdId: '',
  desc: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
};

function openCreate(): void {
  editing.value = null;
  Object.assign(form, { programId: 0, name: '', code: '', poId: '', qdId: '', rdId: '', desc: '' });
  dialogOpen.value = true;
}

function openEdit(row: ProductVo): void {
  editing.value = row;
  Object.assign(form, {
    programId: row.programId,
    name: row.name,
    code: row.code ?? '',
    poId: row.poId ?? '',
    qdId: row.qdId ?? '',
    rdId: row.rdId ?? '',
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
      const { name, code, poId, qdId, rdId, desc } = form;
      await productApi.update(editing.value.id, { name, code, poId, qdId, rdId, desc });
      ElMessage.success('保存成功');
    } else {
      await productApi.create({ ...form });
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
    <PageHeader title="产品" description="需求池的宿主；点击名称进入产品详情">
      <template #actions>
        <el-button
          v-permission="PERMS.product.create"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          新建产品
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3 flex items-center gap-2">
      <el-radio-group v-model="statusFilter">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="active">正常</el-radio-button>
        <el-radio-button value="closed">已关闭</el-radio-button>
      </el-radio-group>
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无产品"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.id }}</span></template
        >
      </el-table-column>
      <el-table-column label="名称" min-width="220">
        <template #default="{ row }">
          <span
            class="cursor-pointer text-primary hover:underline"
            @click="router.push(`/products/${row.id}`)"
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
      <el-table-column label="所属项目集" min-width="140">
        <template #default="{ row }">{{ programName(row.programId) }}</template>
      </el-table-column>
      <el-table-column label="产品经理" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.poId || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="product" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'active'"
            v-permission="PERMS.product.close"
            link
            type="danger"
            size="small"
            @click="handleClose(row)"
            >关闭</el-button
          >
          <el-button
            v-if="row.status === 'closed'"
            v-permission="PERMS.product.close"
            link
            type="primary"
            size="small"
            @click="handleActivate(row)"
            >激活</el-button
          >
          <el-button v-permission="PERMS.product.edit" link size="small" @click="openEdit(row)"
            >编辑</el-button
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

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑产品' : '新建产品'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item v-if="!editing" label="项目集">
          <el-select v-model="form.programId" class="!w-full">
            <el-option :value="0" label="（独立产品）" />
            <el-option
              v-for="p in programs.data.value ?? []"
              :key="p.id"
              :value="p.id"
              :label="p.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="110" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.code" placeholder="可选" />
        </el-form-item>
        <el-form-item label="产品经理">
          <el-input v-model="form.poId" placeholder="账号，可选" />
        </el-form-item>
        <el-form-item label="测试负责人">
          <el-input v-model="form.qdId" placeholder="账号，可选" />
        </el-form-item>
        <el-form-item label="研发负责人">
          <el-input v-model="form.rdId" placeholder="账号，可选" />
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
