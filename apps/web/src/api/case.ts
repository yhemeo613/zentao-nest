import { http } from '../lib/http.js';
import type { CaseStatus } from '@zentao/shared';

/** 用例（契约：docs/03 §4.12，2026-11-06 以源码为准；默认免评审直接 normal） */
export interface CaseVo {
  id: number;
  projectId: number;
  productId: number;
  executionId: number;
  branchId: number;
  moduleId: number;
  storyId: number;
  storyVersion: number;
  title: string;
  precondition: string | null;
  pri: number;
  type: string;
  auto: 'no' | 'auto' | 'unit';
  status: CaseStatus;
  stage: string | null;
  version: number;
  lastRunner: string | null;
  lastRunDate: string | null;
  lastRunResult: 'pass' | 'fail' | 'blocked' | 'n/a' | null;
  openedBy: string | null;
  openedAt: string | null;
}

export interface CaseStepVo {
  id: number;
  caseId: number;
  version: number;
  parentId: number;
  type: 'step' | 'group' | 'item';
  stepDesc: string;
  expect: string | null;
  sortNo: number;
}

export interface CaseDetailVo extends CaseVo {
  steps: CaseStepVo[];
  spec: { id: number; caseId: number; version: number; title: string; precondition: string };
  storyChanged: boolean;
}

export interface CaseStepInput {
  stepDesc: string;
  expect?: string;
  type?: 'step' | 'group';
}

export const caseApi = {
  list(
    query: { productId?: number | string; storyId?: number | string; status?: string } = {},
  ): Promise<CaseVo[]> {
    return http.get('/cases', { params: query }) as Promise<CaseVo[]>;
  },

  get(id: number | string, version?: number | string): Promise<CaseDetailVo> {
    return http.get(`/cases/${id}`, {
      params: version ? { version } : undefined,
    }) as Promise<CaseDetailVo>;
  },

  create(dto: {
    productId: string;
    title: string;
    precondition?: string;
    steps: CaseStepInput[];
    storyId?: string;
    pri?: number;
    moduleId?: number;
  }): Promise<CaseVo> {
    return http.post('/cases', dto) as Promise<CaseVo>;
  },

  /** title/precondition/steps 任一变化 → version+1（storyChanged 标记） */
  update(
    id: number | string,
    dto: { title?: string; precondition?: string; steps?: CaseStepInput[]; pri?: number },
  ): Promise<CaseVo> {
    return http.put(`/cases/${id}`, dto) as Promise<CaseVo>;
  },

  /** 仅 wait 可评（pass→normal；重复评审 4901） */
  review(id: number | string, result: 'pass' | 'clarify'): Promise<CaseVo> {
    return http.post(`/cases/${id}/review`, { result }) as Promise<CaseVo>;
  },

  /** 需求变更确认：storyVersion 同步需求当前版本 */
  confirmStoryChange(id: number | string): Promise<CaseVo> {
    return http.post(`/cases/${id}/confirm-story-change`) as Promise<CaseVo>;
  },
};

/** 步骤结果 → runCase 提交行 */
export interface RunStepInput {
  stepId: number;
  result: 'pass' | 'fail' | 'blocked' | 'n/a';
  real?: string;
}

export interface RunCaseResultVo {
  caseResult: 'pass' | 'fail' | 'blocked';
  resultId: string;
  taskStatus: string;
}
