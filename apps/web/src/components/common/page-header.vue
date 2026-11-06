<script setup lang="ts">
const props = defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div class="mb-4 flex items-start justify-between gap-4">
    <div>
      <h1 class="text-lg font-semibold">{{ props.title }}</h1>
      <p v-if="props.description" class="mt-0.5 text-sm text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
