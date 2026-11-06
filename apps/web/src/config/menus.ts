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
} from '@element-plus/icons-vue';
import { PERMS } from '@zentao/shared';

export interface MenuItem {
  path: string;
  title: string;
  icon: Component;
  /** module.action 权限点（import 自 @zentao/shared PERMS，AGENTS §4 单源） */
  permission?: string;
}

export interface MenuGroup {
  title?: string;
  items: MenuItem[];
}

/** 侧栏菜单（admin-layout 按权限过滤渲染；docs/10 §1；仅登记已有页面的入口，未建页面不进菜单） */
export const menuGroups: MenuGroup[] = [
  {
    items: [{ path: '/dashboard', title: '我的地盘', icon: Odometer }],
  },
  {
    title: '交付',
    items: [
      { path: '/programs', title: '项目集', icon: Box, permission: PERMS.program.browse },
      { path: '/products', title: '产品', icon: Goods, permission: PERMS.product.browse },
      { path: '/projects', title: '项目', icon: Folder, permission: PERMS.project.browse },
      { path: '/executions', title: '执行', icon: VideoPlay, permission: PERMS.execution.browse },
    ],
  },
  {
    title: '研发',
    items: [
      { path: '/stories', title: '需求', icon: Notebook, permission: PERMS.story.browse },
      { path: '/tasks', title: '任务', icon: Tickets, permission: PERMS.task.browse },
      { path: '/bugs', title: 'Bug', icon: Warning, permission: PERMS.bug.browse },
    ],
  },
  {
    title: '质量',
    items: [
      { path: '/cases', title: '用例库', icon: Checked, permission: PERMS.case.browse },
      { path: '/testtasks', title: '测试单', icon: Memo, permission: PERMS.testtask.browse },
    ],
  },
  {
    title: '系统',
    items: [
      { path: '/system/users', title: '用户', icon: User, permission: PERMS.user.browse },
      { path: '/system/roles', title: '角色权限', icon: Setting, permission: PERMS.group.browse },
      { path: '/system/depts', title: '部门', icon: Checked, permission: PERMS.dept.browse },
      { path: '/system/configs', title: '配置', icon: Memo, permission: PERMS.config.browse },
      { path: '/status', title: '系统状态', icon: Monitor },
    ],
  },
];
