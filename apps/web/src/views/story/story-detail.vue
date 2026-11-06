<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { PERMS, StoryStatus, StoryReviewResult, StoryClosedReason } from '@zentao/shared';
import { storyApi } from '../../api/story.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import { fmtDateTime } from '../../lib/format.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import MarkdownView from '../../components/common/markdown-view.vue';
import UserSelect from '../../components/common/user-select.vue';
import ActionLogPanel from '../../components/common/action-log.vue';
import { useEntityNames } from '../../composables/useEntityNames.js';

// 需求详情：动作条（评审四结果/变更版本化/关闭/激活/指派/拆分）+ spec/verify Markdown（docs/02 §4）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const storyId = computed(() => Number(route.params.id));
const { productName } = useEntityNames();

const detail = useQuery({
  queryKey: ['stories', storyId.value],
  queryFn: () => storyApi.get(storyId.value),
  enabled: computed(() => Number.isFinite(storyId.value) && storyId.value > 0),
});

function invalidateAll(): void {
  void queryClient.invalidateQueries({ queryKey: ['stories'] });
}
const invalidate = [invalidateAll];

const actions = computed<ToolbarAction[]>(() => {
  const s = detail.data.value;
  if (!s) return [];
  const list: ToolbarAction[] = [];
  if (s.status === StoryStatus.Reviewing) {
    list.push({
      key: 'review',
      label: '评审',
      permission: PERMS.story.review,
      type: 'primary',
      run: () => (reviewOpen.value = true),
    });
    list.push({
      key: 'recall-review',
      label: '撤回评审',
      permission: PERMS.story.recallReview,
      run: () =>
        confirmAction({
          title: '撤回评审',
          message: '确定撤回本次评审吗？（需求回到草稿态）',
          run: () => storyApi.recallReview(s.id),
          invalidate,
        }),
    });
  }
  if (s.status === StoryStatus.Active) {
    list.push({
      key: 'change',
      label: '变更',
      permission: PERMS.story.change,
      type: 'primary',
      run: () => (changeOpen.value = true),
    });
    list.push({
      key: 'close',
      label: '关闭',
      permission: PERMS.story.close,
      run: () => (closeOpen.value = true),
    });
    list.push({
      key: 'subdivide',
      label: '拆分',
      permission: PERMS.story.subdivide,
      run: () => (subdivideOpen.value = true),
    });
  }
  if (s.status === StoryStatus.Changing) {
    list.push({
      key: 'recall-change',
      label: '撤回变更',
      permission: PERMS.story.recallChange,
      run: () =>
        confirmAction({
          title: '撤回变更',
          message: 'v1 变更不可撤回；仅历史版本首版支持。确定尝试吗？',
          run: () => storyApi.recallChange(s.id),
          invalidate,
        }),
    });
    list.push({
      key: 'close',
      label: '关闭',
      permission: PERMS.story.close,
      run: () => (closeOpen.value = true),
    });
  }
  if (s.status === StoryStatus.Closed)
    list.push({
      key: 'activate',
      label: '激活',
      permission: PERMS.story.activate,
      type: 'primary',
      run: () =>
        confirmAction({ title: '激活需求', run: () => storyApi.activate(s.id), invalidate }),
    });
  list.push({
    key: 'assign',
    label: '指派',
    permission: PERMS.story.assign,
    run: () => (assignOpen.value = true),
  });
  return list;
});

// ---- 评审弹窗 ----
const reviewOpen = ref(false);
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

