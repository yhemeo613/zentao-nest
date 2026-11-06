<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { Plus } from 'lucide-vue-next';
import { programApi } from '../../api/program.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusTag from '../../components/common/status-tag.vue';
import EmptyState from '../../components/common/empty-state.vue';
import Input from '../../components/ui/input.vue';
import Dialog from '../../components/ui/dialog.vue';
import { Button } from '../../components/ui/button.js';
import { useToast } from '../../composables/useToast.js';
import { describeError } from '../../lib/errors.js';

// 项目集列表（树形扁平渲染：按 grade 缩进；F2 范围，docs/10 §4）

const toast = useToast();
const keyword = ref('');
const createOpen = ref(false);
const form = ref({ name: '', begin: today(), end: '', code: '' });

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const query = useQuery({
  queryKey: ['programs'],
  queryFn: () => programApi.list(),
});

const filtered = computed(() => {
  const list = query.data.value ?? [];
  if (!keyword.value) return list;
  return list.filter((p) => p.name.includes(keyword.value) || p.code.includes(keyword.value));
});

async function handleCreate(): Promise<void> {
  if (!form.value.name || !form.value.end) {
    toast.error('请填写名称与结束日期');
    return;
  }
  try {
    await programApi.create({
      name: form.value.name,
      code: form.value.code,
      begin: form.value.begin,
      end: form.value.end,
    });
    toast.success('创建成功');
    createOpen.value = false;
    form.value = { name: '', begin: today(), end: '', code: '' };
    await query.refetch();
  } catch (error) {
    toast.error(describeError(error).message);
  }
}

const router = useRouter();
function openDetail(id: string): void {
  void router.push(`/programs/${id}`);
}
watch(keyword, () => void 0);
const _route = useRoute();
void _route;
</script>

<template>
  <PageHeader title="项目集" description="统筹多项目、多产品与预算（v-permission: program.create）">
    <template #actions>
      <Button v-permission="'program.create'" @click="createOpen = true">
        <Plus class="h-4 w-4" /> 新建项目集
      </Button>
    </template>
  </PageHeader>

  <div class="mb-3 flex items-center gap-2">
    <Input v-model="keyword" placeholder="搜索名称/编码" class="max-w-xs" />
  </div>

  <div v-if="query.isLoading.value" class="text-sm text-muted-foreground">加载中…</div>
  <EmptyState v-else-if="filtered.length === 0" message="暂无项目集，点击右上角新建" />
  <div v-else class="overflow-hidden rounded-lg border border-border">
    <table class="w-full text-sm">
      <thead class="bg-muted/50 text-left text-muted-foreground">
        <tr>
          <th class="px-4 py-2">名称</th>
          <th class="px-4 py-2">编码</th>
          <th class="px-4 py-2">层级</th>
          <th class="px-4 py-2">周期</th>
          <th class="px-4 py-2">状态</th>
          <th class="px-4 py-2">预算</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in filtered"
          :key="p.id"
          class="cursor-pointer border-t border-border hover:bg-accent/50"
          @click="openDetail(p.id)"
        >
          <td
            class="px-4 py-2 font-medium"
            :style="{ paddingLeft: `${(p.grade - 1) * 24 + 16}px` }"
          >
            {{ p.name }}
          </td>
          <td class="px-4 py-2 text-muted-foreground">{{ p.code || '-' }}</td>
          <td class="px-4 py-2">L{{ p.grade }}</td>
          <td class="px-4 py-2 text-muted-foreground text-xs">{{ p.begin }} ~ {{ p.end }}</td>
          <td class="px-4 py-2"><StatusTag entity="program" :status="p.status" /></td>
          <td class="px-4 py-2 text-muted-foreground">
            {{ Number(p.budget) > 0 ? `${p.budget} ${p.budgetUnit}` : '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <Dialog v-model:open="createOpen" title="新建项目集">
    <div class="space-y-3 text-sm">
      <div>
        <label class="mb-1 block">名称</label>
        <Input v-model="form.name" placeholder="项目集名称" />
      </div>
      <div>
        <label class="mb-1 block">编码</label>
        <Input v-model="form.code" placeholder="可选" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block">开始日期</label>
          <Input v-model="form.begin" type="date" />
        </div>
        <div>
          <label class="mb-1 block">结束日期</label>
          <Input v-model="form.end" type="date" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button variant="outline" @click="createOpen = false">取消</Button>
      <Button @click="handleCreate">创建</Button>
    </template>
  </Dialog>
</template>
