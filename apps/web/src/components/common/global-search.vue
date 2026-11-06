<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { Search } from '@element-plus/icons-vue';
import { myApi, type MySearchResult } from '../../api/my.js';

/** 顶栏全局搜索（my/search 跨实体，docs/10 §6.1 禅道风格基线） */
const router = useRouter();
const keyword = ref('');
const open = ref(false);
const boxRef = ref<HTMLDivElement>();

const debounced = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
watch(keyword, (v) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    debounced.value = v.trim();
  }, 300);
});

const query = useQuery({
  queryKey: ['my-search', debounced],
  queryFn: () => myApi.search(debounced.value),
  enabled: computed(() => debounced.value.length > 0),
});

const TYPE_META: Array<{ key: keyof MySearchResult; label: string; path: (id: number) => string }> =
  [
    { key: 'story', label: '需求', path: (id) => `/stories/${id}` },
    { key: 'task', label: '任务', path: (id) => `/tasks/${id}` },
    { key: 'bug', label: 'Bug', path: (id) => `/bugs/${id}` },
    { key: 'case', label: '用例', path: (id) => `/cases/${id}` },
    { key: 'product', label: '产品', path: (id) => `/products/${id}` },
    { key: 'project', label: '项目', path: (id) => `/projects/${id}` },
    { key: 'execution', label: '执行', path: (id) => `/executions/${id}` },
  ];

const groups = computed(() =>
  TYPE_META.map((meta) => ({
    ...meta,
    items: (
      (query.data.value?.[meta.key] ?? []) as Array<{ id: number; title?: string; name?: string }>
    ).slice(0, 5),
  })).filter((g) => g.items.length > 0),
);

const total = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0));

function jump(path: string): void {
  open.value = false;
  keyword.value = '';
  void router.push(path);
}

function onBlur(): void {
  setTimeout(() => (open.value = false), 150);
}
</script>

<template>
  <div ref="boxRef" class="relative">
    <el-input
      v-model="keyword"
      placeholder="搜索 需求 / 任务 / Bug / 用例…"
      :prefix-icon="Search"
      clearable
      class="!w-64"
      @focus="open = true"
      @blur="onBlur"
    />
    <div
      v-if="open && debounced"
      class="absolute right-0 top-10 z-50 max-h-96 w-96 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-md"
    >
      <template v-if="total > 0">
        <div v-for="group in groups" :key="group.key" class="mb-1">
          <div class="px-3 py-1 text-xs text-muted-foreground">{{ group.label }}</div>
          <div
            v-for="item in group.items"
            :key="item.id"
            class="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent"
            @mousedown.prevent="jump(group.path(item.id))"
          >
            <span class="num mr-2 text-muted-foreground">#{{ item.id }}</span>
            <span>{{ item.title ?? item.name ?? '-' }}</span>
          </div>
        </div>
      </template>
      <div v-else class="px-3 py-4 text-center text-sm text-muted-foreground">无匹配结果</div>
    </div>
  </div>
</template>
