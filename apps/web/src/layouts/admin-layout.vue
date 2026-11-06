<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import { ChevronDown } from 'lucide-vue-next';
import { menus } from '../config/menu.js';
import { useAppStore } from '../stores/app.js';
import { useAuthStore } from '../stores/auth.js';
import { usePermissionStore } from '../stores/permission.js';
import { useToast } from '../composables/useToast.js';
import ConfirmDialog from '../components/common/confirm-dialog.vue';
import ToastContainer from '../components/ui/toast-container.vue';

// 管理台布局：「精密仪表」——墨色侧栏 × 冷灰内容区，密度优先（docs/10 §1）
const app = useAppStore();
const auth = useAuthStore();
const permission = usePermissionStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

interface MenuNode {
  path: string;
  title: string;
  icon?: unknown;
  children?: MenuNode[];
}

const visibleMenus = computed<MenuNode[]>(() =>
  menus
    .filter((m) => !m.permission || permission.has(m.permission))
    .map((m) => ({
      path: m.path,
      title: m.title,
      icon: m.icon,
      children: m.children?.filter((c) => !c.permission || permission.has(c.permission)),
    })),
);

function isActive(item: { path: string; children?: { path: string }[] }): boolean {
  const first = '/' + (route.path.split('/')[1] ?? '');
  return (
    route.path === item.path ||
    item.path === first ||
    !!item.children?.some((c) => route.path === c.path || c.path === first)
  );
}

async function handleLogout(): Promise<void> {
  await auth.logout();
  toast.info('已退出登录');
  void router.push({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-dvh">
    <!-- 墨色侧栏：强分区（docs/10 设计方案 Layout 项） -->
    <aside
      class="flex shrink-0 flex-col bg-[#16181d] text-zinc-300 transition-all"
      :class="app.sidebarCollapsed ? 'w-14' : 'w-48'"
    >
      <div class="flex h-12 items-center border-b border-white/10 px-4">
        <span
          v-if="!app.sidebarCollapsed"
          class="num text-sm font-semibold tracking-wide text-zinc-100"
          >ztn</span
        >
        <span v-else class="num text-sm font-semibold text-zinc-100">Z</span>
      </div>
      <nav class="flex-1 overflow-y-auto py-2 text-[13px]">
        <template v-for="menu in visibleMenus" :key="menu.path">
          <template v-if="menu.children && menu.children.length">
            <div
              class="mt-3 px-4 py-1 text-[11px] uppercase tracking-wider text-zinc-500"
              :title="app.sidebarCollapsed ? menu.title : undefined"
            >
              <span v-if="!app.sidebarCollapsed">{{ menu.title }}</span>
            </div>
            <RouterLink
              v-for="child in menu.children"
              :key="child.path"
              :to="child.path"
              class="block border-l-2 px-4 py-1.5 transition-colors"
              :class="
                isActive(child)
                  ? 'border-teal-400 bg-white/10 text-zinc-50'
                  : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              "
              :title="app.sidebarCollapsed ? child.title : undefined"
            >
              <span v-if="!app.sidebarCollapsed">{{ child.title }}</span>
            </RouterLink>
          </template>
          <RouterLink
            v-else
            :to="menu.path"
            class="block border-l-2 px-4 py-1.5 transition-colors"
            :class="
              isActive(menu)
                ? 'border-teal-400 bg-white/10 text-zinc-50'
                : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            "
          >
            {{ menu.title }}
          </RouterLink>
        </template>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground"
            @click="app.toggleSidebar()"
          >
            ☰
          </button>
          <span class="text-sm text-muted-foreground">{{ route.meta.title ?? '' }}</span>
        </div>
        <div class="flex items-center gap-3 text-[13px]">
          <template v-if="auth.isLoggedIn">
            <span class="text-foreground/80">{{ auth.user?.realname ?? auth.user?.account }}</span>
            <div class="relative group">
              <button
                type="button"
                class="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronDown class="h-3.5 w-3.5" />
              </button>
              <div
                class="invisible absolute right-0 z-50 mt-1 w-28 rounded-md border border-border bg-card py-1 shadow-md group-hover:visible"
              >
                <button
                  type="button"
                  class="block w-full px-3 py-1.5 text-left hover:bg-accent"
                  @click="handleLogout"
                >
                  退出登录
                </button>
              </div>
            </div>
          </template>
          <RouterLink v-else :to="{ name: 'login' }" class="text-primary hover:underline"
            >登录</RouterLink
          >
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4">
        <RouterView />
      </main>
    </div>

    <ConfirmDialog />
    <ToastContainer />
  </div>
</template>
