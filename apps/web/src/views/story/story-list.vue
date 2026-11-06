<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, StoryReviewResult, StoryClosedReason } from '@zentao/shared';
import { storyApi, type StoryVo } from '../../api/story.js';
import { productApi } from '../../api/product.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { usePagination } from '../../composables/usePagination.js';
import { useUrlFilter } from '../../composables/useUrlFilter.js';
import { describeError } from '../../lib/errors.js';
import { useAuthStore } from '../../stores/auth.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';
import AssignCell from '../../components/common/assign-cell.vue';

// 需求列表（复刻禅道 product/browse：featureBar 页签 + dtable 列序 + 行内操作，docs/10 §7）
const router = useRouter();
const auth = useAuthStore();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const submitting = ref(false);
const me = computed(() => auth.user?.account ?? '');

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
      status: ['all', 'unclosed', 'assignedme', 'openedme'].includes(statusTab.value)
        ? undefined
        : statusTab.value,
    }),
});

/** 功能页签（禅道 featureBar：全部/未关闭/指给我/由我创建/草稿/评审中/变更中/激活/已关闭） */
const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'unclosed', label: '未关闭' },
  { key: 'assignedme', label: '指给我' },
  { key: 'openedme', label: '由我创建' },
  { key: 'draft', label: '草稿' },
  { key: 'reviewing', label: '评审中' },
  { key: 'changing', label: '变更中' },
  { key: 'active', label: '激活' },
  { key: 'closed', label: '已关闭' },
];

const filtered = computed(() => {
  let list = query.data.value ?? [];
  if (statusTab.value === 'unclosed') list = list.filter((s) => s.status !== 'closed');
  if (statusTab.value === 'assignedme') list = list.filter((s) => s.assignedTo === me.value);
  if (statusTab.value === 'openedme') list = list.filter((s) => s.openedBy === me.value);
  if (keyword.value)
    list = list.filter(
      (s) => s.title.includes(keyword.value) || String(s.id).includes(keyword.value),
    );
  return list;
});
const paged = usePagination(filtered, 20);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['stories'] })];

/** isClickable 前端镜像（story model 同源规则） */
const can = (s: StoryVo, action: string): boolean => {
  const st = s.status;
  switch (action) {
    case 'submitReview':
      return st === 'draft' || st === 'changing';
    case 'recallReview':
      return st === 'reviewing';
    case 'recallChange':
      return st === 'changing';
    case 'review':
      return st === 'reviewing';
    case 'change':
      return st === 'active';
    case 'close':
      return st !== 'closed';
    case 'activate':
      return st === 'closed';
    case 'assign':
      return st !== 'closed';
    case 'subdivide':
      return st === 'active';
    default:
      return false;
  }
};

/** 行内操作链接（禅道 operateList 语义，按状态显隐） */
function rowActions(
  s: StoryVo,
): Array<{ key: string; label: string; perm: string; type?: 'danger'; run: () => void }> {
  const list: Array<{
    key: string;
    label: string;
    perm: string;
    type?: 'danger';
    run: () => void;
  }> = [];
  const push = (
    key: string,
    label: string,
    perm: string,
    open?: () => void,
    type?: 'danger',
    confirm?: () => Promise<boolean>,
  ): void => {
    list.push({
      key,
      label,
      perm,
      type,
      run: () => {
        if (open) open();
        if (confirm) void confirm();
      },
    });
  };
  if (can(s, 'review'))
    push('review', '评审', PERMS.story.review, () => {
      editing.value = s;
      reviewOpen.value = true;
    });
  if (can(s, 'recallReview'))
    push('recallReview', '撤销评审', PERMS.story.recallReview, undefined, undefined, () =>
      confirmAction({
        title: '撤销评审',
        message: '确定撤回本次评审吗？（需求回到草稿态）',
        run: () => storyApi.recallReview(s.id),
        invalidate,
      }),
    );
  if (can(s, 'change'))
    push('change', '变更', PERMS.story.change, () => {
      editing.value = s;
      changeOpen.value = true;
    });
  if (can(s, 'recallChange'))
    push('recallChange', '撤销变更', PERMS.story.recallChange, undefined, undefined, () =>
      confirmAction({
        title: '撤销变更',
        message: '确定尝试撤销变更吗？',
        run: () => storyApi.recallChange(s.id),
        invalidate,
      }),
    );
  if (can(s, 'submitReview'))
    push('submitReview', '提交评审', PERMS.story.change, () => {
      editing.value = s;
      changeOpen.value = true;
    });
  if (can(s, 'close'))
    push(
      'close',
      '关闭',
      PERMS.story.close,
      () => {
        editing.value = s;
        closeOpen.value = true;
      },
      'danger',
    );
  if (can(s, 'activate'))
    push('activate', '激活', PERMS.story.activate, undefined, undefined, () =>
      confirmAction({ title: '激活需求', run: () => storyApi.activate(s.id), invalidate }),
    );
  if (can(s, 'assign'))
    push('assign', '指派', PERMS.story.assign, () => {
      editing.value = s;
      assignOpen.value = true;
    });
  if (can(s, 'subdivide'))
    push('subdivide', '拆分', PERMS.story.subdivide, () => {
      editing.value = s;
      subdivideOpen.value = true;
    });
  push('edit', '编辑', PERMS.story.edit, () => {
    editing.value = s;
    changeOpen.value = true;
  });
  return list;
}

