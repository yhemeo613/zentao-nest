import { http } from '../lib/http.js';

/** 统计报表（契约：report.controller，2026-11-06 以源码为准；全部 report.view，data 为对象） */

/** 项目概览：三组 状态→数量 map */
export interface ProjectOverviewVo {
  story: Record<string, number>;
  task: Record<string, number>;
  bug: Record<string, number>;
}

/** 执行负载：成员任务与工时 */
export interface ExecutionWorkloadVo {
  members: Array<{ userId: string; tasks: number; consumed: number; left: number }>;
}

/** 产品质量 */
export interface ProductQualityVo {
  bugs: Record<string, number>;
  totalBugs: number;
  caseTotal: number;
  caseRan: number;
  /** 百分数（1 位小数）或 null */
  casePassRate: number | null;
  /** Bug 数 / 故事数（2 位小数）或 null */
  defectDensity: number | null;
}

/** 产品路线图：stage→数量 map（15 值 StoryStage） */
export type RoadmapVo = Record<string, number>;

export const reportApi = {
  projectOverview(projectId: number | string): Promise<ProjectOverviewVo> {
    return http.get(`/reports/project/${projectId}/overview`) as Promise<ProjectOverviewVo>;
  },

  executionWorkload(executionId: number | string): Promise<ExecutionWorkloadVo> {
    return http.get(`/reports/execution/${executionId}/workload`) as Promise<ExecutionWorkloadVo>;
  },

  productQuality(productId: number | string): Promise<ProductQualityVo> {
    return http.get(`/reports/product/${productId}/quality`) as Promise<ProductQualityVo>;
  },

  productRoadmap(productId: number | string): Promise<RoadmapVo> {
    return http.get(`/reports/products/${productId}/roadmap`) as Promise<RoadmapVo>;
  },
};
