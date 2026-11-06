<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, BugStatus } from '@zentao/shared';
import { bugApi, type BugVo } from '../../api/bug.js';
import { productApi } from '../../api/product.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { useAuthStore } from '../../stores/auth.js';
import { usePagination } from '../../composables/usePagination.js';
import { useUrlFilter } from '../../composables/useUrlFilter.js';
import { describeError } from '../../lib/errors.js';
import { fmtDate } from '../../lib/format.js';

import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';
import AssignCell from '../../components/common/assign-cell.vue';
import BugCreateDialog from '../../components/common/bug-create-dialog.vue';

// Bug 列表（复刻禅道 bug/browse：featureBar 页签 + 列序 + 行内操作，docs/10 §7）
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();

const castId = (raw: string): number | undefined => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const productId = useUrlFilter<number | undefined>('productId', undefined, castId);
const statusTab = useUrlFilter<string>('status', 'all', (raw) => raw);
const assignedTo = ref('');
const createOpen = ref(false);

const products = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const query = useQuery({
  queryKey: ['bugs', { productId, statusTab, assignedTo }],
  queryFn: () =>
    bugApi.list({
      productId: productId.value,
      status: [
        'all',
        'unclosed',
        'openedme',
        'assignedme',
        'resolvedme',
        'unconfirmed',
        'unassigned',
        'active',
        'resolved',
        'closed',
      ].includes(statusTab.value)
        ? undefined
        : statusTab.value,
      assignedTo: assignedTo.value || undefined,
    }),
});

/** 功能页签（禅道 featureBar；后端无对应筛选的页签前端过滤） */
const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'unclosed', label: '未关闭' },
  { key: 'openedme', label: '由我创建' },
  { key: 'assignedme', label: '指派给我' },
  { key: 'resolvedme', label: '由我解决' },
  { key: 'unconfirmed', label: '未确认' },
  { key: 'unassigned', label: '未指派' },
  { key: 'active', label: '激活' },
  { key: 'resolved', label: '已解决' },
  { key: 'closed', label: '已关闭' },
];

const me2 = computed(() => auth.user?.account ?? '');
const auth = useAuthStore();
const filtered = computed(() => {
  let list = query.data.value ?? [];
  const tab = statusTab.value;
  if (tab === 'unclosed') list = list.filter((b) => b.status !== 'closed');
  if (tab === 'openedme') list = list.filter((b) => b.openedBy === me2.value);
  if (tab === 'assignedme') list = list.filter((b) => b.assignedTo === me2.value);
  if (tab === 'resolvedme') list = list.filter((b) => b.resolvedBy === me2.value);
  if (tab === 'unconfirmed') list = list.filter((b) => b.status === 'active' && !b.confirmed);
  if (tab === 'unassigned') list = list.filter((b) => !b.assignedTo);
  return list;
});
const paged = usePagination(
  computed(() => filtered.value),
  20,
);

const severityType = (s: number): 'danger' | 'warning' | 'primary' | 'info' =>
  s === 1 ? 'danger' : s === 2 ? 'warning' : s === 3 ? 'primary' : 'info';

const resolutionLabels: Record<string, string> = {
  bydesign: '设计如此',
  duplicate: '重复',
  external: '外部原因',
  fixed: '已修复',
  notrepro: '无法重现',
  postponed: '延期处理',
  willnotfix: '不予解决',
  tostory: '转需求',
};

const editing = ref<BugVo | null>(null);
const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['bugs'] })];

