import { defineStore } from 'pinia';
import { ref } from 'vue';

/** 应用 UI 偏好（docs/05 §3 stores/app） */
export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false);
  /** 多页签（docs/05 AdminLayout 约定）——F1 接入真实页签历史 */
  const openedTabs = ref<{ name: string; title: string }[]>([]);

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  return { sidebarCollapsed, openedTabs, toggleSidebar };
});
