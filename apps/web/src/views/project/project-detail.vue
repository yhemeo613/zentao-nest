<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { projectApi } from '../../api/project.js';
import { executionApi } from '../../api/execution.js';
import { productApi } from '../../api/product.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import { describeError } from '../../lib/errors.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import TeamPanel from '../../components/common/team-panel.vue';
import ActionLogPanel from '../../components/common/action-log.vue';

// 项目详情：概览 / 关联产品 / 执行 / 团队（docs/10 §4）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const projectId = computed(() => Number(route.params.id));
const activeTab = ref('overview');

const detail = useQuery({
  queryKey: ['projects', projectId.value],
  queryFn: () => projectApi.get(projectId.value),
  enabled: computed(() => Number.isFinite(projectId.value) && projectId.value > 0),
});
const linkedProducts = useQuery({
  queryKey: ['projects', projectId.value, 'products'],
  queryFn: () => projectApi.listProducts(projectId.value),
  enabled: detail.isEnabled,
});
const allProducts = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const executions = useQuery({
  queryKey: ['executions', projectId.value],
  queryFn: () => executionApi.list(projectId.value),
  enabled: detail.isEnabled,
});

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['projects'] })];

const actions = computed<ToolbarAction[]>(() => {
  const p = detail.data.value;
  if (!p) return [];
  const list: ToolbarAction[] = [];
  const t = (
    key: 'start' | 'suspend' | 'close' | 'activate',
    label: string,
    perm: string,
    type: ToolbarAction['type'],
  ) =>
    list.push({
      key,
      label,
      permission: perm,
      type,
      run: () =>
        confirmAction({
          title: label,
          message: `确定${label}项目「${p.name}」吗？`,
          run: () => projectApi.transition(p.id, key, key === 'close' ? 'done' : undefined),
          successMsg: `${label}成功`,
          invalidate,
        }),
    });
  if (p.status === 'wait') t('start', '启动', PERMS.project.start, 'primary');
  if (p.status === 'doing') {
    t('suspend', '挂起', PERMS.project.suspend, 'warning');
    t('close', '关闭', PERMS.project.close, 'danger');
  }
  if (p.status === 'suspended') {
    t('activate', '激活', PERMS.project.activate, 'primary');
    t('close', '关闭', PERMS.project.close, 'danger');
  }
  if (p.status === 'closed') t('activate', '激活', PERMS.project.activate, 'primary');
  return list;
});

// ---- 关联产品（PUT 全量替换语义） ----
const productSaving = ref(false);
const selectedProductIds = ref<number[]>([]);
const productOptions = computed(() =>
  (allProducts.data.value ?? []).map((p) => ({ id: p.id, name: p.name })),
);

const linkedIds = computed(
  () => new Set((linkedProducts.data.value ?? []).map((r) => r.productId)),
);

/** 已关联产品回显到选择器 */
watch(linkedProducts.data, (rows) => {
  selectedProductIds.value = (rows ?? []).map((r) => r.productId);
});

async function saveProducts(): Promise<void> {
  productSaving.value = true;
  try {
    await projectApi.setProducts(
      projectId.value,
      selectedProductIds.value.map((id) => ({ productId: String(id) })),
    );
    ElMessage.success('关联已更新');
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId.value, 'products'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    productSaving.value = false;
  }
}

