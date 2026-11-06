import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { PERMS } from '@zentao/shared';
import { useAuthStore } from '../stores/auth.js';
import { usePermissionStore } from '../stores/permission.js';
import { setUnauthorizedHandler } from '../lib/http.js';

/**
 * 静态路由表 + 三层权限控制（docs/05 §5，ADR D010）
 * meta 约定：title（页签）、requiresAuth（默认 true）、permission（module.action，数组=任一满足）
 * 权限点一律 import PERMS（@zentao/shared 单源，AGENTS §4）
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
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/dashboard/dashboard.vue'),
        meta: { title: '我的地盘', requiresAuth: true },
      },
      {
        path: '403',
        name: 'forbidden',
        component: () => import('../views/error/forbidden.vue'),
        meta: { title: '无权访问', requiresAuth: false },
      },
      {
        path: 'status',
        name: 'status',
        component: () => import('../views/status/system-status.vue'),
        meta: { title: '系统状态', requiresAuth: false },
      },
      {
        path: 'system/users',
        name: 'system-users',
        component: () => import('../views/system/user-list.vue'),
        meta: { title: '用户', permission: PERMS.user.browse },
      },
      {
        path: 'system/roles',
        name: 'system-roles',
        component: () => import('../views/system/role-list.vue'),
        meta: { title: '角色权限', permission: PERMS.group.browse },
      },
      {
        path: 'system/depts',
        name: 'system-depts',
        component: () => import('../views/system/dept-list.vue'),
        meta: { title: '部门', permission: PERMS.dept.browse },
      },
      {
        path: 'system/configs',
        name: 'system-configs',
        component: () => import('../views/system/config-list.vue'),
        meta: { title: '配置', permission: PERMS.config.browse },
      },
      {
        path: 'programs',
        name: 'program-list',
        component: () => import('../views/program/program-list.vue'),
        meta: { title: '项目集', permission: PERMS.program.browse },
      },
      {
        path: 'programs/:id',
        name: 'program-detail',
        component: () => import('../views/program/program-detail.vue'),
        meta: { title: '项目集详情', permission: PERMS.program.view },
      },
      {
        path: 'products',
        name: 'product-list',
        component: () => import('../views/product/product-list.vue'),
        meta: { title: '产品', permission: PERMS.product.browse },
      },
      {
        path: 'products/:id',
        name: 'product-detail',
        component: () => import('../views/product/product-detail.vue'),
        meta: { title: '产品详情', permission: PERMS.product.view },
      },
      {
        path: 'projects',
        name: 'project-list',
        component: () => import('../views/project/project-list.vue'),
        meta: { title: '项目', permission: PERMS.project.browse },
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: () => import('../views/project/project-detail.vue'),
        meta: { title: '项目详情', permission: PERMS.project.view },
      },
      {
        path: 'executions',
        name: 'execution-list',
        component: () => import('../views/execution/execution-list.vue'),
        meta: { title: '执行', permission: PERMS.execution.browse },
      },
      {
        path: 'executions/:id',
        name: 'execution-detail',
        component: () => import('../views/execution/execution-detail.vue'),
        meta: { title: '执行详情', permission: PERMS.execution.view },
      },
      {
        path: 'stories',
        name: 'story-list',
        component: () => import('../views/story/story-list.vue'),
        meta: { title: '需求', permission: PERMS.story.browse },
      },
      {
        path: 'stories/:id',
        name: 'story-detail',
        component: () => import('../views/story/story-detail.vue'),
        meta: { title: '需求详情', permission: PERMS.story.view },
      },
      {
        path: 'tasks',
        name: 'task-list',
        component: () => import('../views/task/task-list.vue'),
        meta: { title: '任务', permission: PERMS.task.browse },
      },
      {
        path: 'tasks/:id',
        name: 'task-detail',
        component: () => import('../views/task/task-detail.vue'),
        meta: { title: '任务详情', permission: PERMS.task.view },
      },
      {
        path: 'bugs',
        name: 'bug-list',
        component: () => import('../views/bug/bug-list.vue'),
        meta: { title: 'Bug', permission: PERMS.bug.browse },
      },
      {
        path: 'bugs/:id',
        name: 'bug-detail',
        component: () => import('../views/bug/bug-detail.vue'),
        meta: { title: 'Bug 详情', permission: PERMS.bug.view },
      },
      {
        path: 'cases',
        name: 'case-list',
        component: () => import('../views/case/case-list.vue'),
        meta: { title: '用例库', permission: PERMS.case.browse },
      },
      {
        path: 'cases/:id',
        name: 'case-detail',
        component: () => import('../views/case/case-detail.vue'),
        meta: { title: '用例详情', permission: PERMS.case.view },
      },
      {
        path: 'testtasks',
        name: 'testtask-list',
        component: () => import('../views/testtask/testtask-list.vue'),
        meta: { title: '测试单', permission: PERMS.testtask.browse },
      },
      {
        path: 'testtasks/:id',
        name: 'testtask-detail',
        component: () => import('../views/testtask/testtask-detail.vue'),
        meta: { title: '测试单详情', permission: PERMS.testtask.view },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'dashboard' },
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
    // 会话恢复：持久化 token 在手但内存无用户/权限（刷新或重开浏览器）→ 补拉 /auth/me
    if (auth.isLoggedIn && !auth.user) {
      try {
        await auth.fetchMe();
      } catch {
        auth.forceLogout();
        return { name: 'login', query: { redirect: to.fullPath } };
      }
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
