<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { PERMS, BugStatus, BugResolution } from '@zentao/shared';
import { bugApi } from '../../api/bug.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import MarkdownView from '../../components/common/markdown-view.vue';
import UserSelect from '../../components/common/user-select.vue';
import ActionLogPanel from '../../components/common/action-log.vue';
import { useEntityNames } from '../../composables/useEntityNames.js';

// Bug 详情：confirm/resolve/activate/close/assign/转需求 动作条（docs/02 §7）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const bugId = computed(() => Number(route.params.id));
const { productName } = useEntityNames();

const detail = useQuery({
  queryKey: ['bugs', bugId.value],
  queryFn: () => bugApi.get(bugId.value),
  enabled: computed(() => Number.isFinite(bugId.value) && bugId.value > 0),
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['bugs'] })];

const resolutionOptions = [
  { value: BugResolution.Fixed, label: '已修复（fixed）' },
  { value: BugResolution.ByDesign, label: '设计如此（bydesign）' },
  { value: BugResolution.Duplicate, label: '重复（duplicate）' },
  { value: BugResolution.External, label: '外部原因（external）' },
  { value: BugResolution.NotRepro, label: '无法重现（notrepro）' },
  { value: BugResolution.Postponed, label: '延期处理（postponed）' },
  { value: BugResolution.WillNotFix, label: '不予解决（willnotfix）' },
];

const actions = computed<ToolbarAction[]>(() => {
  const b = detail.data.value;
  if (!b) return [];
  const list: ToolbarAction[] = [];
  if (b.status === BugStatus.Active && !b.confirmed)
    list.push({
      key: 'confirm',
      label: '确认',
      permission: PERMS.bug.confirm,
      type: 'primary',
      run: () =>
        confirmAction({
          title: '确认 Bug',
          message: '确认后进入处理流程。',
          run: () => bugApi.confirm(b.id),
          invalidate,
        }),
    });
  if (b.status === BugStatus.Active)
    list.push({
      key: 'resolve',
      label: '解决',
      permission: PERMS.bug.resolve,
      type: 'success',
      run: () => (resolveOpen.value = true),
    });
  if (b.status === BugStatus.Active)
    list.push({
      key: 'toStory',
      label: '转需求',
      permission: PERMS.bug.create,
      run: () => (toStoryOpen.value = true),
    });
  if (b.status === BugStatus.Resolved)
    list.push({
      key: 'close',
      label: '关闭',
      permission: PERMS.bug.close,
      run: () =>
        confirmAction({
          title: '关闭 Bug',
          message: '关闭后验证结束。',
          run: () => bugApi.close(b.id),
          invalidate,
        }),
    });
  if (b.status !== BugStatus.Closed)
    list.push({
      key: 'activate',
      label: '重开',
      permission: PERMS.bug.activate,
      type: 'warning',
      run: () => (activateOpen.value = true),
    });
  list.push({
    key: 'assign',
    label: '指派',
    permission: PERMS.bug.assign,
    run: () => (assignOpen.value = true),
  });
  return list;
});

// ---- 解决弹窗 ----
const resolveOpen = ref(false);
const resolveFormRef = ref<FormInstance>();
const resolveForm = reactive({
  resolution: BugResolution.Fixed as string,
  resolvedBuildId: '',
  duplicateBugId: undefined as number | undefined,
  assignedTo: '',
});

const resolveRules: FormRules = {
  resolution: [{ required: true, message: '请选择解决方案', trigger: 'change' }],
  resolvedBuildId: [
    {
      validator: (_r, value: string, cb) => {
        if (resolveForm.resolution === BugResolution.Fixed && !value)
          cb(new Error('已修复必须填写解决构建（4801）'));
        else cb();
      },
      trigger: 'change',
    },
  ],
  duplicateBugId: [
    {
      validator: (_r, value: number | undefined, cb) => {
        if (resolveForm.resolution === BugResolution.Duplicate && !value)
          cb(new Error('重复 Bug 必须填写原 Bug ID'));
        else cb();
      },
      trigger: 'change',
    },
  ],
};