function openExecution(id: number): void {
  void router.push(`/executions/${id}`);
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <el-breadcrumb class="mb-1">
      <el-breadcrumb-item :to="{ path: '/projects' }">项目</el-breadcrumb-item>
      <el-breadcrumb-item>{{ '#' + detail.data.value.id }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-button link @click="router.push('/projects')"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <h1 class="text-lg font-semibold">{{ detail.data.value.name }}</h1>
        <StatusTag entity="project" :status="detail.data.value.status" />
        <el-tag size="small" effect="plain">{{ detail.data.value.model }}</el-tag>
        <span v-if="detail.data.value.multiple === 0" class="text-xs text-muted-foreground"
          >单执行（影子迭代）</span
        >
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="概览" name="overview">
        <div class="grid max-w-2xl grid-cols-3 gap-3">
          <div class="border border-border bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground">进度</div>
            <div class="num mt-1 text-xl font-semibold">
              {{ detail.data.value.progress || '-' }}
            </div>
          </div>
          <div class="border border-border bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground">工时 消耗/剩余</div>
            <div class="num mt-1 text-xl font-semibold">
              {{ detail.data.value.consumed }} / {{ detail.data.value.left }}
            </div>
          </div>
          <div class="border border-border bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground">项目经理</div>
            <div class="num mt-1 text-xl font-semibold">{{ detail.data.value.pmId || '-' }}</div>
          </div>
        </div>
        <el-descriptions :column="2" border size="small" class="mt-4">
          <el-descriptions-item label="编码"
            ><span class="num">{{ detail.data.value.code }}</span></el-descriptions-item
          >
          <el-descriptions-item label="起止">
            <span class="num"
              >{{ detail.data.value.begin || '-' }} ~ {{ detail.data.value.end || '-' }}</span
            >
          </el-descriptions-item>
          <el-descriptions-item label="实际开始"
            ><span class="num">{{ detail.data.value.realBegan || '-' }}</span></el-descriptions-item
          >
          <el-descriptions-item label="关闭原因">{{
            detail.data.value.closedReason === 'done'
              ? '完成'
              : detail.data.value.closedReason === 'cancel'
                ? '取消'
                : '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            <div class="whitespace-pre-wrap">{{ detail.data.value.desc || '-' }}</div>
          </el-descriptions-item>
        </el-descriptions>
        <ActionLogPanel class="mt-4" object-type="project" :object-id="projectId" />
      </el-tab-pane>

      <el-tab-pane label="关联产品" name="products">
        <div class="max-w-xl space-y-3">
          <el-select
            v-model="selectedProductIds"
            multiple
            filterable
            placeholder="选择要关联的产品"
            class="!w-full"
          >
            <el-option
              v-for="opt in productOptions"
              :key="opt.id"
              :value="opt.id"
              :label="opt.name"
            />
          </el-select>
          <div>
            <el-button
              v-permission="PERMS.project.manageProducts"
              type="primary"
              size="small"
              :loading="productSaving"
              @click="saveProducts"
              >保存关联（全量替换）</el-button
            >
          </div>
          <el-table
            :data="linkedProducts.data.value ?? []"
            size="small"
            class="table-hairline"
            empty-text="暂未关联产品"
          >
            <el-table-column label="产品" min-width="200">
              <template #default="{ row }">{{ row.productName ?? row.productId }}</template>
            </el-table-column>
            <el-table-column label="产品ID" width="90">
              <template #default="{ row }"
                ><span class="num">{{ row.productId }}</span></template
              >
            </el-table-column>
          </el-table>
          <p class="text-xs text-muted-foreground">
            当前已关联 {{ linkedIds.size }} 个产品；保存会整体替换关联关系。
          </p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="执行" name="executions">
        <el-table
          :data="executions.data.value ?? []"
          size="small"
          class="table-hairline"
          empty-text="暂无执行"
        >
          <el-table-column label="名称" min-width="200">
            <template #default="{ row }">
              <span class="cursor-pointer text-primary" @click="openExecution(row.id)">{{
                row.name
              }}</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="90">
            <template #default="{ row }"
              ><el-tag size="small" effect="plain">{{ row.type }}</el-tag></template
            >
          </el-table-column>
          <el-table-column label="起止" width="180">
            <template #default="{ row }"
              ><span class="num">{{ row.begin || '-' }} ~ {{ row.end || '-' }}</span></template
            >
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"
              ><StatusTag entity="execution" :status="row.status"
            /></template>
          </el-table-column>
        </el-table>
        <p class="mt-2 text-xs text-muted-foreground">
          新建执行请前往
          <el-link type="primary" :underline="false" @click="router.push('/executions')"
            >执行列表</el-link
          >
          （须选择所属项目）。
        </p>
      </el-tab-pane>

      <el-tab-pane label="团队" name="team">
        <TeamPanel root-type="project" :root-id="projectId" />
      </el-tab-pane>
    </el-tabs>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="项目不存在" />
</template>
