<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { echarts, type EChartsOption } from '../../lib/echarts.js';

/** ECharts 图表容器（按需注册单例；option 变更全量重绘，窗口自适应） */
const props = defineProps<{
  option: EChartsOption;
  height?: string;
}>();

const el = ref<HTMLDivElement>();
let chart: ReturnType<typeof echarts.init> | null = null;

function render(): void {
  if (!el.value) return;
  chart?.setOption(props.option, true);
}

function resize(): void {
  chart?.resize();
}

onMounted(() => {
  if (!el.value) return;
  chart = echarts.init(el.value);
  render();
  window.addEventListener('resize', resize);
});

watch(
  () => props.option,
  () => render(),
  { deep: true },
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div ref="el" :style="{ height: height ?? '320px', width: '100%' }" />
</template>
