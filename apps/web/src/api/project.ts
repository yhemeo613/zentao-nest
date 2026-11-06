import { http } from '../lib/http.js';

/** 项目（契约：docs/03 §4.8，2026-11-06 以源码为准） */
export interface ProjectVo {
  id: number;
  programId: number;
  name: string;
  code: string;
  model: 'scrum' | 'waterfall' | 'kanban';
  begin: string | null;
  end: string | null;
  realBegan: string | null;
  realEnd: string | null;
  status: 'wait' | 'doing' | 'suspended' | 'closed';
  progress: string;
  estimate: number;
  consumed: number;
  left: number;
  pmId: string | null;
  multiple: number;
  acl: string;
  closedReason: string | null;
  desc: string | null;
}

/** 项目-产品关联（GET/PUT /projects/:id/products） */
export interface ProjectProductVo {
  id: number;
  projectId: number;
  productId: number;
  branchId: number;
  plan: string | null;
  roadmap: string | null;
  productName?: string;
}

export const projectApi = {
  list(programId?: number): Promise<ProjectVo[]> {
    return http.get('/projects', { params: programId ? { programId } : undefined }) as Promise<
      ProjectVo[]
    >;
  },

  get(id: number | string): Promise<ProjectVo> {
    return http.get(`/projects/${id}`) as Promise<ProjectVo>;
  },

  create(dto: {
    name: string;
    code: string;
    model: 'scrum' | 'waterfall' | 'kanban';
    begin: string;
    end: string;
    programId?: number;
    days?: number;
    pmId?: string;
    multiple?: 0 | 1;
    acl?: string;
    whitelist?: string[];
    desc?: string;
  }): Promise<ProjectVo> {
    return http.post('/projects', dto) as Promise<ProjectVo>;
  },

  update(
    id: number | string,
    dto: { name?: string; pmId?: string; end?: string; desc?: string },
  ): Promise<ProjectVo> {
    return http.put(`/projects/${id}`, dto) as Promise<ProjectVo>;
  },

  remove(id: number | string): Promise<null> {
    return http.delete(`/projects/${id}`) as Promise<null>;
  },

  /** 关联产品（全量替换语义） */
  setProducts(
    id: number | string,
    items: Array<{ productId: string; plan?: string; roadmap?: string }>,
  ): Promise<ProjectProductVo[]> {
    return http.put(`/projects/${id}/products`, { items }) as Promise<ProjectProductVo[]>;
  },

  listProducts(id: number | string): Promise<ProjectProductVo[]> {
    return http.get(`/projects/${id}/products`) as Promise<ProjectProductVo[]>;
  },

  /** 状态流转：start 向上传播项目集 wait→doing；close 必填 closedReason */
  transition(
    id: number | string,
    action: 'start' | 'suspend' | 'close' | 'activate',
    closedReason?: string,
  ): Promise<ProjectVo> {
    const body = action === 'close' ? { closedReason: closedReason ?? 'done' } : undefined;
    return http.post(`/projects/${id}/${action}`, body ?? {}) as Promise<ProjectVo>;
  },
};
