<script setup lang="ts">
import { useConfirm } from '../../composables/useConfirm';
import { Button } from '../ui/button';

const { state, confirm, cancel } = useConfirm();
</script>

<template>
  <div
    v-if="state.open"
    class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50"
    @click.self="cancel"
  >
    <div class="w-96 rounded-lg border border-border bg-card p-6 shadow-lg">
      <h3 class="mb-2 text-base font-semibold">{{ state.title }}</h3>
      <p class="mb-6 whitespace-pre-line text-sm text-muted-foreground">{{ state.message }}</p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="cancel">取消</Button>
        <Button :variant="state.danger ? 'destructive' : 'default'" @click="confirm">
          {{ state.confirmText ?? '确定' }}
        </Button>
      </div>
    </div>
  </div>
</template>
