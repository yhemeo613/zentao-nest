/**
 * 质量域枚举（规格：docs/02 §7）
 */

/** bug.status（三态；confirm 仅标记不改状态） */
export const BugStatus = {
  Active: 'active',
  Resolved: 'resolved',
  Closed: 'closed',
} as const;
export type BugStatus = (typeof BugStatus)[keyof typeof BugStatus];

/** bug.resolution（docs/02 §7.1；tostory 为独立动作不走 resolve） */
export const BugResolution = {
  Fixed: 'fixed',
  ByDesign: 'bydesign',
  Duplicate: 'duplicate',
  External: 'external',
  NotRepro: 'notrepro',
  Postponed: 'postponed',
  WillNotFix: 'willnotfix',
} as const;
export type BugResolution = (typeof BugResolution)[keyof typeof BugResolution];

/** bug 流转前置（docs/02 §7.1 isClickable） */
export const BUG_TRANSITIONS: Record<string, readonly string[]> = {
  confirm: ['active'],
  resolve: ['active'],
  close: ['resolved'],
  activate: ['resolved', 'closed'],
};

/** case.status（docs/02 §7.2：默认免评审直接 normal；blocked/investigate 保留枚举无写入入口） */
export const CaseStatus = {
  Wait: 'wait',
  Normal: 'normal',
  Blocked: 'blocked',
  Investigate: 'investigate',
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

/** 用例评审结果仅两值：pass→normal，clarify 留 wait（docs/02 §7.2） */
export const CaseReviewResult = {
  Pass: 'pass',
  Clarify: 'clarify',
} as const;

/** 用例步骤结果（runCase） */
export const StepResult = {
  Pass: 'pass',
  Fail: 'fail',
  Blocked: 'blocked',
  NotAvailable: 'n/a',
} as const;

/** 用例级结果聚合（docs/02 §7.3：任一步 fail → fail，否则首个非 pass/n-a） */
export const CaseRunResult = {
  Pass: 'pass',
  Fail: 'fail',
  Blocked: 'blocked',
} as const;

/** testtask.status（docs/02 §7.3：done=已关闭；无自动完成） */
export const TestTaskStatus = {
  Wait: 'wait',
  Doing: 'doing',
  Done: 'done',
  Blocked: 'blocked',
} as const;
export type TestTaskStatus = (typeof TestTaskStatus)[keyof typeof TestTaskStatus];

/** testtask 流转前置（docs/02 §7.3 isClickable） */
export const TESTTASK_TRANSITIONS: Record<string, readonly string[]> = {
  start: ['wait'],
  block: ['wait', 'doing'],
  activate: ['blocked', 'done'],
  close: ['wait', 'doing', 'blocked'],
};

/** plan.status（docs/02 §5.1） */
export const PlanStatus = {
  Wait: 'wait',
  Doing: 'doing',
  Done: 'done',
  Closed: 'closed',
} as const;

/** release.status（docs/02 §5.3） */
export const ReleaseStatus = {
  Wait: 'wait',
  Normal: 'normal',
  Fail: 'fail',
  Terminate: 'terminate',
} as const;
export type ReleaseStatus = (typeof ReleaseStatus)[keyof typeof ReleaseStatus];
