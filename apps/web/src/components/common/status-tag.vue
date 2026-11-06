<script setup lang="ts">
import { computed } from 'vue';
import { Badge } from '../ui/badge';
import { statusMeta, type StatusEntity } from '../../types/status';

const props = defineProps<{ entity: StatusEntity; status: string }>();
const meta = computed(() => statusMeta(props.entity, props.status));
</script>

<template>
  <Badge :variant="meta.variant">{{ meta.label }}</Badge>
</template>
