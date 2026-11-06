<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Plus } from '@element-plus/icons-vue';
import { PERMS, BugStatus } from '@zentao/shared';
import { bugApi } from '../../api/bug.js';
import { useUrlFilter } from '../../composables/useUrlFilter.js';
import { productApi } from '../../api/product.js';
import { usePagination } from '../../composables/usePagination.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusDot from '../../components/common/status-dot.vue';
import BugCreateDialog from '../../components/common/bug-create-dialog.vue';
import AssignCell from '../../components/common/assign-cell.vue';

// Bug 列表（active/resolved/closed 三态）
const router = useRouter();
const queryClient = useQueryClient();
// 筛选状态同步 URL（禅道基线，docs/10 §6.2）
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
      status: statusTab.value === 'all' ? undefined : statusTab.value,
      assignedTo: assignedTo.value || undefined,
    }),
});

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: BugStatus.Active, label: '激活' },
  { key: BugStatus.Resolved, label: '已解决' },
  { key: BugStatus.Closed, label: '已关闭' },
];

const paged = usePagination(
  computed(() => query.data.value ?? []),
  20,
);
</script>

<template>
  <div>
    <PageHeader title="Bug" description="激活 → 已解决 → 已关闭；重开计数在详情可见">
      <template #actions>
        <el-button
          v-permission="PERMS.bug.create"
          type="primary"
          :icon="Plus"
          @click="createOpen = true"
        >
          提 Bug
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <el-select v-model="productId" placeholder="按产品筛选" clearable filterable class="!w-60">
        <el-option
          v-for="p in products.data.value ?? []"
          :key="p.id"
          :value="p.id"
          :label="p.name"
        />
      </el-select>
      <el-radio-group v-model="statusTab">
        <el-radio-button v-for="tab in statusTabs" :key="tab.key" :value="tab.key">{{
          tab.label
        }}</el-radio-button>
      </el-radio-group>
      <el-input v-model="assignedTo" placeholder="按指派账号筛选" clearable class="!w-44" />
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="paged.paged.value"
      size="small"
      class="table-hairline"
      empty-text="暂无 Bug"
    >
      <el-table-column label="ID" width="70">
        <template #default="{ row }">
          <span class="num cursor-pointer text-primary" @click="router.push(`/bugs/${row.id}`)"
            >#{{ row.id }}</span
          >
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusDot entity="bug" :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="严重度" width="80">
        <template #default="{ row }"
          ><span class="num">S{{ row.severity }}</span></template
        >
      </el-table-column>
      <el-table-column label="优先级" width="70">
        <template #default="{ row }"
          ><span class="num">P{{ row.pri }}</span></template
        >
      </el-table-column>
      <el-table-column label="解决方案" width="100">
        <template #default="{ row }"
          ><span class="num">{{ row.resolution || '-' }}</span></template
        >
      </el-table-column>
      <el-table-column label="重开" width="70">
        <template #default="{ row }">
          <span class="num" :class="row.activatedCount > 0 ? 'text-destructive' : ''">{{
            row.activatedCount
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="指派给" width="120">
        <template #default="{ row }">
          <AssignCell
            v-permission="PERMS.bug.assign"
            :value="row.assignedTo"
            :root-type="row.executionId > 0 ? 'execution' : undefined"
            :root-id="row.executionId > 0 ? row.executionId : undefined"
            :save="(u: string) => bugApi.assign(row.id, u)"
            @success="() => queryClient.invalidateQueries({ queryKey: ['bugs'] })"
          />
        </template>
      </el-table-column>
      <el-table-column label="打开人" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.openedBy || '-' }}</span></template
        >
      </el-table-column>
      <template #empty>
        <el-empty :image-size="60" description="暂无 Bug">
          <el-button
            v-permission="PERMS.bug.create"
            type="primary"
            size="small"
            @click="createOpen = true"
            >提 Bug</el-button
          >
        </el-empty>
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="paged.page.value"
      v-model:page-size="paged.pageSize.value"
      :total="paged.total.value"
      layout="total, prev, pager, next, sizes"
      class="mt-3"
      small
    />

    <BugCreateDialog v-model:open="createOpen" />
  </div>
</template>
