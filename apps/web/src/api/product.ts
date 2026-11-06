import { http } from '../lib/http.js';

/** 产品（契约：docs/03 §4.3，2026-11-06 以源码为准） */
export interface ProductVo {
  id: number;
  programId: number;
  shadow: number;
  name: string;
  code: string | null;
  type: string;
  status: 'active' | 'closed';
  poId: string | null;
  qdId: string | null;
  rdId: string | null;
  acl: string;
  desc: string | null;
  closedDate: string | null;
  sortNo: number;
  createdAt: string;
}

/** 模块树节点（GET /products/:id/modules） */
export interface ModuleNode {
  id: number;
  rootType: string;
  rootId: number;
  branchId: number;
  parentId: number;
  pathStr: string;
  grade: number;
  name: string;
  ownerId: string | null;
  sortNo: number;
  children: ModuleNode[];
}

export const productApi = {
  list(): Promise<ProductVo[]> {
    return http.get('/products') as Promise<ProductVo[]>;
  },

  get(id: number | string): Promise<ProductVo> {
    return http.get(`/products/${id}`) as Promise<ProductVo>;
  },

  create(dto: {
    name: string;
    programId?: number;
    code?: string;
    poId?: string;
    qdId?: string;
    rdId?: string;
    acl?: string;
    whitelist?: string[];
    desc?: string;
    sortNo?: number;
  }): Promise<ProductVo> {
    return http.post('/products', dto) as Promise<ProductVo>;
  },

  update(
    id: number | string,
    dto: {
      name?: string;
      code?: string;
      poId?: string;
      qdId?: string;
      rdId?: string;
      desc?: string;
      sortNo?: number;
    },
  ): Promise<ProductVo> {
    return http.put(`/products/${id}`, dto) as Promise<ProductVo>;
  },

  close(id: number | string): Promise<ProductVo> {
    return http.post(`/products/${id}/close`) as Promise<ProductVo>;
  },

  activate(id: number | string): Promise<ProductVo> {
    return http.post(`/products/${id}/activate`) as Promise<ProductVo>;
  },

  modules(id: number | string): Promise<ModuleNode[]> {
    return http.get(`/products/${id}/modules`) as Promise<ModuleNode[]>;
  },

  createModule(dto: {
    rootId: string;
    name: string;
    parentId?: number;
    ownerId?: string;
    sortNo?: number;
  }): Promise<ModuleNode> {
    return http.post('/modules', dto) as Promise<ModuleNode>;
  },

  updateModule(
    id: number | string,
    dto: { name?: string; ownerId?: string; sortNo?: number },
  ): Promise<ModuleNode> {
    return http.put(`/modules/${id}`, dto) as Promise<ModuleNode>;
  },

  removeModule(id: number | string): Promise<null> {
    return http.delete(`/modules/${id}`) as Promise<null>;
  },
};
