import { http } from '../lib/http.js';
import type { TaskStatus, TaskType } from '@zentao/shared';

/** 任务（契约：docs/03 §4.10，2026-11-06 以源码为准；状态机前置见 shared TASK_TRANSITIONS） */
export interface TaskVo {
  id: number;
  projectId: number;
  parentId: number;
  isParent: number;
  executionId: number;
  storyId: number;
  storyVersion: number;
  fromBugId: number | null;
  name: string;
  type: TaskType;
  pri: number;
  estimate: number;
  consumed: number;
  left: number;
  deadline: string | null;
  status: TaskStatus;
  desc: string | null;
  openedBy: string | null;
  openedAt: string | null;
  assignedTo: string | null;
  assignedAt: string | null;
  estStarted: string | null;
  realStarted: string | null;
  finishedBy: string | null;
  finishedAt: string | null;
  closedReason: string | null;
}

/** 工时流水（GET /tasks/:id 内嵌 efforts） */
export interface EffortVo {
  id: number;
  objectType: string;
  objectId: number;
  projectId: number;
  executionId: number;
  userId: string;
  date: string;
  consumed: number;
  left: number;
  work: string;
  createdAt: string;
}

export interface TaskDetailVo extends TaskVo {
  efforts: EffortVo[];
  children: TaskVo[];
}

export const taskApi = {
  list(
    query: {
      executionId?: number | string;
      projectId?: number | string;
      storyId?: number | string;
      status?: string;
      assignedTo?: string;
    } = {},
  ): Promise<TaskVo[]> {
    return http.get('/tasks', { params: query }) as Promise<TaskVo[]>;
  },

  get(id: number | string): Promise<TaskDetailVo> {
    return http.get(`/tasks/${id}`) as Promise<TaskDetailVo>;
  },

  create(dto: {
    projectId: string;
    executionId: string;
    name: string;
    type?: TaskType;
    storyId?: string;
    pri?: number;
    estimate: number;
    assignedTo?: string;
    estStarted?: string;
    deadline?: string;
    desc?: string;
  }): Promise<TaskVo> {
    return http.post('/tasks', dto) as Promise<TaskVo>;
  },

  /** start：consumed≥0 须≥旧值；left=0 直接完成 */
  start(
    id: number | string,
    dto: { consumed: number; left: number; realStarted?: string },
  ): Promise<TaskVo> {
    return http.post(`/tasks/${id}/start`, dto) as Promise<TaskVo>;
  },

  restart(id: number | string): Promise<TaskVo> {
    return http.post(`/tasks/${id}/restart`) as Promise<TaskVo>;
  },

  pause(id: number | string): Promise<TaskVo> {
    return http.post(`/tasks/${id}/pause`) as Promise<TaskVo>;
  },

  finish(
    id: number | string,
    dto: {
      consumed: number;
      realStarted: string;
      left?: number;
      finishedDate: string;
      work?: string;
    },
  ): Promise<TaskVo> {
    return http.post(`/tasks/${id}/finish`, dto) as Promise<TaskVo>;
  },

  cancel(id: number | string): Promise<TaskVo> {
    return http.post(`/tasks/${id}/cancel`) as Promise<TaskVo>;
  },

  close(id: number | string): Promise<TaskVo> {
    return http.post(`/tasks/${id}/close`) as Promise<TaskVo>;
  },

  activate(id: number | string, dto: { left: number }): Promise<TaskVo> {
    return http.post(`/tasks/${id}/activate`, dto) as Promise<TaskVo>;
  },

  assign(id: number | string, dto: { assignedTo: string; left?: number }): Promise<TaskVo> {
    return http.put(`/tasks/${id}/assign`, dto) as Promise<TaskVo>;
  },

  update(
    id: number | string,
    dto: { name?: string; desc?: string; deadline?: string; pri?: number },
  ): Promise<TaskVo> {
    return http.put(`/tasks/${id}`, dto) as Promise<TaskVo>;
  },

  remove(id: number | string): Promise<null> {
    return http.delete(`/tasks/${id}`) as Promise<null>;
  },

  /** 记工时（隐式状态迁移：left=0 隐式完成，docs/02 §6.4） */
  recordEffort(
    id: number | string,
    dto: { date: string; consumed: number; left: number; work: string },
  ): Promise<TaskVo> {
    return http.post(`/tasks/${id}/efforts`, dto) as Promise<TaskVo>;
  },

  deleteEffort(id: number | string, effortId: number | string): Promise<TaskVo> {
    return http.delete(`/tasks/${id}/efforts/${effortId}`) as Promise<TaskVo>;
  },

  /** 添加子任务（父任务 isParent=1，工时聚合） */
  addChildren(
    id: number | string,
    children: Array<{ name: string; estimate: number; type?: string; assignedTo?: string }>,
  ): Promise<TaskVo[]> {
    return http.post(`/tasks/${id}/children`, { children }) as Promise<TaskVo[]>;
  },
};
