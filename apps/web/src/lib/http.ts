import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { ErrorCodes } from '@zentao/shared';

/** 统一业务错误（docs/05 §4：拦截器解包后抛出，禁止业务代码读 res.code） */
export class ApiError extends Error {
  readonly code: number;
  readonly traceId: string;

  constructor(code: number, message: string, traceId: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.traceId = traceId;
  }
}

type UnauthorizedHandler = () => void;
type TokenProvider = () => string | null;

let unauthorizedHandler: UnauthorizedHandler | null = null;
/** token 提供者：由 auth store 注入（单一事实源，避免存储键位漂移） */
let tokenProvider: TokenProvider = () => null;
/** 刷新队列（P1 /auth/refresh 落地后启用单飞刷新+重放，docs/05 §4） */
let refreshing: Promise<boolean> | null = null;

/** 由 auth store 注入：401 清会话并跳登录 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

/** 由 auth store 注入：动态取当前 accessToken */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api/v1',
  timeout: 15_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenProvider();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Trace-Id'] = crypto.randomUUID();
  return config;
});

http.interceptors.response.use(
  // 统一解包：code===0 → data；否则抛 ApiError（docs/06 §4.4 响应类型约束）
  (res) => {
    const body = res.data as { code: number; message: string; data: unknown; traceId: string };
    if (body.code === 0) return body.data as never;
    return Promise.reject(new ApiError(body.code, body.message, body.traceId));
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const body = error.response?.data as
      { code?: number; message?: string; traceId?: string } | undefined;

    // 认证失效：2001/2002/2007（docs/05 §4 错误码路由）——P1 接入 refresh 后先尝试刷新
    if (status === 401) {
      if (refreshing) {
        await refreshing.catch(() => undefined);
      } else if (unauthorizedHandler) {
        unauthorizedHandler();
      }
      return Promise.reject(
        new ApiError(
          body?.code ?? ErrorCodes.AUTH.TOKEN_INVALID,
          body?.message ?? '登录状态失效',
          body?.traceId ?? '-',
        ),
      );
    }

    return Promise.reject(
      new ApiError(
        body?.code ?? ErrorCodes.SYS.DEPENDENCY_UNAVAILABLE,
        body?.message ?? error.message,
        body?.traceId ?? '-',
      ),
    );
  },
);

/** P1 落地：单飞刷新（占位拒绝，不做假成功——docs/06 §1 纪律） */
export function beginRefresh(): Promise<boolean> {
  refreshing = Promise.reject(new Error('refresh 接口随 P1 交付'));
  refreshing.catch(() => undefined);
  return refreshing.finally(() => {
    refreshing = null;
  });
}