/** 行内操作（禅道 menu=confirm,resolve,close|activate,edit + 指派/转需求；无编辑端点故砍编辑） */
function rowActions(
  b: BugVo,
): Array<{
  key: string;
  label: string;
  perm: string;
  type?: 'danger' | 'warning';
  run: () => void;
}> {
  const list: Array<{
    key: string;
    label: string;
    perm: string;
    type?: 'danger' | 'warning';
    run: () => void;
  }> = [];
  const push = (
    key: string,
    label: string,
    perm: string,
    open?: () => void,
    type?: 'danger' | 'warning',
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
  if (b.status === BugStatus.Active && !b.confirmed)
    push('confirm', '确认', PERMS.bug.confirm, undefined, undefined, () =>
      confirmAction({
        title: '确认 Bug',
        message: '确认后进入处理流程。',
        run: () => bugApi.confirm(b.id),
        invalidate,
      }),
    );
  if (b.status === BugStatus.Active)
    push('resolve', '解决', PERMS.bug.resolve, () => {
      editing.value = b;
      resolveOpen.value = true;
    });
  if (b.status === BugStatus.Active)
    push('toStory', '转需求', PERMS.bug.create, () => {
      editing.value = b;
      toStoryOpen.value = true;
    });
  if (b.status === BugStatus.Resolved)
    push('close', '关闭', PERMS.bug.close, undefined, undefined, () =>
      confirmAction({
        title: '关闭 Bug',
        message: '关闭后验证结束。',
        run: () => bugApi.close(b.id),
        invalidate,
      }),
    );
  if (b.status !== BugStatus.Closed)
    push(
      'activate',
      '激活',
      PERMS.bug.activate,
      () => {
        editing.value = b;
        activateOpen.value = true;
      },
      'warning',
    );
  push('assign', '指派', PERMS.bug.assign, () => {
    editing.value = b;
    assignOpen.value = true;
  });
  return list;
}

// ---- 解决弹窗 ----
const resolveOpen = ref(false);
const resolveFormRef = ref<FormInstance>();
const resolveForm = reactive({
  resolution: 'fixed',
  resolvedBuildId: '',
  duplicateBugId: undefined as number | undefined,
  assignedTo: '',
});

const resolveRules: FormRules = {
  resolution: [{ required: true, message: '请选择解决方案', trigger: 'change' }],
  resolvedBuildId: [
    {
      validator: (_r, value: string, cb) => {
        if (resolveForm.resolution === 'fixed' && !value)
          cb(new Error('已修复必须填写解决构建（4801）'));
        else cb();
      },
      trigger: 'change',
    },
  ],
  duplicateBugId: [
    {
      validator: (_r, value: number | undefined, cb) => {
        if (resolveForm.resolution === 'duplicate' && !value)
          cb(new Error('重复 Bug 必须填写原 Bug ID'));
        else cb();
      },
      trigger: 'change',
    },
  ],
};

const resolutionOptions = [
  { value: 'fixed', label: '已修复（fixed）' },
  { value: 'bydesign', label: '设计如此（bydesign）' },
  { value: 'duplicate', label: '重复（duplicate）' },
  { value: 'external', label: '外部原因（external）' },
  { value: 'notrepro', label: '无法重现（notrepro）' },
  { value: 'postponed', label: '延期处理（postponed）' },
  { value: 'willnotfix', label: '不予解决（willnotfix）' },
];

async function submitResolve(): Promise<void> {
  const valid = await resolveFormRef.value?.validate().catch(() => false);
  if (!valid || !editing.value) return;
  try {
    await bugApi.resolve(editing.value.id, {
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
  if (!editing.value) return;
  if (!activateForm.openedBuild) {
    ElMessage.warning('重开必须填写发现构建（4803）');
    return;
  }
  try {
    await bugApi.activate(editing.value.id, {
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
  if (!editing.value || !assignTo.value) {
    ElMessage.warning('请选择或输入账号');
    return;
  }
  try {
    await bugApi.assign(editing.value.id, assignTo.value);
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
  if (!editing.value) return;
  const valid = await toStoryFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    const story = await bugApi.convertToStory(editing.value.id, { ...toStoryForm });
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
  <div>
    <PageHeader
      title="Bug"
      description="全部 / 未关闭 / 由我创建 / 指派给我 / 由我解决 / 未确认 / 未指派 / 激活 / 已解决 / 已关闭"
    >
      <template #actions>
        <el-button
          v-permission="PERMS.bug.create"
          type="primary"
          :icon="Plus"
          @click="createOpen = true"
          >提Bug</el-button
        >
      </template>
    </PageHeader>

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
      <el-input v-model="assignedTo" placeholder="按指派账号筛选" clearable class="!w-44" />
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂时没有 Bug。"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }">
          <span class="num cursor-pointer text-primary" @click="router.push(`/bugs/${row.id}`)">{{
            row.id
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Bug标题" min-width="300" show-overflow-tooltip>
        <template #default="{ row }">
          <span
            class="cursor-pointer text-primary hover:underline"
            @click="router.push(`/bugs/${row.id}`)"
            >{{ row.title }}</span
          >
        </template>
      </el-table-column>
      <el-table-column label="严重程度" width="80">
        <template #default="{ row }">
          <el-tag :type="severityType(row.severity)" size="small" effect="plain" disable-transitions
            >S{{ row.severity }}</el-tag
          >
        </template>
      </el-table-column>
      <el-table-column label="P" width="56">
        <template #default="{ row }"
          ><span class="num">P{{ row.pri }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="bug" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="创建者" width="100">
        <template #default="{ row }"
          ><span class="num">{{ row.openedBy || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="创建日期" width="100">
        <template #default="{ row }"
          ><span class="num">{{ fmtDate(row.openedAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="确认" width="80">
        <template #default="{ row }">
          <span :class="row.confirmed ? 'text-muted-foreground' : 'text-destructive'">{{
            row.confirmed ? '已确认' : '未确认'
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="指派给" width="110">
        <template #default="{ row }">
          <AssignCell
            v-permission="PERMS.bug.assign"
            :value="row.assignedTo"
            :save="(u: string) => bugApi.assign(row.id, u)"
            @success="invalidate[0]"
          />
        </template>
      </el-table-column>
      <el-table-column label="解决方案" width="90">
        <template #default="{ row }">{{ resolutionLabels[row.resolution ?? ''] ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="200" fixed="right">
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
        <el-empty :image-size="60" description="暂时没有 Bug。">
          <el-button
            v-permission="PERMS.bug.create"
            type="primary"
            size="small"
            @click="createOpen = true"
            >提Bug</el-button
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

    <BugCreateDialog v-model:open="createOpen" />

    <!-- 解决弹窗 -->
    <el-dialog v-model="resolveOpen" :title="`解决 Bug #${editing?.id ?? ''}`" width="520px">
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
          v-if="resolveForm.resolution === 'fixed'"
          label="解决构建"
          prop="resolvedBuildId"
        >
          <el-input v-model="resolveForm.resolvedBuildId" placeholder="构建 ID" class="!w-56" />
        </el-form-item>
        <el-form-item
          v-if="resolveForm.resolution === 'duplicate'"
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
          <el-input v-model="resolveForm.assignedTo" placeholder="默认回开单人" class="!w-56" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveOpen = false">取消</el-button>
        <el-button v-permission="PERMS.bug.resolve" type="success" @click="submitResolve"
          >解决</el-button
        >
      </template>
    </el-dialog>

    <!-- 重开弹窗 -->
    <el-dialog v-model="activateOpen" :title="`重开 Bug #${editing?.id ?? ''}`" width="480px">
      <div class="space-y-3">
        <div>
          <div class="mb-1 text-xs text-muted-foreground">发现构建（必填，4803）</div>
          <el-input v-model="activateForm.openedBuild" placeholder="构建 ID" class="!w-56" />
        </div>
        <div>
          <div class="mb-1 text-xs text-muted-foreground">指派给（默认原解决人）</div>
          <el-input v-model="activateForm.assignedTo" placeholder="账号" class="!w-56" />
        </div>
      </div>
      <template #footer>
        <el-button @click="activateOpen = false">取消</el-button>
        <el-button v-permission="PERMS.bug.activate" type="warning" @click="submitActivate"
          >重开</el-button
        >
      </template>
    </el-dialog>

    <!-- 指派弹窗 -->
    <el-dialog v-model="assignOpen" :title="`指派 Bug #${editing?.id ?? ''}`" width="440px">
      <el-input v-model="assignTo" placeholder="账号" class="!w-64" />
      <template #footer>
        <el-button @click="assignOpen = false">取消</el-button>
        <el-button v-permission="PERMS.bug.assign" type="primary" @click="submitAssign"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 转需求弹窗 -->
    <el-dialog v-model="toStoryOpen" :title="`Bug 转需求 #${editing?.id ?? ''}`" width="640px">
      <el-form ref="toStoryFormRef" :model="toStoryForm" :rules="toStoryRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="toStoryForm.title" :placeholder="editing?.title" />
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
        <el-button v-permission="PERMS.bug.create" type="primary" @click="submitToStory"
          >转换</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>
