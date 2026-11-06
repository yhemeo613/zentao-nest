import { defineStore } from 'pinia';
import { ref } from 'vue';

/** 页签（docs/10 §1 AdminLayout 多页签内容区；对齐禅道页签体验） */
export interface PageTab {
  name: string;
  title: string;
  path: string;
}

/** 应用 UI 偏好（docs/05 §3 stores/app） */
export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false);
  /** 首个页签=我的地盘，不可关闭 */
  const openedTabs = ref<PageTab[]>([{ name: 'dashboard', title: '我的地盘', path: '/dashboard' }]);
  const activeTab = ref('dashboard');

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  /** 路由进入时登记页签；已存在则激活 */
  function openTab(tab: PageTab): void {
    const exists = openedTabs.value.find((t) => t.name === tab.name);
    if (exists) {
      exists.path = tab.path;
    } else {
      openedTabs.value.push(tab);
    }
    activeTab.value = tab.name;
  }

  /** 关闭页签；若关闭的是激活页签则激活相邻页签，返回应跳转的 path（无变化返回 null） */
  function closeTab(name: string): string | null {
    const index = openedTabs.value.findIndex((t) => t.name === name);
    if (index < 0 || name === 'dashboard') return null;
    openedTabs.value.splice(index, 1);
    if (activeTab.value !== name) return null;
    const next = openedTabs.value[index] ?? openedTabs.value[index - 1];
    activeTab.value = next.name;
    return next.path;
  }

  return { sidebarCollapsed, openedTabs, activeTab, toggleSidebar, openTab, closeTab };
});
