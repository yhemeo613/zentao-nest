import { http } from '../lib/http.js';
import type { PageResult } from '@zentao/shared';

/** 系统管理（契约：docs/03 §4.1，2026-11-06 以源码为准；users 是全站唯一真分页端点） */

export interface SysUserVo {
  id: string;
  account: string;
  realname: string;
  nickname: string;
  /** 职位展示字段（dev/qa/pm/po/td/pd/qd/top/others），不参与鉴权 */
  role: string;
  deptId: string;
  gender: string;
  email: string;
  mobile: string;
  visits: number;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
}

export interface SysRoleVo {
  id: string;
  name: string;
  code: string;
  isSuper: number;
  remark: string;
  createdBy: string;
  createdAt: string;
}

export interface PermissionNode {
  module: string;
  actions: Array<{ key: string; name: string; status: 'active' | 'deprecated' }>;
}

export interface DeptNode {
  id: string;
  parentId: number;
  pathStr: string;
  grade: number;
  name: string;
  manager: string;
  sortNo: number;
  children: DeptNode[];
}

export interface SysAclVo {
  id: string;
  objectType: string;
  objectId: string;
  userIds: string[] | null;
}

export const systemApi = {
  // ---- 用户 ----
  users(
    query: { keyword?: string; deptId?: number; page?: number; pageSize?: number } = {},
  ): Promise<PageResult<SysUserVo>> {
    return http.get('/users', { params: query }) as Promise<PageResult<SysUserVo>>;
  },

  /** 详情（含全局 roleIds，projectId=0） */
  getUser(id: number | string): Promise<SysUserVo & { roleIds: number[] }> {
    return http.get(`/users/${id}`) as Promise<SysUserVo & { roleIds: number[] }>;
  },

  createUser(dto: {
    account: string;
    password: string;
    realname: string;
    nickname?: string;
    role?: string;
    deptId?: number;
    email?: string;
    mobile?: string;
    roleIds?: number[];
  }): Promise<SysUserVo> {
    return http.post('/users', dto) as Promise<SysUserVo>;
  },

  updateUser(
    id: number | string,
    dto: {
      realname?: string;
      nickname?: string;
      role?: string;
      deptId?: number;
      email?: string;
      mobile?: string;
      password?: string;
    },
  ): Promise<SysUserVo> {
    return http.put(`/users/${id}`, dto) as Promise<SysUserVo>;
  },

  deleteUser(id: number | string): Promise<null> {
    return http.delete(`/users/${id}`) as Promise<null>;
  },

  /** 分配角色（全量替换；projectId 缺省 0=全局授权） */
  assignRoles(id: number | string, roleIds: number[], projectId = 0): Promise<null> {
    return http.put(`/users/${id}/roles`, { roleIds, projectId }) as Promise<null>;
  },

  // ---- 角色 / 权限点 ----
  roles(): Promise<SysRoleVo[]> {
    return http.get('/roles') as Promise<SysRoleVo[]>;
  },

  createRole(dto: { name: string; code: string; remark?: string }): Promise<SysRoleVo> {
    return http.post('/roles', dto) as Promise<SysRoleVo>;
  },

  updateRole(id: number | string, dto: { name?: string; remark?: string }): Promise<SysRoleVo> {
    return http.put(`/roles/${id}`, dto) as Promise<SysRoleVo>;
  },

  deleteRole(id: number | string): Promise<null> {
    return http.delete(`/roles/${id}`) as Promise<null>;
  },

  permissionTree(): Promise<PermissionNode[]> {
    return http.get('/permissions') as Promise<PermissionNode[]>;
  },

  rolePermissions(id: number | string): Promise<string[]> {
    return http.get(`/roles/${id}/permissions`) as Promise<string[]>;
  },

  /** 角色授权（全量替换；超管角色不可显式授权） */
  setRolePermissions(id: number | string, permissions: string[]): Promise<null> {
    return http.put(`/roles/${id}/permissions`, { permissions }) as Promise<null>;
  },

  // ---- 部门 ----
  deptTree(): Promise<DeptNode[]> {
    return http.get('/depts') as Promise<DeptNode[]>;
  },

  createDept(dto: {
    name: string;
    parentId?: number;
    manager?: string;
    sortNo?: number;
  }): Promise<DeptNode> {
    return http.post('/depts', dto) as Promise<DeptNode>;
  },

  updateDept(
    id: number | string,
    dto: { name?: string; manager?: string; sortNo?: number },
  ): Promise<DeptNode> {
    return http.put(`/depts/${id}`, dto) as Promise<DeptNode>;
  },

  deleteDept(id: number | string): Promise<null> {
    return http.delete(`/depts/${id}`) as Promise<null>;
  },

  // ---- ACL 白名单 ----
  getAcl(objectType: string, objectId: number | string): Promise<SysAclVo[]> {
    return http.get('/acl', { params: { objectType, objectId } }) as Promise<SysAclVo[]>;
  },

  /** 白名单维护（替换式；空数组=清空） */
  setAcl(dto: { objectType: string; objectId: string; userIds: string[] }): Promise<null> {
    return http.put('/acl', dto) as Promise<null>;
  },
};
