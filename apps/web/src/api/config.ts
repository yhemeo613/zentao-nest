import { http } from '../lib/http.js';

/** 运行时配置（契约：config.controller GET/PUT /configs；只读键 5503 拒绝，变更即时失效缓存） */
export interface SysConfigVo {
  id: string;
  scope: string;
  owner: string;
  module: string;
  section: string;
  keyName: string;
  value: string | null;
  createdAt: string;
}

export const configApi = {
  list(): Promise<SysConfigVo[]> {
    return http.get('/configs') as Promise<SysConfigVo[]>;
  },

  /** 批量更新（items 全量按 module/section/key 定位） */
  setMany(
    items: Array<{ module: string; section: string; key: string; value: string }>,
  ): Promise<number> {
    return http.put('/configs', { items }) as Promise<number>;
  },
};
