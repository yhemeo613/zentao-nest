/**
 * 全实体状态标签映射（docs/10 §3；枚举值 import 自 @zentao/shared，颜色/文案为本文件单一维护点）
 */

export interface StatusMeta {
  label: string;
  /** badge variant */
  variant: 'default' | 'success' | 'info' | 'warning' | 'destructive' | 'muted' | 'outline';
}

const map = (m: Record<string, { label: string; variant: StatusMeta['variant'] }>) => m;

export const StatusMetaMap = {
  story: map({
    draft: { label: '草稿', variant: 'muted' },
    reviewing: { label: '评审中', variant: 'info' },
    active: { label: '激活', variant: 'success' },
    changing: { label: '变更中', variant: 'warning' },
    closed: { label: '已关闭', variant: 'default' },
  }),
  storyStage: map({
    wait: { label: '未开始', variant: 'muted' },
    planned: { label: '已计划', variant: 'info' },
    projected: { label: '研发立项', variant: 'info' },
    designing: { label: '设计中', variant: 'info' },
    designed: { label: '设计完毕', variant: 'info' },
    developing: { label: '研发中', variant: 'info' },
    developed: { label: '研发完毕', variant: 'success' },
    testing: { label: '测试中', variant: 'warning' },
    tested: { label: '测试完毕', variant: 'success' },
    verified: { label: '已验收', variant: 'success' },
    rejected: { label: '验收失败', variant: 'destructive' },
    delivering: { label: '交付中', variant: 'info' },
    delivered: { label: '已交付', variant: 'success' },
    released: { label: '已发布', variant: 'success' },
    closed: { label: '已关闭', variant: 'default' },
  }),
  task: map({
    wait: { label: '未开始', variant: 'muted' },
    doing: { label: '进行中', variant: 'info' },
    done: { label: '已完成', variant: 'success' },
    pause: { label: '已暂停', variant: 'warning' },
    cancel: { label: '已取消', variant: 'destructive' },
    closed: { label: '已关闭', variant: 'default' },
  }),
  bug: map({
    active: { label: '激活', variant: 'destructive' },
    resolved: { label: '已解决', variant: 'success' },
    closed: { label: '已关闭', variant: 'default' },
  }),
  case: map({
    wait: { label: '待评审', variant: 'warning' },
    normal: { label: '正常', variant: 'success' },
    blocked: { label: '被阻塞', variant: 'destructive' },
    investigate: { label: '研究中', variant: 'info' },
  }),
  caseResult: map({
    pass: { label: '通过', variant: 'success' },
    fail: { label: '失败', variant: 'destructive' },
    blocked: { label: '阻塞', variant: 'warning' },
    'n/a': { label: 'N/A', variant: 'muted' },
  }),
  testtask: map({
    wait: { label: '未开始', variant: 'muted' },
    doing: { label: '进行中', variant: 'info' },
    done: { label: '已关闭', variant: 'default' },
    blocked: { label: '被阻塞', variant: 'destructive' },
  }),
  plan: map({
    wait: { label: '未开始', variant: 'muted' },
    doing: { label: '进行中', variant: 'info' },
    done: { label: '已完成', variant: 'success' },
    closed: { label: '已关闭', variant: 'default' },
  }),
  release: map({
    wait: { label: '未发布', variant: 'muted' },
    normal: { label: '已发布', variant: 'success' },
    fail: { label: '发布失败', variant: 'destructive' },
    terminate: { label: '停止维护', variant: 'default' },
  }),
  program: map({
    wait: { label: '未开始', variant: 'muted' },
    doing: { label: '进行中', variant: 'info' },
    suspended: { label: '已挂起', variant: 'warning' },
    closed: { label: '已关闭', variant: 'default' },
  }),
  execution: map({
    wait: { label: '未开始', variant: 'muted' },
    doing: { label: '进行中', variant: 'info' },
    suspended: { label: '已挂起', variant: 'warning' },
    closed: { label: '已关闭', variant: 'default' },
  }),
  product: map({
    active: { label: '正常', variant: 'success' },
    closed: { label: '已关闭', variant: 'default' },
  }),
} as const;

export type StatusEntity = keyof typeof StatusMetaMap;

/** 取状态元数据（未知值回退 outline 灰标） */
export function statusMeta(entity: StatusEntity, status: string): StatusMeta {
  return (
    (StatusMetaMap[entity] as Record<string, StatusMeta>)[status] ?? {
      label: status || '-',
      variant: 'outline',
    }
  );
}
