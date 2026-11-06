<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps<{ total: number; page: number; pageSize: number }>();
const emit = defineEmits<{ (e: 'change', v: { page: number; pageSize: number }): void }>();

const route = useRoute();
const router = useRouter();
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

function go(p: number): void {
  if (p < 1 || p > totalPages.value || p === props.page) return;
  emit('change', { page: p, pageSize: props.pageSize });
  // 筛选状态入 URL（docs/10 §3：可分享/刷新保持）
  const query = { ...route.query, page: String(p) };
  void router.replace({ query });
}
</script>

<template>
  <div
    v-if="total > 0"
    class="mt-4 flex items-center justify-between text-sm text-muted-foreground"
  >
    <span>共 {{ total }} 条</span>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="rounded-md border border-border px-2 py-1 hover:bg-accent disabled:opacity-40"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        上一页
      </button>
      <span class="px-2">{{ page }} / {{ totalPages }}</span>
      <button
        type="button"
        class="rounded-md border border-border px-2 py-1 hover:bg-accent disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="go(page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>
