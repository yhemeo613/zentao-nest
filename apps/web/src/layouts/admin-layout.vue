<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { ArrowDown } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { navGroups, resolveActiveGroup } from '../config/menus.js';
import { useAppStore } from '../stores/app.js';
import { useAuthStore } from '../stores/auth.js';
import { usePermissionStore } from '../stores/permission.js';
import GlobalSearch from '../components/common/global-search.vue';
import NotificationBell from '../components/common/notification-bell.vue';
import { closeSocket } from '../lib/socket.js';

/**
 * 全局壳（复刻禅道 22.x，docs/10 §6）：
 * 顶部蓝主导航（模块语境）+ 深藏青侧栏（页面清单，选中蓝圆角块）+ 页签 + 内容区。
 */
const app = useAppStore();
const auth = useAuthStore();
const permission = usePermissionStore();
const route = useRoute();
const router = useRouter();

const activeGroup = computed(() => resolveActiveGroup(route.path));

/** 顶部主导航：组内任一子项可见即显示 */
const visibleGroups = computed(() =>
  navGroups.filter(
    (g) => g.key === 'my' || g.items.some((i) => !i.permission || permission.has(i.permission)),
  ),
);

/** 侧栏：全部组平铺（组间分隔线），权限过滤 */
const flatSideItems = computed(() =>
  navGroups
    .map((g) => ({
      key: g.key,
      items: g.items.filter((i) => !i.permission || permission.has(i.permission)),
    }))
    .filter((g) => g.items.length > 0),
);

const isActive = (path: string): boolean => {
  const first = '/' + (route.path.split('/')[1] ?? '');
  return first === path || route.path === path;
};

/** 路由 → 页签登记 */
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
  <div class="flex h-dvh flex-col overflow-hidden">
    <!-- 顶部蓝主导航（复刻禅道） -->
    <header class="topnav-blue">
      <RouterLink to="/dashboard" class="brand">
        <span class="brand-badge">Z</span>
        <span class="brand-name">禅道复刻</span>
      </RouterLink>
      <nav class="topnav-center">
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
      <div class="topnav-right">
        <NotificationBell />
        <GlobalSearch />
        <el-dropdown
          v-if="auth.isLoggedIn"
          @command="(cmd: string) => cmd === 'logout' && handleLogout()"
        >
          <span class="user-chip">
            <span class="user-avatar">{{
              (auth.user?.realname ?? auth.user?.account ?? '?').slice(0, 1)
            }}</span>
            <span class="user-name">{{ auth.user?.realname ?? auth.user?.account }}</span>
            <el-icon class="text-white/80"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <!-- 深藏青侧栏（页面清单） -->
      <aside class="sidebar" :class="app.sidebarCollapsed ? 'w-16' : 'w-36'">
        <nav class="flex-1 overflow-y-auto py-2">
          <template v-for="(group, gi) in flatSideItems" :key="group.key">
            <div v-if="gi > 0" class="mx-3 my-2 border-t border-white/10" />
            <RouterLink
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              class="side-item"
              :class="{ 'is-active': isActive(item.path) }"
              :title="app.sidebarCollapsed ? item.title : undefined"
            >
              <el-icon class="shrink-0"><component :is="item.icon" /></el-icon>
              <span v-if="!app.sidebarCollapsed" class="truncate">{{ item.title }}</span>
            </RouterLink>
          </template>
        </nav>
        <div
          class="flex h-9 shrink-0 cursor-pointer items-center gap-2 border-t border-white/10 px-4 text-zinc-400 hover:text-zinc-200"
          @click="app.toggleSidebar()"
        >
          <span class="num">{{ app.sidebarCollapsed ? '»' : '«' }}</span>
          <span v-if="!app.sidebarCollapsed" class="text-xs">收起</span>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <!-- 页签栏 -->
        <div class="layout-tabs">
          <div
            v-for="tab in app.openedTabs"
            :key="tab.name"
            class="layout-tab"
            :class="{ 'is-active': app.activeTab === tab.name }"
            @click="handleTabClick(tab.name)"
          >
            <span class="truncate">{{ tab.title }}</span>
            <span
              v-if="tab.name !== 'dashboard'"
              class="ml-1 text-muted-foreground hover:text-destructive"
              @click.stop="handleTabRemove(tab.name)"
              >×</span
            >
          </div>
        </div>

        <main class="min-h-0 flex-1 overflow-y-auto p-4">
          <RouterView v-slot="{ Component }">
            <Transition name="page-fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 顶部蓝主导航 */
.topnav-blue {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 46px;
  flex-shrink: 0;
  padding: 0 12px;
  background: var(--ztn-topnav);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 6px;
  border-radius: 6px;
  background: var(--ztn-topnav-deep);
}
.brand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgb(255 255 255 / 18%);
  color: #fff;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 13px;
}
.brand-name {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.topnav-center {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.topnav-item {
  padding: 5px 14px;
  border-radius: 6px;
  color: rgb(255 255 255 / 85%);
  font-size: 13.5px;
  transition: background 0.15s ease;
}
.topnav-item:hover {
  background: rgb(255 255 255 / 14%);
  color: #fff;
}
.topnav-item.is-active {
  background: #fff;
  color: var(--ztn-topnav);
  font-weight: 600;
}
.topnav-right {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgb(255 255 255 / 20%);
  color: #fff;
  font-size: 12px;
}
.user-name {
  color: #fff;
  font-size: 13px;
}
/* 深藏青侧栏 */
.sidebar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: var(--ztn-sidebar);
  transition: width 0.2s ease;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 8px;
  padding: 7px 10px;
  border-radius: 6px;
  color: rgb(255 255 255 / 72%);
  font-size: 13px;
  transition: background 0.12s ease;
}
.side-item:hover {
  background: var(--ztn-sidebar-hover);
  color: #fff;
}
.side-item.is-active {
  background: var(--ztn-topnav);
  color: #fff;
  font-weight: 500;
}
/* 页签栏 */
.layout-tabs {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  padding: 6px 12px 0;
  background: var(--background);
}
.layout-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 180px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #e8eaf0;
  color: var(--muted-foreground);
  font-size: 12.5px;
  cursor: pointer;
}
.layout-tab.is-active {
  background: var(--card);
  color: var(--foreground);
  font-weight: 500;
}
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.16s ease;
}
.page-fade-enter-from {
  opacity: 0;
}
.page-fade-leave-to {
  opacity: 0;
}
</style>
