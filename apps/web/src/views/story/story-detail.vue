<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { ArrowLeft, Plus } from '@element-plus/icons-vue';
import { PERMS, StoryReviewResult, StoryClosedReason } from '@zentao/shared';
import { storyApi } from '../../api/story.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import { fmtDateTime } from '../../lib/format.js';
import { useEntityNames } from '../../composables/useEntityNames.js';
import StatusDot from '../../components/common/status-dot.vue';
import MarkdownView from '../../components/common/markdown-view.vue';
import UserSelect from '../../components/common/user-select.vue';
import ActionLogPanel from '../../components/common/action-log.vue';

// 需求详情（复刻禅道 story/view：#ID 胶囊标题区 + 左主栏 sections/历史记录 + 右栏基本信息/一生 + 底部悬浮动作栏）
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

const s = computed(() => detail.data.value);
const can = (action: string): boolean => {
  const st = s.value?.status;
  if (!st) return false;
  switch (action) {
    case 'change':
      return st === 'active';
    case 'submitReview':
      return st === 'draft' || st === 'changing';
    case 'recallReview':
      return st === 'reviewing';
    case 'recallChange':
      return st === 'changing';
    case 'review':
      return st === 'reviewing';
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

watch(changeOpen, (v) => {
  const d = detail.data.value;
  if (!v || !d) return;
  Object.assign(changeForm, {
    title: d.spec.title,
    spec: d.spec.spec,
    verify: d.spec.verify,
    pri: d.pri,
    estimate: d.estimate,
    submitReview: true,
    reviewerIds: [],
  });
});

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

const reviewLabels: Record<string, string> = {
  pass: '通过',
  revert: '驳回',
  clarify: '澄清',
  reject: '拒绝',
};
</script>

<template>
  <div v-if="s" class="pb-16">
    <!-- 标题区（禅道 entityTitle：#ID 胶囊 + 标题 + 版本） -->
    <div class="mb-3 flex items-center gap-3">
      <el-button link @click="router.push('/stories')"
        ><el-icon><ArrowLeft /></el-icon
      ></el-button>
      <span class="num rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
        >#{{ s.id }}</span
      >
      <h1 class="truncate text-lg font-bold">{{ s.title }}</h1>
      <span class="num rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
        >v{{ s.version }}</span
      >
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)_320px] gap-4">
      <!-- 左主栏 -->
      <div class="min-w-0 space-y-4">
        <div class="ztn-card">
          <div class="ztn-card-title">需求描述</div>
          <div class="p-4"><MarkdownView :content="s.spec.spec || '暂无描述'" /></div>
        </div>
        <div class="ztn-card">
          <div class="ztn-card-title">验收标准</div>
          <div class="p-4"><MarkdownView :content="s.spec.verify || '暂无描述'" /></div>
        </div>

        <!-- 评审记录 -->
        <div class="ztn-card">
          <div class="ztn-card-title">评审记录</div>
          <el-table
            :data="s.reviewers"
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
                  {{ reviewLabels[row.result as string] ?? row.result }}
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

        <!-- 历史记录（禅道：操作 + 字段变更行） -->
        <ActionLogPanel object-type="story" :object-id="storyId" />
      </div>

      <!-- 右侧栏 -->
      <aside class="space-y-4">
        <div class="ztn-card">
          <div class="ztn-card-title">基本信息</div>
          <el-descriptions :column="1" border size="small" class="p-3">
            <el-descriptions-item label="所属产品">
              <router-link
                v-if="productName(s.productId)"
                :to="`/products/${s.productId}`"
                class="text-primary hover:underline"
              >
                {{ productName(s.productId) }}
              </router-link>
              <span v-else class="num">{{ s.productId }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="当前状态"
              ><StatusDot entity="story" :status="s.status"
            /></el-descriptions-item>
            <el-descriptions-item label="所处阶段"
              ><StatusDot entity="storyStage" :status="s.stage"
            /></el-descriptions-item>
            <el-descriptions-item label="优先级"
              ><span class="num">P{{ s.pri }}</span></el-descriptions-item
            >
            <el-descriptions-item label="预计工时"
              ><span class="num">{{ s.estimate }} 小时</span></el-descriptions-item
            >
            <el-descriptions-item label="关键词"
              ><span class="num">{{ s.finalResult || '-' }}</span></el-descriptions-item
            >
          </el-descriptions>
        </div>

        <div class="ztn-card">
          <div class="ztn-card-title">需求的一生</div>
          <el-descriptions :column="1" border size="small" class="p-3">
            <el-descriptions-item label="由谁创建">
              <span class="num">{{ s.openedBy || '-' }}</span>
              <span class="num ml-1 text-xs text-muted-foreground">{{
                fmtDateTime(s.openedAt)
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="指派给"
              ><span class="num">{{ s.assignedTo || '-' }}</span></el-descriptions-item
            >
            <el-descriptions-item label="评审时间"
              ><span class="num">{{ fmtDateTime(s.reviewedAt) }}</span></el-descriptions-item
            >
            <el-descriptions-item label="由谁关闭">
              <span class="num">{{ s.closedBy || '-' }}</span>
              <span class="num ml-1 text-xs text-muted-foreground">{{
                fmtDateTime(s.closedAt)
              }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="s.closedReason" label="关闭原因">
              {{
                closedReasonOptions.find((o) => o.value === s?.closedReason)?.label ??
                s?.closedReason
              }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </aside>
    </div>

    <!-- 底部悬浮动作栏（禅道 detail-actions） -->
    <div class="detail-actions">
      <el-button size="small" @click="router.push('/stories')">返回</el-button>
      <span class="mx-2 h-4 w-px bg-border" />
      <el-button
        v-if="can('change')"
        v-permission="PERMS.story.change"
        type="primary"
        size="small"
        @click="changeOpen = true"
        >变更</el-button
      >
      <el-button
        v-if="can('recallChange')"
        v-permission="PERMS.story.recallChange"
        size="small"
        @click="
          confirmAction({
            title: '撤销变更',
            message: '确定尝试撤销变更吗？',
            run: () => storyApi.recallChange(storyId),
            invalidate,
          })
        "
        >撤销变更</el-button
      >
      <el-button
        v-if="can('submitReview')"
        v-permission="PERMS.story.change"
        size="small"
        @click="changeOpen = true"
        >提交评审</el-button
      >
      <el-button
        v-if="can('recallReview')"
        v-permission="PERMS.story.recallReview"
        size="small"
        @click="
          confirmAction({
            title: '撤销评审',
            message: '确定撤回本次评审吗？',
            run: () => storyApi.recallReview(storyId),
            invalidate,
          })
        "
        >撤销评审</el-button
      >
      <el-button
        v-if="can('review')"
        v-permission="PERMS.story.review"
        type="primary"
        size="small"
        @click="reviewOpen = true"
        >评审</el-button
      >
      <el-button
        v-if="can('subdivide')"
        v-permission="PERMS.story.subdivide"
        size="small"
        @click="subdivideOpen = true"
        >拆分</el-button
      >
      <el-button
        v-if="can('assign')"
        v-permission="PERMS.story.assign"
        size="small"
        @click="assignOpen = true"
        >指派</el-button
      >
      <el-button
        v-if="can('close')"
        v-permission="PERMS.story.close"
        type="danger"
        size="small"
        @click="closeOpen = true"
        >关闭</el-button
      >
      <el-button
        v-if="can('activate')"
        v-permission="PERMS.story.activate"
        type="primary"
        size="small"
        @click="
          confirmAction({ title: '激活需求', run: () => storyApi.activate(storyId), invalidate })
        "
        >激活</el-button
      >
      <span class="mx-2 h-4 w-px bg-border" />
      <el-button
        v-permission="PERMS.story.create"
        size="small"
        type="primary"
        :icon="Plus"
        @click="router.push('/stories')"
        >提需求</el-button
      >
    </div>

    <!-- 评审弹窗 -->
    <el-dialog v-model="reviewOpen" :title="`评审需求 #${s?.id}`" width="520px">
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
    <el-dialog v-model="changeOpen" title="变更需求（生成新版本）" width="680px">
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
            <el-radio :value="1">1</el-radio><el-radio :value="2">2</el-radio
            ><el-radio :value="3">3</el-radio><el-radio :value="4">4</el-radio>
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
        >添加子需求</el-button
      >
      <template #footer>
        <el-button @click="subdivideOpen = false">取消</el-button>
        <el-button type="primary" @click="submitSubdivide">提交拆分</el-button>
      </template>
    </el-dialog>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="需求不存在" />
</template>

<style scoped>
.detail-actions {
  position: sticky;
  bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow:
    0 1px 1px rgb(0 0 0 / 5%),
    0 2px 6px rgb(0 0 0 / 4.5%);
}
</style>
