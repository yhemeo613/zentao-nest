import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

let seq = 0;

/** 轻量 Toast（ui/toast 容器消费；docs/10 §2） */
export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([]);

  function push(message: string, variant: ToastItem['variant'] = 'info'): void {
    const id = ++seq;
    items.value.push({ id, message, variant });
    setTimeout(() => dismiss(id), 3500);
  }

  function dismiss(id: number): void {
    items.value = items.value.filter((t) => t.id !== id);
  }

  return { items, push, dismiss };
});

export function useToast() {
  const store = useToastStore();
  return {
    success: (msg: string) => store.push(msg, 'success'),
    error: (msg: string) => store.push(msg, 'error'),
    info: (msg: string) => store.push(msg, 'info'),
  };
}
