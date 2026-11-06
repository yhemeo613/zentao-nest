<script setup lang="ts">
import { computed } from 'vue';
import { statusMeta, type StatusEntity } from '../../types/status.js';

const props = defineProps<{
  entity: StatusEntity;
  status: string;
}>();

const meta = computed(() => statusMeta(props.entity, props.status));
</script>

<template>
  <el-tag :type="meta.variant" size="small" disable-transitions>{{ meta.label }}</el-tag>
</template>
