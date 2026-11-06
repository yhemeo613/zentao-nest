import { http } from '../lib/http.js';

/** 需求（契约：docs/03 §4.4 / docs/02 §4） */
export interface StoryVo {
  id: string;
  productId: number;
  parentId: number;
  title: string;
  pri: number;
  estimate: string;
  status: string;
  stage: string;
  version: number;
  assignedTo: string;
  openedBy: string;
  closedReason: string;
  updatedAt: string;
}

export const storyApi = {
  list(query: { productId?: string; status?: string; keyword?: string }): Promise<StoryVo[]> {
    const params = new URLSearchParams();
    if (query.productId) params.set('productId', query.productId);
    if (query.status) params.set('status', query.status);
    if (query.keyword) params.set('keyword', query.keyword);
    return http.get(`/stories?${params.toString()}`) as Promise<StoryVo[]>;
  },

  get(
    id: string,
    version?: number,
  ): Promise<StoryVo & { spec?: { spec: string; verify: string } }> {
    return http.get(`/stories/${id}${version ? `?version=${version}` : ''}`) as Promise<never>;
  },

  create(dto: {
    productId: string;
    title: string;
    spec: string;
    verify: string;
    status?: string;
    pri?: number;
    estimate?: number;
    reviewerIds?: string[];
  }): Promise<StoryVo> {
    return http.post('/stories', dto) as Promise<StoryVo>;
  },

  /** 评审（result: pass/revert/clarify/reject，版本裁剪由后端校验） */
  review(
    id: string,
    dto: { result: string; closedReason?: string; duplicateStoryId?: number },
  ): Promise<StoryVo> {
    return http.post(`/stories/${id}/review`, dto) as Promise<StoryVo>;
  },

  change(
    id: string,
    dto: {
      title: string;
      spec: string;
      verify: string;
      submitReview: boolean;
      reviewerIds?: string[];
    },
  ): Promise<StoryVo> {
    return http.post(`/stories/${id}/change`, dto) as Promise<StoryVo>;
  },

  close(
    id: string,
    dto: { closedReason: string; duplicateStoryId?: number; force?: boolean },
  ): Promise<StoryVo> {
    return http.post(`/stories/${id}/close`, dto) as Promise<StoryVo>;
  },

  activate(id: string): Promise<StoryVo> {
    return http.post(`/stories/${id}/activate`) as Promise<StoryVo>;
  },
};

/** 任务（契约：docs/03 §4.10 / docs/02 §6.1 isClickable） */
export interface TaskVo {
  id: string;
  projectId: number;
  executionId: number;
  storyId: number;
  storyVersion: number;
  name: string;
  type: string;
  pri: number;
  estimate: string;
  consumed: string;
  left: string;
  status: string;
  assignedTo: string;
  deadline: string | null;
}

export const taskApi = {
  list(query: {
    executionId?: string;
    projectId?: string;
    status?: string;
    assignedTo?: string;
  }): Promise<TaskVo[]> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    return http.get(`/tasks?${params.toString()}`) as Promise<TaskVo[]>;
  },

  get(id: string) {
    return http.get(`/tasks/${id}`) as Promise<never>;
  },

  create(dto: {
    projectId: string;
    executionId: string;
    name: string;
    type?: string;
    estimate: number;
    storyId?: string;
    assignedTo?: string;
  }): Promise<TaskVo> {
    return http.post('/tasks', dto) as Promise<TaskVo>;
  },

  /** 动作统一入口（前置状态校验后端 3006） */
  action(
    id: string,
    action: 'start' | 'restart' | 'pause' | 'cancel' | 'close' | 'activate' | 'finish',
    payload?: Record<string, unknown>,
  ): Promise<TaskVo> {
    return http.post(`/tasks/${id}/${action}`, payload ?? {}) as Promise<TaskVo>;
  },

  /** 记工时（隐式状态迁移，docs/02 §6.4） */
  recordEffort(
    id: string,
    dto: { date: string; consumed: number; left: number; work: string },
  ): Promise<TaskVo> {
    return http.post(`/tasks/${id}/efforts`, dto) as Promise<TaskVo>;
  },

  assign(id: string, assignedTo: string, left?: number): Promise<TaskVo> {
    return http.put(`/tasks/${id}/assign`, { assignedTo, left }) as Promise<TaskVo>;
  },
};

