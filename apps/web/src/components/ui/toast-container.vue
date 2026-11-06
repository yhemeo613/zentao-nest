<script setup lang="ts">
import { useToastStore } from '../../composables/useToast';

const store = useToastStore();
const variantClass: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-border bg-card text-foreground',
};
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="t in store.items"
        :key="t.id"
        class="pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-md"
        :class="variantClass[t.variant]"
        role="alert"
        @click="store.dismiss(t.id)"
      >
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>
