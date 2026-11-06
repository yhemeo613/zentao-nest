import { http } from '../lib/http.js';
import type { StoryStatus, StoryReviewResult, StoryClosedReason } from '@zentao/shared';

/** 需求（契约：docs/03 §4.4，2026-11-06 以源码为准） */
export interface StoryVo {
  id: number;
  parentId: number;
  isParent: number;
  productId: number;
  branchId: number;
  moduleId: number;
  plan: string | null;
  title: string;
  type: string;
  pri: number;
  estimate: number;
  status: StoryStatus;
  stage: string;
  version: number;
  openedBy: string | null;
  openedAt: string | null;
  assignedTo: string | null;
  changedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  closedBy: string | null;
  closedAt: string | null;
  closedReason: string | null;
  toBugId: number | null;
  finalResult: string | null;
  updatedAt: string;
}

export interface StoryDetailVo extends StoryVo {
  spec: {
    id: number;
    storyId: number;
    version: number;
    title: string;
    spec: string;
    verify: string;
  };
  reviewers: Array<{
    id: number;
    storyId: number;
    version: number;
    reviewerId: string;
    result: StoryReviewResult | '';
    reviewedAt: string | null;
  }>;
}

export const storyApi = {
  list(
    query: {
      productId?: number | string;
      status?: string;
      moduleId?: number | string;
      keyword?: string;
    } = {},
  ): Promise<StoryVo[]> {
    return http.get('/stories', { params: query }) as Promise<StoryVo[]>;
  },

  get(id: number | string, version?: number | string): Promise<StoryDetailVo> {
    return http.get(`/stories/${id}`, {
      params: version ? { version } : undefined,
    }) as Promise<StoryDetailVo>;
  },

  /** status: draft=存草稿 / active=提审（active 且 needReview → reviewing，需 reviewerIds） */
  create(dto: {
    productId: string;
    branchId?: number;
    moduleId?: number;
    title: string;
    type?: string;
    pri?: number;
    estimate?: number;
    spec: string;
    verify: string;
    status?: 'draft' | 'active';
    reviewerIds?: string[];
    source?: string;
    sourceNote?: string;
    keywords?: string;
    assignedTo?: string;
    fromBugId?: number;
  }): Promise<StoryVo> {
    return http.post('/stories', dto) as Promise<StoryVo>;
  },

  /** 评审（v1 无 revert / v>1 无 reject 由后端 4202 校验） */
  review(
    id: number | string,
    dto: { result: StoryReviewResult; closedReason?: StoryClosedReason; duplicateStoryId?: number },
  ): Promise<StoryVo> {
    return http.post(`/stories/${id}/review`, dto) as Promise<StoryVo>;
  },

  /** 变更（版本+1；submitReview=true → reviewing 需 reviewerIds，false → changing） */
  change(
    id: number | string,
    dto: {
      title: string;
      spec: string;
      verify: string;
      pri?: number;
      estimate?: number;
      submitReview: boolean;
      reviewerIds?: string[];
    },
  ): Promise<StoryVo> {
    return http.post(`/stories/${id}/change`, dto) as Promise<StoryVo>;
  },

  recallChange(id: number | string): Promise<StoryVo> {
    return http.post(`/stories/${id}/recall-change`) as Promise<StoryVo>;
  },

  recallReview(id: number | string): Promise<StoryVo> {
    return http.post(`/stories/${id}/recall-review`) as Promise<StoryVo>;
  },

  close(
    id: number | string,
    dto: { closedReason: StoryClosedReason; duplicateStoryId?: number; force?: boolean },
  ): Promise<StoryVo> {
    return http.post(`/stories/${id}/close`, dto) as Promise<StoryVo>;
  },

  activate(id: number | string): Promise<StoryVo> {
    return http.post(`/stories/${id}/activate`) as Promise<StoryVo>;
  },

  assign(id: number | string, assignedTo: string): Promise<StoryVo> {
    return http.put(`/stories/${id}/assign`, { assignedTo }) as Promise<StoryVo>;
  },

  subdivide(
    id: number | string,
    children: Array<{ title: string; spec: string; verify: string; estimate?: number }>,
  ): Promise<StoryVo[]> {
    return http.post(`/stories/${id}/subdivide`, { children }) as Promise<StoryVo[]>;
  },
};
