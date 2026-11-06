import { describe, it, expect } from 'vitest';
import {
  TASK_TRANSITIONS,
  deriveStatusOnEffort,
  deriveParentStatus,
} from '@zentao/shared';
import { COLUMN_TO_TASK_ACTION, TASK_STATUS_TO_COLUMN } from '@zentao/shared';

/**
 * 任务状态机单元测试（docs/04 §10 必测清单；规则权威 = docs/02 §6.1 isClickable 表）
 * 表驱动：合法迁移表逐行断言 + 非法组合抽样断言。
 */

describe('TASK_TRANSITIONS（isClickable 权威表）', () => {
  const allStatuses = ['wait', 'doing', 'done', 'pause', 'cancel', 'closed'];

  const legalCases: Array<[string, string]> = [
    ['start', 'wait'],
    ['restart', 'pause'],
    ['pause', 'doing'],
    ['finish', 'wait'],
    ['finish', 'doing'],
    ['finish', 'pause'],
    ['cancel', 'wait'],
    ['cancel', 'doing'],
    ['cancel', 'pause'],
    ['close', 'done'],
    ['close', 'cancel'],
    ['activate', 'done'],
    ['activate', 'closed'],
    ['activate', 'cancel'],
  ];

  it.each(legalCases)('%s 允许从前置状态 %s', (action, status) => {
    expect(TASK_TRANSITIONS[action]).toContain(status);
  });

  const illegalCases: Array<[string, string]> = [
    ['start', 'doing'],
    ['start', 'done'],
    ['start', 'pause'],
    ['start', 'closed'],
    ['restart', 'wait'],
    ['restart', 'doing'],
    ['pause', 'wait'],
    ['pause', 'done'],
    ['close', 'wait'],
    ['close', 'doing'],
    ['close', 'pause'],
    ['close', 'closed'],
    ['activate', 'wait'],
    ['activate', 'doing'],
    ['activate', 'pause'],
    ['cancel', 'done'],
    ['cancel', 'closed'],
    ['finish', 'done'],
    ['finish', 'closed'],
    ['finish', 'cancel'],
  ];

  it.each(illegalCases)('%s 禁止从状态 %s（3006）', (action, status) => {
    expect(TASK_TRANSITIONS[action]).not.toContain(status);
  });

  it('六个动作的前置集合均非空且属于六态', () => {
    for (const [action, allowed] of Object.entries(TASK_TRANSITIONS)) {
      expect(allowed.length).toBeGreaterThan(0);
      for (const s of allowed) expect(allStatuses).toContain(s);
    }
  });
});

describe('deriveStatusOnEffort（记工时隐式迁移，docs/02 §6.4）', () => {
  it('left=0 且未完成 → done（Finished）', () => {
    for (const current of ['wait', 'doing', 'pause']) {
      const r = deriveStatusOnEffort(current, 0, 5);
      expect(r?.status).toBe('done');
      expect(r?.action).toBe('Finished');
    }
  });

  it('wait 且有工时 → doing（Started）', () => {
    expect(deriveStatusOnEffort('wait', 5, 2)?.status).toBe('doing');
    expect(deriveStatusOnEffort('wait', 5, 2)?.action).toBe('Started');
  });

  it('done/pause/cancel/closed 且 left>0 → doing（Activated 返工）', () => {
    for (const current of ['done', 'pause', 'cancel', 'closed']) {
      const r = deriveStatusOnEffort(current, 3, 5);
      expect(r?.status).toBe('doing');
      expect(r?.action).toBe('Activated');
    }
  });

  it('doing 且 left>0 → 无迁移（RecordWorkhour 语义，返回 null 由调用方记录）', () => {
    expect(deriveStatusOnEffort('doing', 4, 6)).toBeNull();
  });

  it('done 且 left=0 → 无迁移（保持终态）', () => {
    expect(deriveStatusOnEffort('done', 0, 8)).toBeNull();
    expect(deriveStatusOnEffort('closed', 0, 8)).toBeNull();
  });
});

describe('deriveParentStatus（父任务状态推导，docs/02 §6.3 优先级）', () => {
  it('全部 closed → closed', () => {
    expect(deriveParentStatus(['closed', 'closed'])).toBe('closed');
  });

  it('余全 cancel → cancel', () => {
    expect(deriveParentStatus(['closed', 'cancel', 'cancel'])).toBe('cancel');
    expect(deriveParentStatus(['cancel'])).toBe('cancel');
  });

  it('单一状态 → 取该状态', () => {
    expect(deriveParentStatus(['wait', 'wait'])).toBe('wait');
    expect(deriveParentStatus(['doing'])).toBe('doing');
    expect(deriveParentStatus(['done', 'done'])).toBe('done');
  });

  it('含 doing/pause/wait → doing（doing 优先于 done）', () => {
    expect(deriveParentStatus(['doing', 'done'])).toBe('doing');
    expect(deriveParentStatus(['wait', 'done'])).toBe('doing');
    expect(deriveParentStatus(['pause', 'done'])).toBe('doing');
  });

  it('全 done（无其他）→ done', () => {
    expect(deriveParentStatus(['done'])).toBe('done');
  });
});

describe('看板状态映射（TASK_STATUS_TO_COLUMN / COLUMN_TO_TASK_ACTION，docs/02 §8.1）', () => {
  it('六态全部有对应列', () => {
    for (const status of [
      'wait',
      'doing',
      'done',
      'pause',
      'cancel',
      'closed',
    ]) {
      expect(TASK_STATUS_TO_COLUMN[status]).toBeTruthy();
    }
  });

  it('developing 列映射 startOrRestart（wait→start/pause→restart/终态→activate 由服务端分支处理）', () => {
    expect(COLUMN_TO_TASK_ACTION.developing).toBe('startOrRestart');
    expect(COLUMN_TO_TASK_ACTION.developed).toBe('finish');
    expect(COLUMN_TO_TASK_ACTION.pause).toBe('pause');
    expect(COLUMN_TO_TASK_ACTION.canceled).toBe('cancel');
    expect(COLUMN_TO_TASK_ACTION.closed).toBe('close');
  });

  it('状态列映射与动作映射互逆闭环（doing→developing→startOrRestart 覆盖 doing）', () => {
    // doing 拖到 developing 列：语义为「保持/进入进行」，不产生非法动作
    expect(TASK_STATUS_TO_COLUMN.doing).toBe('developing');
    expect(['startOrRestart', 'none']).toContain(
      COLUMN_TO_TASK_ACTION.developing,
    );
  });
});
