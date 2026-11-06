<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, CaseStatus } from '@zentao/shared';
import { caseApi, type CaseStepInput } from '../../api/case.js';
import { productApi } from '../../api/product.js';
import { usePagination } from '../../composables/usePagination.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';

// 用例库列表（产品维度；默认免评审直接 normal）
const router = useRouter();
const queryClient = useQueryClient();
const submitting = ref(false);

const productId = ref<number | undefined>();
const statusTab = ref<string>('all');

const products = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const query = useQuery({
  queryKey: ['cases', { productId, statusTab }],
  queryFn: () =>
    caseApi.list({
      productId: productId.value,
      status: statusTab.value === 'all' ? undefined : statusTab.value,
    }),
});

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: CaseStatus.Wait, label: '待评审' },
  { key: CaseStatus.Normal, label: '正常' },
  { key: CaseStatus.Blocked, label: '被阻塞' },
  { key: CaseStatus.Investigate, label: '研究中' },
];

const paged = usePagination(
  computed(() => query.data.value ?? []),
  20,
);

// ---- 新建弹窗 ----
const dialogOpen = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  productId: '' as string,
  title: '',
  precondition: '',
  pri: 3,
  storyId: '' as string,
  steps: [{ stepDesc: '', expect: '' }] as CaseStepInput[],
});

const rules: FormRules = {
  productId: [{ required: true, message: '请选择所属产品', trigger: 'change' }],
  title: [{ required: true, message: '请输入用例标题', trigger: 'blur' }],
};

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  const steps = form.steps.filter((s) => s.stepDesc.trim());
  if (steps.length === 0) {
    ElMessage.warning('至少填写一个步骤');
    return;
  }
  submitting.value = true;
  try {
    const created = await caseApi.create({
      productId: form.productId,
      title: form.title,
      precondition: form.precondition || undefined,
      pri: form.pri,
      storyId: form.storyId || undefined,
      steps,
    });
    ElMessage.success('用例已创建');
    dialogOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['cases'] });
    void router.push(`/cases/${created.id}`);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader title="用例库" description="按产品组织的测试用例；步骤版本化">
      <template #actions>
        <el-button
          v-permission="PERMS.case.create"
          type="primary"
          :icon="Plus"
          @click="dialogOpen = true"
        >
          新建用例
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <el-select v-model="productId" placeholder="按产品筛选" clearable filterable class="!w-60">
        <el-option
          v-for="p in products.data.value ?? []"
          :key="p.id"
          :value="p.id"
          :label="p.name"
        />
      </el-select>
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
      empty-text="暂无用例"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }">
          <span class="num cursor-pointer text-primary" @click="router.push(`/cases/${row.id}`)"
            >#{{ row.id }}</span
          >
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="case" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="版本" width="70">
        <template #default="{ row }"
          ><span class="num">v{{ row.version }}</span></template
        >
      </el-table-column>
      <el-table-column label="优先级" width="70">
        <template #default="{ row }"
          ><span class="num">P{{ row.pri }}</span></template
        >
      </el-table-column>
      <el-table-column label="最近结果" width="90">
        <template #default="{ row }">
          <StatusDot v-if="row.lastRunResult" entity="caseResult" :status="row.lastRunResult" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="最近执行人" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.lastRunner || '-' }}</span></template
        >
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

    <el-dialog v-model="dialogOpen" title="新建用例" width="720px">
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
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="前置条件">
          <el-input v-model="form.precondition" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.pri">
            <el-radio :value="1">1</el-radio>
            <el-radio :value="2">2</el-radio>
            <el-radio :value="3">3</el-radio>
            <el-radio :value="4">4</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="关联需求">
          <el-input v-model="form.storyId" placeholder="需求 ID，可选" class="!w-40" />
        </el-form-item>
        <el-form-item label="步骤">
          <div class="w-full space-y-2">
            <div v-for="(step, i) in form.steps" :key="i" class="flex gap-2">
              <span class="num mt-1 w-6 text-center text-muted-foreground">{{ i + 1 }}</span>
              <el-input v-model="step.stepDesc" placeholder="步骤描述" />
              <el-input v-model="step.expect" placeholder="预期结果" />
              <el-button
                link
                type="danger"
                @click="form.steps.length > 1 && form.steps.splice(i, 1)"
                >删除</el-button
              >
            </div>
            <el-button size="small" @click="form.steps.push({ stepDesc: '', expect: '' })"
              >添加步骤</el-button
            >
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
