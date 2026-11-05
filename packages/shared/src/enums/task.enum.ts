/**
 * 任务/工时域枚举（规格：docs/02 §6，isClickable 权威表）
 */

/** task.status（六态） */
export const TaskStatus = {
  Wait: 'wait',
  Doing: 'doing',
  Done: 'done',
  Pause: 'pause',
  Cancel: 'cancel',
  Closed: 'closed',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/** task.closedReason（done|cancel，docs/02 §6.1 close 自动映射） */
export const TaskClosedReason = {
  Done: 'done',
  Cancel: 'cancel',
} as const;

/**
 * 任务操作 → 前置状态权威表（docs/02 §6.1 isClickable，model.php:2533-2596）
 * start 仅 wait；restart 仅 pause；pause 仅 doing；finish/cancel 非终态；close 仅 done/cancel；activate 返工 done/closed/cancel。
 */
export const TASK_TRANSITIONS: Record<string, readonly string[]> = {
  start: ['wait'],
  restart: ['pause'],
  pause: ['doing'],
  finish: ['wait', 'doing', 'pause'],
  cancel: ['wait', 'doing', 'pause'],
  close: ['done', 'cancel'],
  activate: ['done', 'closed', 'cancel'],
};

/** task.type（禅道 typeList 核心） */
export const TaskType = {
  Devel: 'devel',
  Test: 'test',
  Design: 'design',
  Study: 'study',
  Discuss: 'discuss',
  Trans: 'trans',
  Misc: 'misc',
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

/** task.mode（''=单人；linear/multi 多人任务 P3.5 落地） */
export const TaskMode = {
  Single: '',
  Linear: 'linear',
  Multi: 'multi',
} as const;

/** effort.objectType（通用工时，docs/04 §5 zt_effort） */
export const EffortObjectType = {
  Task: 'task',
  Story: 'story',
  Bug: 'bug',
  Case: 'case',
  Todo: 'todo',
  Custom: 'custom',
} as const;

/**
 * 记工时隐式状态迁移（docs/02 §6.4 buildTaskForEffort，tao.php:47-102）：
 * left=0 且未完成 → done；wait → doing；done/pause/cancel/closed 且 left≠0 → doing。
 */
export function deriveStatusOnEffort(
  current: string,
  left: number,
  consumed: number,
): { status: string; action: 'Finished' | 'Started' | 'Activated' | 'RecordWorkhour' } | null {
  if (left === 0 && !['done', 'closed', 'cancel'].includes(current)) {
    return { status: 'done', action: 'Finished' };
  }
  if (current === 'wait' && (consumed > 0 || left > 0)) {
    return { status: 'doing', action: 'Started' };
  }
  if (['done', 'pause', 'cancel', 'closed'].includes(current) && left > 0) {
    return { status: 'doing', action: 'Activated' };
  }
  return null;
}

/** 父任务状态推导优先级（docs/02 §6.3 getParentStatusById，tao.php:763-780） */
export function deriveParentStatus(childStatuses: string[]): string {
  const alive = childStatuses.filter((s) => s !== 'closed');
  if (alive.length === 0) return 'closed';
  const notCancel = alive.filter((s) => s !== 'cancel');
  if (notCancel.length === 0) return 'cancel';
  const unique = [...new Set(notCancel)];
  if (unique.length === 1) return unique[0];
  if (notCancel.some((s) => ['doing', 'pause', 'wait'].includes(s))) return 'doing';
  return 'done';
}
