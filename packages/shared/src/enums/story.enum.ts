/**
 * 需求域枚举（规格：docs/02-业务流程规格 §4，禅道 22.7 源码校准）
 */

/** story.status（docs/02 §4.2） */
export const StoryStatus = {
  Draft: 'draft',
  Reviewing: 'reviewing',
  Active: 'active',
  Changing: 'changing',
  Closed: 'closed',
} as const;
export type StoryStatus = (typeof StoryStatus)[keyof typeof StoryStatus];

/** story.stage 需求阶段 15 值（docs/02 §4.4 setStage 引擎） */
export const StoryStage = {
  Wait: 'wait',
  Planned: 'planned',
  Projected: 'projected',
  Designing: 'designing',
  Designed: 'designed',
  Developing: 'developing',
  Developed: 'developed',
  Testing: 'testing',
  Tested: 'tested',
  Verified: 'verified',
  Rejected: 'rejected',
  Delivering: 'delivering',
  Delivered: 'delivered',
  Released: 'released',
  Closed: 'closed',
} as const;
export type StoryStage = (typeof StoryStage)[keyof typeof StoryStage];

/** story.closedReason（docs/02 §4.2，注意无 deferred） */
export const StoryClosedReason = {
  Done: 'done',
  Subdivided: 'subdivided',
  Duplicate: 'duplicate',
  Postponed: 'postponed',
  WillNotDo: 'willnotdo',
  Cancel: 'cancel',
  ByDesign: 'bydesign',
} as const;
export type StoryClosedReason = (typeof StoryClosedReason)[keyof typeof StoryClosedReason];

/** 评审结果四值（docs/02 §4.2；按版本裁剪：v1 无 revert、v>1 无 reject） */
export const StoryReviewResult = {
  Pass: 'pass',
  Revert: 'revert',
  Clarify: 'clarify',
  Reject: 'reject',
} as const;
export type StoryReviewResult = (typeof StoryReviewResult)[keyof typeof StoryReviewResult];

/** 评审裁决规则 */
export const ReviewRules = {
  AllPass: 'allpass',
  HalfPass: 'halfpass',
} as const;

/** story.type（一期落地 story；requirement/epic 预留） */
export const StoryType = {
  Story: 'story',
  Requirement: 'requirement',
  Epic: 'epic',
} as const;

/** story 来源 */
export const StorySource = {
  Bug: 'bug',
  Customer: 'customer',
  User: 'user',
  Product: 'product',
  Operations: 'operations',
  Support: 'support',
  Dev: 'dev',
  Test: 'test',
  Market: 'market',
  Other: 'other',
} as const;

/** setStage 引擎触发类型（action 语义，docs/02 §4.4 触发点清单） */
export const StageTrigger = {
  LinkPlan: 'linkPlan',
  UnlinkPlan: 'unlinkPlan',
  LinkProject: 'linkProject',
  UnlinkProject: 'unlinkProject',
  StartTask: 'startTask',
  FinishTask: 'finishTask',
  CancelTask: 'cancelTask',
  CloseTask: 'closeTask',
  ActivateTask: 'activateTask',
  RecordEffort: 'recordEffort',
  EditEffort: 'editEffort',
  DeleteEffort: 'deleteEffort',
  LinkRelease: 'linkRelease',
  PublishRelease: 'publishRelease',
  UnlinkRelease: 'unlinkRelease',
  Reviewed: 'reviewed',
  Manual: 'manual',
} as const;
export type StageTrigger = (typeof StageTrigger)[keyof typeof StageTrigger];