/** Bug（契约：docs/03 §4.11 / docs/02 §7.1） */
export interface BugVo {
  id: string;
  productId: number;
  title: string;
  severity: number;
  pri: number;
  status: string;
  resolution: string;
  confirmed: number;
  activatedCount: number;
  assignedTo: string;
  openedBy: string;
  steps: string | null;
}

export const bugApi = {
  list(query: { productId?: string; status?: string; assignedTo?: string }): Promise<BugVo[]> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    return http.get(`/bugs?${params.toString()}`) as Promise<BugVo[]>;
  },

  create(dto: {
    productId: string;
    title: string;
    steps: string;
    openedBuild: string;
    severity?: number;
    assignedTo?: string;
  }): Promise<BugVo> {
    return http.post('/bugs', dto) as Promise<BugVo>;
  },

  confirm(id: string): Promise<BugVo> {
    return http.post(`/bugs/${id}/confirm`) as Promise<BugVo>;
  },

  resolve(
    id: string,
    dto: { resolution: string; resolvedBuildId?: string; duplicateBugId?: number },
  ): Promise<BugVo> {
    return http.post(`/bugs/${id}/resolve`, dto) as Promise<BugVo>;
  },

  activate(id: string, openedBuild: string): Promise<BugVo> {
    return http.post(`/bugs/${id}/activate`, { openedBuild }) as Promise<BugVo>;
  },

  close(id: string): Promise<BugVo> {
    return http.post(`/bugs/${id}/close`) as Promise<BugVo>;
  },
};

/** 用例与测试单（契约：docs/03 §4.12/4.13） */
export interface CaseVo {
  id: string;
  productId: number;
  title: string;
  pri: number;
  status: string;
  version: number;
  lastRunResult: string;
}

export const caseApi = {
  list(productId?: string): Promise<CaseVo[]> {
    return http.get(`/cases?productId=${productId}`) as Promise<CaseVo[]>;
  },

  create(dto: {
    productId: string;
    title: string;
    steps: Array<{ stepDesc: string; expect?: string }>;
    storyId?: string;
  }): Promise<CaseVo> {
    return http.post('/cases', dto) as Promise<CaseVo>;
  },
};

export interface TestTaskVo {
  id: string;
  productId: number;
  name: string;
  buildId: number;
  status: string;
  ownerId: string;
  begin: string | null;
  end: string | null;
}

export const testTaskApi = {
  list(_productId?: string): Promise<TestTaskVo[]> {
    return http.get('/testtasks') as Promise<TestTaskVo[]>;
  },

  create(dto: {
    productId: string;
    name: string;
    buildId: string;
    ownerId: string;
    begin: string;
    end: string;
  }): Promise<TestTaskVo> {
    return http.post('/testtasks', dto) as Promise<TestTaskVo>;
  },

  get(id: string) {
    return http.get(`/testtasks/${id}`) as Promise<never>;
  },

  linkCases(id: string, caseIds: string[]) {
    return http.post(`/testtasks/${id}/cases`, { caseIds }) as Promise<never>;
  },

  runCase(
    id: string,
    runId: string,
    steps: Array<{ stepId: number; result: string; real?: string }>,
  ) {
    return http.post(`/testtasks/${id}/runs/${runId}/run-case`, { steps }) as Promise<never>;
  },

  transition(id: string, action: 'start' | 'block' | 'activate' | 'close', closedReason?: string) {
    return http.post(`/testtasks/${id}/${action}`, { closedReason }) as Promise<never>;
  },
};
