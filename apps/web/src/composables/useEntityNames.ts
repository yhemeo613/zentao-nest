import { useQuery } from '@tanstack/vue-query';
import { productApi } from '../api/product.js';
import { projectApi } from '../api/project.js';

/**
 * 实体名称解析（禅道基线 docs/10 §6.1：跨实体引用显示"名称 + ID"，不让用户记裸数字）。
 * products/projects 全局缓存（vue-query 跨页共享，60s 内不重发）。
 */
export function useEntityNames() {
  const products = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.list(),
    staleTime: 60_000,
  });
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
    staleTime: 60_000,
  });

  function productName(id: number | null | undefined): string | null {
    if (!id || id <= 0) return null;
    return (products.data.value ?? []).find((p) => p.id === id)?.name ?? null;
  }

  function projectName(id: number | null | undefined): string | null {
    if (!id || id <= 0) return null;
    return (projects.data.value ?? []).find((p) => p.id === id)?.name ?? null;
  }

  return { productName, projectName };
}
