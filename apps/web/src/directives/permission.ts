import type { Directive } from 'vue';
import { usePermissionStore } from '../stores/permission.js';

/**
 * v-permission 按钮级权限控制（docs/05 §5.2 第三层）
 * 无权限点直接移除元素；权限点字符串必须 import 自 @zentao/shared（AGENTS §4）
 */
export const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const permission = usePermissionStore();
    if (!permission.has(binding.value)) {
      el.remove();
    }
  },
};
