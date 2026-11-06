import { http } from '../lib/http.js';

/** 操作日志（契约：apps/server oa.controller GET /actions；登录即可，全站动作审计） */
export interface ActionLogVo {
  id: string;
  objectType: 'story' | 'task' | 'bug' | 'product' | 'project' | 'program' | 'todo' | 'build';
  objectId: string;
  actor: string;
  /** opened/started/finished/resolved/assigned…（动作矩阵 docs/02 §9.2） */
  action: string;
  actionDate: string;
  comment: string | null;
  extra: string;
}

export const oaApi = {
  /** 某对象的操作日志（DESC，100 条封顶） */
  actions(objectType: string, objectId: number | string): Promise<ActionLogVo[]> {
    return http.get('/actions', { params: { objectType, objectId } }) as Promise<ActionLogVo[]>;
  },
};
