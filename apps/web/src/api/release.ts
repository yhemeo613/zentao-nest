import { http } from '../lib/http.js';
import type { ReleaseStatus } from '@zentao/shared';

/** 发布（契约：release.controller，2026-11-06 以源码为准；状态 wait|normal|fail|terminate） */
export interface ReleaseVo {
  id: number;
  projectIds: string | null;
  productId: number;
  branch: string;
  buildIds: string | null;
  name: string;
  marker: number;
  date: string | null;
  releasedDate: string | null;
  stories: string | null;
  bugs: string | null;
  leftBugs: string | null;
  desc: string | null;
  status: ReleaseStatus;
  createdBy: string;
  createdAt: string;
}

export interface ReleaseRelatedVo {
  id: string;
  releaseId: string;
  objectType: 'story' | 'bug' | 'build';
  objectId: string;
}

export interface ReleaseDetailVo extends ReleaseVo {
  related: ReleaseRelatedVo[];
}

export const releaseApi = {
  list(productId?: number | string): Promise<ReleaseVo[]> {
    return http.get('/releases', { params: productId ? { productId } : undefined }) as Promise<
      ReleaseVo[]
    >;
  },

  get(id: number | string): Promise<ReleaseDetailVo> {
    return http.get(`/releases/${id}`) as Promise<ReleaseDetailVo>;
  },

  /** 创建时自动汇总 buildIds 的 stories/bugs/leftBugs */
  create(dto: {
    productId: string;
    name: string;
    buildIds: string[];
    date: string;
    projectIds?: string;
    desc?: string;
  }): Promise<ReleaseVo> {
    return http.post('/releases', dto) as Promise<ReleaseVo>;
  },

  /** wait|fail → normal，置 releasedDate，并逐需求 stage=released */
  publish(id: number | string): Promise<ReleaseVo> {
    return http.post(`/releases/${id}/publish`) as Promise<ReleaseVo>;
  },

  /** terminate 需 normal、activate 需 terminate（4402） */
  changeStatus(id: number | string, action: 'activate' | 'terminate'): Promise<ReleaseVo> {
    return http.post(`/releases/${id}/change-status`, { action }) as Promise<ReleaseVo>;
  },

  /** status=normal 时拒绝删除（3007，须先停止维护） */
  remove(id: number | string): Promise<null> {
    return http.delete(`/releases/${id}`) as Promise<null>;
  },
};
