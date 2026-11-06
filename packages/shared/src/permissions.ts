/**
 * 权限点常量（规格：docs/03-接口与契约.md §3/§4 权限点列；矩阵：docs/04-数据与种子 §9.2）
 * 唯一事实源：后端 @Permissions 装饰器与前端 v-permission/路由 meta 均须 import 此处。
 * 新模块落地时在本文件追加分组，并回填 docs/03 §12。
 */

export const PERMS = {
  /** system 系统模块（P1） */
  user: {
    browse: 'user.browse',
    create: 'user.create',
    view: 'user.view',
    edit: 'user.edit',
    delete: 'user.delete',
  },
  dept: { browse: 'dept.browse', manage: 'dept.manage' },
  group: {
    browse: 'group.browse',
    create: 'group.create',
    edit: 'group.edit',
    delete: 'group.delete',
    updatePriv: 'group.updatePriv',
  },
  acl: { browse: 'acl.browse', manage: 'acl.manage' },

  /** 四层框架域（P2，端点映射 docs/03 §4.2-4.9） */
  program: {
    browse: 'program.browse',
    create: 'program.create',
    view: 'program.view',
    edit: 'program.edit',
    delete: 'program.delete',
    start: 'program.start',
    suspend: 'program.suspend',
    close: 'program.close',
    activate: 'program.activate',
  },
  product: {
    browse: 'product.browse',
    create: 'product.create',
    view: 'product.view',
    edit: 'product.edit',
    close: 'product.close',
    delete: 'product.delete',
    manage: 'product.manage',
  },
  project: {
    browse: 'project.browse',
    create: 'project.create',
    view: 'project.view',
    edit: 'project.edit',
    close: 'project.close',
    delete: 'project.delete',
    start: 'project.start',
    putoff: 'project.putoff',
    suspend: 'project.suspend',
    activate: 'project.activate',
    manageProducts: 'project.manageProducts',
    teamBrowse: 'project.team.browse',
    teamManage: 'project.team.manage',
  },
  projectstory: {
    browse: 'projectstory.browse',
    linkStory: 'projectstory.linkStory',
    unlinkStory: 'projectstory.unlinkStory',
    importPlanStories: 'projectstory.importPlanStories',
  },
  execution: {
    browse: 'execution.browse',
    create: 'execution.create',
    view: 'execution.view',
    edit: 'execution.edit',
    close: 'execution.close',
    delete: 'execution.delete',
    start: 'execution.start',
    putoff: 'execution.putoff',
    suspend: 'execution.suspend',
    activate: 'execution.activate',
    teamBrowse: 'execution.team.browse',
    teamManage: 'execution.team.manage',
  },

  /** 需求域（P3，docs/03 §4.4） */
  story: {
    browse: 'story.browse',
    create: 'story.create',
    view: 'story.view',
    edit: 'story.edit',
    change: 'story.change',
    recallChange: 'story.recallChange',
    review: 'story.review',
    batchReview: 'story.batchReview',
    recallReview: 'story.recallReview',
    subdivide: 'story.subdivide',
    close: 'story.close',
    batchClose: 'story.batchClose',
    activate: 'story.activate',
    assign: 'story.assign',
    link: 'story.link',
    unlink: 'story.unlink',
    batchChange: 'story.batchChange',
  },
  /** 计划（docs/03 §4.5） */
  plan: {
    browse: 'plan.browse',
    create: 'plan.create',
    view: 'plan.view',
    edit: 'plan.edit',
    delete: 'plan.delete',
    start: 'plan.start',
    finish: 'plan.finish',
    close: 'plan.close',
    activate: 'plan.activate',
    batchChangeStatus: 'plan.batchChangeStatus',
    linkStory: 'plan.linkStory',
    unlinkStory: 'plan.unlinkStory',
    linkBug: 'plan.linkBug',
    unlinkBug: 'plan.unlinkBug',
  },
  /** 版本/发布（docs/03 §4.6/4.7） */
  build: {
    create: 'build.create',
    view: 'build.view',
    edit: 'build.edit',
    delete: 'build.delete',
    linkStory: 'build.linkStory',
    unlinkStory: 'build.unlinkStory',
    linkBug: 'build.linkBug',
    unlinkBug: 'build.unlinkBug',
  },
  release: {
    browse: 'release.browse',
    create: 'release.create',
    view: 'release.view',
    edit: 'release.edit',
    delete: 'release.delete',
    publish: 'release.publish',
    changeStatus: 'release.changeStatus',
    linkStory: 'release.linkStory',
    unlinkStory: 'release.unlinkStory',
    linkBug: 'release.linkBug',
    unlinkBug: 'release.unlinkBug',
  },
  /** 任务/工时（docs/03 §4.10） */
  task: {
    browse: 'task.browse',
    create: 'task.create',
    batchCreate: 'task.batchCreate',
    view: 'task.view',
    edit: 'task.edit',
    delete: 'task.delete',
    start: 'task.start',
    restart: 'task.restart',
    pause: 'task.pause',
    finish: 'task.finish',
    cancel: 'task.cancel',
    close: 'task.close',
    activate: 'task.activate',
    assign: 'task.assign',
    recordWorkhour: 'task.recordWorkhour',
    editWorkhour: 'task.editWorkhour',
    deleteWorkhour: 'task.deleteWorkhour',
    dragMove: 'task.dragMove',
    batchUpdate: 'task.batchUpdate',
  },
  /** 缺陷（docs/03 §4.11） */
  bug: {
    browse: 'bug.browse',
    create: 'bug.create',
    batchCreate: 'bug.batchCreate',
    view: 'bug.view',
    edit: 'bug.edit',
    delete: 'bug.delete',
    confirm: 'bug.confirm',
    resolve: 'bug.resolve',
    activate: 'bug.activate',
    close: 'bug.close',
    assign: 'bug.assign',
    link: 'bug.link',
    unlink: 'bug.unlink',
  },
  /** 用例（docs/03 §4.12） */
  case: {
    browse: 'case.browse',
    create: 'case.create',
    view: 'case.view',
    edit: 'case.edit',
    delete: 'case.delete',
    review: 'case.review',
    batchReview: 'case.batchReview',
    confirmStoryChange: 'case.confirmStoryChange',
    linkBug: 'case.linkBug',
    batchChange: 'case.batchChange',
  },
  /** 测试单（docs/03 §4.13） */
  testtask: {
    browse: 'testtask.browse',
    create: 'testtask.create',
    view: 'testtask.view',
    edit: 'testtask.edit',
    delete: 'testtask.delete',
    start: 'testtask.start',
    block: 'testtask.block',
    activate: 'testtask.activate',
    close: 'testtask.close',
    linkCase: 'testtask.linkCase',
    unlinkCase: 'testtask.unlinkCase',
    runCase: 'testtask.runCase',
    batchRun: 'testtask.batchRun',
    assignCase: 'testtask.assignCase',
  },
  /** 工时日志（docs/03 §4.16 effort） */
  effort: {
    browse: 'effort.browse',
    create: 'effort.create',
    edit: 'effort.edit',
    delete: 'effort.delete',
  },

  /** 文档（P5，docs/03 §4.15） */
  doc: {
    browseSpace: 'doc.browseSpace',
    manageSpace: 'doc.manageSpace',
    browseLib: 'doc.browseLib',
    manageLib: 'doc.manageLib',
    browse: 'doc.browse',
    create: 'doc.create',
    view: 'doc.view',
    edit: 'doc.edit',
    delete: 'doc.delete',
  },
  /** 待办（P5，docs/03 §4.16） */
  todo: {
    browse: 'todo.browse',
    create: 'todo.create',
    view: 'todo.view',
    edit: 'todo.edit',
    delete: 'todo.delete',
    start: 'todo.start',
    finish: 'todo.finish',
    activate: 'todo.activate',
    close: 'todo.close',
    assignTo: 'todo.assignTo',
    batchFinish: 'todo.batchFinish',
    batchClose: 'todo.batchClose',
  },
  /** 配置（P5，docs/03 §4.25） */
  config: { browse: 'config.browse', manage: 'config.manage' },

  /** 看板（P6，docs/03 §4.14） */
  board: { manageLane: 'board.manageLane', manageColumn: 'board.manageColumn' },
  /** 附件（docs/03 §4.0） */
  file: { upload: 'file.upload', download: 'file.download', delete: 'file.delete' },
  /** 用例库/套件/测试报告（docs/03 §4.20-4.22） */
  caselib: {
    browse: 'caselib.browse',
    create: 'caselib.create',
    edit: 'caselib.edit',
    delete: 'caselib.delete',
    manageCases: 'caselib.manageCases',
    import: 'caselib.import',
  },
  testsuite: {
    browse: 'testsuite.browse',
    create: 'testsuite.create',
    edit: 'testsuite.edit',
    delete: 'testsuite.delete',
    manageCases: 'testsuite.manageCases',
  },
  testreport: {
    browse: 'testreport.browse',
    create: 'testreport.create',
    view: 'testreport.view',
    edit: 'testreport.edit',
    delete: 'testreport.delete',
  },
  /** 统计/搜索（docs/03 §4.23/§7） */
  report: { view: 'report.view' },
  search: { all: 'search.all' },
  /** webhook（docs/03 §4.24） */
  webhook: {
    browse: 'webhook.browse',
    create: 'webhook.create',
    edit: 'webhook.edit',
    delete: 'webhook.delete',
  },
  /** 产品线/分支（docs/03 §4.18/4.19） */
  productline: { manage: 'productline.manage' },
  branch: { manage: 'branch.manage' },
} as const;

type PermValues<T> = T extends string ? T : PermValues<T[keyof T]>;
export type PermKey = PermValues<typeof PERMS>;

/** 展平全部权限点字符串（种子/校验用） */
export function allPermKeys(): PermKey[] {
  const out: PermKey[] = [];
  for (const group of Object.values(PERMS)) {
    for (const key of Object.values(group)) out.push(key as PermKey);
  }
  return out;
}

/** 解析 'module.action' → [module, action]（权限缓存/守卫判定用） */
export function splitPermKey(perm: string): [string, string] {
  const idx = perm.indexOf('.');
  if (idx <= 0 || idx === perm.length - 1) throw new Error(`非法权限点：${perm}`);
  return [perm.slice(0, idx), perm.slice(idx + 1)];
}
