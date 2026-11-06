import { http } from '../lib/http.js';

/** 项目集（契约：docs/03 §4.2，2026-11-06 以源码为准） */
export interface ProgramVo {
  id: number;
  parentId: number;
  grade: number;
  pathStr: string;
  sortNo: number;
  name: string;
  code: string | null;
  pmId: string | null;
  budget: number | null;
  budgetUnit: string;
  begin: string | null;
  end: string | null;
  realBegan: string | null;
  realEnd: string | null;
  status: 'wait' | 'doing' | 'suspended' | 'closed';
  closedReason: string | null;
  acl: string;
  desc: string | null;
}

export interface ProgramSummaryVo {
  products: number;
  projects: number;
  childPrograms: number;
}

export const programApi = {
  list(): Promise<ProgramVo[]> {
    return http.get('/programs') as Promise<ProgramVo[]>;
  },

  get(id: number | string): Promise<ProgramVo> {
    return http.get(`/programs/${id}`) as Promise<ProgramVo>;
  },

  create(dto: {
    name: string;
    parentId?: number;
    begin: string;
    end: string;
    code?: string;
    pmId?: string;
    budget?: number;
    budgetUnit?: string;
    desc?: string;
    acl?: string;
    sortNo?: number;
  }): Promise<ProgramVo> {
    return http.post('/programs', dto) as Promise<ProgramVo>;
  },

  /** begin 不可改；end 为延期 */
  update(
    id: number | string,
    dto: {
      name?: string;
      code?: string;
      pmId?: string;
      budget?: number;
      end?: string;
      desc?: string;
      sortNo?: number;
    },
  ): Promise<ProgramVo> {
    return http.put(`/programs/${id}`, dto) as Promise<ProgramVo>;
  },

  /** 有子项目集/产品/项目报 4002 */
  remove(id: number | string): Promise<null> {
    return http.delete(`/programs/${id}`) as Promise<null>;
  },

  /** close 必填 closedReason；有未关子项目集 4603 */
  transition(
    id: number | string,
    action: 'start' | 'suspend' | 'close' | 'activate',
    closedReason?: string,
  ): Promise<ProgramVo> {
    const body = action === 'close' ? { closedReason: closedReason ?? 'done' } : undefined;
    return http.post(`/programs/${id}/${action}`, body ?? {}) as Promise<ProgramVo>;
  },

  summary(id: number | string): Promise<ProgramSummaryVo> {
    return http.get(`/programs/${id}/summary`) as Promise<ProgramSummaryVo>;
  },
};
