<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Plus } from 'lucide-vue-next';
import { productApi } from '../../api/framework.js';
import PageHeader from '../../components/common/page-header.vue';
import StatusTag from '../../components/common/status-tag.vue';
import EmptyState from '../../components/common/empty-state.vue';
import Input from '../../components/ui/input.vue';
import Dialog from '../../components/ui/dialog.vue';
import { Button } from '../../components/ui/button.js';
import { useToast } from '../../composables/useToast.js';
import { describeError } from '../../lib/errors.js';

const toast = useToast();
const qc = useQueryClient();
const keyword = ref('');
const createOpen = ref(false);
const form = ref({ name: '', code: '' });

const query = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const filtered = computed(() => {
  const list = query.data.value ?? [];
  if (!keyword.value) return list;
  return list.filter((p) => p.name.includes(keyword.value) || p.code.includes(keyword.value));
});

async function handleCreate(): Promise<void> {
  if (!form.value.name) {
    toast.error('请填写产品名称');
    return;
  }
  try {
    await productApi.create({ name: form.value.name, code: form.value.code });
    toast.success('创建成功');
    createOpen.value = false;
    form.value = { name: '', code: '' };
    await qc.invalidateQueries({ queryKey: ['products'] });
  } catch (error) {
    toast.error(describeError(error).message);
  }
}
</script>

<template>
  <PageHeader title="产品" description="需求池/计划/发布的归属载体">
    <template #actions>
      <Button v-permission="'product.create'" @click="createOpen = true"
        ><Plus class="h-4 w-4" /> 新建产品</Button
      >
    </template>
  </PageHeader>

  <div class="mb-3"><Input v-model="keyword" placeholder="搜索名称/编码" class="max-w-xs" /></div>

  <div v-if="query.isLoading.value" class="text-sm text-muted-foreground">加载中…</div>
  <EmptyState v-else-if="filtered.length === 0" message="暂无产品" />
  <div v-else class="overflow-hidden rounded-lg border border-border">
    <table class="w-full text-sm">
      <thead class="bg-muted/50 text-left text-muted-foreground">
        <tr>
          <th class="px-4 py-2">产品</th>
          <th class="px-4 py-2">编码</th>
          <th class="px-4 py-2">状态</th>
          <th class="px-4 py-2">负责人(PO)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in filtered" :key="p.id" class="border-t border-border hover:bg-accent/50">
          <td class="px-4 py-2 font-medium">{{ p.name }}</td>
          <td class="px-4 py-2 text-muted-foreground">{{ p.code || '-' }}</td>
          <td class="px-4 py-2"><StatusTag entity="product" :status="p.status" /></td>
          <td class="px-4 py-2 text-muted-foreground">{{ p.poId || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <Dialog v-model:open="createOpen" title="新建产品">
    <div class="space-y-3 text-sm">
      <div>
        <label class="mb-1 block">名称</label><Input v-model="form.name" placeholder="产品名称" />
      </div>
      <div>
        <label class="mb-1 block">编码</label><Input v-model="form.code" placeholder="可选" />
      </div>
    </div>
    <template #footer>
      <Button variant="outline" @click="createOpen = false">取消</Button>
      <Button @click="handleCreate">创建</Button>
    </template>
  </Dialog>
</template>
