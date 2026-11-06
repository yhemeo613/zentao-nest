/**
 * 全实体状态标签映射（docs/10 §3；枚举值 import 自 @zentao/shared，颜色/文案为本文件单一维护点）
 * variant 直接对齐 Element Plus el-tag type（2026-11-06 UI 选型切 Element Plus，docs/05 §1）
 */

export interface StatusMeta {
  label: string;
  /** el-tag type */
  variant: 'primary' | 'success' | 'info' | 'warning' | 'danger';
}

const map = (m: Record<string, StatusMeta>) => m;

export const StatusMetaMap = {
  story: map({
    draft: { label: '草稿', variant: 'info' },
    reviewing: { label: '评审中', variant: 'warning' },
    active: { label: '激活', variant: 'success' },
    changing: { label: '变更中', variant: 'warning' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  storyStage: map({
    wait: { label: '未开始', variant: 'info' },
    planned: { label: '已计划', variant: 'primary' },
    projected: { label: '研发立项', variant: 'primary' },
    designing: { label: '设计中', variant: 'primary' },
    designed: { label: '设计完毕', variant: 'primary' },
    developing: { label: '研发中', variant: 'primary' },
    developed: { label: '研发完毕', variant: 'success' },
    testing: { label: '测试中', variant: 'warning' },
    tested: { label: '测试完毕', variant: 'success' },
    verified: { label: '已验收', variant: 'success' },
    rejected: { label: '验收失败', variant: 'danger' },
    delivering: { label: '交付中', variant: 'primary' },
    delivered: { label: '已交付', variant: 'success' },
    released: { label: '已发布', variant: 'success' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  task: map({
    wait: { label: '未开始', variant: 'info' },
    doing: { label: '进行中', variant: 'primary' },
    done: { label: '已完成', variant: 'success' },
    pause: { label: '已暂停', variant: 'warning' },
    cancel: { label: '已取消', variant: 'danger' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  bug: map({
    active: { label: '激活', variant: 'danger' },
    resolved: { label: '已解决', variant: 'success' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  case: map({
    wait: { label: '待评审', variant: 'warning' },
    normal: { label: '正常', variant: 'success' },
    blocked: { label: '被阻塞', variant: 'danger' },
    investigate: { label: '研究中', variant: 'primary' },
  }),
  caseResult: map({
    pass: { label: '通过', variant: 'success' },
    fail: { label: '失败', variant: 'danger' },
    blocked: { label: '阻塞', variant: 'warning' },
    'n/a': { label: 'N/A', variant: 'info' },
  }),
  testtask: map({
    wait: { label: '未开始', variant: 'info' },
    doing: { label: '进行中', variant: 'primary' },
    done: { label: '已关闭', variant: 'success' },
    blocked: { label: '被阻塞', variant: 'danger' },
  }),
  runResult: map({
    normal: { label: '正常', variant: 'success' },
    blocked: { label: '被阻塞', variant: 'danger' },
  }),
  plan: map({
    wait: { label: '未开始', variant: 'info' },
    doing: { label: '进行中', variant: 'primary' },
    done: { label: '已完成', variant: 'success' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  release: map({
    wait: { label: '未发布', variant: 'info' },
    normal: { label: '已发布', variant: 'success' },
    fail: { label: '发布失败', variant: 'danger' },
    terminate: { label: '停止维护', variant: 'info' },
  }),
  program: map({
    wait: { label: '未开始', variant: 'info' },
    doing: { label: '进行中', variant: 'primary' },
    suspended: { label: '已挂起', variant: 'warning' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  project: map({
    wait: { label: '未开始', variant: 'info' },
    doing: { label: '进行中', variant: 'primary' },
    suspended: { label: '已挂起', variant: 'warning' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  execution: map({
    wait: { label: '未开始', variant: 'info' },
    doing: { label: '进行中', variant: 'primary' },
    suspended: { label: '已挂起', variant: 'warning' },
    closed: { label: '已关闭', variant: 'info' },
  }),
  product: map({
    active: { label: '正常', variant: 'success' },
    closed: { label: '已关闭', variant: 'info' },
  }),
} as const;

export type StatusEntity = keyof typeof StatusMetaMap;

/** 取状态元数据（未知值回退灰色 info 标） */
export function statusMeta(entity: StatusEntity, status: string): StatusMeta {
  return (
    (StatusMetaMap[entity] as Record<string, StatusMeta>)[status] ?? {
      label: status || '-',
      variant: 'info',
    }
  );
}
