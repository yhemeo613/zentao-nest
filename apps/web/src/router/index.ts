import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { usePermissionStore } from '../stores/permission.js';
import { setUnauthorizedHandler } from '../lib/http.js';

/**
 * 静态路由表 + 三层权限控制（docs/05 §5，ADR D010）
 * meta 约定：title（页签）、requiresAuth（默认 true）、permission（module.action，数组=任一满足）
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('../layouts/blank-layout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('../views/auth/login.vue'),
        meta: { title: '登录', requiresAuth: false },
      },
    ],
  },
  {
    path: '/',
    component: () => import('../layouts/admin-layout.vue'),
    children: [
      {
        path: '',
        redirect: { name: 'status' },
      },
      {
        path: 'status',
        name: 'status',
        component: () => import('../views/status/system-status.vue'),
        meta: { title: '系统状态', requiresAuth: false },
      },
      {
        path: 'programs',
        name: 'program-list',
        component: () => import('../views/program/program-list.vue'),
        meta: { title: '项目集列表', permission: 'program.browse' },
      },
      {
        path: 'programs/:id',
        name: 'program-detail',
        component: () => import('../views/program/program-detail.vue'),
        meta: { title: '项目集详情', permission: 'program.view' },
      },
      {
        path: 'products',
        name: 'product-list',
        component: () => import('../views/product/product-list.vue'),
        meta: { title: '产品列表', permission: 'product.browse' },
      },
      {
        path: 'projects',
        name: 'project-list',
        component: () => import('../views/project/project-list.vue'),
        meta: { title: '项目列表', permission: 'project.browse' },
      },
      {
        path: 'executions',
        name: 'execution-list',
        component: () => import('../views/execution/execution-list.vue'),
        meta: { title: '执行列表', permission: 'execution.browse' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/dashboard/dashboard.vue'),
        meta: { title: '我的概览', requiresAuth: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'status' },
  },
];

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  // 守卫：登录态 + 权限点（docs/05 §5.2）
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    const permission = usePermissionStore();

    if (to.name === 'login') {
      return auth.isLoggedIn ? { name: 'dashboard' } : true;
    }
    if (to.meta.requiresAuth !== false && !auth.isLoggedIn) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    const required = to.meta.permission as string | string[] | undefined;
    if (required && !permission.has(required)) {
      return { name: 'forbidden' };
    }
    return true;
  });

  // http 层 401 桥接：清会话 → 登录页（docs/05 §4 错误码路由）
  setUnauthorizedHandler(() => {
    const auth = useAuthStore();
    auth.forceLogout();
    void router.push({ name: 'login' });
  });

  return router;
}
