import { ElMessage, ElMessageBox } from 'element-plus';
import { describeError } from '../lib/errors.js';

export interface ConfirmActionOptions {
  /** 弹窗标题（=动作名，如「关闭项目集」） */
  title: string;
  /** 弹窗正文；默认「确定执行该操作吗？」 */
  message?: string;
  /** 危险动作确认文案加粗提示 */
  danger?: boolean;
  run: () => Promise<unknown>;
  successMsg?: string;
  /** 成功后的 query 失效回调（精确失效，docs/06 §6.3） */
  invalidate?: Array<() => void>;
}

/**
 * 流转动作统一入口：确认弹窗 → mutation → toast → 精确失效（docs/10 §3 ActionToolbar 约定）
 * 用户取消不视为错误；业务失败 toast 服务端中文 message。
 */
export function useConfirmAction() {
  return async function confirmAction(opts: ConfirmActionOptions): Promise<boolean> {
    try {
      await ElMessageBox.confirm(opts.message ?? '确定执行该操作吗？', opts.title, {
        type: opts.danger ? 'warning' : 'info',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      });
    } catch {
      return false;
    }
    try {
      await opts.run();
      ElMessage.success(opts.successMsg ?? `${opts.title}成功`);
      opts.invalidate?.forEach((fn) => fn());
      return true;
    } catch (error) {
      ElMessage.error(describeError(error).message);
      return false;
    }
  };
}
