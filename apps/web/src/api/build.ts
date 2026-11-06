import { http } from '../lib/http.js';
import type { StoryVo } from './story.js';
import type { BugVo } from './bug.js';

/** 构建（契约：build.controller，2026-11-06 以源码为准；无状态字段、无 update/delete 端点） */
export interface BuildVo {
  id: number;
  projectId: number;
  productId: number;
  branch: string;
  executionId: number;
  name: string;
  scmPath: string | null;
  filePath: string | null;
  date: string | null;
  builder: string;
  desc: string | null;
  stories: string | null;
  bugs: string | null;
  createdBy: string;
  createdAt: string;
}

export interface BuildDetailVo extends Omit<BuildVo, 'stories' | 'bugs'> {
  stories: StoryVo[];
  bugs: BugVo[];
}

export const buildApi = {
  list(productId?: number | string): Promise<BuildVo[]> {
    return http.get('/builds', { params: productId ? { productId } : undefined }) as Promise<
      BuildVo[]
    >;
  },

  get(id: number | string): Promise<BuildDetailVo> {
    return http.get(`/builds/${id}`) as Promise<BuildDetailVo>;
  },

  create(dto: {
    productId: string;
    name: string;
    date: string;
    builder: string;
    projectId?: string;
    executionId?: string;
    scmPath?: string;
    desc?: string;
    storyIds?: string[];
  }): Promise<BuildVo> {
    return http.post('/builds', dto) as Promise<BuildVo>;
  },

  /** 关联需求（追加语义，返回新关联数） */
  linkStories(id: number | string, storyIds: string[]): Promise<number> {
    return http.post(`/builds/${id}/stories`, { storyIds }) as Promise<number>;
  },

  unlinkStory(id: number | string, storyId: number | string): Promise<null> {
    return http.delete(`/builds/${id}/stories/${storyId}`) as Promise<null>;
  },

  /** 关联 Bug：未解决的自动置 resolved/fixed 并回指开单人 */
  linkBugs(id: number | string, bugIds: string[]): Promise<number> {
    return http.post(`/builds/${id}/bugs`, { bugIds }) as Promise<number>;
  },

  unlinkBug(id: number | string, bugId: number | string): Promise<null> {
    return http.delete(`/builds/${id}/bugs/${bugId}`) as Promise<null>;
  },
};
