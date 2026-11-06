import { http } from '../lib/http.js';

/** 文档（契约：doc.controller，2026-11-06 以源码为准；正文变化 → version+1） */

export interface DocSpaceVo {
  id: string;
  objectType: 'product' | 'project' | 'execution' | 'personal';
  objectId: number;
  name: string;
  acl: string;
  whitelist: string[] | null;
  createdBy: string;
  createdAt: string;
}

export interface DocLibVo {
  id: string;
  spaceId: string;
  name: string;
  main: number;
  sortNo: number;
  createdBy: string;
  createdAt: string;
}

export interface DocVo {
  id: string;
  libId: string;
  moduleId: number;
  title: string;
  keywords: string;
  type: 'text' | 'markdown' | 'link';
  url: string;
  /** 当前版本号（smallint） */
  version: number;
  views: number;
  objectType: string;
  objectId: number;
  sortNo: number;
  openedBy: string;
  openedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface DocContentVo {
  id: string;
  docId: string;
  version: number;
  content: string | null;
  editedBy: string;
  createdAt: string;
}

export interface DocDetailVo extends DocVo {
  /** 指定版本正文（缺省=最新） */
  content: string | null;
  /** 全部版本 DESC */
  contents: DocContentVo[];
}

export const docApi = {
  spaces(): Promise<DocSpaceVo[]> {
    return http.get('/doc-spaces') as Promise<DocSpaceVo[]>;
  },

  createSpace(dto: {
    objectType: 'product' | 'project' | 'execution' | 'personal';
    objectId?: string;
    name: string;
    acl?: string;
    whitelist?: string[];
  }): Promise<DocSpaceVo> {
    return http.post('/doc-spaces', dto) as Promise<DocSpaceVo>;
  },

  libs(spaceId: number | string): Promise<DocLibVo[]> {
    return http.get(`/doc-spaces/${spaceId}/libs`) as Promise<DocLibVo[]>;
  },

  createLib(dto: {
    spaceId: string;
    name: string;
    main?: number;
    sortNo?: number;
  }): Promise<DocLibVo> {
    return http.post('/doc-libs', dto) as Promise<DocLibVo>;
  },

  docs(libId: number | string): Promise<DocVo[]> {
    return http.get(`/doc-libs/${libId}/docs`) as Promise<DocVo[]>;
  },

  get(id: number | string, version?: number | string): Promise<DocDetailVo> {
    return http.get(`/docs/${id}`, {
      params: version ? { version } : undefined,
    }) as Promise<DocDetailVo>;
  },

  create(dto: {
    libId: string;
    title: string;
    content?: string;
    type?: 'text' | 'markdown' | 'link';
    keywords?: string;
    moduleId?: number;
    objectType?: string;
    objectId?: string;
  }): Promise<DocVo> {
    return http.post('/docs', dto) as Promise<DocVo>;
  },

  update(
    id: number | string,
    dto: { title?: string; keywords?: string; content?: string; sortNo?: number },
  ): Promise<DocDetailVo> {
    return http.put(`/docs/${id}`, dto) as Promise<DocDetailVo>;
  },

  remove(id: number | string): Promise<null> {
    return http.delete(`/docs/${id}`) as Promise<null>;
  },

  versions(id: number | string): Promise<DocContentVo[]> {
    return http.get(`/docs/${id}/versions`) as Promise<DocContentVo[]>;
  },
};
