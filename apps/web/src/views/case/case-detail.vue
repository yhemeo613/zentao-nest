<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { PERMS, CaseStatus } from '@zentao/shared';
import { caseApi, type CaseStepInput } from '../../api/case.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';

// 用例详情：步骤版本化 + 评审 + 需求变更确认（docs/02 §8 用例域）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const caseId = computed(() => Number(route.params.id));

const detail = useQuery({
  queryKey: ['cases', caseId.value],
  queryFn: () => caseApi.get(caseId.value),
  enabled: computed(() => Number.isFinite(caseId.value) && caseId.value > 0),
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['cases'] })];

const actions = computed<ToolbarAction[]>(() => {
  const c = detail.data.value;
  if (!c) return [];
  const list: ToolbarAction[] = [];
  if (c.status === CaseStatus.Wait)
    list.push({
      key: 'review',
      label: '评审',
      permission: PERMS.case.review,
      type: 'primary',
      run: () => (reviewOpen.value = true),
    });
  list.push({
    key: 'edit',
    label: '编辑',
    permission: PERMS.case.edit,
    run: () => (editOpen.value = true),
  });
  if (c.storyChanged)
    list.push({
      key: 'confirm-story-change',
      label: '确认需求变更',
      permission: PERMS.case.confirmStoryChange,
      type: 'warning',
      run: () =>
        confirmAction({
          title: '确认需求变更',
          message: '确认后用例版本与需求当前版本对齐。',
          run: () => caseApi.confirmStoryChange(c.id),
          invalidate,
        }),
    });
  return list;
});

// ---- 评审弹窗 ----
const reviewOpen = ref(false);
const reviewResult = ref<'pass' | 'clarify'>('pass');

async function submitReview(): Promise<void> {
  try {
    await caseApi.review(caseId.value, reviewResult.value);
    ElMessage.success(reviewResult.value === 'pass' ? '评审通过' : '标记澄清');
    reviewOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 编辑弹窗 ----
const editOpen = ref(false);
const editFormRef = ref<FormInstance>();
const editForm = reactive({
  title: '',
  precondition: '',
  pri: 3,
  steps: [{ stepDesc: '', expect: '' }] as CaseStepInput[],
});

function openEdit(): void {
  const c = detail.data.value;
  if (!c) return;
  Object.assign(editForm, {
    title: c.title,
    precondition: c.precondition ?? '',
    pri: c.pri,
    steps:
      c.steps.length > 0
        ? c.steps
            .filter((s) => s.type !== 'item')
            .map((s) => ({ stepDesc: s.stepDesc, expect: s.expect ?? '' }))
        : [{ stepDesc: '', expect: '' }],
  });
}

async function submitEdit(): Promise<void> {
  const steps = editForm.steps.filter((s) => s.stepDesc.trim());
  if (!editForm.title || steps.length === 0) {
    ElMessage.warning('标题与至少一个步骤必填');
    return;
  }
  try {
    await caseApi.update(caseId.value, {
      title: editForm.title,
      precondition: editForm.precondition || undefined,
      pri: editForm.pri,
      steps,
    });
    ElMessage.success('已保存（内容有变化时版本 +1）');
    editOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <el-button link @click="router.push('/cases')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <span class="num text-muted-foreground">#{{ detail.data.value.id }}</span>
        <h1 class="truncate text-lg font-semibold">{{ detail.data.value.title }}</h1>
        <StatusTag entity="case" :status="detail.data.value.status" />
        <span class="num text-xs text-muted-foreground">v{{ detail.data.value.version }}</span>
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <el-alert
      v-if="detail.data.value.storyChanged"
      type="warning"
      :closable="false"
      title="关联需求已变更"
      description="用例基于旧版本需求编写，请核对步骤后点击「确认需求变更」完成版本对齐。"
    />

    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 space-y-4">
        <div class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">前置条件</div>
          <div class="whitespace-pre-wrap p-4 text-sm">
            {{ detail.data.value.precondition || '（无）' }}
          </div>
        </div>
        <div class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">测试步骤</div>
          <el-table
            :data="detail.data.value.steps.filter((s) => s.type !== 'item')"
            size="small"
            class="table-hairline"
            empty-text="无步骤"
          >
            <el-table-column label="#" width="50">
              <template #default="{ $index }"
                ><span class="num">{{ $index + 1 }}</span></template
              >
            </el-table-column>
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{
                  row.type === 'group' ? '步骤组' : '步骤'
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="stepDesc" label="步骤描述" min-width="240" />
            <el-table-column prop="expect" label="预期结果" min-width="180">
              <template #default="{ row }">{{ row.expect || '-' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <el-descriptions title="属性" :column="1" border size="small">
        <el-descriptions-item label="产品"
          ><span class="num">{{ detail.data.value.productId }}</span></el-descriptions-item
        >
        <el-descriptions-item label="关联需求">
          <el-link
            v-if="detail.data.value.storyId > 0"
            type="primary"
            :underline="false"
            @click="router.push(`/stories/${detail.data.value.storyId}`)"
            ><span class="num">#{{ detail.data.value.storyId }}</span></el-link
          >
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="需求版本"
          ><span class="num">v{{ detail.data.value.storyVersion }}</span></el-descriptions-item
        >
        <el-descriptions-item label="优先级"
          ><span class="num">P{{ detail.data.value.pri }}</span></el-descriptions-item
        >
        <el-descriptions-item label="最近结果">
          <StatusTag
            v-if="detail.data.value.lastRunResult"
            entity="caseResult"
            :status="detail.data.value.lastRunResult"
          />
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="最近执行人"
          ><span class="num">{{ detail.data.value.lastRunner || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="创建人"
          ><span class="num">{{ detail.data.value.openedBy || '-' }}</span></el-descriptions-item
        >
      </el-descriptions>
    </div>

    <!-- 评审弹窗 -->
    <el-dialog v-model="reviewOpen" title="用例评审" width="420px">
      <el-radio-group v-model="reviewResult">
        <el-radio value="pass">通过（转正常）</el-radio>
        <el-radio value="clarify">需要澄清</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="reviewOpen = false">取消</el-button>
        <el-button type="primary" @click="submitReview">提交</el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editOpen" title="编辑用例" width="720px" @open="openEdit">
      <el-form ref="editFormRef" :model="editForm" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="前置条件">
          <el-input v-model="editForm.precondition" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="editForm.pri">
            <el-radio :value="1">1</el-radio>
            <el-radio :value="2">2</el-radio>
            <el-radio :value="3">3</el-radio>
            <el-radio :value="4">4</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="步骤">
          <div class="w-full space-y-2">
            <div v-for="(step, i) in editForm.steps" :key="i" class="flex gap-2">
              <span class="num mt-1 w-6 text-center text-muted-foreground">{{ i + 1 }}</span>
              <el-input v-model="step.stepDesc" placeholder="步骤描述" />
              <el-input v-model="step.expect" placeholder="预期结果" />
              <el-button
                link
                type="danger"
                @click="editForm.steps.length > 1 && editForm.steps.splice(i, 1)"
                >删除</el-button
              >
            </div>
            <el-button size="small" @click="editForm.steps.push({ stepDesc: '', expect: '' })"
              >添加步骤</el-button
            >
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editOpen = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="用例不存在" />
</template>