// ---- 新建弹窗（字段序对齐禅道 create；保存/存为草稿双按钮） ----
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
  assignedTo: '',
});

const rules: FormRules = {
  productId: [{ required: true, message: '请选择所属产品', trigger: 'change' }],
  title: [{ required: true, message: '请输入需求名称', trigger: 'blur' }],
  spec: [{ required: true, message: '请填写需求描述', trigger: 'blur' }],
  verify: [{ required: true, message: '请填写验收标准', trigger: 'blur' }],
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
      assignedTo: form.assignedTo || undefined,
    });
    ElMessage.success(form.submitMode === 'draft' ? '草稿已保存' : '已提交评审');
    dialogOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 评审弹窗 ----
const reviewOpen = ref(false);
const editing = ref<StoryVo | null>(null);
const reviewFormRef = ref<FormInstance>();
const reviewForm = reactive({
  result: StoryReviewResult.Pass as string,
  closedReason: '',
  duplicateStoryId: undefined as number | undefined,
});

const reviewRules: FormRules = {
  result: [{ required: true, message: '请选择评审结果', trigger: 'change' }],
  closedReason: [
    {
      validator: (_r, value: string, cb) => {
        if (reviewForm.result === StoryReviewResult.Reject && !value)
          cb(new Error('拒绝必须填写关闭原因'));
        else cb();
      },
      trigger: 'change',
    },
  ],
};

const closedReasonOptions = [
  { value: StoryClosedReason.Done, label: '已完成' },
  { value: StoryClosedReason.Subdivided, label: '已拆分' },
  { value: StoryClosedReason.Duplicate, label: '重复' },
  { value: StoryClosedReason.Postponed, label: '延期' },
  { value: StoryClosedReason.WillNotDo, label: '不做' },
  { value: StoryClosedReason.Cancel, label: '取消' },
  { value: StoryClosedReason.ByDesign, label: '设计如此' },
];

