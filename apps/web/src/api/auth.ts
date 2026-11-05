import { http } from '../lib/http.js';

/** 登录入参（契约：docs/03 §4.0 LoginDto） */
export interface LoginParams {
  account: string;
  password: string;
}

/** 登录/刷新响应（契约：docs/03 §4.0 TokenPairVo） */
export interface TokenPairVo {
  accessToken: string;
  /** Redis 白名单可吊销（docs/01 §9） */
  refreshToken: string;
}

/** 当前用户（契约：docs/03 §4.0 CurrentUserVo） */
export interface CurrentUserVo {
  id: number;
  account: string;
  realname: string;
  /** 权限点集合 module.action（docs/05 §5.1 契约） */
  permissions: string[];
}

export const authApi = {
  /** POST /auth/login */
  login(params: LoginParams): Promise<TokenPairVo> {
    return http.post('/auth/login', params) as Promise<TokenPairVo>;
  },

  /** POST /auth/refresh（P1 交付，docs/03 §4.0） */
  refresh(refreshToken: string): Promise<TokenPairVo> {
    return http.post('/auth/refresh', { refreshToken }) as Promise<TokenPairVo>;
  },

  /** POST /auth/logout */
  logout(): Promise<void> {
    return http.post('/auth/logout') as Promise<void>;
  },

  /** GET /auth/me */
  me(): Promise<CurrentUserVo> {
    return http.get('/auth/me') as Promise<CurrentUserVo>;
  },
};
