import { defineStore } from 'pinia';
import { ref } from 'vue';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  resolve?: (ok: boolean) => void;
}

/** 确认弹窗（Promise 化；容器 confirm-dialog.vue 消费） */
export const useConfirmStore = defineStore('confirm', () => {
  const state = ref<ConfirmState>({ open: false, title: '', message: '' });

  function open(options: {
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = { ...options, open: true, resolve };
    });
  }

  function settle(ok: boolean): void {
    state.value.resolve?.(ok);
    state.value = { open: false, title: '', message: '' };
  }

  return { state, open, settle };
});

export function useConfirm() {
  const store = useConfirmStore();
  return {
    state: store.state,
    /** 返回 Promise<boolean>：true=确认 */
    ask: (options: { title: string; message: string; confirmText?: string; danger?: boolean }) =>
      store.open(options),
    confirm: () => store.settle(true),
    cancel: () => store.settle(false),
  };
}