async function submitReview(): Promise<void> {
  const valid = await reviewFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    await storyApi.review(storyId.value, {
      result: reviewForm.result as never,
      closedReason: (reviewForm.closedReason || undefined) as never,
      duplicateStoryId: reviewForm.duplicateStoryId,
    });
    ElMessage.success('评审已提交');
    reviewOpen.value = false;
    invalidateAll();
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

function openChange(): void {
  const s = detail.data.value;
  if (!s) return;
  Object.assign(changeForm, {
    title: s.spec.title,
    spec: s.spec.spec,
    verify: s.spec.verify,
    pri: s.pri,
    estimate: s.estimate,
    submitReview: true,
    reviewerIds: [],
  });
  changeOpen.value = true;
}

// 弹窗打开时回填当前版本内容
watch(changeOpen, (v) => {
  if (v) openChange();
});

async function submitChange(): Promise<void> {
  const valid = await changeFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (changeForm.submitReview && changeForm.reviewerIds.length === 0) {
    ElMessage.warning('变更后提审需要至少一名评审人');
    return;
  }
  try {
    await storyApi.change(storyId.value, { ...changeForm });
    ElMessage.success('变更已提交');
    changeOpen.value = false;
    invalidateAll();
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

const closedReasonOptions = [
  { value: StoryClosedReason.Done, label: '已完成' },
  { value: StoryClosedReason.Subdivided, label: '已拆分' },
  { value: StoryClosedReason.Duplicate, label: '重复' },
  { value: StoryClosedReason.Postponed, label: '延期' },
  { value: StoryClosedReason.WillNotDo, label: '不做' },
  { value: StoryClosedReason.Cancel, label: '取消' },
  { value: StoryClosedReason.ByDesign, label: '设计如此' },
];

async function submitClose(): Promise<void> {
  const valid = await closeFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    await storyApi.close(storyId.value, {
      closedReason: closeForm.closedReason as never,
      duplicateStoryId: closeForm.duplicateStoryId,
      force: closeForm.force,
    });
    ElMessage.success('已关闭');
    closeOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 指派弹窗 ----
const assignOpen = ref(false);
const assignTo = ref('');

async function submitAssign(): Promise<void> {
  if (!assignTo.value) {
    ElMessage.warning('请选择或输入账号');
    return;
  }
  try {
    await storyApi.assign(storyId.value, assignTo.value);
    ElMessage.success('已指派');
    assignOpen.value = false;
    invalidateAll();
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
  const filled = children.value.filter((c) => c.title && c.spec && c.verify);
  if (filled.length === 0) {
    ElMessage.warning('至少填写一条完整子需求');
    return;
  }
  try {
    const created = await storyApi.subdivide(storyId.value, filled);
    ElMessage.success(`已拆分出 ${created.length} 条子需求`);
    subdivideOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <el-breadcrumb class="mb-1">
      <el-breadcrumb-item :to="{ path: '/stories' }">需求</el-breadcrumb-item>
      <el-breadcrumb-item>{{ '#' + detail.data.value.id }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <el-button link @click="router.push('/stories')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <span class="num text-muted-foreground">#{{ detail.data.value.id }}</span>
        <h1 class="truncate text-lg font-semibold">{{ detail.data.value.title }}</h1>
        <StatusTag entity="story" :status="detail.data.value.status" />
        <StatusTag entity="storyStage" :status="detail.data.value.stage" />
        <span class="num text-xs text-muted-foreground">v{{ detail.data.value.version }}</span>
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <el-alert
      v-if="detail.data.value.status === StoryStatus.Changing"
      type="warning"
      :closable="false"
      title="需求变更中"
      description="变更已生成新版本；评审通过后任务/用例将按版本对齐（对齐 docs/02 变更版本化）。"
    />

    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 space-y-4">
        <div class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">需求描述（spec）</div>
          <div class="p-4">
            <MarkdownView :content="detail.data.value.spec.spec || '（无）'" />
          </div>
        </div>
        <div class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">验收标准（verify）</div>
          <div class="p-4">
            <MarkdownView :content="detail.data.value.spec.verify || '（无）'" />
          </div>
        </div>

        <!-- 评审记录 -->
        <div class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">评审记录</div>
          <el-table
            :data="detail.data.value.reviewers"
            size="small"
            class="table-hairline"
            empty-text="暂无评审记录"
          >
            <el-table-column label="版本" width="70">
              <template #default="{ row }"
                ><span class="num">v{{ row.version }}</span></template
              >
            </el-table-column>
            <el-table-column label="评审人" min-width="120">
              <template #default="{ row }"
                ><span class="num">{{ row.reviewerId }}</span></template
              >
            </el-table-column>
            <el-table-column label="结果" width="90">
              <template #default="{ row }">
                <el-tag
                  v-if="row.result"
                  size="small"
                  :type="
                    row.result === 'pass'
                      ? 'success'
                      : row.result === 'reject'
                        ? 'danger'
                        : 'warning'
                  "
                >
                  {{
                    { pass: '通过', revert: '驳回', clarify: '澄清', reject: '拒绝' }[
                      row.result as string
                    ] ?? row.result
                  }}
                </el-tag>
                <span v-else class="text-muted-foreground">待评审</span>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="150">
              <template #default="{ row }"
                ><span class="num">{{ fmtDateTime(row.reviewedAt) }}</span></template
              >
            </el-table-column>
          </el-table>
        </div>
      </div>

      <el-descriptions title="属性" :column="1" border size="small">
        <el-descriptions-item label="产品">
          <router-link
            v-if="productName(detail.data.value.productId)"
            :to="`/products/${detail.data.value.productId}`"
            class="text-primary hover:underline"
          >
            {{ productName(detail.data.value.productId) }}
          </router-link>
          <span v-else class="num">{{ detail.data.value.productId }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="模块"
          ><span class="num">{{ detail.data.value.moduleId || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="优先级"
          ><span class="num">P{{ detail.data.value.pri }}</span></el-descriptions-item
        >
        <el-descriptions-item label="预计工时"
          ><span class="num">{{ detail.data.value.estimate }}</span></el-descriptions-item
        >
        <el-descriptions-item label="指派给"
          ><span class="num">{{ detail.data.value.assignedTo || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="打开人"
          ><span class="num">{{ detail.data.value.openedBy || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="打开时间"
          ><span class="num">{{
            fmtDateTime(detail.data.value.openedAt)
          }}</span></el-descriptions-item
        >
        <el-descriptions-item v-if="detail.data.value.closedReason" label="关闭原因">
          {{
            closedReasonOptions.find((o) => o.value === detail.data.value?.closedReason)?.label ??
            detail.data.value.closedReason
          }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <ActionLogPanel object-type="story" :object-id="storyId" />

    <!-- 评审弹窗 -->
    <el-dialog v-model="reviewOpen" title="需求评审" width="520px">
      <el-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules" label-width="90px">
        <el-form-item label="评审结果" prop="result">
          <el-radio-group v-model="reviewForm.result">
            <el-radio value="pass">通过</el-radio>
            <el-radio value="clarify">澄清</el-radio>
            <el-radio value="revert">驳回（v1）</el-radio>
            <el-radio value="reject">拒绝（v&gt;1）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="reviewForm.result === StoryReviewResult.Reject"
          label="关闭原因"
          prop="closedReason"
        >
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
          v-if="
            reviewForm.result === StoryReviewResult.Reject &&
            reviewForm.closedReason === StoryClosedReason.Duplicate
          "
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
    <el-dialog v-model="changeOpen" title="需求变更（生成新版本）" width="680px">
      <el-form ref="changeFormRef" :model="changeForm" :rules="changeRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="changeForm.title" />
        </el-form-item>
        <el-form-item label="需求描述" prop="spec">
          <el-input v-model="changeForm.spec" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="验收标准" prop="verify">
          <el-input v-model="changeForm.verify" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="changeForm.pri">
            <el-radio :value="1">1</el-radio>
            <el-radio :value="2">2</el-radio>
            <el-radio :value="3">3</el-radio>
            <el-radio :value="4">4</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="预计工时">
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
        <el-button @click="changeOpen = false">取消</el-button>
        <el-button type="primary" @click="submitChange">提交变更</el-button>
      </template>
    </el-dialog>

    <!-- 关闭弹窗 -->
    <el-dialog v-model="closeOpen" title="关闭需求" width="520px">
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
          v-if="closeForm.closedReason === StoryClosedReason.Duplicate"
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
          <span class="ml-2 text-xs text-muted-foreground">存在未关闭子需求时强制关闭（4203）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeOpen = false">取消</el-button>
        <el-button type="danger" @click="submitClose">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 指派弹窗 -->
    <el-dialog v-model="assignOpen" title="指派需求" width="440px">
      <UserSelect v-model="assignTo" />
      <template #footer>
        <el-button @click="assignOpen = false">取消</el-button>
        <el-button type="primary" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>

    <!-- 拆分弹窗 -->
    <el-dialog v-model="subdivideOpen" title="拆分子需求" width="760px">
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
      >
        添加子需求
      </el-button>
      <template #footer>
        <el-button @click="subdivideOpen = false">取消</el-button>
        <el-button type="primary" @click="submitSubdivide">提交拆分</el-button>
      </template>
    </el-dialog>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="需求不存在" />
</template>
