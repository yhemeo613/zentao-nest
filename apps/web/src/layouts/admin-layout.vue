<script setup lang="ts">
import { RouterView, RouterLink, useRouter } from 'vue-router';
import { useAppStore } from '../stores/app.js';
import { useAuthStore } from '../stores/auth.js';

// F1 起菜单由权限点过滤渲染（docs/05 §5.2 第一层）；F0 仅占位结构
const app = useAppStore();
const auth = useAuthStore();
const router = useRouter();

async function handleLogout(): Promise<void> {
  await auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-dvh">
    <!-- 侧栏 -->
    <aside
      class="w-56 shrink-0 border-r border-border bg-card transition-all"
      :class="app.sidebarCollapsed ? 'w-14' : 'w-56'"
    >
      <div class="flex h-14 items-center gap-2 border-b border-border px-4 font-semibold">
        <span v-if="!app.sidebarCollapsed">zentao-nest</span>
      </div>
      <nav class="p-2 text-sm">
        <RouterLink
          :to="{ name: 'dashboard' }"
          class="block rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {{ app.sidebarCollapsed ? '' : '我的概览' }}
        </RouterLink>
        <RouterLink
          :to="{ name: 'status' }"
          class="block rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {{ app.sidebarCollapsed ? '' : '系统状态' }}
        </RouterLink>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 顶栏 -->
      <header class="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <button
          type="button"
          class="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent"
          @click="app.toggleSidebar()"
        >
          ☰
        </button>
        <div class="flex items-center gap-3 text-sm">
          <template v-if="auth.isLoggedIn">
            <span class="text-foreground/80">{{ auth.user?.realname ?? auth.user?.account }}</span>
            <button
              type="button"
              class="rounded-md border border-border px-3 py-1 hover:bg-accent"
              @click="handleLogout"
            >
              退出
            </button>
          </template>
          <RouterLink v-else :to="{ name: 'login' }" class="text-primary hover:underline">
            登录
          </RouterLink>
        </div>
      </header>

      <main class="flex-1 p-4">
        <RouterView />
      </main>
    </div>
  </div>
</template>
