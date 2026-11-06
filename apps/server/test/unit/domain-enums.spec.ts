import { describe, it, expect } from 'vitest';
import {
  BugStatus,
  BUG_TRANSITIONS,
  CaseReviewResult,
  StoryClosedReason,
  StoryReviewResult,
  StoryStage,
  StoryStatus,
  TestTaskStatus,
  TESTTASK_TRANSITIONS,
  ReleaseStatus,
} from '@zentao/shared';

/** 全域枚举与流转表一致性测试（docs/02 §4/§7 权威枚举） */

describe('需求域枚举（docs/02 §4）', () => {
  it('story.status 五态完整', () => {
    expect(Object.values(StoryStatus).sort()).toEqual(
      ['active', 'changing', 'closed', 'draft', 'reviewing'].sort(),
    );
  });

  it('closedReason 七值且无 deferred（源码校准）', () => {
    expect(Object.values(StoryClosedReason).sort()).toEqual(
      [
        'bydesign',
        'cancel',
        'done',
        'duplicate',
        'postponed',
        'subdivided',
        'willnotdo',
      ].sort(),
    );
    expect('deferred' in StoryClosedReason).toBe(false);
  });

  it('stage 15 值完整', () => {
    expect(Object.keys(StoryStage).length).toBe(15);
    expect(Object.values(StoryStage)).toContain('released');
    expect(Object.values(StoryStage)).toContain('closed');
  });

  it('评审结果四值', () => {
    expect(Object.values(StoryReviewResult).sort()).toEqual(
      ['clarify', 'pass', 'reject', 'revert'].sort(),
    );
  });
});

describe('质量域枚举（docs/02 §7）', () => {
  it('bug 三态 + resolution 七值（tostory 为独立动作不入 resolve 枚举）', () => {
    expect(Object.values(BugStatus).sort()).toEqual(
      ['active', 'closed', 'resolved'].sort(),
    );
    expect(Object.keys(BUG_TRANSITIONS)).toEqual([
      'confirm',
      'resolve',
      'close',
      'activate',
    ]);
    expect(BUG_TRANSITIONS.close).toEqual(['resolved']);
    expect(BUG_TRANSITIONS.activate).toEqual(['resolved', 'closed']);
  });

  it('用例评审结果仅两值（pass/clarify）', () => {
    expect(Object.values(CaseReviewResult).sort()).toEqual(
      ['clarify', 'pass'].sort(),
    );
  });

  it('测试单四态 + 流转前置（done=已关闭；无自动完成）', () => {
    expect(Object.values(TestTaskStatus).sort()).toEqual(
      ['blocked', 'doing', 'done', 'wait'].sort(),
    );
    expect(TESTTASK_TRANSITIONS.start).toEqual(['wait']);
    expect(TESTTASK_TRANSITIONS.activate).toEqual(['blocked', 'done']);
    expect(TESTTASK_TRANSITIONS.close).toEqual(['wait', 'doing', 'blocked']);
  });

  it('发布状态含 terminate（docs/02 §5.3）', () => {
    expect(Object.values(ReleaseStatus)).toContain('terminate');
  });
});
