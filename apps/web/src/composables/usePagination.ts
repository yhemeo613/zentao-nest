import { computed, ref, watch, type Ref } from 'vue';

/**
 * 客户端分页（后端列表端点为纯数组、200 条封顶，docs/03 §1 实测口径——2026-11-06 源码核实）。
 * 数据源变化自动回到第 1 页。
 */
export function usePagination<T>(source: Ref<T[]> | (() => T[]), defaultSize = 20) {
  const list = computed<T[]>(() => (typeof source === 'function' ? source() : source.value));
  const page = ref(1);
  const pageSize = ref(defaultSize);
  const total = computed(() => list.value.length);
  const paged = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return list.value.slice(start, start + pageSize.value);
  });
  watch(total, () => {
    if (page.value > 1 && (page.value - 1) * pageSize.value >= total.value) {
      page.value = Math.max(1, Math.ceil(total.value / pageSize.value));
    }
  });
  return { page, pageSize, total, paged };
}
