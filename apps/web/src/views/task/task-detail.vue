<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { PERMS, TASK_TRANSITIONS } from '@zentao/shared';
import { taskApi, type EffortVo } from '../../api/task.js';
import { executionApi } from '../../api/execution.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import { fmtDateTime } from '../../lib/format.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import MarkdownView from '../../components/common/markdown-view.vue';
import UserSelect from '../../components/common/user-select.vue';
import ActionLogPanel from '../../components/common/action-log.vue';
import { useEntityNames } from '../../composables/useEntityNames.js';

// 任务详情：isClickable 前端镜像（TASK_TRANSITIONS 单源）+ 工时流水（docs/02 §6）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const taskId = computed(() => Number(route.params.id));
const { projectName } = useEntityNames();

const detail = useQuery({
  queryKey: ['tasks', taskId.value],
  queryFn: () => taskApi.get(taskId.value),
  enabled: computed(() => Number.isFinite(taskId.value) && taskId.value > 0),
});
// 所属执行名称（executions 端点按项目过滤，用任务上的 projectId 拉取）
const executionQuery = useQuery({
  queryKey: ['executions', () => detail.data.value?.projectId],
  queryFn: () => executionApi.list(detail.data.value!.projectId),
  enabled: computed(() => (detail.data.value?.projectId ?? 0) > 0),
});
const execName = computed(
  () =>
    (executionQuery.data.value ?? []).find((e) => e.id === detail.data.value?.executionId)?.name ??
    null,
);

function invalidateAll(): void {
  void queryClient.invalidateQueries({ queryKey: ['tasks'] });
}
const invalidate = [invalidateAll];

/** 动作 → 前置状态（shared TASK_TRANSITIONS 镜像；后端 3006 兜底） */
const can = (action: string): boolean => {
  const s = detail.data.value?.status;
  return s != null && (TASK_TRANSITIONS[action] ?? []).includes(s);
};

const actions = computed<ToolbarAction[]>(() => {
  const t = detail.data.value;
  if (!t) return [];
  const list: ToolbarAction[] = [];
  if (can('start'))
    list.push({
      key: 'start',
      label: '开始',
      permission: PERMS.task.start,
      type: 'primary',
      run: () => (startOpen.value = true),
    });
  if (can('finish'))
    list.push({
      key: 'finish',
      label: '完成',
      permission: PERMS.task.finish,
      type: 'success',
      run: () => (finishOpen.value = true),
    });
  if (can('pause'))
    list.push({
      key: 'pause',
      label: '暂停',
      permission: PERMS.task.pause,
      type: 'warning',
      run: () => confirmAction({ title: '暂停任务', run: () => taskApi.pause(t.id), invalidate }),
    });
  if (can('restart'))
    list.push({
      key: 'restart',
      label: '继续',
      permission: PERMS.task.restart,
      type: 'primary',
      run: () => confirmAction({ title: '继续任务', run: () => taskApi.restart(t.id), invalidate }),
    });
  if (can('cancel'))
    list.push({
      key: 'cancel',
      label: '取消',
      permission: PERMS.task.cancel,
      type: 'warning',
      run: () =>
        confirmAction({
          title: '取消任务',
          message: '取消后任务指派回开单人。',
          run: () => taskApi.cancel(t.id),
          invalidate,
        }),
    });
  if (can('close'))
    list.push({
      key: 'close',
      label: '关闭',
      permission: PERMS.task.close,
      run: () => confirmAction({ title: '关闭任务', run: () => taskApi.close(t.id), invalidate }),
    });
  if (can('activate'))
    list.push({
      key: 'activate',
      label: '激活',
      permission: PERMS.task.activate,
      run: () => (activateOpen.value = true),
    });
  list.push({
    key: 'assign',
    label: '指派',
    permission: PERMS.task.assign,
    run: () => (assignOpen.value = true),
  });
  list.push({
    key: 'edit',
    label: '编辑',
    permission: PERMS.task.edit,
    run: () => (editOpen.value = true),
  });
  list.push({
    key: 'delete',
    label: '删除',
    permission: PERMS.task.delete,
    type: 'danger',
    run: () =>
      confirmAction({
        title: '删除任务',
        message: '存在子任务时将被拒绝；确定删除吗？',
        danger: true,
        run: () => taskApi.remove(t.id),
        successMsg: '已删除',
        invalidate,
      }),
  });
  return list;
});

// ---- 开始弹窗 ----
const startOpen = ref(false);
const startFormRef = ref<FormInstance>();
const startForm = reactive({ consumed: 0, left: 0, realStarted: '' });
const startRules: FormRules = {
  consumed: [{ required: true, message: '请填写初始消耗', trigger: 'blur' }],
  left: [{ required: true, message: '请填写初始剩余（0 直接完成）', trigger: 'blur' }],
};

