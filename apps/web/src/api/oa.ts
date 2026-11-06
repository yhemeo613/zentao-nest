import { http } from '../lib/http.js';

/**
 * oa 域（契约：oa.controller，2026-11-06 以源码为准）。
 * actions/notifications 无权限点（登录即可）；todos/efforts 各有权限点。
 */

// ---- 操作日志 ----
export interface ActionLogVo {
  id: string;
  objectType: 'story' | 'task' | 'bug' | 'product' | 'project' | 'program' | 'todo' | 'build';
  objectId: string;
  actor: string;
  action: string;
  actionDate: string;
  comment: string | null;
  extra: string;
}

export interface ActionHistoryVo {
  id: string;
  actionId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export const oaApi = {
  /** 某对象的操作日志（DESC，100 条封顶） */
  actions(objectType: string, objectId: number | string): Promise<ActionLogVo[]> {
    return http.get('/actions', { params: { objectType, objectId } }) as Promise<ActionLogVo[]>;
  },

  /** 日志明细（含字段级 history） */
  actionDetail(id: number | string): Promise<ActionLogVo & { history: ActionHistoryVo[] }> {
    return http.get(`/actions/${id}`) as Promise<ActionLogVo & { history: ActionHistoryVo[] }>;
  },

  // ---- 待办 ----
  /** status 可逗号分隔多值；assignedTo=我 或 userId=我，200 条封顶 */
  todos(status?: string): Promise<TodoVo[]> {
    return http.get('/todos', { params: status ? { status } : undefined }) as Promise<TodoVo[]>;
  },

  /** type≠custom 必带 objectId；type=custom 必带 name */
  createTodo(dto: {
    type: 'custom' | 'task' | 'bug' | 'story' | 'test' | 'cycle';
    objectId?: string;
    date?: string;
    assignedTo?: string;
    pri?: number;
    name?: string;
    desc?: string;
  }): Promise<TodoVo> {
    return http.post('/todos', dto) as Promise<TodoVo>;
  },

  updateTodo(
    id: number | string,
    dto: { name?: string; desc?: string; pri?: number; date?: string },
  ): Promise<TodoVo> {
    return http.put(`/todos/${id}`, dto) as Promise<TodoVo>;
  },

  todoAction(
    id: number | string,
    action: 'start' | 'finish' | 'close' | 'activate',
  ): Promise<TodoVo> {
    return http.post(`/todos/${id}/${action}`) as Promise<TodoVo>;
  },

  deleteTodo(id: number | string): Promise<null> {
    return http.delete(`/todos/${id}`) as Promise<null>;
  },

  // ---- 工时填报 ----
  /** date>今天 4703；consumed 须>0；仅本人（effort.browse=我的） */
  createEffort(dto: {
    objectType: 'task' | 'story' | 'bug' | 'case' | 'todo' | 'custom';
    objectId?: string;
    date: string;
    consumed: number;
    left?: number;
    work: string;
  }): Promise<EffortVo> {
    return http.post('/efforts', dto) as Promise<EffortVo>;
  },

  /** 我的工时流水（begin/end 闭区间，200 条封顶，date DESC） */
  efforts(begin?: string, end?: string): Promise<EffortVo[]> {
    return http.get('/efforts', { params: { begin, end } }) as Promise<EffortVo[]>;
  },

  // ---- 站内通知（登录即可） ----
  notifications(unread?: boolean): Promise<NotifyVo[]> {
    return http.get('/notifications', { params: unread ? { unread: '1' } : undefined }) as Promise<
      NotifyVo[]
    >;
  },

  unreadCount(): Promise<number> {
    return http.get('/notifications/unread-count') as Promise<number>;
  },

  markRead(id: number | string): Promise<null> {
    return http.post(`/notifications/${id}/read`) as Promise<null>;
  },
};

export interface TodoVo {
  id: string;
  userId: string;
  date: string | null;
  type: 'custom' | 'task' | 'bug' | 'story' | 'test' | 'cycle';
  objectId: number;
  pri: number;
  name: string;
  desc: string | null;
  status: 'wait' | 'doing' | 'done' | 'closed';
  assignedTo: string;
  finishedBy: string | null;
  finishedAt: string | null;
  closedBy: string | null;
  closedAt: string | null;
}

export interface EffortVo {
  id: string;
  objectType: string;
  objectId: string;
  projectId: number;
  executionId: number;
  userId: string;
  date: string;
  consumed: number;
  left: number;
  work: string | null;
  createdAt: string;
}

export interface NotifyVo {
  id: string;
  objectType: string;
  objectId: string;
  action: string;
  toUserId: string;
  subject: string;
  data: Record<string, unknown> | null;
  status: 'wait' | 'done';
  createdAt: string;
  readAt: string | null;
}
