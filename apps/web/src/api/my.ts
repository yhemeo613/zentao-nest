import { http } from '../lib/http.js';
import type { StoryVo } from './story.js';
import type { TaskVo } from './task.js';
import type { BugVo } from './bug.js';
import type { CaseVo } from './case.js';
import type { TestTaskVo } from './testtask.js';
import type { ProductVo } from './product.js';
import type { ProjectVo } from './project.js';
import type { ExecutionVo } from './execution.js';

/** 我的地盘（契约：docs/03 §4.17，2026-11-06 以源码为准；全部登录即可，无权限点） */
export interface MySummaryVo {
  tasks: number;
  bugs: number;
  stories: number;
  testTasks: number;
  todo: number;
}

export interface MySearchResult {
  story?: StoryVo[];
  task?: TaskVo[];
  bug?: BugVo[];
  case?: CaseVo[];
  product?: ProductVo[];
  project?: ProjectVo[];
  execution?: ExecutionVo[];
}

export const myApi = {
  summary(): Promise<MySummaryVo> {
    return http.get('/my/summary') as Promise<MySummaryVo>;
  },

  tasks(status?: string): Promise<TaskVo[]> {
    return http.get('/my/tasks', { params: status ? { status } : undefined }) as Promise<TaskVo[]>;
  },

  bugs(): Promise<BugVo[]> {
    return http.get('/my/bugs') as Promise<BugVo[]>;
  },

  stories(): Promise<StoryVo[]> {
    return http.get('/my/stories') as Promise<StoryVo[]>;
  },

  testtasks(): Promise<TestTaskVo[]> {
    return http.get('/my/testtasks') as Promise<TestTaskVo[]>;
  },

  search(q: string, types?: string): Promise<MySearchResult> {
    return http.get('/my/search', {
      params: { q, ...(types ? { types } : {}) },
    }) as Promise<MySearchResult>;
  },
};
