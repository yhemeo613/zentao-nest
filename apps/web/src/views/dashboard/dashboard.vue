<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { ArrowRight, InfoFilled, Odometer, Tickets, Warning } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { myApi } from '../../api/my.js';
import { oaApi } from '../../api/oa.js';
import { useAuthStore } from '../../stores/auth.js';
import { fmtDateTime } from '../../lib/format.js';
import StatusTag from '../../components/common/status-tag.vue';

// 我的地盘（复刻禅道 22.x 地盘页结构：日期横幅 → 统计条 → 使用帮助 + 我的待处理 → 右栏动态）
const router = useRouter();
const auth = useAuthStore();

const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayjs().day()];
const today = `${dayjs().format('YYYY年MM月DD日')} ${weekday}`;
const greeting = computed(() => {
  const name = auth.user?.realname ?? auth.user?.account ?? '';
  return name ? `${name}，下午好` : '我的地盘';
});

const summary = useQuery({ queryKey: ['my', 'summary'], queryFn: () => myApi.summary() });

/** 统计条（禅道六格结构；无端点的统计项砍掉，填我们域内五项） */
const stats = [
  { key: 'tasks', label: '任务数', to: '/tasks' },
  { key: 'bugs', label: 'BUG数', to: '/bugs' },
  { key: 'stories', label: '研发需求数', to: '/stories' },
  { key: 'testTasks', label: '测试单数', to: '/testtasks' },
  { key: 'todo', label: '待办数', to: '/todos' },
] as const;

// ---- 我的待处理（页签：待办/任务） ----
const pendingTab = ref<'todo' | 'task'>('todo');
const todos = useQuery({
  queryKey: ['todos', 'wait,doing'],
  queryFn: () => oaApi.todos('wait,doing'),
});
const myTasks = useQuery({ queryKey: ['my', 'tasks'], queryFn: () => myApi.tasks() });

const pendingTodos = computed(() => (todos.data.value ?? []).slice(0, 6));
const pendingTasks = computed(() =>
  (myTasks.data.value ?? []).filter((t) => t.status === 'wait' || t.status === 'doing').slice(0, 6),
);

// ---- 右栏：最新动态（站内通知） ----
const notifies = useQuery({
  queryKey: ['notifications-all'],
  queryFn: () => oaApi.notifications(),
});

const notifJump = (objectType: string, objectId: string): void => {
  const map: Record<string, string> = {
    story: '/stories/',
    task: '/tasks/',
    bug: '/bugs/',
    case: '/cases/',
    testtask: '/testtasks/',
    product: '/products/',
    project: '/projects/',
  };
  const path = map[objectType];
  if (path) void router.push(path + objectId);
};

/** 使用帮助（静态复刻禅道角色流程链） */
const roleFlows = [
  { role: '管理员', steps: ['维护部门', '添加用户', '维护权限'] },
  {
    role: '项目集负责人',
    steps: ['创建项目集', '关联产品', '创建项目', '制定预算和规划', '添加干系人'],
  },
  { role: '产品经理', steps: ['创建产品', '维护模块', '维护计划', '维护需求', '创建发布'] },
  { role: '项目经理', steps: ['创建项目、执行', '维护团队', '关联需求', '分解任务', '跟踪进度'] },
  {
    role: '研发人员',
    steps: ['领取任务和Bug', '设计实现方案', '更新状态', '完成任务和Bug', '提交代码'],
  },
  { role: '测试人员', steps: ['撰写用例', '执行用例', '提交Bug', '验证Bug', '关闭Bug'] },
];

const quickLinks = [
  { label: '项目集', path: '/programs' },
  { label: '产品', path: '/products' },
  { label: '项目', path: '/projects' },
  { label: '执行', path: '/executions' },
  { label: '需求', path: '/stories' },
  { label: '任务', path: '/tasks' },
  { label: 'Bug', path: '/bugs' },
  { label: '测试单', path: '/testtasks' },
  { label: '文档', path: '/docs' },
  { label: '统计', path: '/reports' },
];

function open(path: string): void {
  void router.push(path);
}
</script>

