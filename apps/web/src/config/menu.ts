import {
  LayoutDashboard,
  Boxes,
  Package,
  FolderKanban,
  PlayCircle,
  BookOpen,
  Bug,
  FlaskConical,
  FileText,
  ListTodo,
  Users,
  Settings,
} from 'lucide-vue-next';
import { h, type Component } from 'vue';

export interface MenuItem {
  path: string;
  name: string;
  title: string;
  icon: Component;
  permission?: string;
  children?: MenuItem[];
}

const icon = (c: Component) => h(c, { class: 'h-4 w-4 shrink-0' });

/**
 * 侧栏菜单（docs/10 §1 管理台布局）：
 * permission 字段与后端 @Permissions 同源（import 自 @zentao/shared 语义，此处以字符串字面量+CI 漂移门禁保障）。
 */
export const menus: MenuItem[] = [
  { path: '/dashboard', name: 'dashboard', title: '我的地盘', icon: LayoutDashboard },
  {
    path: '/programs',
    name: 'menu-programs',
    title: '项目集',
    icon: Boxes,
    permission: 'program.browse',
    children: [
      {
        path: '/programs',
        name: 'program-list',
        title: '项目集列表',
        icon: Boxes,
        permission: 'program.browse',
      },
    ],
  },
  {
    path: '/products',
    name: 'menu-products',
    title: '产品',
    icon: Package,
    permission: 'product.browse',
    children: [
      {
        path: '/products',
        name: 'product-list',
        title: '产品列表',
        icon: Package,
        permission: 'product.browse',
      },
    ],
  },
  {
    path: '/projects',
    name: 'menu-projects',
    title: '项目',
    icon: FolderKanban,
    permission: 'project.browse',
    children: [
      {
        path: '/projects',
        name: 'project-list',
        title: '项目列表',
        icon: FolderKanban,
        permission: 'project.browse',
      },
    ],
  },
  {
    path: '/executions',
    name: 'menu-executions',
    title: '执行',
    icon: PlayCircle,
    permission: 'execution.browse',
    children: [
      {
        path: '/executions',
        name: 'execution-list',
        title: '执行列表',
        icon: PlayCircle,
        permission: 'execution.browse',
      },
    ],
  },
  {
    path: '/stories',
    name: 'menu-stories',
    title: '需求',
    icon: BookOpen,
    permission: 'story.browse',
    children: [
      {
        path: '/stories',
        name: 'story-list',
        title: '需求列表',
        icon: BookOpen,
        permission: 'story.browse',
      },
    ],
  },
  {
    path: '/tasks',
    name: 'menu-tasks',
    title: '任务',
    icon: ListTodo,
    permission: 'task.browse',
    children: [
      {
        path: '/tasks',
        name: 'task-list',
        title: '任务列表',
        icon: ListTodo,
        permission: 'task.browse',
      },
    ],
  },
  {
    path: '/bugs',
    name: 'menu-bugs',
    title: 'Bug',
    icon: Bug,
    permission: 'bug.browse',
    children: [
      { path: '/bugs', name: 'bug-list', title: 'Bug 列表', icon: Bug, permission: 'bug.browse' },
    ],
  },
  {
    path: '/cases',
    name: 'menu-cases',
    title: '用例',
    icon: FlaskConical,
    permission: 'case.browse',
    children: [
      {
        path: '/cases',
        name: 'case-list',
        title: '用例列表',
        icon: FlaskConical,
        permission: 'case.browse',
      },
    ],
  },
  {
    path: '/testtasks',
    name: 'menu-testtasks',
    title: '测试单',
    icon: FlaskConical,
    permission: 'testtask.browse',
    children: [
      {
        path: '/testtasks',
        name: 'testtask-list',
        title: '测试单',
        icon: FlaskConical,
        permission: 'testtask.browse',
      },
    ],
  },
  {
    path: '/docs',
    name: 'menu-docs',
    title: '文档',
    icon: FileText,
    permission: 'doc.browseSpace',
    children: [
      {
        path: '/docs',
        name: 'doc-list',
        title: '文档空间',
        icon: FileText,
        permission: 'doc.browseSpace',
      },
    ],
  },
  {
    path: '/system',
    name: 'menu-system',
    title: '系统管理',
    icon: Settings,
    permission: 'user.browse',
    children: [
      {
        path: '/system/users',
        name: 'system-users',
        title: '用户',
        icon: Users,
        permission: 'user.browse',
      },
      {
        path: '/system/roles',
        name: 'system-roles',
        title: '角色权限',
        icon: Settings,
        permission: 'group.browse',
      },
      {
        path: '/system/depts',
        name: 'system-depts',
        title: '部门',
        icon: Users,
        permission: 'dept.browse',
      },
    ],
  },
];

export function iconOf(item: MenuItem): Component {
  return item.icon ?? icon(h('span'));
}
