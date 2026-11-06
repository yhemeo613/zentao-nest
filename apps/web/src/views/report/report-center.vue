<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { StoryStage, StoryStatus, TaskStatus, BugStatus } from '@zentao/shared';
import { reportApi } from '../../api/report.js';
import { projectApi } from '../../api/project.js';
import { executionApi } from '../../api/execution.js';
import { productApi } from '../../api/product.js';
import Echart from '../../components/common/echart.vue';
import PageHeader from '../../components/common/page-header.vue';
import type { EChartsOption } from '../../lib/echarts.js';

// 统计中心：项目概览 / 执行负载 / 产品质量 / 产品路线图（reports 域，docs/05 §8）
const projectId = ref<number | undefined>();
const executionId = ref<number | undefined>();
const productId = ref<number | undefined>();

const projects = useQuery({ queryKey: ['projects'], queryFn: () => projectApi.list() });
const products = useQuery({ queryKey: ['products'], queryFn: () => productApi.list() });
const executions = useQuery({
  queryKey: ['executions', projectId],
  queryFn: () => executionApi.list(projectId.value!),
  enabled: computed(() => projectId.value != null),
});

function onProjectChange(): void {
  executionId.value = undefined;
}

// ---- 1. 项目概览 ----
const overview = useQuery({
  queryKey: ['reports', 'project-overview', projectId],
  queryFn: () => reportApi.projectOverview(projectId.value!),
  enabled: computed(() => projectId.value != null),
});

function statusMapToPie(
  map: Record<string, number>,
  labels: Record<string, { label: string; variant: string }>,
): EChartsOption {
  const data = Object.entries(map)
    .filter(([k]) => labels[k])
    .map(([k, v]) => ({ name: labels[k].label, value: v }));
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        label: { show: true, formatter: '{b}: {c}', fontSize: 11 },
        data,
      },
    ],
  };
}

const storyPie = computed(() =>
  overview.data.value ? statusMapToPie(overview.data.value.story, StoryMeta) : emptyPie,
);
const taskPie = computed(() =>
  overview.data.value ? statusMapToPie(overview.data.value.task, TaskMeta) : emptyPie,
);
const bugPie = computed(() =>
  overview.data.value ? statusMapToPie(overview.data.value.bug, BugMeta) : emptyPie,
);

const emptyPie: EChartsOption = { series: [{ type: 'pie', data: [] }] };

const StoryMeta: Record<string, { label: string; variant: string }> = {
  [StoryStatus.Draft]: { label: '草稿', variant: '' },
  [StoryStatus.Reviewing]: { label: '评审中', variant: '' },
  [StoryStatus.Active]: { label: '激活', variant: '' },
  [StoryStatus.Changing]: { label: '变更中', variant: '' },
  [StoryStatus.Closed]: { label: '已关闭', variant: '' },
};
const TaskMeta: Record<string, { label: string; variant: string }> = {
  [TaskStatus.Wait]: { label: '未开始', variant: '' },
  [TaskStatus.Doing]: { label: '进行中', variant: '' },
  [TaskStatus.Done]: { label: '已完成', variant: '' },
  [TaskStatus.Pause]: { label: '已暂停', variant: '' },
  [TaskStatus.Cancel]: { label: '已取消', variant: '' },
  [TaskStatus.Closed]: { label: '已关闭', variant: '' },
};
const BugMeta: Record<string, { label: string; variant: string }> = {
  [BugStatus.Active]: { label: '激活', variant: '' },
  [BugStatus.Resolved]: { label: '已解决', variant: '' },
  [BugStatus.Closed]: { label: '已关闭', variant: '' },
};

// ---- 2. 执行负载 ----
const workload = useQuery({
  queryKey: ['reports', 'workload', executionId],
  queryFn: () => reportApi.executionWorkload(executionId.value!),
  enabled: computed(() => executionId.value != null),
});

const workloadBar = computed<EChartsOption>(() => {
  const members = workload.data.value?.members ?? [];
  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 40, right: 16, top: 24, bottom: 48 },
    xAxis: {
      type: 'category',
      data: members.map((m) => m.userId),
      axisLabel: { fontSize: 11, interval: 0 },
    },
    yAxis: { type: 'value' },
    series: [
      { name: '任务数', type: 'bar', data: members.map((m) => m.tasks), barMaxWidth: 26 },
      { name: '已消耗', type: 'bar', data: members.map((m) => m.consumed), barMaxWidth: 26 },
      { name: '剩余', type: 'bar', data: members.map((m) => m.left), barMaxWidth: 26 },
    ],
  };
});

// ---- 3. 产品质量 ----
const quality = useQuery({
  queryKey: ['reports', 'quality', productId],
  queryFn: () => reportApi.productQuality(productId.value!),
  enabled: computed(() => productId.value != null),
});

const qualityGauge = computed<EChartsOption>(() => {
  const rate = quality.data.value?.casePassRate;
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: { show: true, width: 12, itemStyle: { color: '#0e7490' } },
        axisLine: { lineStyle: { width: 12 } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { fontSize: 10, distance: 14 },
        pointer: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, 0],
          formatter: rate == null ? '无数据' : '{value}%',
          fontSize: 20,
          color: '#16181d',
        },
        data: [{ value: rate ?? 0 }],
      },
    ],
  };
});