function openStart(): void {
  startForm.consumed = 0;
  startForm.left = detail.data.value?.left ?? 0;
  startForm.realStarted = dayjs().format('YYYY-MM-DD');
}

async function submitStart(): Promise<void> {
  const valid = await startFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    await taskApi.start(taskId.value, {
      consumed: startForm.consumed,
      left: startForm.left,
      realStarted: startForm.realStarted || undefined,
    });
    ElMessage.success(startForm.left === 0 ? '任务已完成' : '任务已开始');
    startOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 完成弹窗 ----
const finishOpen = ref(false);
const finishFormRef = ref<FormInstance>();
const finishForm = reactive({
  consumed: undefined as number | undefined,
  realStarted: '',
  finishedDate: '',
  work: '',
});
const finishRules: FormRules = {
  consumed: [{ required: true, message: '请填写最终消耗（>0）', trigger: 'blur' }],
  realStarted: [{ required: true, message: '请选择实际开始日期', trigger: 'change' }],
  finishedDate: [{ required: true, message: '请选择完成日期', trigger: 'change' }],
};

async function submitFinish(): Promise<void> {
  const valid = await finishFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    await taskApi.finish(taskId.value, {
      consumed: finishForm.consumed ?? 0,
      realStarted: finishForm.realStarted,
      finishedDate: finishForm.finishedDate,
      work: finishForm.work || undefined,
    });
    ElMessage.success('任务已完成');
    finishOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 激活弹窗 ----
const activateOpen = ref(false);
const activateLeft = ref<number>(1);

async function submitActivate(): Promise<void> {
  if (!(activateLeft.value > 0)) {
    ElMessage.warning('激活后剩余工时必须大于 0');
    return;
  }
  try {
    await taskApi.activate(taskId.value, { left: activateLeft.value });
    ElMessage.success('任务已激活');
    activateOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 指派弹窗 ----
const assignOpen = ref(false);
const assignForm = reactive({ assignedTo: '', left: undefined as number | undefined });

function openAssign(): void {
  assignForm.assignedTo = detail.data.value?.assignedTo ?? '';
  assignForm.left = undefined;
}

async function submitAssign(): Promise<void> {
  if (!assignForm.assignedTo) {
    ElMessage.warning('请选择或输入账号');
    return;
  }
  try {
    await taskApi.assign(taskId.value, {
      assignedTo: assignForm.assignedTo,
      left: assignForm.left,
    });
    ElMessage.success('已指派');
    assignOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 编辑弹窗 ----
const editOpen = ref(false);
const editFormRef = ref<FormInstance>();
const editForm = reactive({ name: '', desc: '', deadline: '', pri: 3 });

function openEdit(): void {
  const t = detail.data.value;
  if (!t) return;
  Object.assign(editForm, {
    name: t.name,
    desc: t.desc ?? '',
    deadline: t.deadline ?? '',
    pri: t.pri,
  });
}

async function submitEdit(): Promise<void> {
  if (!editForm.name) {
    ElMessage.warning('名称不能为空');
    return;
  }
  try {
    await taskApi.update(taskId.value, {
      name: editForm.name,
      desc: editForm.desc || undefined,
      deadline: editForm.deadline || undefined,
      pri: editForm.pri,
    });
    ElMessage.success('已保存');
    editOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 记工时弹窗 ----
const effortOpen = ref(false);
const effortFormRef = ref<FormInstance>();
const effortForm = reactive({
  date: '',
  consumed: undefined as number | undefined,
  left: undefined as number | undefined,
  work: '',
});
const effortRules: FormRules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  consumed: [{ required: true, message: '请填写消耗（>0）', trigger: 'blur' }],
  left: [{ required: true, message: '请填写剩余（0 隐式完成）', trigger: 'blur' }],
  work: [{ required: true, message: '请填写工作内容', trigger: 'blur' }],
};

async function submitEffort(): Promise<void> {
  const valid = await effortFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    await taskApi.recordEffort(taskId.value, {
      date: effortForm.date,
      consumed: effortForm.consumed ?? 0,
      left: effortForm.left ?? 0,
      work: effortForm.work,
    });
    ElMessage.success(effortForm.left === 0 ? '工时已记录，任务隐式完成' : '工时已记录');
    effortOpen.value = false;
    invalidateAll();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

async function deleteEffort(row: EffortVo): Promise<void> {
  await confirmAction({
    title: '删除工时',
    message: '删除后全量重算工时；消耗归零任务将回到未开始。',
    danger: true,
    run: () => taskApi.deleteEffort(taskId.value, row.id),
    successMsg: '已删除',
    invalidate,
  });
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <el-breadcrumb class="mb-1">
      <el-breadcrumb-item :to="{ path: '/tasks' }">任务</el-breadcrumb-item>
      <el-breadcrumb-item>{{ '#' + detail.data.value.id }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <el-button link @click="router.push('/tasks')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <span class="num text-muted-foreground">#{{ detail.data.value.id }}</span>
        <h1 class="truncate text-lg font-semibold">{{ detail.data.value.name }}</h1>
        <StatusTag entity="task" :status="detail.data.value.status" />
        <span class="num text-xs text-muted-foreground">
          预 {{ detail.data.value.estimate }} / 耗 {{ detail.data.value.consumed }} / 余
          {{ detail.data.value.left }}
        </span>
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 space-y-4">
        <div class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">任务描述</div>
          <div class="p-4"><MarkdownView :content="detail.data.value.desc || '（无）'" /></div>
        </div>

        <!-- 工时流水 -->
        <div class="border border-border bg-card">
          <div class="flex items-center justify-between border-b border-border px-4 py-2">
            <span class="text-sm font-medium">工时流水</span>
            <el-button
              v-permission="PERMS.task.recordWorkhour"
              type="primary"
              size="small"
              @click="
                effortForm.date = dayjs().format('YYYY-MM-DD');
                effortOpen = true;
              "
              >记工时</el-button
            >
          </div>
          <el-table
            :data="detail.data.value.efforts"
            size="small"
            class="table-hairline"
            empty-text="暂无工时记录"
          >
            <el-table-column label="日期" width="110">
              <template #default="{ row }"
                ><span class="num">{{ row.date }}</span></template
              >
            </el-table-column>
            <el-table-column label="记录人" width="110">
              <template #default="{ row }"
                ><span class="num">{{ row.userId }}</span></template
              >
            </el-table-column>
            <el-table-column label="消耗" width="80">
              <template #default="{ row }"
                ><span class="num">{{ row.consumed }}</span></template
              >
            </el-table-column>
            <el-table-column label="剩余" width="80">
              <template #default="{ row }"
                ><span class="num">{{ row.left }}</span></template
              >
            </el-table-column>
            <el-table-column prop="work" label="工作内容" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-permission="PERMS.task.deleteWorkhour"
                  link
                  type="danger"
                  size="small"
                  @click="deleteEffort(row)"
                  >删除</el-button
                >
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 子任务 -->
        <div v-if="detail.data.value.children.length" class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">子任务</div>
          <el-table :data="detail.data.value.children" size="small" class="table-hairline">
            <el-table-column label="ID" width="70">
              <template #default="{ row }">
                <span
                  class="num cursor-pointer text-primary"
                  @click="router.push(`/tasks/${row.id}`)"
                  >#{{ row.id }}</span
                >
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }"
                ><StatusTag entity="task" :status="row.status"
              /></template>
            </el-table-column>
            <el-table-column label="指派给" width="110">
              <template #default="{ row }"
                ><span class="num">{{ row.assignedTo || '-' }}</span></template
              >
            </el-table-column>
          </el-table>
        </div>
      </div>

      <el-descriptions title="属性" :column="1" border size="small">
        <el-descriptions-item label="所属项目">
          {{ projectName(detail.data.value.projectId) ?? detail.data.value.projectId }}
        </el-descriptions-item>
        <el-descriptions-item label="所属执行">
          {{ execName ?? detail.data.value.executionId }}
        </el-descriptions-item>
        <el-descriptions-item label="关联需求">
          <el-link
            v-if="detail.data.value.storyId > 0"
            type="primary"
            :underline="false"
            @click="router.push(`/stories/${detail.data.value.storyId}`)"
          >
            <span class="num">#{{ detail.data.value.storyId }}</span>
          </el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="类型"
          ><span class="num">{{ detail.data.value.type }}</span></el-descriptions-item
        >
        <el-descriptions-item label="优先级"
          ><span class="num">P{{ detail.data.value.pri }}</span></el-descriptions-item
        >
        <el-descriptions-item label="指派给"
          ><span class="num">{{ detail.data.value.assignedTo || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="开始时间"
          ><span class="num">{{
            fmtDateTime(detail.data.value.realStarted ?? detail.data.value.estStarted)
          }}</span></el-descriptions-item
        >
        <el-descriptions-item label="完成时间"
          ><span class="num">{{
            fmtDateTime(detail.data.value.finishedAt)
          }}</span></el-descriptions-item
        >
        <el-descriptions-item label="截止"
          ><span class="num">{{ detail.data.value.deadline || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="开单人"
          ><span class="num">{{ detail.data.value.openedBy || '-' }}</span></el-descriptions-item
        >
      </el-descriptions>
    </div>

    <ActionLogPanel object-type="task" :object-id="taskId" />

    <!-- 开始弹窗 -->
    <el-dialog v-model="startOpen" title="开始任务" width="460px" @open="openStart">
      <el-form ref="startFormRef" :model="startForm" :rules="startRules" label-width="110px">
        <el-form-item label="初始消耗" prop="consumed">
          <el-input-number
            v-model="startForm.consumed"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
        </el-form-item>
        <el-form-item label="剩余工时" prop="left">
          <el-input-number
            v-model="startForm.left"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
          <span class="ml-2 text-xs text-muted-foreground">填 0 将直接完成任务</span>
        </el-form-item>
        <el-form-item label="实际开始">
          <el-date-picker v-model="startForm.realStarted" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="startOpen = false">取消</el-button>
        <el-button type="primary" @click="submitStart">确定</el-button>
      </template>
    </el-dialog>

    <!-- 完成弹窗 -->
    <el-dialog v-model="finishOpen" title="完成任务" width="460px">
      <el-form ref="finishFormRef" :model="finishForm" :rules="finishRules" label-width="110px">
        <el-form-item label="最终消耗" prop="consumed">
          <el-input-number
            v-model="finishForm.consumed"
            :min="0.1"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
        </el-form-item>
        <el-form-item label="实际开始" prop="realStarted">
          <el-date-picker v-model="finishForm.realStarted" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="完成日期" prop="finishedDate">
          <el-date-picker v-model="finishForm.finishedDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="工作内容">
          <el-input v-model="finishForm.work" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="finishOpen = false">取消</el-button>
        <el-button type="success" @click="submitFinish">完成任务</el-button>
      </template>
    </el-dialog>

    <!-- 激活弹窗 -->
    <el-dialog v-model="activateOpen" title="激活任务" width="420px">
      <div class="mb-2 text-xs text-muted-foreground">
        激活后任务回到进行中，需填写新的剩余工时（>0）。
      </div>
      <el-input-number
        v-model="activateLeft"
        :min="0.5"
        :step="0.5"
        :precision="1"
        :controls="false"
        class="!w-32"
      />
      <template #footer>
        <el-button @click="activateOpen = false">取消</el-button>
        <el-button type="primary" @click="submitActivate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 指派弹窗 -->
    <el-dialog v-model="assignOpen" title="指派任务" width="460px" @open="openAssign">
      <div class="space-y-3">
        <UserSelect
          v-model="assignForm.assignedTo"
          :root-type="'execution'"
          :root-id="detail.data.value.executionId"
        />
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground"
            >剩余工时（未完成任务须 &gt; 0，可留空表示不变）：</span
          >
          <el-input-number
            v-model="assignForm.left"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-28"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="assignOpen = false">取消</el-button>
        <el-button type="primary" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editOpen" title="编辑任务" width="560px" @open="openEdit">
      <el-form ref="editFormRef" :model="editForm" label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="editForm.pri">
            <el-radio :value="1">1</el-radio>
            <el-radio :value="2">2</el-radio>
            <el-radio :value="3">3</el-radio>
            <el-radio :value="4">4</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="editForm.deadline" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.desc" type="textarea" :rows="4" placeholder="支持 Markdown" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editOpen = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 记工时弹窗 -->
    <el-dialog v-model="effortOpen" title="记录工时" width="480px">
      <el-form ref="effortFormRef" :model="effortForm" :rules="effortRules" label-width="110px">
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="effortForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled-date="(d: Date) => d > new Date()"
          />
        </el-form-item>
        <el-form-item label="本次消耗" prop="consumed">
          <el-input-number
            v-model="effortForm.consumed"
            :min="0.1"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
        </el-form-item>
        <el-form-item label="完成剩余" prop="left">
          <el-input-number
            v-model="effortForm.left"
            :min="0"
            :step="0.5"
            :precision="1"
            :controls="false"
            class="!w-32"
          />
          <span class="ml-2 text-xs text-muted-foreground">填 0 隐式完成任务</span>
        </el-form-item>
        <el-form-item label="工作内容" prop="work">
          <el-input v-model="effortForm.work" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="effortOpen = false">取消</el-button>
        <el-button type="primary" @click="submitEffort">记录</el-button>
      </template>
    </el-dialog>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="任务不存在" />
</template>
