<script setup lang="ts">
export interface BreadcrumbItem {
  label: string;
  to?: string;
}

defineProps<{
  title: string;
  description?: string;
  /** 面包屑链（禅道风格：层级语境，docs/10 §6.3） */
  breadcrumb?: BreadcrumbItem[];
}>();
</script>

<template>
  <div class="mb-3">
    <el-breadcrumb v-if="breadcrumb?.length" class="mb-1.5">
      <el-breadcrumb-item
        v-for="(item, i) in breadcrumb"
        :key="i"
        :to="item.to ? { path: item.to } : undefined"
      >
        {{ item.label }}
      </el-breadcrumb-item>
    </el-breadcrumb>
    <div class="flex items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-base font-semibold leading-6">{{ title }}</h1>
        <p v-if="description" class="mt-0.5 text-xs text-muted-foreground">{{ description }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