<template>
  <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
    <!-- 左列 -->
    <div class="min-w-0 space-y-4">
      <!-- 日期横幅 -->
      <div class="ztn-card flex items-center justify-between px-5 py-3">
        <span class="text-[15px] font-semibold">{{ today }}</span>
        <span class="text-xs text-muted-foreground">昨日已收工，今日期待优秀的您来处理！</span>
      </div>

      <!-- 统计条（头像格 + 五统计格） -->
      <div class="ztn-card grid grid-cols-6">
        <div class="col-span-1 border-r border-border p-4">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-white"
            >
              {{ (auth.user?.realname ?? auth.user?.account ?? '?').slice(0, 1) }}
            </span>
            <div class="min-w-0">
              <div class="truncate text-sm">{{ greeting }}</div>
              <span
                class="mt-0.5 inline-block rounded bg-[#fff7e6] px-1.5 py-0.5 text-[11px] text-[#d48806]"
              >
                {{ (auth.user?.permissions ?? []).length }} 个权限点
              </span>
            </div>
          </div>
        </div>
        <div
          v-for="(stat, i) in stats"
          :key="stat.key"
          v-motion
          :initial="{ opacity: 0, y: 8 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: i * 50 } }"
          class="col-span-1 cursor-pointer p-4 text-center transition-colors hover:bg-accent/40"
          :class="i < stats.length - 1 ? 'border-r border-border' : ''"
          @click="open(stat.to)"
        >
          <div class="num text-[28px] font-semibold leading-8 text-primary">
            {{ summary.data.value?.[stat.key] ?? '-' }}
          </div>
          <div class="mt-1 text-xs text-muted-foreground">{{ stat.label }}</div>
        </div>
      </div>

      <!-- 使用帮助 -->
      <div class="ztn-card">
        <div class="ztn-card-title">
          <span>使用帮助</span>
          <span class="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            按角色引导上手
            <el-button type="warning" size="small" round @click="open('/system/roles')"
              >查看角色权限</el-button
            >
          </span>
        </div>
        <div class="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 p-4">
          <template v-for="flow in roleFlows" :key="flow.role">
            <div class="flex items-center">
              <span class="w-fit rounded bg-primary px-2 py-1 text-xs text-white">{{
                flow.role
              }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1">
              <template v-for="(step, si) in flow.steps" :key="step">
                <span v-if="si > 0" class="text-muted-foreground">→</span>
                <span class="rounded border border-border bg-secondary px-2 py-1 text-xs">{{
                  step
                }}</span>
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- 我的待处理 -->
      <div class="ztn-card">
        <div class="ztn-card-title">
          <span>我的待处理</span>
          <span class="flex gap-1 text-xs">
            <button
              class="rounded px-2 py-0.5"
              :class="
                pendingTab === 'todo'
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="pendingTab = 'todo'"
            >
              待办
            </button>
            <button
              class="rounded px-2 py-0.5"
              :class="
                pendingTab === 'task'
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="pendingTab = 'task'"
            >
              任务
            </button>
          </span>
        </div>
        <div class="p-2">
          <template v-if="pendingTab === 'todo'">
            <div
              v-for="t in pendingTodos"
              :key="t.id"
              class="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm hover:bg-accent/60"
              @click="open('/todos')"
            >
              <StatusTag entity="task" :status="t.status === 'doing' ? 'doing' : 'wait'" />
              <span class="min-w-0 flex-1 truncate">{{ t.name }}</span>
              <span class="num text-xs text-muted-foreground">P{{ t.pri }}</span>
            </div>
            <div
              v-if="pendingTodos.length === 0"
              class="py-8 text-center text-sm text-muted-foreground"
            >
              暂无
            </div>
          </template>
          <template v-else>
            <div
              v-for="t in pendingTasks"
              :key="t.id"
              class="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm hover:bg-accent/60"
              @click="open(`/tasks/${t.id}`)"
            >
              <StatusTag entity="task" :status="t.status" />
              <span class="min-w-0 flex-1 truncate">{{ t.name }}</span>
              <span class="num text-xs text-muted-foreground">#{{ t.id }}</span>
            </div>
            <div
              v-if="pendingTasks.length === 0"
              class="py-8 text-center text-sm text-muted-foreground"
            >
              暂无
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 右列 -->
    <div class="min-w-0 space-y-4">
      <!-- 最新动态 -->
      <div class="ztn-card">
        <div class="ztn-card-title">
          <span>最新动态</span>
          <el-button link size="small" @click="open('/todos')">
            更多 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <div class="max-h-80 overflow-y-auto p-3">
          <el-empty
            v-if="(notifies.data.value ?? []).length === 0"
            description="暂无动态"
            :image-size="60"
          />
          <div
            v-for="n in notifies.data.value ?? []"
            :key="n.id"
            class="cursor-pointer border-b border-border/50 py-2 text-sm last:border-0 hover:bg-accent/50"
            @click="notifJump(n.objectType, n.objectId)"
          >
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                :class="n.status === 'wait' ? 'bg-primary' : 'bg-muted-foreground/40'"
              />
              <span class="num shrink-0 text-xs text-muted-foreground">{{
                fmtDateTime(n.createdAt).slice(5, 16)
              }}</span>
              <span
                class="min-w-0 flex-1 truncate"
                :class="n.status === 'wait' ? 'font-medium' : ''"
                >{{ n.subject }}</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- 团队成就替代：快捷入口 -->
      <div class="ztn-card">
        <div class="ztn-card-title">
          <span>快捷入口</span>
          <el-icon class="text-muted-foreground"><InfoFilled /></el-icon>
        </div>
        <div class="grid grid-cols-2 gap-2 p-4">
          <div
            v-for="link in quickLinks"
            :key="link.path"
            class="flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
            @click="open(link.path)"
          >
            <el-icon v-if="link.path === '/tasks'" class="text-primary"><Tickets /></el-icon>
            <el-icon v-else-if="link.path === '/bugs'" class="text-primary"><Warning /></el-icon>
            <el-icon v-else class="text-primary"><Odometer /></el-icon>
            {{ link.label }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