async function submitResolve(): Promise<void> {
  const valid = await resolveFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    await bugApi.resolve(bugId.value, {
      resolution: resolveForm.resolution as never,
      resolvedBuildId: resolveForm.resolvedBuildId || undefined,
      duplicateBugId: resolveForm.duplicateBugId,
      assignedTo: resolveForm.assignedTo || undefined,
    });
    ElMessage.success('已解决（指派回开单人验证）');
    resolveOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 重开弹窗 ----
const activateOpen = ref(false);
const activateForm = reactive({ openedBuild: '', assignedTo: '' });

async function submitActivate(): Promise<void> {
  if (!activateForm.openedBuild) {
    ElMessage.warning('重开必须填写发现构建（4803）');
    return;
  }
  try {
    await bugApi.activate(bugId.value, {
      openedBuild: activateForm.openedBuild,
      assignedTo: activateForm.assignedTo || undefined,
    });
    ElMessage.success('已重开（指派原解决人）');
    activateOpen.value = false;
    invalidate[0]();
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
    await bugApi.assign(bugId.value, assignTo.value);
    ElMessage.success('已指派');
    assignOpen.value = false;
    invalidate[0]();
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}

// ---- 转需求弹窗 ----
const toStoryOpen = ref(false);
const toStoryFormRef = ref<FormInstance>();
const toStoryForm = reactive({ title: '', spec: '', verify: '' });
const toStoryRules: FormRules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  spec: [{ required: true, message: '请填写需求描述', trigger: 'blur' }],
  verify: [{ required: true, message: '请填写验收标准', trigger: 'blur' }],
};

async function submitToStory(): Promise<void> {
  const valid = await toStoryFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    const story = await bugApi.convertToStory(bugId.value, { ...toStoryForm });
    ElMessage.success(`已转为需求 #${story.id}，Bug 关闭`);
    toStoryOpen.value = false;
    invalidate[0]();
    void router.push(`/stories/${story.id}`);
  } catch (error) {
    ElMessage.error(describeError(error).message);
  }
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <el-breadcrumb class="mb-1">
      <el-breadcrumb-item :to="{ path: '/bugs' }">Bug</el-breadcrumb-item>
      <el-breadcrumb-item>{{ '#' + detail.data.value.id }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <el-button link @click="router.push('/bugs')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <span class="num text-muted-foreground">#{{ detail.data.value.id }}</span>
        <h1 class="truncate text-lg font-semibold">{{ detail.data.value.title }}</h1>
        <StatusTag entity="bug" :status="detail.data.value.status" />
        <el-tag
          v-if="!detail.data.value.confirmed && detail.data.value.status === 'active'"
          size="small"
          type="warning"
          effect="plain"
        >
          待确认
        </el-tag>
        <el-tag
          v-if="detail.data.value.activatedCount > 0"
          size="small"
          type="danger"
          effect="plain"
        >
          重开 {{ detail.data.value.activatedCount }} 次
        </el-tag>
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 space-y-4">
        <div class="border border-border bg-card">
          <div class="border-b border-border px-4 py-2 text-sm font-medium">重现步骤</div>
          <div class="p-4"><MarkdownView :content="detail.data.value.steps || '（无）'" /></div>
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
        <el-descriptions-item label="严重程度"
          ><span class="num">S{{ detail.data.value.severity }}</span></el-descriptions-item
        >
        <el-descriptions-item label="优先级"
          ><span class="num">P{{ detail.data.value.pri }}</span></el-descriptions-item
        >
        <el-descriptions-item label="发现构建"
          ><span class="num">{{ detail.data.value.openedBuild }}</span></el-descriptions-item
        >
        <el-descriptions-item label="解决构建">
          <span class="num">{{ detail.data.value.resolvedBuildId || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="解决方案">
          {{
            resolutionOptions.find((o) => o.value === detail.data.value?.resolution)?.label ?? '-'
          }}
        </el-descriptions-item>
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
        <el-descriptions-item v-if="detail.data.value.toStoryId" label="转出需求">
          <el-link
            type="primary"
            :underline="false"
            @click="router.push(`/stories/${detail.data.value.toStoryId}`)"
          >
            <span class="num">#{{ detail.data.value.toStoryId }}</span>
          </el-link>
        </el-descriptions-item>
        <el-descriptions-item label="指派给"
          ><span class="num">{{ detail.data.value.assignedTo || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="打开人"
          ><span class="num">{{ detail.data.value.openedBy || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="解决人"
          ><span class="num">{{ detail.data.value.resolvedBy || '-' }}</span></el-descriptions-item
        >
        <el-descriptions-item label="关闭人"
          ><span class="num">{{ detail.data.value.closedBy || '-' }}</span></el-descriptions-item
        >
      </el-descriptions>
    </div>

    <ActionLogPanel object-type="bug" :object-id="bugId" />

    <!-- 解决弹窗 -->
    <el-dialog v-model="resolveOpen" title="解决 Bug" width="520px">
      <el-form ref="resolveFormRef" :model="resolveForm" :rules="resolveRules" label-width="100px">
        <el-form-item label="解决方案" prop="resolution">
          <el-select
            v-model="resolveForm.resolution"
            class="!w-full"
            @change="
              resolveForm.resolvedBuildId = '';
              resolveForm.duplicateBugId = undefined;
            "
          >
            <el-option
              v-for="opt in resolutionOptions"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="resolveForm.resolution === BugResolution.Fixed"
          label="解决构建"
          prop="resolvedBuildId"
        >
          <el-input v-model="resolveForm.resolvedBuildId" placeholder="构建 ID" class="!w-56" />
        </el-form-item>
        <el-form-item
          v-if="resolveForm.resolution === BugResolution.Duplicate"
          label="原 Bug ID"
          prop="duplicateBugId"
        >
          <el-input-number
            v-model="resolveForm.duplicateBugId"
            :min="1"
            :controls="false"
            class="!w-40"
          />
        </el-form-item>
        <el-form-item label="指派给">
          <UserSelect v-model="resolveForm.assignedTo" placeholder="默认回开单人" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveOpen = false">取消</el-button>
        <el-button type="success" @click="submitResolve">解决</el-button>
      </template>
    </el-dialog>

    <!-- 重开弹窗 -->
    <el-dialog v-model="activateOpen" title="重开 Bug" width="480px">
      <div class="space-y-3">
        <div>
          <div class="mb-1 text-xs text-muted-foreground">发现构建（必填，4803）</div>
          <el-input v-model="activateForm.openedBuild" placeholder="构建 ID" class="!w-56" />
        </div>
        <div>
          <div class="mb-1 text-xs text-muted-foreground">指派给（默认原解决人）</div>
          <UserSelect v-model="activateForm.assignedTo" />
        </div>
      </div>
      <template #footer>
        <el-button @click="activateOpen = false">取消</el-button>
        <el-button type="warning" @click="submitActivate">重开</el-button>
      </template>
    </el-dialog>

    <!-- 指派弹窗 -->
    <el-dialog v-model="assignOpen" title="指派 Bug" width="440px">
      <UserSelect v-model="assignTo" />
      <template #footer>
        <el-button @click="assignOpen = false">取消</el-button>
        <el-button type="primary" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>

    <!-- 转需求弹窗 -->
    <el-dialog v-model="toStoryOpen" title="Bug 转需求" width="640px">
      <el-form ref="toStoryFormRef" :model="toStoryForm" :rules="toStoryRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="toStoryForm.title" :placeholder="detail.data.value.title" />
        </el-form-item>
        <el-form-item label="需求描述" prop="spec">
          <el-input v-model="toStoryForm.spec" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="验收标准" prop="verify">
          <el-input v-model="toStoryForm.verify" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="toStoryOpen = false">取消</el-button>
        <el-button type="primary" @click="submitToStory">转换</el-button>
      </template>
    </el-dialog>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="Bug 不存在" />
</template>