const bugBar = computed<EChartsOption>(() => {
  const bugs = quality.data.value?.bugs ?? {};
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: Object.keys(bugs).map((k) => BugMeta[k]?.label ?? k),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value' },
    series: [
      { type: 'bar', data: Object.values(bugs), barMaxWidth: 34, itemStyle: { color: '#b45309' } },
    ],
  };
});

// ---- 4. 产品路线图 ----
const roadmap = useQuery({
  queryKey: ['reports', 'roadmap', productId],
  queryFn: () => reportApi.productRoadmap(productId.value!),
  enabled: computed(() => productId.value != null),
});

const stageLabels: Record<string, string> = Object.fromEntries(
  Object.entries(StoryStage).map(([k, v]) => [v, k]),
);

const roadmapBar = computed<EChartsOption>(() => {
  const map = roadmap.data.value ?? {};
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 56 },
    xAxis: {
      type: 'category',
      data: Object.keys(map),
      axisLabel: { fontSize: 10, interval: 0, rotate: 36 },
    },
    yAxis: { type: 'value' },
    series: [
      { type: 'bar', data: Object.values(map), barMaxWidth: 30, itemStyle: { color: '#0e7490' } },
    ],
  };
});
void stageLabels;
</script>

<template>
  <div>
    <PageHeader
      title="统计"
      description="项目概览 / 执行负载 / 产品质量 / 产品路线图（reports 域实时数据）"
    />

    <!-- 项目概览 -->
    <div class="border border-border bg-card p-4">
      <div class="mb-3 flex items-center gap-3">
        <span class="text-sm font-medium">项目概览</span>
        <el-select v-model="projectId" placeholder="选择项目" clearable filterable class="!w-56">
          <el-option
            v-for="p in projects.data.value ?? []"
            :key="p.id"
            :value="p.id"
            :label="p.name"
          />
        </el-select>
      </div>
      <div v-if="projectId" class="grid grid-cols-3 gap-3">
        <div class="border border-border p-2">
          <div class="mb-1 text-center text-xs text-muted-foreground">需求分布</div>
          <Echart :option="storyPie" height="240px" />
        </div>
        <div class="border border-border p-2">
          <div class="mb-1 text-center text-xs text-muted-foreground">任务分布</div>
          <Echart :option="taskPie" height="240px" />
        </div>
        <div class="border border-border p-2">
          <div class="mb-1 text-center text-xs text-muted-foreground">Bug 分布</div>
          <Echart :option="bugPie" height="240px" />
        </div>
      </div>
      <el-empty v-else description="选择项目查看三态分布" :image-size="60" />
    </div>

    <!-- 执行负载 -->
    <div class="mt-4 border border-border bg-card p-4">
      <div class="mb-3 flex items-center gap-3">
        <span class="text-sm font-medium">执行负载</span>
        <el-select
          v-model="projectId"
          placeholder="选择项目"
          clearable
          filterable
          class="!w-56"
          @change="onProjectChange"
        >
          <el-option
            v-for="p in projects.data.value ?? []"
            :key="p.id"
            :value="p.id"
            :label="p.name"
          />
        </el-select>
        <el-select v-model="executionId" placeholder="选择执行" clearable filterable class="!w-56">
          <el-option
            v-for="e in executions.data.value ?? []"
            :key="e.id"
            :value="e.id"
            :label="e.name"
          />
        </el-select>
      </div>
      <Echart v-if="executionId" :option="workloadBar" height="300px" />
      <el-empty v-else description="选择执行查看成员负载" :image-size="60" />
    </div>

    <!-- 产品质量 + 路线图 -->
    <div class="mt-4 border border-border bg-card p-4">
      <div class="mb-3 flex items-center gap-3">
        <span class="text-sm font-medium">产品质量 / 路线图</span>
        <el-select v-model="productId" placeholder="选择产品" clearable filterable class="!w-56">
          <el-option
            v-for="p in products.data.value ?? []"
            :key="p.id"
            :value="p.id"
            :label="p.name"
          />
        </el-select>
      </div>
      <div v-if="productId" class="grid grid-cols-3 gap-3">
        <div class="border border-border p-2">
          <div class="mb-1 text-center text-xs text-muted-foreground">用例通过率</div>
          <Echart :option="qualityGauge" height="220px" />
          <div class="num text-center text-xs text-muted-foreground">
            执行 {{ quality.data.value?.caseRan ?? 0 }} / 共
            {{ quality.data.value?.caseTotal ?? 0 }} 条
          </div>
        </div>
        <div class="border border-border p-2">
          <div class="mb-1 text-center text-xs text-muted-foreground">
            Bug 状态（共 {{ quality.data.value?.totalBugs ?? 0 }}，缺陷密度
            {{ quality.data.value?.defectDensity ?? '-' }}）
          </div>
          <Echart :option="bugBar" height="220px" />
        </div>
        <div class="col-span-1 border border-border p-2">
          <div class="mb-1 text-center text-xs text-muted-foreground">需求阶段路线图</div>
          <Echart :option="roadmapBar" height="220px" />
        </div>
      </div>
      <el-empty v-else description="选择产品查看质量与路线图" :image-size="60" />
    </div>
  </div>
</template>
