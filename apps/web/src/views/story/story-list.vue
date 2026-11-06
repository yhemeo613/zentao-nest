<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, StoryStatus } from '@zentao/shared';
import { storyApi } from '../../api/story.js';
import { productApi } from '../../api/product.js';
import { usePagination } from '../../composables/usePagination.js';
import { useUrlFilter } from '../../composables/useUrlFilter.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';

// 需求列表（docs/10 §4；status 页签 + 产品筛选 + 关键字）
const router = useRouter();
const queryClient = useQueryClient();
const submitting = ref(false);

// 筛选状态同步 URL（禅道基线：可分享/刷新保持，docs/10 §6.2）
const castId = (raw: string): number | undefined => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const productId = useUrlFilter<number | undefined>('productId', undefined, castId);
const statusTab = useUrlFilter<string>('status', 'all', (raw) => raw);
const keyword = ref('');

const products = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const query = useQuery({
  queryKey: ['stories', productId, statusTab],
  queryFn: () =>
    storyApi.list({
      productId: productId.value,
      status: statusTab.value === 'all' ? undefined : statusTab.value,
    }),
});

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: StoryStatus.Draft, label: '草稿' },
  { key: StoryStatus.Reviewing, label: '评审中' },
  { key: StoryStatus.Active, label: '激活' },
  { key: StoryStatus.Changing, label: '变更中' },
  { key: StoryStatus.Closed, label: '已关闭' },
];

const filtered = computed(() => {
  const list = query.data.value ?? [];
  if (!keyword.value) return list;
  return list.filter(
    (s) => s.title.includes(keyword.value) || String(s.id).includes(keyword.value),
  );
});
const paged = usePagination(filtered, 20);

// ---- 新建弹窗 ----
const dialogOpen = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  productId: '' as string,
  title: '',
  pri: 3,
  estimate: undefined as number | undefined,
  spec: '',
  verify: '',
  submitMode: 'active' as 'draft' | 'active',
  reviewerIds: [] as string[],
});

const rules: FormRules = {
  productId: [{ required: true, message: '请选择所属产品', trigger: 'change' }],
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  spec: [{ required: true, message: '请填写需求描述（spec）', trigger: 'blur' }],
  verify: [{ required: true, message: '请填写验收标准（verify）', trigger: 'blur' }],
};

const needReview = computed(() => form.submitMode === 'active');

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  if (needReview.value && form.reviewerIds.length === 0) {
    ElMessage.warning('提审需要至少一名评审人');
    return;
  }
  submitting.value = true;
  try {
    await storyApi.create({
      productId: form.productId,
      title: form.title,
      pri: form.pri,
      estimate: form.estimate,
      spec: form.spec,
      verify: form.verify,
      status: form.submitMode,
      reviewerIds: needReview.value ? form.reviewerIds : undefined,
    });
    ElMessage.success(form.submitMode === 'draft' ? '草稿已保存' : '已提交评审');
    dialogOpen.value = false;
    void queryClient.invalidateQueries({ queryKey: ['stories'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader title="需求" description="需求五态：草稿 → 评审中 → 激活 →（变更中）→ 已关闭">
      <template #actions>
        <el-button
          v-permission="PERMS.story.create"
          type="primary"
          :icon="Plus"
          @click="dialogOpen = true"
        >
          新建需求
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
      <el-input v-model="keyword" placeholder="搜索标题 / ID" clearable class="!w-56" />
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无需求"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }">
          <span class="num cursor-pointer text-primary" @click="router.push(`/stories/${row.id}`)"
            >#{{ row.id }}</span
          >
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip />
      <el-table-column label="阶段" width="100">
        <template #default="{ row }"
          ><StatusDot entity="storyStage" :status="row.stage"
        /></template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="story" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="优先级" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.pri }}</span></template
        >
      </el-table-column>
      <el-table-column label="预计" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.estimate }}</span></template
        >
      </el-table-column>
      <el-table-column label="版本" width="60">
        <template #default="{ row }"
          ><span class="num">v{{ row.version }}</span></template
        >
      </el-table-column>
      <el-table-column label="指派给" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.assignedTo || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="打开人" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.openedBy || '-' }}</span></template
        >
      </el-table-column>
      <template #empty>
        <el-empty :image-size="60" description="暂无需求">
          <el-button
            v-permission="PERMS.story.create"
            type="primary"
            size="small"
            @click="dialogOpen = true"
            >新建需求</el-button
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

    <el-dialog v-model="dialogOpen" title="新建需求" width="680px">
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
          <el-input v-model="form.title" maxlength="255" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.pri">
            <el-radio :value="1">1 高</el-radio>
            <el-radio :value="2">2 中高</el-radio>
            <el-radio :value="3">3 中</el-radio>
            <el-radio :value="4">4 低</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="预计工时">
          <el-input-number
            v-model="form.estimate"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
        </el-form-item>
        <el-form-item label="需求描述" prop="spec">
          <el-input v-model="form.spec" type="textarea" :rows="5" placeholder="支持 Markdown" />
        </el-form-item>
        <el-form-item label="验收标准" prop="verify">
          <el-input v-model="form.verify" type="textarea" :rows="4" placeholder="支持 Markdown" />
        </el-form-item>
        <el-form-item label="提交方式">
          <el-radio-group v-model="form.submitMode">
            <el-radio value="draft">存草稿</el-radio>
            <el-radio value="active">直接提审</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="needReview" label="评审人">
          <el-select
            v-model="form.reviewerIds"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入评审人账号，回车添加"
            class="!w-full"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
