<script setup lang="ts">
import { computed } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { myApi } from '../../api/my.js';
import { useAuthStore } from '../../stores/auth.js';
import StatusTag from '../../components/common/status-tag.vue';

// 我的地盘（my 域聚合：summary + 四列表，docs/03 §4.17）
const router = useRouter();
const auth = useAuthStore();

const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayjs().day()];
const today = `${dayjs().format('YYYY年MM月DD日')} ${weekday}`;
const greeting = computed(() => {
  const name = auth.user?.realname ?? auth.user?.account ?? '';
  return name ? `${name}，下午好` : '我的地盘';
});

const summary = useQuery({ queryKey: ['my', 'summary'], queryFn: () => myApi.summary() });
const tasks = useQuery({ queryKey: ['my', 'tasks'], queryFn: () => myApi.tasks() });
const bugs = useQuery({ queryKey: ['my', 'bugs'], queryFn: () => myApi.bugs() });
const stories = useQuery({ queryKey: ['my', 'stories'], queryFn: () => myApi.stories() });

const stats = [
  { key: 'tasks', label: '我的任务', to: '/tasks' },
  { key: 'bugs', label: '我的 Bug', to: '/bugs' },
  { key: 'stories', label: '我的需求', to: '/stories' },
  { key: 'testTasks', label: '负责的测试单', to: '/testtasks' },
  { key: 'todo', label: '待办', to: '/dashboard' },
] as const;

function open(path: string): void {
  void router.push(path);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-baseline justify-between">
      <div>
        <div class="text-sm text-muted-foreground">{{ today }}</div>
        <h1 class="mt-0.5 text-lg font-semibold">{{ greeting }}</h1>
      </div>
    </div>

    <!-- 统计卡：大数字层级（禅道风格基线 docs/10 §6.1） -->
    <div class="grid grid-cols-5 gap-3">
      <div
        v-for="(stat, i) in stats"
        :key="stat.key"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: i * 60 } }"
        class="stat-card is-clickable"
        @click="open(stat.to)"
      >
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-num text-primary">{{ summary.data.value?.[stat.key] ?? '-' }}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <!-- 我的任务 -->
      <div class="border border-border bg-card">
        <div class="border-b border-border px-4 py-2 text-sm font-medium">我的任务</div>
        <el-table
          :data="tasks.data.value?.slice(0, 8) ?? []"
          size="small"
          class="table-hairline"
          empty-text="暂无"
        >
          <el-table-column label="ID" width="64">
            <template #default="{ row }">
              <span class="num cursor-pointer text-primary" @click="open(`/tasks/${row.id}`)"
                >#{{ row.id }}</span
              >
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" show-overflow-tooltip min-width="160" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag entity="task" :status="row.status" /></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 我的 Bug -->
      <div class="border border-border bg-card">
        <div class="border-b border-border px-4 py-2 text-sm font-medium">我的 Bug</div>
        <el-table
          :data="bugs.data.value?.slice(0, 8) ?? []"
          size="small"
          class="table-hairline"
          empty-text="暂无"
        >
          <el-table-column label="ID" width="64">
            <template #default="{ row }">
              <span class="num cursor-pointer text-primary" @click="open(`/bugs/${row.id}`)"
                >#{{ row.id }}</span
              >
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" show-overflow-tooltip min-width="160" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag entity="bug" :status="row.status" /></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 我的需求 -->
      <div class="border border-border bg-card">
        <div class="border-b border-border px-4 py-2 text-sm font-medium">我的需求</div>
        <el-table
          :data="stories.data.value?.slice(0, 8) ?? []"
          size="small"
          class="table-hairline"
          empty-text="暂无"
        >
          <el-table-column label="ID" width="64">
            <template #default="{ row }">
              <span class="num cursor-pointer text-primary" @click="open(`/stories/${row.id}`)"
                >#{{ row.id }}</span
              >
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" show-overflow-tooltip min-width="160" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"
              ><StatusTag entity="story" :status="row.status"
            /></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 使用帮助（指向系统状态与各列表入口） -->
      <div class="border border-border bg-card p-4">
        <div class="mb-2 text-sm font-medium">快捷入口</div>
        <div class="flex flex-wrap gap-2">
          <el-button size="small" @click="open('/programs')">项目集</el-button>
          <el-button size="small" @click="open('/products')">产品</el-button>
          <el-button size="small" @click="open('/projects')">项目</el-button>
          <el-button size="small" @click="open('/executions')">执行</el-button>
          <el-button size="small" @click="open('/cases')">用例库</el-button>
          <el-button size="small" @click="open('/status')">系统状态</el-button>
        </div>
        <p class="mt-3 text-xs leading-5 text-muted-foreground">
          提示：四层框架从项目集逐级展开；需求评审、任务工时、Bug
          闭环、测试单执行均在对应详情页操作。
        </p>
      </div>
    </div>
  </div>
</template>
