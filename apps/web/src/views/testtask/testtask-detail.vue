<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { PERMS, TestTaskStatus, StepResult, CaseRunResult } from '@zentao/shared';
import { caseApi, type CaseDetailVo, type RunStepInput } from '../../api/case.js';
import { testTaskApi, type TestRunVo } from '../../api/testtask.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import { fmtDateTime } from '../../lib/format.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import BugCreateDialog from '../../components/common/bug-create-dialog.vue';

// 测试单详情：圈用例（replace 语义）/ 执行用例（runCase 三写）/ 失败转 Bug（docs/02 §9）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const taskId = computed(() => Number(route.params.id));

const detail = useQuery({
  queryKey: ['testtasks', taskId.value],
  queryFn: () => testTaskApi.get(taskId.value),
  enabled: computed(() => Number.isFinite(taskId.value) && taskId.value > 0),
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['testtasks'] })];

const actions = computed<ToolbarAction[]>(() => {
  const t = detail.data.value;
  if (!t) return [];
  const list: ToolbarAction[] = [];
  list.push({
    key: 'link',
    label: '圈选用例',
    permission: PERMS.testtask.linkCase,
    type: 'primary',
    run: () => (linkOpen.value = true),
  });
  if (t.status === TestTaskStatus.Wait)
    list.push({
      key: 'start',
      label: '开始',
      permission: PERMS.testtask.start,
      type: 'primary',
      run: () =>
        confirmAction({ title: '开始测试单', run: () => testTaskApi.start(t.id), invalidate }),
    });
  if (t.status === TestTaskStatus.Wait || t.status === TestTaskStatus.Doing)
    list.push({
      key: 'block',
      label: '阻塞',
      permission: PERMS.testtask.block,
      type: 'warning',
      run: () =>
        confirmAction({ title: '阻塞测试单', run: () => testTaskApi.block(t.id), invalidate }),
    });
  if (t.status === TestTaskStatus.Blocked || t.status === TestTaskStatus.Done)
    list.push({
      key: 'activate',
      label: '激活',
      permission: PERMS.testtask.activate,
      type: 'primary',
      run: () =>
        confirmAction({ title: '激活测试单', run: () => testTaskApi.activate(t.id), invalidate }),
    });
  if (t.status === TestTaskStatus.Doing)
    list.push({
      key: 'close',
      label: '关闭',
      permission: PERMS.testtask.close,
      type: 'danger',
      run: () => (closeOpen.value = true),
    });
  return list;
});

// ---- 圈用例弹窗（POST /testtasks/:id/cases 为 replace 语义） ----
const linkOpen = ref(false);
const selectedCaseIds = ref<string[]>([]);

const productCases = useQuery({
  queryKey: ['cases', { productId: () => detail.data.value?.productId }],
  queryFn: () => caseApi.list({ productId: detail.data.value!.productId }),
  enabled: computed(() => linkOpen.value && detail.data.value != null),
});

function openLink(): void {
  selectedCaseIds.value = (detail.data.value?.runs ?? []).map((r) => String(r.caseId));
}

