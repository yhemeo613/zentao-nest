<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { programApi } from '../../api/program.js';
import { productApi } from '../../api/framework.js';
import { projectApi } from '../../api/framework.js';
import StatusTag from '../../components/common/status-tag.vue';
import PageHeader from '../../components/common/page-header.vue';
import { useAuthStore } from '../../stores/auth.js';
import { useToast } from '../../composables/useToast.js';
import { describeError } from '../../lib/errors.js';
import { Button } from '../../components/ui/button.js';

// 项目集详情：下辖产品/项目 + 状态流转动作条（docs/03 §4.2）
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const qc = useQueryClient();
const id = route.params.id as string;

const programQuery = useQuery({
  queryKey: ['program', id],
  queryFn: () => programApi.get(id),
});
const summaryQuery = useQuery({
  queryKey: ['program-summary', id],
  queryFn: () => programApi.summary(id),
});
const productsQuery = useQuery({
  queryKey: ['products-of-program', id],
  queryFn: () => productApi.list(),
});
const projectsQuery = useQuery({
  queryKey: ['projects-of-program', id],
  queryFn: () => projectApi.list(id),
});

const program = computed(() => programQuery.data.value);
const products = computed(() =>
  (productsQuery.data.value ?? []).filter((p) => String(p.programId) === String(id)),
);
const projects = computed(() =>
  (projectsQuery.data.value ?? []).filter((p) => String(p.programId) === String(id)),
);

const acting = ref(false);
async function doAction(action: 'start' | 'suspend' | 'activate'): Promise<void> {
  acting.value = true;
  try {
    await programApi.transition(id, action);
    toast.success('操作成功');
    await qc.invalidateQueries({ queryKey: ['program', id] });
  } catch (error) {
    toast.error(describeError(error).message);
  } finally {
    acting.value = false;
  }
}

async function doClose(): Promise<void> {
  acting.value = true;
  try {
    await programApi.transition(id, 'close', 'done');
    toast.success('已关闭');
    await qc.invalidateQueries({ queryKey: ['program', id] });
  } catch (error) {
    toast.error(describeError(error).message);
  } finally {
    acting.value = false;
  }
}

function goBack(): void {
  void router.push('/programs');
}
void auth;
</script>

<template>
  <PageHeader :title="program?.name ?? '项目集详情'" :description="program?.desc ?? ''">
    <template #actions>
      <Button variant="outline" size="sm" @click="goBack">返回列表</Button>
      <Button
        v-if="program && ['wait', 'suspended'].includes(program.status)"
        size="sm"
        :disabled="acting"
        @click="doAction('start')"
        >开始</Button
      >
      <Button
        v-if="program?.status === 'doing'"
        size="sm"
        variant="secondary"
        :disabled="acting"
        @click="doAction('suspend')"
        >挂起</Button
      >
      <Button
        v-if="program && ['closed', 'suspended'].includes(program.status)"
        size="sm"
        :disabled="acting"
        @click="doAction('activate')"
        >激活</Button
      >
      <Button
        v-if="program && program.status !== 'closed'"
        size="sm"
        variant="destructive"
        :disabled="acting"
        @click="doClose"
        >关闭</Button
      >
    </template>
  </PageHeader>

  <div class="grid grid-cols-4 gap-3 text-sm">
    <div class="rounded-lg border border-border bg-card p-4">
      <div class="mb-1 text-muted-foreground">状态</div>
      <StatusTag v-if="program" entity="program" :status="program.status" />
    </div>
    <div class="rounded-lg border border-border bg-card p-4">
      <div class="mb-1 text-muted-foreground">下辖产品</div>
      <div>{{ summaryQuery.data.value?.products ?? '-' }}</div>
    </div>
    <div class="rounded-lg border border-border bg-card p-4">
      <div class="mb-1 text-muted-foreground">下辖项目</div>
      <div>{{ summaryQuery.data.value?.projects ?? '-' }}</div>
    </div>
    <div class="rounded-lg border border-border bg-card p-4">
      <div class="mb-1 text-muted-foreground">子项目集</div>
      <div>{{ summaryQuery.data.value?.childPrograms ?? '-' }}</div>
    </div>
  </div>

  <h2 class="mb-2 mt-6 text-base font-semibold">下辖产品</h2>
  <div class="overflow-hidden rounded-lg border border-border">
    <table class="w-full text-sm">
      <thead class="bg-muted/50 text-left text-muted-foreground">
        <tr>
          <th class="px-4 py-2">产品</th>
          <th class="px-4 py-2">编码</th>
          <th class="px-4 py-2">状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in products" :key="p.id" class="border-t border-border">
          <td class="px-4 py-2 font-medium">{{ p.name }}</td>
          <td class="px-4 py-2 text-muted-foreground">{{ p.code || '-' }}</td>
          <td class="px-4 py-2"><StatusTag entity="product" :status="p.status" /></td>
        </tr>
        <tr v-if="products.length === 0">
          <td colspan="3" class="px-4 py-4 text-center text-muted-foreground">暂无产品</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2 class="mb-2 mt-6 text-base font-semibold">下辖项目</h2>
  <div class="overflow-hidden rounded-lg border border-border">
    <table class="w-full text-sm">
      <thead class="bg-muted/50 text-left text-muted-foreground">
        <tr>
          <th class="px-4 py-2">项目</th>
          <th class="px-4 py-2">模型</th>
          <th class="px-4 py-2">状态</th>
          <th class="px-4 py-2">周期</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in projects" :key="p.id" class="border-t border-border">
          <td class="px-4 py-2 font-medium">{{ p.name }}</td>
          <td class="px-4 py-2 text-muted-foreground">{{ p.model }}</td>
          <td class="px-4 py-2"><StatusTag entity="program" :status="p.status" /></td>
          <td class="px-4 py-2 text-muted-foreground text-xs">{{ p.begin }} ~ {{ p.end }}</td>
        </tr>
        <tr v-if="projects.length === 0">
          <td colspan="4" class="px-4 py-4 text-center text-muted-foreground">暂无项目</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
