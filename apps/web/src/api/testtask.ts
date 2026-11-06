import { http } from '../lib/http.js';
import type { TestTaskStatus } from '@zentao/shared';
import type { RunCaseResultVo, RunStepInput } from './case.js';

/** 测试单（契约：docs/03 §4.13，2026-11-06 以源码为准；圈用例为 replace 语义，无独立 unlink） */
export interface TestTaskVo {
  id: number;
  projectId: number;
  productId: number;
  name: string;
  executionId: number;
  buildId: number;
  owner: string | null;
  ownerId: string;
  pri: number;
  begin: string | null;
  end: string | null;
  realBegan: string | null;
  realFinishedDate: string | null;
  desc: string | null;
  status: TestTaskStatus;
  members: string | null;
}

export interface TestRunVo {
  id: number;
  taskId: number;
  caseId: number;
  caseVersion: number;
  assignedTo: string | null;
  lastRunner: string | null;
  lastRunDate: string | null;
  lastRunResult: 'pass' | 'fail' | 'blocked' | 'n/a' | null;
  status: 'normal' | 'blocked';
}

export interface TestTaskDetailVo extends TestTaskVo {
  runs: TestRunVo[];
}

/** 失败转 Bug 预填（GET /testtasks/:id/runs/:runId/bug-prefill） */
export interface BugPrefillVo {
  caseId: number;
  caseVersion: number;
  testtaskId: number;
  resultId: number;
  title: string;
  steps: string;
}

export const testTaskApi = {
  list(productId?: number | string): Promise<TestTaskVo[]> {
    return http.get('/testtasks', { params: productId ? { productId } : undefined }) as Promise<
      TestTaskVo[]
    >;
  },

  get(id: number | string): Promise<TestTaskDetailVo> {
    return http.get(`/testtasks/${id}`) as Promise<TestTaskDetailVo>;
  },

  create(dto: {
    productId: string;
    name: string;
    buildId: string;
    projectId?: string;
    executionId?: string;
    ownerId: string;
    begin: string;
    end: string;
    desc?: string;
  }): Promise<TestTaskVo> {
    return http.post('/testtasks', dto) as Promise<TestTaskVo>;
  },

  start(id: number | string): Promise<TestTaskVo> {
    return http.post(`/testtasks/${id}/start`) as Promise<TestTaskVo>;
  },

  block(id: number | string): Promise<TestTaskVo> {
    return http.post(`/testtasks/${id}/block`) as Promise<TestTaskVo>;
  },

  activate(id: number | string): Promise<TestTaskVo> {
    return http.post(`/testtasks/${id}/activate`) as Promise<TestTaskVo>;
  },

  /** 关闭：realFinishedDate 必填且晚于 begin（4951） */
  close(id: number | string, realFinishedDate: string): Promise<TestTaskVo> {
    return http.post(`/testtasks/${id}/close`, { realFinishedDate }) as Promise<TestTaskVo>;
  },

  remove(id: number | string): Promise<null> {
    return http.delete(`/testtasks/${id}`) as Promise<null>;
  },

  /** 圈用例（replace 语义：传空数组=全部取消圈选） */
  linkCases(id: number | string, caseIds: string[]): Promise<TestRunVo[]> {
    return http.post(`/testtasks/${id}/cases`, { caseIds }) as Promise<TestRunVo[]>;
  },

  /** 执行用例：三写（testrun/result/case），失败自动推进 task doing */
  runCase(
    id: number | string,
    runId: number | string,
    steps: RunStepInput[],
    caseId?: string,
  ): Promise<RunCaseResultVo> {
    return http.post(`/testtasks/${id}/runs/${runId}/run-case`, {
      steps,
      caseId,
    }) as Promise<RunCaseResultVo>;
  },

  bugPrefill(id: number | string, runId: number | string): Promise<BugPrefillVo> {
    return http.get(`/testtasks/${id}/runs/${runId}/bug-prefill`) as Promise<BugPrefillVo>;
  },
};
