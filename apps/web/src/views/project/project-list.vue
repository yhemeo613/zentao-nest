<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Plus } from 'lucide-vue-next';
import { projectApi } from '../../api/framework.js';
import { programApi } from '../../api/program.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusTag from '../../components/common/status-tag.vue';
import EmptyState from '../../components/common/empty-state.vue';
import Input from '../../components/ui/input.vue';
import Select from '../../components/ui/select.vue';
import Dialog from '../../components/ui/dialog.vue';
import { Button } from '../../components/ui/button.js';
import { useToast } from '../../composables/useToast.js';
import { describeError } from '../../lib/errors.js';

const toast = useToast();
const qc = useQueryClient();
const keyword = ref('');
const modelFilter = ref('');
const createOpen = ref(false);
const form = ref({
  name: '',
  code: '',
  model: 'scrum',
  begin: new Date().toISOString().slice(0, 10),
  end: '',
  multiple: 1,
  programId: '0',
});

const programsQuery = useQuery({ queryKey: ['programs'], queryFn: () => programApi.list() });
const query = useQuery({ queryKey: ['projects'], queryFn: () => projectApi.list() });

const programOptions = computed(() => [
  { label: '（独立项目）', value: '0' },
  ...(programsQuery.data.value ?? []).map((p) => ({ label: p.name, value: p.id })),
]);
const filtered = computed(() => {
  let list = query.data.value ?? [];
  if (modelFilter.value) list = list.filter((p) => p.model === modelFilter.value);
  if (keyword.value)
    list = list.filter((p) => p.name.includes(keyword.value) || p.code.includes(keyword.value));
  return list;
});

async function handleCreate(): Promise<void> {
  if (!form.value.name || !form.value.code || !form.value.end) {
    toast.error('请填写名称/编码/结束日期');
    return;
  }
  try {
    await projectApi.create({
      name: form.value.name,
      code: form.value.code,
      model: form.value.model,
      begin: form.value.begin,
      end: form.value.end,
      programId: Number(form.value.programId),
      multiple: form.value.multiple,
    });
    toast.success('创建成功（影子迭代自动创建）');
    createOpen.value = false;
    await qc.invalidateQueries({ queryKey: ['projects'] });
  } catch (error) {
    toast.error(describeError(error).message);
  }
}
</script>

<template>
  <PageHeader title="项目" description="管理模型（Scrum/瀑布/看板）· multiple=0 自动建影子迭代">
    <template #actions>
      <Button v-permission="'project.create'" @click="createOpen = true"
        ><Plus class="h-4 w-4" /> 新建项目</Button
      >
    </template>
  </PageHeader>

  <div class="mb-3 flex items-center gap-2">
    <Input v-model="keyword" placeholder="搜索名称/编码" class="max-w-xs" />
    <Select
      v-model="modelFilter"
      class="max-w-32"
      :options="[
        { label: '全部模型', value: '' },
        { label: 'Scrum', value: 'scrum' },
        { label: '瀑布', value: 'waterfall' },
        { label: '看板', value: 'kanban' },
      ]"
    />
  </div>

  <div v-if="query.isLoading.value" class="text-sm text-muted-foreground">加载中…</div>
  <EmptyState v-else-if="filtered.length === 0" message="暂无项目" />
  <div v-else class="overflow-hidden rounded-lg border border-border">
    <table class="w-full text-sm">
      <thead class="bg-muted/50 text-left text-muted-foreground">
        <tr>
          <th class="px-4 py-2">项目</th>
          <th class="px-4 py-2">编码</th>
          <th class="px-4 py-2">模型</th>
          <th class="px-4 py-2">状态</th>
          <th class="px-4 py-2">周期</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in filtered" :key="p.id" class="border-t border-border hover:bg-accent/50">
          <td class="px-4 py-2 font-medium">{{ p.name }}</td>
          <td class="px-4 py-2 text-muted-foreground">{{ p.code }}</td>
          <td class="px-4 py-2 text-muted-foreground">{{ p.model }}</td>
          <td class="px-4 py-2"><StatusTag entity="program" :status="p.status" /></td>
          <td class="px-4 py-2 text-xs text-muted-foreground">{{ p.begin }} ~ {{ p.end }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <Dialog v-model:open="createOpen" title="新建项目" width="520px">
    <div class="space-y-3 text-sm">
      <div>
        <label class="mb-1 block">名称</label><Input v-model="form.name" placeholder="项目名称" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block">编码（唯一）</label
          ><Input v-model="form.code" placeholder="如 EMS-P1" />
        </div>
        <div>
          <label class="mb-1 block">管理模型</label>
          <Select
            v-model="form.model"
            :options="[
              { label: 'Scrum', value: 'scrum' },
              { label: '瀑布', value: 'waterfall' },
              { label: '看板', value: 'kanban' },
            ]"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block">开始日期</label><Input v-model="form.begin" type="date" />
        </div>
        <div>
          <label class="mb-1 block">结束日期</label><Input v-model="form.end" type="date" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block">所属项目集</label>
          <Select v-model="form.programId" :options="programOptions" />
        </div>
        <div>
          <label class="mb-1 block">多执行</label>
          <Select
            v-model="form.multiple"
            :options="[
              { label: '是', value: 1 },
              { label: '否（自动建影子迭代）', value: 0 },
            ]"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <Button variant="outline" @click="createOpen = false">取消</Button>
      <Button @click="handleCreate">创建</Button>
    </template>
  </Dialog>
</template>
