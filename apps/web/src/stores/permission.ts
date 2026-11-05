import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useAuthStore } from './auth.js';

/**
 * 权限点集合（docs/05 §5 三层控制的数据源）：
 * F0 阶段后端 /auth/me 未交付（P1），集合为空 → has() 恒 false（不放宽）。
 */
export const usePermissionStore = defineStore('permission', () => {
  const auth = useAuthStore();

  const permissionSet = computed(() => new Set(auth.permissions));

  /** 路由 meta / 菜单过滤 / v-permission 统一判定 */
  function has(permission: string | string[] | undefined): boolean {
    if (!permission) return true;
    const required = Array.isArray(permission) ? permission : [permission];
    // 任一满足即通过（'|' 语义由调用处用数组表达）
    return required.some((p) => permissionSet.value.has(p));
  }

  return { has };
});
