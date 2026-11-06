import { http } from '../lib/http.js';

/** 项目集（契约：docs/03 §4.2） */
export interface ProgramVo {
  id: string;
  parentId: number;
  grade: number;
  pathStr: string;
  name: string;
  code: string;
  pmId: string;
  budget: string;
  budgetUnit: string;
  begin: string | null;
  end: string | null;
  status: string;
  acl: string;
  desc: string | null;
}

export const programApi = {
  /** GET /programs 项目集列表 */
  list(): Promise<ProgramVo[]> {
    return http.get('/programs') as Promise<ProgramVo[]>;
  },

  /** GET /programs/:id */
  get(id: string): Promise<ProgramVo> {
    return http.get(`/programs/${id}`) as Promise<ProgramVo>;
  },

  /** POST /programs 创建 */
  create(dto: {
    name: string;
    parentId?: number;
    begin: string;
    end: string;
    code?: string;
    pmId?: string;
    desc?: string;
  }): Promise<ProgramVo> {
    return http.post('/programs', dto) as Promise<ProgramVo>;
  },

  /** PUT /programs/:id */
  update(
    id: string,
    dto: { name?: string; end?: string; desc?: string; pmId?: string },
  ): Promise<ProgramVo> {
    return http.put(`/programs/${id}`, dto) as Promise<ProgramVo>;
  },

  /** DELETE /programs/:id 软删 */
  remove(id: string): Promise<null> {
    return http.delete(`/programs/${id}`) as Promise<null>;
  },

  /** POST /programs/:id/start|suspend|close|activate 状态流转 */
  transition(
    id: string,
    action: 'start' | 'suspend' | 'close' | 'activate',
    closedReason?: string,
  ): Promise<ProgramVo> {
    const body = action === 'close' ? { closedReason: closedReason ?? 'done' } : undefined;
    return http.post(`/programs/${id}/${action}`, body ?? {}) as Promise<ProgramVo>;
  },

  /** GET /programs/:id/summary 概览 */
  summary(id: string): Promise<{ products: number; projects: number; childPrograms: number }> {
    return http.get(`/programs/${id}/summary`) as Promise<{
      products: number;
      projects: number;
      childPrograms: number;
    }>;
  },
};
