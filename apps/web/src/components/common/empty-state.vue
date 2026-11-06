<script setup lang="ts">
defineProps<{ message?: string }>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground"
  >
    <slot>{{ message ?? '暂无数据' }}</slot>
  </div>
</template>
