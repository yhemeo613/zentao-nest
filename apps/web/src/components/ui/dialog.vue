<script setup lang="ts">
import { Button } from './button';

const props = defineProps<{ open: boolean; title?: string; width?: string }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="props.open"
        class="fixed inset-0 z-50 bg-black/50"
        @click.self="emit('update:open', false)"
      >
        <div
          class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg"
          :style="{ width: props.width ?? '480px', maxHeight: '85vh', overflowY: 'auto' }"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold">{{ props.title }}</h2>
            <Button variant="ghost" size="icon" @click="emit('update:open', false)">✕</Button>
          </div>
          <slot />
          <div v-if="$slots.footer" class="mt-6 flex justify-end gap-2">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
