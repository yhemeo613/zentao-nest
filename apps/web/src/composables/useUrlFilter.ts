import { ref, watch, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * 筛选状态 ↔ URL query 双向同步（禅道风格基线 docs/10 §6.2：筛选可分享/刷新保持）。
 * cast 负责把字符串还原为目标类型（undefined 表示清除）。
 */
export function useUrlFilter<T>(key: string, fallback: T, cast: (raw: string) => T): Ref<T> {
  const route = useRoute();
  const router = useRouter();
  const value = ref<T>(
    route.query[key] != null ? cast(String(route.query[key])) : fallback,
  ) as Ref<T>;

  watch(value, (v) => {
    const query = { ...route.query };
    if (v == null || v === '') delete query[key];
    else query[key] = String(v);
    void router.replace({ query });
  });

  return value;
}
