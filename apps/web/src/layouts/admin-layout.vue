<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import { Fold, Expand, ArrowDown } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { navGroups, resolveActiveGroup } from '../config/menus.js';
import { useAppStore } from '../stores/app.js';
import { useAuthStore } from '../stores/auth.js';
import { usePermissionStore } from '../stores/permission.js';
import GlobalSearch from '../components/common/global-search.vue';
import NotificationBell from '../components/common/notification-bell.vue';
import { closeSocket } from '../lib/socket.js';

// 双导航布局（禅道式，docs/10 §6.1）：顶部主导航换语境 + 墨色侧栏换页面 + 多页签内容区
const app = useAppStore();
const auth = useAuthStore();
const permission = usePermissionStore();
const route = useRoute();
const router = useRouter();

const activeGroup = computed(() => resolveActiveGroup(route.path));

/** 顶部导航项：组内任一子项可见即显示 */
const visibleGroups = computed(() =>
  navGroups.filter(
    (g) => g.key === 'my' || g.items.some((i) => !i.permission || permission.has(i.permission)),
  ),
);

const visibleSideItems = computed(() =>
  activeGroup.value.items.filter((i) => !i.permission || permission.has(i.permission)),
);

/** 路由 → 页签登记（多页签内容区，docs/10 §1） */
watch(
  () => route.fullPath,
  () => {
    if (route.name === 'login' || route.name === 'forbidden') return;
    const title = (route.meta.title as string | undefined) ?? String(route.name ?? '');
    app.openTab({ name: String(route.name), title, path: route.fullPath });
  },
  { immediate: true },
);

function handleTabClick(name: string | number): void {
  const tab = app.openedTabs.find((t) => t.name === name);
  if (tab && route.fullPath !== tab.path) void router.push(tab.path);
}

function handleTabRemove(name: string | number): void {
  const target = app.closeTab(String(name));
  if (target) void router.push(target);
}

async function handleLogout(): Promise<void> {
  closeSocket();
  await auth.logout();
  ElMessage.success('已退出登录');
  void router.push({ name: 'login' });
}
</script>

<template>
  <el-container class="h-dvh overflow-hidden">
    <!-- 墨色侧栏：当前语境的子菜单 -->
    <el-aside :width="app.sidebarCollapsed ? '64px' : '176px'" class="aside-dark">
      <div class="flex h-12 items-center border-b border-white/10 px-4">
        <span class="num text-sm font-semibold tracking-wide text-zinc-100">
          {{ app.sidebarCollapsed ? 'Z' : 'ztn' }}
        </span>
      </div>
      <el-scrollbar>
        <el-menu
          :default-active="route.path"
          :collapse="app.sidebarCollapsed"
          :collapse-transition="false"
          router
          background-color="#16181d"
          text-color="#a3a6ad"
          active-text-color="#5eead4"
          class="aside-menu"
        >
          <el-menu-item v-for="item in visibleSideItems" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
      <div
        class="flex h-10 shrink-0 cursor-pointer items-center gap-2 border-t border-white/10 px-4 text-zinc-500 hover:text-zinc-300"
        @click="app.toggleSidebar()"
      >
        <el-icon><Fold v-if="!app.sidebarCollapsed" /><Expand v-else /></el-icon>
        <span v-if="!app.sidebarCollapsed" class="text-xs">收起侧栏</span>
      </div>
    </el-aside>

    <el-container class="min-w-0">
      <!-- 顶部主导航（换语境） -->
      <el-header class="topnav" height="44px">
        <nav class="flex items-center gap-1">
          <RouterLink
            v-for="group in visibleGroups"
            :key="group.key"
            :to="group.items[0].path"
            class="topnav-item"
            :class="{ 'is-active': activeGroup.key === group.key }"
          >
            {{ group.label }}
          </RouterLink>
        </nav>
        <div class="flex items-center gap-4 text-[13px]">
          <NotificationBell />
          <GlobalSearch />
          <template v-if="auth.isLoggedIn">
            <el-dropdown @command="(cmd: string) => cmd === 'logout' && handleLogout()">
              <span class="cursor-pointer text-foreground/80">
                {{ auth.user?.realname ?? auth.user?.account }}
                <el-icon class="align-middle"><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </div>
      </el-header>

      <!-- 多页签（对齐禅道页签体验） -->
      <el-tabs
        v-model="app.activeTab"
        type="card"
        class="layout-tabs"
        @tab-change="handleTabClick"
        @tab-remove="handleTabRemove"
      >
        <el-tab-pane
          v-for="tab in app.openedTabs"
          :key="tab.name"
          :label="tab.title"
          :name="tab.name"
          :closable="tab.name !== 'dashboard'"
        />
      </el-tabs>

      <el-main class="p-4">
        <RouterView v-slot="{ Component }">
          <Transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.aside-dark {
  display: flex;
  flex-direction: column;
  background-color: #16181d;
  transition: width 0.2s ease;
}
.aside-menu {
  border-right: none;
  flex: 1;
}
.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  padding: 0 16px;
}
.topnav-item {
  position: relative;
  padding: 0 14px;
  line-height: 42px;
  font-size: 13.5px;
  color: var(--muted-foreground);
  transition: color 0.15s ease;
}
.topnav-item:hover {
  color: var(--foreground);
}
.topnav-item.is-active {
  color: var(--primary);
  font-weight: 500;
}
.topnav-item.is-active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 2px;
  background: var(--primary);
}
.layout-tabs {
  --el-tabs-header-height: 34px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  padding: 0 12px;
}
.layout-tabs :deep(.el-tabs__item) {
  font-size: 12.5px;
  height: 30px;
  line-height: 30px;
}
.layout-tabs :deep(.el-tabs__item.is-active) {
  color: var(--primary);
}
.page-fade-enter-active,
.page-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-fade-leave-to {
  opacity: 0;
}
</style>
