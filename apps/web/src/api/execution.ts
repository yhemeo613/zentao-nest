import { http } from '../lib/http.js';

/** 执行（契约：docs/03 §4.9，2026-11-06 以源码为准；GET /executions 的 projectId 实际必填） */
export interface ExecutionVo {
  id: number;
  projectId: number;
  type: 'sprint' | 'stage' | 'kanban';
  grade: number;
  parentId: number;
  pathStr: string;
  name: string;
  attribute: string | null;
  begin: string | null;
  end: string | null;
  realBegan: string | null;
  realEnd: string | null;
  status: 'wait' | 'doing' | 'suspended' | 'closed';
  sprintGoal: string | null;
  milestone: number;
  percent: number;
  progress: string;
  estimate: number;
  consumed: number;
  left: number;
}

export const executionApi = {
  list(projectId: number | string): Promise<ExecutionVo[]> {
    return http.get('/executions', { params: { projectId } }) as Promise<ExecutionVo[]>;
  },

  get(id: number | string): Promise<ExecutionVo> {
    return http.get(`/executions/${id}`) as Promise<ExecutionVo>;
  },

  create(dto: {
    projectId: string;
    name: string;
    begin: string;
    end: string;
    days?: number;
    attribute?: 'mix' | 'request' | 'design' | 'dev' | 'qa' | 'release' | 'review' | 'other';
    parentId?: string;
    sprintGoal?: string;
    milestone?: 0 | 1;
    percent?: number;
  }): Promise<ExecutionVo> {
    return http.post('/executions', dto) as Promise<ExecutionVo>;
  },

  update(
    id: number | string,
    dto: { name?: string; end?: string; sprintGoal?: string; sortNo?: number },
  ): Promise<ExecutionVo> {
    return http.put(`/executions/${id}`, dto) as Promise<ExecutionVo>;
  },

  remove(id: number | string): Promise<null> {
    return http.delete(`/executions/${id}`) as Promise<null>;
  },

  /** start 向上传播（执行→项目→项目集）；putoff 需 {end}；close 必填 closedReason */
  transition(
    id: number | string,
    action: 'start' | 'suspend' | 'activate' | 'close',
    closedReason?: string,
  ): Promise<ExecutionVo> {
    const body = action === 'close' ? { closedReason: closedReason ?? 'done' } : undefined;
    return http.post(`/executions/${id}/${action}`, body ?? {}) as Promise<ExecutionVo>;
  },

  putoff(id: number | string, end: string): Promise<ExecutionVo> {
    return http.post(`/executions/${id}/putoff`, { end }) as Promise<ExecutionVo>;
  },

  backToWait(id: number | string): Promise<ExecutionVo> {
    return http.post(`/executions/${id}/back-to-wait`) as Promise<ExecutionVo>;
  },
};
