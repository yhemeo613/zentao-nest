import { http } from '../lib/http.js';

/** 健康检查（契约：docs/01 §13 探活口径） */
export interface HealthVo {
  db: boolean;
  redis: boolean;
  uptime: number;
}

export const healthApi = {
  /** GET /health */
  getHealth(): Promise<HealthVo> {
    return http.get('/health') as Promise<HealthVo>;
  },
};
