import { http } from '../lib/http.js';

/** 项目/执行团队（契约：docs/03 §4.x team，2026-11-06 以源码为准） */
export interface TeamVo {
  id: number;
  rootType: 'project' | 'execution';
  rootId: number;
  userId: string;
  role: string | null;
  position: string | null;
  limited: number;
  joinDate: string | null;
  days: number | null;
  hours: number | null;
  estimate: number;
  consumed: number;
  left: number;
}

export const teamApi = {
  list(rootType: 'project' | 'execution', rootId: number | string): Promise<TeamVo[]> {
    return http.get('/team', { params: { rootType, rootId } }) as Promise<TeamVo[]>;
  },

  add(dto: {
    rootType: 'project' | 'execution';
    rootId: string;
    userId: string;
    role?: string;
    position?: string;
    limited?: 0 | 1;
    days?: number;
    hours?: number;
  }): Promise<TeamVo> {
    return http.post('/team', dto) as Promise<TeamVo>;
  },

  update(
    id: number | string,
    dto: { role?: string; position?: string; days?: number; hours?: number },
  ): Promise<TeamVo> {
    return http.put(`/team/${id}`, dto) as Promise<TeamVo>;
  },

  remove(id: number | string): Promise<null> {
    return http.delete(`/team/${id}`) as Promise<null>;
  },
};
