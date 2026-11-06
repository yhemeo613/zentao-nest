<script setup lang="ts">
import { cn } from '../../lib/utils';

const props = defineProps<{
  modelValue: string;
  tabs: Array<{ value: string; label: string; count?: number }>;
  class?: string;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
</script>

<template>
  <div
    :class="
      cn('inline-flex h-9 items-center rounded-md bg-muted p-1 text-muted-foreground', props.class)
    "
  >
    <button
      v-for="tab in props.tabs"
      :key="tab.value"
      type="button"
      class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all disabled:opacity-50"
      :class="
        props.modelValue === tab.value
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:text-foreground'
      "
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="ml-1 text-xs opacity-70">{{ tab.count }}</span>
    </button>
  </div>
</template>
