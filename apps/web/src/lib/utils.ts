import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-vue 标准类名合并工具（docs/05 §3 ui/ 基础组件约定） */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
