import axios from 'axios';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type CurrentUserVo, type LoginParams } from '../api/auth.js';
import { setRefreshHandler, setTokenProvider } from '../lib/http.js';

const STORAGE_KEY = 'zentao.auth';

interface PersistedAuth {
  accessToken: string | null;
  refreshToken: string | null;
}

function loadPersisted(): PersistedAuth {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw) as Partial<PersistedAuth>;
    return {
      // 边界归一化（docs/06 §4.3）：历史数据可能是字符串 "null"
      accessToken:
        typeof parsed.accessToken === 'string' && parsed.accessToken ? parsed.accessToken : null,
      refreshToken:
        typeof parsed.refreshToken === 'string' && parsed.refreshToken ? parsed.refreshToken : null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

/** 会话状态：双 token + 当前用户 + 权限点集合（docs/05 §3 stores/auth） */
export const useAuthStore = defineStore('auth', () => {
  const persisted = loadPersisted();

  const accessToken = ref<string | null>(persisted.accessToken);
  const refreshToken = ref<string | null>(persisted.refreshToken);
  const user = ref<CurrentUserVo | null>(null);
  const permissions = ref<string[]>([]);

  const isLoggedIn = computed(() => accessToken.value !== null);

  function persist(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: accessToken.value, refreshToken: refreshToken.value }),
    );
  }

  async function login(params: LoginParams): Promise<void> {
    const tokens = await authApi.login(params);
    accessToken.value = tokens.accessToken;
    refreshToken.value = tokens.refreshToken;
    persist();
    await fetchMe();
  }

  async function fetchMe(): Promise<void> {
    user.value = await authApi.me();
    permissions.value = user.value.permissions ?? [];
  }

  /** 主动登出（调后端吊销；失败也继续清本地，docs/05 §4） */
  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // 吊销失败不阻断本地清会话；refresh token 由后端 TTL 兜底
    }
    forceLogout();
  }

  /** 清空本地会话（401 时由 http 桥接调用） */
  function forceLogout(): void {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    permissions.value = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    accessToken,
    refreshToken,
    user,
    permissions,
    isLoggedIn,
    login,
    fetchMe,
    logout,
    forceLogout,
    persist,
  };
});

/** pinia 安装后调用：把会话状态提供给 http 层（token/刷新/登出，单一事实源） */
export function installAuthBridge(): void {
  setTokenProvider(() => useAuthStore().accessToken);
  setRefreshHandler(async () => {
    const auth = useAuthStore();
    if (!auth.refreshToken) return false;
    try {
      // raw axios 直连：不走 http 实例拦截器，避免 401 刷新递归（docs/05 §4）
      const base = import.meta.env.VITE_API_BASE ?? '/api/v1';
      const res = await axios.post(`${base}/auth/refresh`, { refreshToken: auth.refreshToken });
      const body = res.data as {
        code: number;
        data?: { accessToken: string; refreshToken: string };
      };
      if (body.code !== 0 || !body.data) return false;
      auth.accessToken = body.data.accessToken;
      auth.refreshToken = body.data.refreshToken;
      auth.persist();
      return true;
    } catch {
      return false;
    }
  });
}
