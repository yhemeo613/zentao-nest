<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, TestTaskStatus } from '@zentao/shared';
import { testTaskApi, type TestTaskVo } from '../../api/testtask.js';
import { productApi } from '../../api/product.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';
import UserSelect from '../../components/common/user-select.vue';

// 测试单列表（wait/doing/done/blocked；执行用例自动推进 doing）
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);

const productId = ref<number | undefined>();
const products = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const query = useQuery({
  queryKey: ['testtasks', productId],
  queryFn: () => testTaskApi.list(productId.value),
});

const paged = usePagination(
  computed(() => query.data.value ?? []),
  20,
);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['testtasks'] })];

const transitions: Array<{
  action: 'start' | 'block' | 'activate' | 'close';
  label: string;
  perm: string;
  from: string[];
}> = [
  { action: 'start', label: '开始', perm: PERMS.testtask.start, from: [TestTaskStatus.Wait] },
  {
    action: 'block',
    label: '阻塞',
    perm: PERMS.testtask.block,
    from: [TestTaskStatus.Wait, TestTaskStatus.Doing],
  },
  {
    action: 'activate',
    label: '激活',
    perm: PERMS.testtask.activate,
    from: [TestTaskStatus.Blocked, TestTaskStatus.Done],
  },
  { action: 'close', label: '关闭', perm: PERMS.testtask.close, from: [TestTaskStatus.Doing] },
];

async function transition(
  row: TestTaskVo,
  action: 'start' | 'block' | 'activate' | 'close',
): Promise<void> {
  const label = transitions.find((t) => t.action === action)?.label ?? action;
  await confirmAction({
    title: label,
    message: `确定${label}测试单「${row.name}」吗？`,
    run: async () => {
      if (action === 'close') {
        await testTaskApi.close(row.id, new Date().toISOString().slice(0, 10));
      } else {
        await testTaskApi[action](row.id);
      }
    },
    successMsg: `${label}成功`,
    invalidate,
  });
}

async function handleDelete(row: TestTaskVo): Promise<void> {
  await confirmAction({
    title: '删除测试单',
    message: `确定删除「${row.name}」吗？`,
    danger: true,
    run: () => testTaskApi.remove(row.id),
    successMsg: '已删除',
    invalidate,
  });
}

// ---- 新建弹窗 ----
const dialogOpen = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  productId: '' as string,
  name: '',
  buildId: '',
  ownerId: '',
  begin: '',
  end: '',
  desc: '',
});

const rules: FormRules = {
  productId: [{ required: true, message: '请选择所属产品', trigger: 'change' }],
  name: [{ required: true, message: '请输入测试单名称', trigger: 'blur' }],
  buildId: [{ required: true, message: '请输入测试构建 ID', trigger: 'blur' }],
  ownerId: [{ required: true, message: '请填写负责人', trigger: 'change' }],
  begin: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
};

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    await testTaskApi.create({ ...form });
    ElMessage.success('测试单已创建');
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
    <PageHeader title="测试单" description="圈选用例、执行并汇总结果；失败可转 Bug">
      <template #actions>
        <el-button
          v-permission="PERMS.testtask.create"
          type="primary"
          :icon="Plus"
          @click="dialogOpen = true"
        >
          新建测试单
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3">
      <el-select v-model="productId" placeholder="按产品筛选" clearable filterable class="!w-60">
        <el-option
          v-for="p in products.data.value ?? []"
          :key="p.id"
          :value="p.id"
          :label="p.name"
        />
      </el-select>
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无测试单"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }">
          <span class="num cursor-pointer text-primary" @click="router.push(`/testtasks/${row.id}`)"
            >#{{ row.id }}</span
          >
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="240" show-overflow-tooltip />
      <el-table-column label="构建" width="90">
        <template #default="{ row }"
          ><span class="num">{{ row.buildId }}</span></template
        >
      </el-table-column>
      <el-table-column label="负责人" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.ownerId }}</span></template
        >
      </el-table-column>
      <el-table-column label="起止" width="180">
        <template #default="{ row }"
          ><span class="num">{{ row.begin || '-' }} ~ {{ row.end || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="testtask" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button
            v-for="t in transitions.filter((t) => t.from.includes(row.status))"
            v-permission="t.perm"
            :key="t.action"
            link
            :type="t.action === 'close' ? 'danger' : 'primary'"
            size="small"
            @click="transition(row, t.action)"
            >{{ t.label }}</el-button
          >
          <el-button
            v-permission="PERMS.testtask.delete"
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

    <el-dialog v-model="dialogOpen" title="新建测试单" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属产品" prop="productId">
          <el-select v-model="form.productId" filterable class="!w-full">
            <el-option
              v-for="p in products.data.value ?? []"
              :key="p.id"
              :value="String(p.id)"
              :label="p.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="90" />
        </el-form-item>
        <el-form-item label="测试构建" prop="buildId">
          <el-input v-model="form.buildId" placeholder="构建 ID" class="!w-56" />
        </el-form-item>
        <el-form-item label="负责人" prop="ownerId">
          <UserSelect v-model="form.ownerId" />
        </el-form-item>
        <el-form-item label="开始日期" prop="begin">
          <el-date-picker v-model="form.begin" type="date" value-format="YYYY-MM-DD" />
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
        <el-button type="primary" :loading="submitting" @click="handleSubmit">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
