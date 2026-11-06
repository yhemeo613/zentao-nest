<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Plus } from 'lucide-vue-next';
import { executionApi, projectApi } from '../../api/framework.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusTag from '../../components/common/status-tag.vue';
import EmptyState from '../../components/common/empty-state.vue';
import Select from '../../components/ui/select.vue';
import Dialog from '../../components/ui/dialog.vue';
import Input from '../../components/ui/input.vue';
import { Button } from '../../components/ui/button.js';
import { useToast } from '../../composables/useToast.js';
import { describeError } from '../../lib/errors.js';

// 执行列表：按项目筛选（docs/03 §4.9）
const toast = useToast();
const qc = useQueryClient();
const projectIdFilter = ref('');
const createOpen = ref(false);
const form = ref({
  projectId: '',
  name: '',
  begin: new Date().toISOString().slice(0, 10),
  end: '',
  sprintGoal: '',
});

const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => projectApi.list() });
const projectOptions = computed(() =>
  (projectsQuery.data.value ?? []).map((p) => ({ label: p.name, value: p.id })),
);
const projectId = computed(() => projectIdFilter.value || projectOptions.value[0]?.value || '');

const query = useQuery({
  queryKey: ['executions', projectId],
  queryFn: () => executionApi.list(projectId.value),
  enabled: computed(() => !!projectId.value),
});

const filtered = computed(() => query.data.value ?? []);

async function handleCreate(): Promise<void> {
  if (!form.value.name || !form.value.end) {
    toast.error('请填写名称与结束日期');
    return;
  }
  try {
    await executionApi.create({ ...form.value, projectId: projectId.value });
    toast.success('创建成功');
    createOpen.value = false;
    await qc.invalidateQueries({ queryKey: ['executions'] });
  } catch (error) {
    toast.error(describeError(error).message);
  }
}
</script>

<template>
  <PageHeader title="执行" description="Scrum 迭代 / 瀑布阶段 / 看板（类型由项目模型决定）">
    <template #actions>
      <Button v-permission="'execution.create'" @click="createOpen = true"
        ><Plus class="h-4 w-4" /> 新建执行</Button
      >
    </template>
  </PageHeader>

  <div class="mb-3">
    <Select
      v-model="projectIdFilter"
      class="max-w-xs"
      :options="[{ label: '全部项目', value: '' }, ...projectOptions]"
    />
  </div>

  <div v-if="query.isLoading.value" class="text-sm text-muted-foreground">加载中…</div>
  <EmptyState v-else-if="filtered.length === 0" message="暂无执行" />
  <div v-else class="overflow-hidden rounded-lg border border-border">
    <table class="w-full text-sm">
      <thead class="bg-muted/50 text-left text-muted-foreground">
        <tr>
          <th class="px-4 py-2">执行</th>
          <th class="px-4 py-2">类型</th>
          <th class="px-4 py-2">状态</th>
          <th class="px-4 py-2">周期</th>
          <th class="px-4 py-2">冲刺目标</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in filtered" :key="e.id" class="border-t border-border hover:bg-accent/50">
          <td class="px-4 py-2 font-medium">{{ e.name }}</td>
          <td class="px-4 py-2 text-muted-foreground">{{ e.type }}</td>
          <td class="px-4 py-2"><StatusTag entity="execution" :status="e.status" /></td>
          <td class="px-4 py-2 text-xs text-muted-foreground">{{ e.begin }} ~ {{ e.end }}</td>
          <td class="px-4 py-2 text-muted-foreground">{{ e.sprintGoal || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <Dialog v-model:open="createOpen" title="新建执行" width="520px">
    <div class="space-y-3 text-sm">
      <div>
        <label class="mb-1 block">名称</label><Input v-model="form.name" placeholder="如：迭代一" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block">开始日期</label><Input v-model="form.begin" type="date" />
        </div>
        <div>
          <label class="mb-1 block">结束日期</label><Input v-model="form.end" type="date" />
        </div>
      </div>
      <div>
        <label class="mb-1 block">冲刺目标（可选）</label
        ><Input v-model="form.sprintGoal" placeholder="Scrum" />
      </div>
    </div>
    <template #footer>
      <Button variant="outline" @click="createOpen = false">取消</Button>
      <Button @click="handleCreate">创建</Button>
    </template>
  </Dialog>
</template>
