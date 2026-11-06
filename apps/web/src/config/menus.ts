import type { Component } from 'vue';
import {
  Box,
  Checked,
  Folder,
  Goods,
  Memo,
  Monitor,
  Notebook,
  Odometer,
  Setting,
  Tickets,
  User,
  VideoPlay,
  Warning,
  Document,
} from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';

export interface MenuItem {
  path: string;
  title: string;
  icon: Component;
  /** module.action 权限点（import 自 @zentao/shared PERMS，AGENTS §4 单源） */
  permission?: string;
}

export interface NavGroup {
  key: string;
  /** 顶部主导航显示名 */
  label: string;
  icon: Component;
  /** 路由前缀 → 顶部项激活判定 */
  matchPrefixes: string[];
  /** 侧栏子菜单（权限过滤后渲染） */
  items: MenuItem[];
}

/**
 * 双导航 IA（禅道式：顶部换语境、侧栏换页面，docs/10 §6.1）：
 * 需求/Bug 归产品域，任务归执行域，用例/测试单归测试域——与禅道心智一致。
 */
export const navGroups: NavGroup[] = [
  {
    key: 'my',
    label: '我的地盘',
    icon: Odometer,
    matchPrefixes: ['/dashboard'],
    items: [{ path: '/dashboard', title: '我的地盘', icon: Odometer }],
  },
  {
    key: 'program',
    label: '项目集',
    icon: Box,
    matchPrefixes: ['/programs'],
    items: [{ path: '/programs', title: '项目集', icon: Box, permission: PERMS.program.browse }],
  },
  {
    key: 'product',
    label: '产品',
    icon: Goods,
    matchPrefixes: ['/products', '/stories', '/bugs'],
    items: [
      { path: '/products', title: '产品', icon: Goods, permission: PERMS.product.browse },
      { path: '/stories', title: '需求', icon: Notebook, permission: PERMS.story.browse },
      { path: '/bugs', title: 'Bug', icon: Warning, permission: PERMS.bug.browse },
    ],
  },
  {
    key: 'project',
    label: '项目',
    icon: Folder,
    matchPrefixes: ['/projects'],
    items: [{ path: '/projects', title: '项目', icon: Folder, permission: PERMS.project.browse }],
  },
  {
    key: 'execution',
    label: '执行',
    icon: VideoPlay,
    matchPrefixes: ['/executions', '/tasks'],
    items: [
      { path: '/executions', title: '执行', icon: VideoPlay, permission: PERMS.execution.browse },
      { path: '/tasks', title: '任务', icon: Tickets, permission: PERMS.task.browse },
    ],
  },
  {
    key: 'quality',
    label: '测试',
    icon: Checked,
    matchPrefixes: ['/cases', '/testtasks', '/reports'],
    items: [
      { path: '/cases', title: '用例库', icon: Checked, permission: PERMS.case.browse },
      { path: '/testtasks', title: '测试单', icon: Memo, permission: PERMS.testtask.browse },
      { path: '/reports', title: '统计', icon: Odometer, permission: PERMS.report.view },
    ],
  },
  {
    key: 'collab',
    label: '协作',
    icon: Document,
    matchPrefixes: ['/todos', '/efforts', '/docs'],
    items: [
      { path: '/todos', title: '待办', icon: Memo, permission: PERMS.todo.browse },
      { path: '/efforts', title: '工时', icon: Odometer, permission: PERMS.effort.browse },
      { path: '/docs', title: '文档', icon: Document, permission: PERMS.doc.browseSpace },
    ],
  },
  {
    key: 'system',
    label: '系统',
    icon: Setting,
    matchPrefixes: ['/system', '/status'],
    items: [
      { path: '/system/users', title: '用户', icon: User, permission: PERMS.user.browse },
      { path: '/system/roles', title: '角色权限', icon: Setting, permission: PERMS.group.browse },
      { path: '/system/depts', title: '部门', icon: User, permission: PERMS.dept.browse },
      { path: '/system/configs', title: '配置', icon: Memo, permission: PERMS.config.browse },
      { path: '/status', title: '系统状态', icon: Monitor },
    ],
  },
];

/** 按当前路径解析激活的顶部导航组（找不到回退第一组） */
export function resolveActiveGroup(path: string): NavGroup {
  const first = '/' + (path.split('/')[1] ?? '');
  return (
    navGroups.find((g) => g.matchPrefixes.some((p) => first === p || first.startsWith(p + '/'))) ??
    navGroups[0]
  );
}
