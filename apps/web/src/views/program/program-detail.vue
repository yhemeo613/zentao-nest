<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import dayjs from 'dayjs';
import { ArrowLeft } from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';
import { programApi } from '../../api/program.js';
import { productApi } from '../../api/product.js';
import { projectApi } from '../../api/project.js';
import { useConfirmAction } from '../../composables/useConfirmAction.js';
import StatusTag from '../../components/common/status-tag.vue';
import ActionToolbar, { type ToolbarAction } from '../../components/common/action-toolbar.vue';
import ActionLogPanel from '../../components/common/action-log.vue';

// 项目集详情：概览 + 计数 + 下级项目集/产品/项目（docs/10 §4）
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const confirmAction = useConfirmAction();
const programId = computed(() => Number(route.params.id));

const detail = useQuery({
  queryKey: ['programs', programId.value],
  queryFn: () => programApi.get(programId.value),
  enabled: computed(() => Number.isFinite(programId.value) && programId.value > 0),
});
const summary = useQuery({
  queryKey: ['programs', programId.value, 'summary'],
  queryFn: () => programApi.summary(programId.value),
  enabled: detail.isEnabled,
});
const allPrograms = useQuery({ queryKey: ['programs'], queryFn: () => programApi.list() });
const products = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const projects = useQuery({
  queryKey: ['projects', programId.value],
  queryFn: () => projectApi.list(programId.value),
  enabled: detail.isEnabled,
});

/** 下级项目集（parentId 直挂） */
const childPrograms = computed(() =>
  (allPrograms.data.value ?? []).filter((p) => p.parentId === programId.value),
);
const childProducts = computed(() =>
  (products.data.value ?? []).filter((p) => p.programId === programId.value),
);

const invalidate = [() => queryClient.invalidateQueries({ queryKey: ['programs'] })];

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
          message: `确定${label}项目集「${p.name}」吗？`,
          run: () => programApi.transition(p.id, key, key === 'close' ? 'done' : undefined),
          successMsg: `${label}成功`,
          invalidate,
        }),
    });
  if (p.status === 'wait') t('start', '启动', PERMS.program.start, 'primary');
  if (p.status === 'doing') {
    t('suspend', '挂起', PERMS.program.suspend, 'warning');
    t('close', '关闭', PERMS.program.close, 'danger');
  }
  if (p.status === 'suspended') {
    t('activate', '激活', PERMS.program.activate, 'primary');
    t('close', '关闭', PERMS.program.close, 'danger');
  }
  if (p.status === 'closed') t('activate', '激活', PERMS.program.activate, 'primary');
  return list;
});

function fmtDate(value: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD') : '-';
}
</script>

<template>
  <div v-if="detail.data.value" class="space-y-4">
    <el-breadcrumb class="mb-1">
      <el-breadcrumb-item :to="{ path: '/programs' }">项目集</el-breadcrumb-item>
      <el-breadcrumb-item>{{ '#' + detail.data.value.id }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-button link @click="router.push('/programs')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h1 class="text-lg font-semibold">{{ detail.data.value.name }}</h1>
        <StatusTag entity="program" :status="detail.data.value.status" />
        <span v-if="detail.data.value.closedReason" class="text-xs text-muted-foreground">
          关闭原因：{{ detail.data.value.closedReason === 'done' ? '完成' : '取消' }}
        </span>
      </div>
      <ActionToolbar :actions="actions" />
    </div>

    <!-- 概览计数 -->
    <div class="grid max-w-xl grid-cols-3 gap-3">
      <div class="border border-border bg-card p-4 text-center">
        <div class="text-xs text-muted-foreground">子项目集</div>
        <div class="num mt-1 text-xl font-semibold">
          {{ summary.data.value?.childPrograms ?? '-' }}
        </div>
      </div>
      <div class="border border-border bg-card p-4 text-center">
        <div class="text-xs text-muted-foreground">产品</div>
        <div class="num mt-1 text-xl font-semibold">{{ summary.data.value?.products ?? '-' }}</div>
      </div>
      <div class="border border-border bg-card p-4 text-center">
        <div class="text-xs text-muted-foreground">项目</div>
        <div class="num mt-1 text-xl font-semibold">{{ summary.data.value?.projects ?? '-' }}</div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <el-descriptions title="基本信息" :column="1" border size="small" class="col-span-2">
        <el-descriptions-item label="编码">
          <span class="num">{{ detail.data.value.code || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="负责人">
          <span class="num">{{ detail.data.value.pmId || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="预算">
          <span class="num">
            {{
              detail.data.value.budget != null
                ? `${detail.data.value.budget} ${detail.data.value.budgetUnit}`
                : '-'
            }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="计划起止">
          <span class="num">
            {{ fmtDate(detail.data.value.begin) }} ~ {{ fmtDate(detail.data.value.end) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="实际开始">
          <span class="num">{{ fmtDate(detail.data.value.realBegan) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="访问控制">
          {{
            detail.data.value.acl === 'open'
              ? '公开'
              : detail.data.value.acl === 'private'
                ? '私有'
                : '自定义白名单'
          }}
        </el-descriptions-item>
        <el-descriptions-item label="描述">
          <div class="whitespace-pre-wrap">{{ detail.data.value.desc || '-' }}</div>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 下级项目集 -->
    <div class="border border-border bg-card">
      <div class="border-b border-border px-4 py-2 text-sm font-medium">下级项目集</div>
      <el-table :data="childPrograms" size="small" class="table-hairline" empty-text="暂无">
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <span class="cursor-pointer text-primary" @click="router.push(`/programs/${row.id}`)">{{
              row.name
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><StatusTag entity="program" :status="row.status"
          /></template>
        </el-table-column>
        <el-table-column label="起止" width="190">
          <template #default="{ row }"
            ><span class="num">{{ fmtDate(row.begin) }} ~ {{ fmtDate(row.end) }}</span></template
          >
        </el-table-column>
      </el-table>
    </div>

    <ActionLogPanel object-type="program" :object-id="programId" />

    <div class="grid grid-cols-2 gap-4">
      <div class="border border-border bg-card">
        <div class="border-b border-border px-4 py-2 text-sm font-medium">下属产品</div>
        <el-table :data="childProducts" size="small" class="table-hairline" empty-text="暂无">
          <el-table-column label="名称" min-width="200">
            <template #default="{ row }">
              <span
                class="cursor-pointer text-primary"
                @click="router.push(`/products/${row.id}`)"
                >{{ row.name }}</span
              >
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"
              ><StatusTag entity="product" :status="row.status"
            /></template>
          </el-table-column>
        </el-table>
      </div>
      <div class="border border-border bg-card">
        <div class="border-b border-border px-4 py-2 text-sm font-medium">下属项目</div>
        <el-table
          :data="projects.data.value ?? []"
          size="small"
          class="table-hairline"
          empty-text="暂无"
        >
          <el-table-column label="名称" min-width="200">
            <template #default="{ row }">
              <span
                class="cursor-pointer text-primary"
                @click="router.push(`/projects/${row.id}`)"
                >{{ row.name }}</span
              >
            </template>
          </el-table-column>
          <el-table-column label="模型" width="90">
            <template #default="{ row }"
              ><span class="num">{{ row.model }}</span></template
            >
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"
              ><StatusTag entity="project" :status="row.status"
            /></template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
  <el-empty v-else-if="!detail.isLoading.value" description="项目集不存在" />
</template>
