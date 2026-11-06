import { http } from '../lib/http.js';
import type { BugStatus, BugResolution } from '@zentao/shared';

/** Bug（契约：docs/03 §4.11，2026-11-06 以源码为准） */
export interface BugVo {
  id: number;
  productId: number;
  branchId: number;
  moduleId: number;
  projectId: number;
  executionId: number;
  storyId: number;
  toStoryId: number | null;
  caseId: number;
  testtaskId: number;
  openedBuild: string;
  resolvedBuildId: string | null;
  duplicateBugId: number | null;
  title: string;
  severity: number;
  pri: number;
  type: string;
  os: string | null;
  browser: string | null;
  steps: string | null;
  status: BugStatus;
  confirmed: number;
  activatedCount: number;
  openedBy: string | null;
  openedAt: string | null;
  assignedTo: string | null;
  deadline: string | null;
  resolvedBy: string | null;
  resolution: BugResolution | null;
  resolvedAt: string | null;
  closedBy: string | null;
  closedAt: string | null;
}

export const bugApi = {
  list(
    query: {
      productId?: number | string;
      status?: string;
      storyId?: number | string;
      assignedTo?: string;
    } = {},
  ): Promise<BugVo[]> {
    return http.get('/bugs', { params: query }) as Promise<BugVo[]>;
  },

  get(id: number | string): Promise<BugVo> {
    return http.get(`/bugs/${id}`) as Promise<BugVo>;
  },

  create(dto: {
    productId: string;
    title: string;
    steps: string;
    openedBuild: string;
    severity?: number;
    pri?: number;
    moduleId?: number;
    projectId?: string;
    executionId?: string;
    storyId?: string;
    caseId?: string;
    resultId?: number;
    testtaskId?: number;
    assignedTo?: string;
    os?: string;
    browser?: string;
  }): Promise<BugVo> {
    return http.post('/bugs', dto) as Promise<BugVo>;
  },

  confirm(id: number | string): Promise<BugVo> {
    return http.post(`/bugs/${id}/confirm`) as Promise<BugVo>;
  },

  /** fixed 必填 resolvedBuildId（4801）；duplicate 必填 duplicateBugId */
  resolve(
    id: number | string,
    dto: {
      resolution: BugResolution;
      resolvedBuildId?: string;
      duplicateBugId?: number;
      assignedTo?: string;
    },
  ): Promise<BugVo> {
    return http.post(`/bugs/${id}/resolve`, dto) as Promise<BugVo>;
  },

  /** 重开：openedBuild 必填（4803） */
  activate(id: number | string, dto: { openedBuild: string; assignedTo?: string }): Promise<BugVo> {
    return http.post(`/bugs/${id}/activate`, dto) as Promise<BugVo>;
  },

  close(id: number | string): Promise<BugVo> {
    return http.post(`/bugs/${id}/close`) as Promise<BugVo>;
  },

  assign(id: number | string, assignedTo: string): Promise<BugVo> {
    return http.put(`/bugs/${id}/assign`, { assignedTo }) as Promise<BugVo>;
  },

  /** 转：返回新建的需求，Bug 置 closed/tostory */
  convertToStory(
    id: number | string,
    dto: { title: string; spec: string; verify: string },
  ): Promise<{ id: number }> {
    return http.post(`/bugs/${id}/convert-to-story`, dto) as Promise<{ id: number }>;
  },

  remove(id: number | string): Promise<null> {
    return http.delete(`/bugs/${id}`) as Promise<null>;
  },
};
