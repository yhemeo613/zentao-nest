<script setup lang="ts">
import { computed } from 'vue';
import { statusMeta, type StatusEntity } from '../../types/status.js';

/**
 * 列表状态：圆点 + 文字（禅道风格基线 docs/10 §6.1——列表不铺彩色标签，
 * el-tag 只用于详情头等强调处）
 */
const props = defineProps<{
  entity: StatusEntity;
  status: string;
}>();

const meta = computed(() => statusMeta(props.entity, props.status));
const dotColor: Record<string, string> = {
  primary: 'var(--primary)',
  success: '#15803d',
  info: '#9ca3af',
  warning: '#b45309',
  danger: '#dc2626',
};
</script>

<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
    <span class="status-dot" :style="{ background: dotColor[meta.variant] ?? '#9ca3af' }" />
    <span>{{ meta.label }}</span>
  </span>
</template>

<style scoped>
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  flex-shrink: 0;
}
</style>
