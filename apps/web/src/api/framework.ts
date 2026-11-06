import { http } from '../lib/http.js';

/** 产品（契约：docs/03 §4.3） */
export interface ProductVo {
  id: string;
  programId: number;
  name: string;
  code: string;
  status: string;
  poId: string;
  qdId: string;
  rdId: string;
  acl: string;
  desc: string | null;
  createdAt: string;
}

export const productApi = {
  list(): Promise<ProductVo[]> {
    return http.get('/products') as Promise<ProductVo[]>;
  },

  get(id: string): Promise<ProductVo> {
    return http.get(`/products/${id}`) as Promise<ProductVo>;
  },

  create(dto: {
    name: string;
    programId?: number;
    code?: string;
    poId?: string;
    desc?: string;
  }): Promise<ProductVo> {
    return http.post('/products', dto) as Promise<ProductVo>;
  },

  update(id: string, dto: { name?: string; desc?: string }): Promise<ProductVo> {
    return http.put(`/products/${id}`, dto) as Promise<ProductVo>;
  },

  close(id: string): Promise<ProductVo> {
    return http.post(`/products/${id}/close`) as Promise<ProductVo>;
  },

  activate(id: string): Promise<ProductVo> {
    return http.post(`/products/${id}/activate`) as Promise<ProductVo>;
  },
};

/** 项目（契约：docs/03 §4.8） */
export interface ProjectVo {
  id: string;
  programId: number;
  name: string;
  code: string;
  model: string;
  begin: string | null;
  end: string | null;
  status: string;
  pmId: string;
  multiple: number;
  acl: string;
  progress: string;
}

export const projectApi = {
  list(programId?: string): Promise<ProjectVo[]> {
    const query = programId ? `?programId=${programId}` : '';
    return http.get(`/projects${query}`) as Promise<ProjectVo[]>;
  },

  get(id: string): Promise<ProjectVo> {
    return http.get(`/projects/${id}`) as Promise<ProjectVo>;
  },

  create(dto: {
    name: string;
    code: string;
    model: string;
    begin: string;
    end: string;
    programId?: number;
    multiple?: number;
    pmId?: string;
  }): Promise<ProjectVo> {
    return http.post('/projects', dto) as Promise<ProjectVo>;
  },

  transition(
    id: string,
    action: 'start' | 'suspend' | 'close' | 'activate',
    closedReason?: string,
  ): Promise<ProjectVo> {
    const body = action === 'close' ? { closedReason: closedReason ?? 'done' } : undefined;
    return http.post(`/projects/${id}/${action}`, body ?? {}) as Promise<ProjectVo>;
  },
};

/** 执行（契约：docs/03 §4.9） */
export interface ExecutionVo {
  id: string;
  projectId: number;
  type: string;
  name: string;
  begin: string | null;
  end: string | null;
  status: string;
  sprintGoal: string;
  grade: number;
}

export const executionApi = {
  list(projectId: string): Promise<ExecutionVo[]> {
    return http.get(`/executions?projectId=${projectId}`) as Promise<ExecutionVo[]>;
  },

  get(id: string): Promise<ExecutionVo> {
    return http.get(`/executions/${id}`) as Promise<ExecutionVo>;
  },

  create(dto: {
    projectId: string;
    name: string;
    begin: string;
    end: string;
    sprintGoal?: string;
  }): Promise<ExecutionVo> {
    return http.post('/executions', dto) as Promise<ExecutionVo>;
  },

  transition(
    id: string,
    action: 'start' | 'suspend' | 'activate' | 'close' | 'back-to-wait',
    closedReason?: string,
  ): Promise<ExecutionVo> {
    const body = action === 'close' ? { closedReason: closedReason ?? 'done' } : undefined;
    return http.post(`/executions/${id}/${action}`, body ?? {}) as Promise<ExecutionVo>;
  },
};