async function submitLink(): Promise<void> {
  try {
    const runs = await testTaskApi.linkCases(taskId.value, selectedCaseIds.value);
    ElMessage.success(`圈选完成，共 ${runs.length} 条用例（整体替换）`);
    linkOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 关闭弹窗 ----
const closeOpen = ref(false);
const closeFormRef = ref<FormInstance>();
const closeForm = reactive({ realFinishedDate: '' });
const closeRules: FormRules = {
  realFinishedDate: [
    { required: true, message: '请填写实际完成日期（4951：须晚于开始日期）', trigger: 'change' },
  ],
};

async function submitClose(): Promise<void> {
  const valid = await closeFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    await testTaskApi.close(taskId.value, closeForm.realFinishedDate);
    ElMessage.success('测试单已关闭');
    closeOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 执行用例弹窗（runCase） ----
const runOpen = ref(false);
const runningCase = ref<CaseDetailVo | null>(null);
const runningRun = ref<TestRunVo | null>(null);
const stepResults = ref<Array<{ stepId: number; result: string; real: string }>>([]);
const submitting = ref(false);

const resultOptions = [
  { value: StepResult.Pass, label: '通过' },
  { value: StepResult.Fail, label: '失败' },
  { value: StepResult.Blocked, label: '阻塞' },
  { value: 'n/a', label: 'N/A' },
];

async function openRun(run: TestRunVo): Promise<void> {
  runningRun.value = run;
  try {
    const detailVo = await caseApi.get(run.caseId);
    runningCase.value = detailVo;
    stepResults.value = detailVo.steps
      .filter((s) => s.type !== 'item')
      .map((s) => ({ stepId: s.id, result: StepResult.Pass, real: '' }));
    runOpen.value = true;
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

async function submitRun(): Promise<void> {
  if (!runningRun.value) return;
  submitting.value = true;
  try {
    const result = await testTaskApi.runCase(
      taskId.value,
      runningRun.value.id,
      stepResults.value.map((s) => ({
        stepId: s.stepId,
        result: s.result as RunStepInput['result'],
        real: s.real || undefined,
      })),
      String(runningRun.value.caseId),
    );
    ElMessage.success(`执行完成：用例结果 ${result.caseResult}`);
    runOpen.value = false;
    invalidate[0]();
    // 失败 → 提供「失败转 Bug」
    if (result.caseResult !== CaseRunResult.Pass) void openBugPrefill(runningRun.value);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    submitting.value = false;
  }
}

// ---- 失败转 Bug（bug-prefill 预填 → BugCreateDialog） ----
const bugOpen = ref(false);
type BugPrefillWithProduct = import('../../api/testtask.js').BugPrefillVo & { productId?: number };
const bugPrefill = ref<BugPrefillWithProduct | null>(null);

async function openBugPrefill(run: TestRunVo): Promise<void> {
  try {
    const prefill = await testTaskApi.bugPrefill(taskId.value, run.id);
    bugPrefill.value = { ...prefill, productId: detail.data.value?.productId };
    bugOpen.value = true;
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <el-button link @click="router.push('/testtasks')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <span class="num text-muted-foreground">#{{ detail.data.value.id }}</span>
        <h1 class="truncate text-lg font-semibold">{{ detail.data.value.name }}</h1>
        <StatusTag entity="testtask" :status="detail.data.value.status" />
        <span class="num text-xs text-muted-foreground">构建 {{ detail.data.value.buildId }}</span>
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <el-descriptions :column="3" border size="small">
      <el-descriptions-item label="产品"
        ><span class="num">{{ detail.data.value.productId }}</span></el-descriptions-item
      >
      <el-descriptions-item label="负责人"
        ><span class="num">{{ detail.data.value.ownerId }}</span></el-descriptions-item
      >
      <el-descriptions-item label="起止">
        <span class="num"
          >{{ detail.data.value.begin || '-' }} ~ {{ detail.data.value.end || '-' }}</span
        >
      </el-descriptions-item>
      <el-descriptions-item label="描述" :span="3">{{
        detail.data.value.desc || '-'
      }}</el-descriptions-item>
    </el-descriptions>

    <!-- 圈选用例（runs） -->
    <div class="border border-border bg-card">
      <div class="flex items-center justify-between border-b border-border px-4 py-2">
        <span class="text-sm font-medium">圈选用例（{{ detail.data.value.runs.length }}）</span>
        <span class="num text-xs text-muted-foreground">圈选为整体替换语义</span>
      </div>
      <el-table
        :data="detail.data.value.runs"
        size="small"
        class="table-hairline"
        empty-text="尚未圈选用例"
      >
        <el-table-column label="用例" min-width="240">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="router.push(`/cases/${row.caseId}`)">
              <span class="num">#{{ row.caseId }}</span>
            </el-link>
            <span class="num ml-2 text-xs text-muted-foreground">v{{ row.caseVersion }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最近结果" width="100">
          <template #default="{ row }">
            <StatusTag v-if="row.lastRunResult" entity="caseResult" :status="row.lastRunResult" />
            <span v-else class="text-muted-foreground">未执行</span>
          </template>
        </el-table-column>
        <el-table-column label="执行人" width="110">
          <template #default="{ row }"
            ><span class="num">{{ row.lastRunner || '-' }}</span></template
          >
        </el-table-column>
        <el-table-column label="执行时间" width="150">
          <template #default="{ row }"
            ><span class="num">{{ fmtDateTime(row.lastRunDate) }}</span></template
          >
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="PERMS.testtask.runCase"
              link
              type="primary"
              size="small"
              @click="openRun(row)"
              >执行</el-button
            >
            <el-button
              v-permission="PERMS.testtask.runCase"
              link
              size="small"
              @click="openBugPrefill(row)"
              >转 Bug</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 圈用例弹窗 -->
    <el-dialog v-model="linkOpen" title="圈选用例（整体替换）" width="640px" @open="openLink">
      <el-select
        v-model="selectedCaseIds"
        multiple
        filterable
        placeholder="选择该产品下的用例"
        class="!w-full"
      >
        <el-option
          v-for="c in productCases.data.value ?? []"
          :key="c.id"
          :value="String(c.id)"
          :label="`#${c.id} ${c.title}`"
        />
      </el-select>
      <p class="mt-2 text-xs text-muted-foreground">
        清空并保存 = 取消全部圈选；已执行记录将被重置。
      </p>
      <template #footer>
        <el-button @click="linkOpen = false">取消</el-button>
        <el-button type="primary" @click="submitLink">保存圈选</el-button>
      </template>
    </el-dialog>

    <!-- 关闭弹窗 -->
    <el-dialog v-model="closeOpen" title="关闭测试单" width="440px">
      <el-form ref="closeFormRef" :model="closeForm" :rules="closeRules" label-width="110px">
        <el-form-item label="实际完成日期" prop="realFinishedDate">
          <el-date-picker
            v-model="closeForm.realFinishedDate"
            type="date"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeOpen = false">取消</el-button>
        <el-button type="danger" @click="submitClose">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 执行用例弹窗 -->
    <el-dialog
      v-model="runOpen"
      :title="`执行用例 #${runningCase?.id ?? ''} ${runningCase?.title ?? ''}`"
      width="760px"
    >
      <el-table :data="stepResults" size="small" class="table-hairline">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="步骤" min-width="220">
          <template #default="{ $index }">{{ runningCase?.steps[$index]?.stepDesc }}</template>
        </el-table-column>
        <el-table-column label="预期" min-width="160">
          <template #default="{ $index }">{{ runningCase?.steps[$index]?.expect || '-' }}</template>
        </el-table-column>
        <el-table-column label="结果" width="150">
          <template #default="{ row }">
            <el-radio-group v-model="row.result" size="small">
              <el-radio-button v-for="opt in resultOptions" :key="opt.value" :value="opt.value">{{
                opt.label
              }}</el-radio-button>
            </el-radio-group>
          </template>
        </el-table-column>
        <el-table-column label="实际情况" min-width="140">
          <template #default="{ row }">
            <el-input v-model="row.real" placeholder="可选" />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="runOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRun">提交执行结果</el-button>
      </template>
    </el-dialog>

    <!-- 失败转 Bug 弹窗（预填） -->
    <BugCreateDialog v-model:open="bugOpen" :prefill="bugPrefill" />
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="测试单不存在" />
</template>