async function submitReview(): Promise<void> {
  const valid = await reviewFormRef.value?.validate().catch(() => false);
  if (!valid || !editing.value) return;
  try {
    await storyApi.review(editing.value.id, {
      result: reviewForm.result as never,
      closedReason: (reviewForm.closedReason || undefined) as never,
      duplicateStoryId: reviewForm.duplicateStoryId,
    });
    ElMessage.success('评审已提交');
    reviewOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 变更弹窗 ----
const changeOpen = ref(false);
const changeFormRef = ref<FormInstance>();
const changeForm = reactive({
  title: '',
  spec: '',
  verify: '',
  pri: 3,
  estimate: undefined as number | undefined,
  submitReview: true,
  reviewerIds: [] as string[],
});

const changeRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  spec: [{ required: true, message: '请填写需求描述', trigger: 'blur' }],
  verify: [{ required: true, message: '请填写验收标准', trigger: 'blur' }],
};

async function openChange(): Promise<void> {
  const s = editing.value;
  if (!s) return;
  try {
    const detail = await storyApi.get(s.id);
    Object.assign(changeForm, {
      title: detail.spec.title,
      spec: detail.spec.spec,
      verify: detail.spec.verify,
      pri: detail.pri,
      estimate: detail.estimate,
      submitReview: true,
      reviewerIds: [],
    });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

async function submitChange(): Promise<void> {
  const valid = await changeFormRef.value?.validate().catch(() => false);
  if (!valid || !editing.value) return;
  if (changeForm.submitReview && changeForm.reviewerIds.length === 0) {
    ElMessage.warning('变更后提审需要至少一名评审人');
    return;
  }
  try {
    await storyApi.change(editing.value.id, { ...changeForm });
    ElMessage.success('变更已提交');
    changeOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 关闭弹窗 ----
const closeOpen = ref(false);
const closeFormRef = ref<FormInstance>();
const closeForm = reactive({
  closedReason: StoryClosedReason.Done as string,
  duplicateStoryId: undefined as number | undefined,
  force: false,
});

const closeRules: FormRules = {
  closedReason: [{ required: true, message: '请选择关闭原因', trigger: 'change' }],
  duplicateStoryId: [
    {
      validator: (_r, value: number | undefined, cb) => {
        if (closeForm.closedReason === StoryClosedReason.Duplicate && !value)
          cb(new Error('重复需求必须填写原需求 ID'));
        else cb();
      },
      trigger: 'change',
    },
  ],
};

async function submitClose(): Promise<void> {
  const valid = await closeFormRef.value?.validate().catch(() => false);
  if (!valid || !editing.value) return;
  try {
    await storyApi.close(editing.value.id, {
      closedReason: closeForm.closedReason as never,
      duplicateStoryId: closeForm.duplicateStoryId,
      force: closeForm.force,
    });
    ElMessage.success('已关闭');
    closeOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 指派弹窗 ----
const assignOpen = ref(false);
const assignTo = ref('');

async function submitAssign(): Promise<void> {
  if (!editing.value || !assignTo.value) {
    ElMessage.warning('请选择或输入账号');
    return;
  }
  try {
    await storyApi.assign(editing.value.id, assignTo.value);
    ElMessage.success('已指派');
    assignOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 拆分弹窗 ----
const subdivideOpen = ref(false);
const children = ref<
  Array<{ title: string; spec: string; verify: string; estimate: number | undefined }>
>([{ title: '', spec: '', verify: '', estimate: undefined }]);

async function submitSubdivide(): Promise<void> {
  if (!editing.value) return;
  const filled = children.value.filter((c) => c.title && c.spec && c.verify);
  if (filled.length === 0) {
    ElMessage.warning('至少填写一条完整子需求');
    return;
  }
  try {
    const created = await storyApi.subdivide(editing.value.id, filled);
    ElMessage.success(`已拆分出 ${created.length} 条子需求`);
    subdivideOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

function beforeReviewOpen(): void {
  Object.assign(reviewForm, {
    result: StoryReviewResult.Pass,
    closedReason: '',
    duplicateStoryId: undefined,
  });
}

function beforeCloseOpen(): void {
  Object.assign(closeForm, {
    closedReason: StoryClosedReason.Done,
    duplicateStoryId: undefined,
    force: false,
  });
}

function beforeAssignOpen(): void {
  assignTo.value = editing.value?.assignedTo ?? '';
}

function beforeSubdivideOpen(): void {
  children.value = [{ title: '', spec: '', verify: '', estimate: undefined }];
}

watch([reviewOpen, closeOpen, assignOpen, subdivideOpen], ([r, c, a, sd]) => {
  if (r) beforeReviewOpen();
  if (c) beforeCloseOpen();
  if (a) beforeAssignOpen();
  if (sd) beforeSubdivideOpen();
});
watch(changeOpen, (v) => {
  if (v) void openChange();
});

const priType = (pri: number): 'danger' | 'warning' | 'primary' | 'info' =>
  pri === 1 ? 'danger' : pri === 2 ? 'warning' : pri === 3 ? 'primary' : 'info';
</script>

<template>
  <div>
    <PageHeader
      :title="`需求${productId ? '（产品 #' + productId + '）' : ''}`"
      description="全部 / 未关闭 / 指给我 / 由我创建 / 草稿 / 评审中 / 变更中 / 激活 / 已关闭"
    >
      <template #actions>
        <el-dropdown
          v-permission="PERMS.story.create"
          @command="
            (cmd: string) =>
              cmd === 'batch' ? ElMessage.info('批量创建暂未提供') : (dialogOpen = true)
          "
        >
          <el-button type="primary" :icon="Plus">创建</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="single">创建需求</el-dropdown-item>
              <el-dropdown-item command="batch">批量创建</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </PageHeader>

    <!-- 功能页签 + 筛选（禅道 featureBar） -->
    <div class="mb-3 flex flex-wrap items-center gap-3">
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
      <el-select v-model="productId" placeholder="按产品筛选" clearable filterable class="!w-56">
        <el-option
          v-for="p in products.data.value ?? []"
          :key="p.id"
          :value="p.id"
          :label="p.name"
        />
      </el-select>
      <el-input v-model="keyword" placeholder="搜索标题 / ID" clearable class="!w-52" />
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂时没有需求。"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }">
          <span
            class="num cursor-pointer text-primary"
            @click="router.push(`/stories/${row.id}`)"
            >{{ row.id }}</span
          >
        </template>
      </el-table-column>
      <el-table-column label="需求名称" min-width="340" show-overflow-tooltip>
        <template #default="{ row }">
          <span
            class="cursor-pointer text-primary hover:underline"
            @click="router.push(`/stories/${row.id}`)"
            >{{ row.title }}</span
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
        <template #default="{ row }"><StatusDot entity="story" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="阶段" width="96">
        <template #default="{ row }"
          ><StatusDot entity="storyStage" :status="row.stage"
        /></template>
      </el-table-column>
      <el-table-column label="创建者" width="100">
        <template #default="{ row }"
          ><span class="num">{{ row.openedBy || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="预计" width="70">
        <template #default="{ row }"
          ><span class="num">{{ row.estimate }}</span></template
        >
      </el-table-column>
      <el-table-column label="指派给" width="110">
        <template #default="{ row }">
          <AssignCell
            v-permission="PERMS.story.assign"
            :value="row.assignedTo"
            :save="(u: string) => storyApi.assign(row.id, u)"
            @success="invalidate[0]"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="230" fixed="right">
        <template #default="{ row }">
          <el-button
            v-for="action in rowActions(row)"
            v-permission="action.perm"
            :key="action.key"
            link
            size="small"
            :type="action.type === 'danger' ? 'danger' : 'primary'"
            @click="action.run"
            >{{ action.label }}</el-button
          >
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :image-size="60" description="暂时没有需求。">
          <el-button
            v-permission="PERMS.story.create"
            type="primary"
            size="small"
            @click="dialogOpen = true"
            >创建需求</el-button
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

    <!-- 创建需求弹窗（字段序对齐禅道 create；保存/存为草稿双按钮） -->
    <el-dialog v-model="dialogOpen" title="提需求" width="680px">
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
        <el-form-item label="需求名称" prop="title">
          <el-input v-model="form.title" maxlength="255" />
        </el-form-item>
        <el-form-item v-if="needReview" label="评审人" prop="reviewerIds">
          <el-select
            v-model="form.reviewerIds"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入账号，回车添加"
            class="!w-full"
          />
        </el-form-item>
        <el-form-item label="指派给">
          <el-input v-model="form.assignedTo" placeholder="账号，可选" class="!w-56" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.pri">
            <el-radio :value="1">1</el-radio>
            <el-radio :value="2">2</el-radio>
            <el-radio :value="3">3</el-radio>
            <el-radio :value="4">4</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="预计(小时)">
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
          <el-input
            v-model="form.spec"
            type="textarea"
            :rows="5"
            placeholder="作为一名&lt;某种类型的用户&gt;，我希望…"
          />
        </el-form-item>
        <el-form-item label="验收标准" prop="verify">
          <el-input v-model="form.verify" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="保存方式">
          <el-radio-group v-model="form.submitMode">
            <el-radio value="draft">存为草稿</el-radio>
            <el-radio value="active">保存并提审</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">返回</el-button>
        <el-button
          v-permission="PERMS.story.create"
          :loading="submitting"
          @click="
            form.submitMode = 'draft';
            handleSubmit();
          "
          >存为草稿</el-button
        >
        <el-button
          v-permission="PERMS.story.create"
          type="primary"
          :loading="submitting"
          @click="
            form.submitMode = 'active';
            handleSubmit();
          "
          >保存</el-button
        >
      </template>
    </el-dialog>

    <!-- 评审弹窗 -->
    <el-dialog v-model="reviewOpen" :title="`评审需求 #${editing?.id ?? ''}`" width="520px">
      <el-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules" label-width="90px">
        <el-form-item label="评审结果" prop="result">
          <el-radio-group v-model="reviewForm.result">
            <el-radio value="pass">通过</el-radio>
            <el-radio value="clarify">澄清</el-radio>
            <el-radio value="revert">驳回（v1）</el-radio>
            <el-radio value="reject">拒绝（v&gt;1）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="reviewForm.result === 'reject'" label="关闭原因" prop="closedReason">
          <el-select v-model="reviewForm.closedReason" class="!w-full">
            <el-option
              v-for="opt in closedReasonOptions"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="reviewForm.result === 'reject' && reviewForm.closedReason === 'duplicate'"
          label="原需求ID"
          prop="duplicateStoryId"
        >
          <el-input-number
            v-model="reviewForm.duplicateStoryId"
            :min="1"
            :controls="false"
            class="!w-40"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewOpen = false">取消</el-button>
        <el-button type="primary" @click="submitReview">提交评审结果</el-button>
      </template>
    </el-dialog>

    <!-- 变更弹窗 -->
    <el-dialog
      v-model="changeOpen"
      :title="`变更需求 #${editing?.id ?? ''}（生成新版本）`"
      width="680px"
    >
      <el-form ref="changeFormRef" :model="changeForm" :rules="changeRules" label-width="100px">
        <el-form-item label="标题" prop="title"
          ><el-input v-model="changeForm.title"
        /></el-form-item>
        <el-form-item label="需求描述" prop="spec"
          ><el-input v-model="changeForm.spec" type="textarea" :rows="5"
        /></el-form-item>
        <el-form-item label="验收标准" prop="verify"
          ><el-input v-model="changeForm.verify" type="textarea" :rows="4"
        /></el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="changeForm.pri">
            <el-radio :value="1">1</el-radio>
            <el-radio :value="2">2</el-radio>
            <el-radio :value="3">3</el-radio>
            <el-radio :value="4">4</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="预计(小时)">
          <el-input-number
            v-model="changeForm.estimate"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
        </el-form-item>
        <el-form-item label="变更后">
          <el-radio-group v-model="changeForm.submitReview">
            <el-radio :value="true">提审（需评审人）</el-radio>
            <el-radio :value="false">进入变更中</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="changeForm.submitReview" label="评审人">
          <el-select
            v-model="changeForm.reviewerIds"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入账号，回车添加"
            class="!w-full"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changeOpen = false">返回</el-button>
        <el-button v-permission="PERMS.story.change" type="primary" @click="submitChange"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <!-- 关闭弹窗 -->
    <el-dialog v-model="closeOpen" :title="`关闭需求 #${editing?.id ?? ''}`" width="520px">
      <el-form ref="closeFormRef" :model="closeForm" :rules="closeRules" label-width="100px">
        <el-form-item label="关闭原因" prop="closedReason">
          <el-select v-model="closeForm.closedReason" class="!w-full">
            <el-option
              v-for="opt in closedReasonOptions"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="closeForm.closedReason === 'duplicate'"
          label="原需求ID"
          prop="duplicateStoryId"
        >
          <el-input-number
            v-model="closeForm.duplicateStoryId"
            :min="1"
            :controls="false"
            class="!w-40"
          />
        </el-form-item>
        <el-form-item label="强制关闭">
          <el-switch v-model="closeForm.force" />
          <span class="ml-2 text-xs text-muted-foreground">存在未关闭子需求时强制关闭</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeOpen = false">取消</el-button>
        <el-button v-permission="PERMS.story.close" type="danger" @click="submitClose"
          >关闭</el-button
        >
      </template>
    </el-dialog>

    <!-- 指派弹窗 -->
    <el-dialog v-model="assignOpen" :title="`指派需求 #${editing?.id ?? ''}`" width="440px">
      <el-input v-model="assignTo" placeholder="账号" class="!w-64" />
      <template #footer>
        <el-button @click="assignOpen = false">取消</el-button>
        <el-button v-permission="PERMS.story.assign" type="primary" @click="submitAssign"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 拆分弹窗 -->
    <el-dialog v-model="subdivideOpen" :title="`拆分子需求 #${editing?.id ?? ''}`" width="760px">
      <div v-for="(child, i) in children" :key="i" class="mb-4 border border-border p-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium">子需求 {{ i + 1 }}</span>
          <el-button link type="danger" size="small" @click="children.splice(i, 1)">移除</el-button>
        </div>
        <el-input v-model="child.title" placeholder="标题" class="mb-2" />
        <el-input
          v-model="child.spec"
          type="textarea"
          :rows="2"
          placeholder="需求描述"
          class="mb-2"
        />
        <div class="flex gap-2">
          <el-input v-model="child.verify" type="textarea" :rows="2" placeholder="验收标准" />
          <el-input-number
            v-model="child.estimate"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            placeholder="预计"
            class="!w-28"
          />
        </div>
      </div>
      <el-button
        size="small"
        @click="children.push({ title: '', spec: '', verify: '', estimate: undefined })"
        >添加子需求</el-button
      >
      <template #footer>
        <el-button @click="subdivideOpen = false">取消</el-button>
        <el-button v-permission="PERMS.story.subdivide" type="primary" @click="submitSubdivide"
          >提交拆分</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>
