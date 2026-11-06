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
/** 刷新协调器：auth store 注入（raw axios 直连 refresh，避免拦截器递归） */
type RefreshHandler = () => Promise<boolean>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
/** token 提供者：由 auth store 注入（单一事实源，避免存储键位漂移） */
let tokenProvider: TokenProvider = () => null;
let refreshHandler: RefreshHandler | null = null;
/** 401 单飞刷新（并发 401 只发起一次刷新，成功后各自重放，docs/05 §4） */
let refreshing: Promise<boolean> | null = null;

/** 由 auth store 注入：401 清会话并跳登录 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

/** 由 auth store 注入：动态取当前 accessToken */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/** 由 auth store 注入：refresh 执行体（成功返回 true 并已更新本地 token） */
export function setRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

interface ReplayConfig extends InternalAxiosRequestConfig {
  /** 已重放一次的请求不再重试刷新（防循环） */
  __retried?: boolean;
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
    const config = error.config as ReplayConfig | undefined;

    // 认证失效：先单飞刷新再重放一次；刷新不可用/失败 → 清会话跳登录（docs/05 §4）
    if (status === 401 && config && !config.__retried && refreshHandler) {
      refreshing ??= refreshHandler().finally(() => {
        refreshing = null;
      });
      const ok = await refreshing;
      if (ok) {
        config.__retried = true;
        return http.request(config);
      }
    }
    if (status === 401) {
      unauthorizedHandler?.();
    }

    return Promise.reject(
      new ApiError(
        body?.code ??
          (status === 401 ? ErrorCodes.AUTH.TOKEN_INVALID : ErrorCodes.SYS.DEPENDENCY_UNAVAILABLE),
        body?.message ?? error.message,
        body?.traceId ?? '-',
      ),
    );
  },
);
