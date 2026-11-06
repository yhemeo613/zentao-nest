<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { PERMS } from '@zentao/shared';
import { configApi } from '../../api/config.js';
import { describeError } from '../../lib/errors.js';
import PageHeader from '../../components/common/page-header.vue';

// 运行时配置（批量编辑统一保存；只读键由后端 5503 拦截，前端如实报错）
const queryClient = useQueryClient();
const saving = ref(false);

const query = useQuery({ queryKey: ['configs'], queryFn: () => configApi.list() });

/** 本地草稿值（key = id） */
const drafts = reactive<Record<string, string>>({});

const rows = computed(() => query.data.value ?? []);
const moduleFilter = ref('all');
const modules = computed(() => Array.from(new Set(rows.value.map((r) => r.module))));
const filtered = computed(() =>
  moduleFilter.value === 'all'
    ? rows.value
    : rows.value.filter((r) => r.module === moduleFilter.value),
);

/** 相对原值发生变化的项 */
const changedItems = computed(() =>
  rows.value
    .filter((r) => drafts[r.id] !== undefined && drafts[r.id] !== (r.value ?? ''))
    .map((r) => ({ module: r.module, section: r.section, key: r.keyName, value: drafts[r.id] })),
);

async function saveAll(): Promise<void> {
  if (changedItems.value.length === 0) return;
  saving.value = true;
  try {
    const changed = await configApi.setMany(changedItems.value);
    ElMessage.success(`已更新 ${changed} 项配置（即时生效）`);
    void queryClient.invalidateQueries({ queryKey: ['configs'] });
  } catch (error) {
    ElMessage.error(describeError(error).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader title="配置" description="运行时配置批量编辑；保存后即时生效（缓存同步失效）">
      <template #actions>
        <el-button
          v-permission="PERMS.config.manage"
          type="primary"
          :disabled="changedItems.length === 0"
          :loading="saving"
          @click="saveAll"
        >
          保存变更（{{ changedItems.length }}）
        </el-button>
      </template>
    </PageHeader>

    <div class="mb-3">
      <el-radio-group v-model="moduleFilter">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button v-for="m in modules" :key="m" :value="m">{{ m }}</el-radio-button>
      </el-radio-group>
    </div>

    <el-table
      v-loading="query.isLoading.value"
      :data="filtered"
      size="small"
      class="table-hairline"
      empty-text="暂无配置"
    >
      <el-table-column label="模块" width="110">
        <template #default="{ row }"
          ><el-tag size="small" effect="plain">{{ row.module }}</el-tag></template
        >
      </el-table-column>
      <el-table-column label="分组" width="110">
        <template #default="{ row }"
          ><span class="num">{{ row.section }}</span></template
        >
      </el-table-column>
      <el-table-column label="配置键" min-width="180">
        <template #default="{ row }"
          ><span class="num">{{ row.keyName }}</span></template
        >
      </el-table-column>
      <el-table-column label="值" min-width="280">
        <template #default="{ row }">
          <el-input v-model="drafts[row.id]" size="small" :placeholder="row.value ?? ''" />
        </template>
      </el-table-column>
    </el-table>
    <p class="mt-2 text-xs text-muted-foreground">
      共 {{ rows.length }} 项；编辑后点右上「保存变更」统一提交（只读键会被后端拒绝并如实提示）。
    </p>
  </div>
</template>
