/**
 * 看板状态映射（规格：docs/02-业务流程规格 §8.1，禅道 kanban/config.php:128-134 同源）
 * 拖拽到列 = 触发对应任务动作（服务端唯一事实源，docs/03 §6）。
 */

/** 任务列 type 枚举（docs/02 §8.1 kanban/lang:310-317） */
export const KanbanColumnTypes = {
  Wait: 'wait',
  Develop: 'develop', // 父列（developing/developed 的父）
  Developing: 'developing',
  Developed: 'developed',
  Pause: 'pause',
  Canceled: 'canceled',
  Closed: 'closed',
} as const;
export type KanbanColumnType = (typeof KanbanColumnTypes)[keyof typeof KanbanColumnTypes];

/** 泳道 type 枚举（执行看板默认 story/bug/task 三泳道） */
export const KanbanLaneTypes = {
  Story: 'story',
  Bug: 'bug',
  Task: 'task',
} as const;
export type KanbanLaneType = (typeof KanbanLaneTypes)[keyof typeof KanbanLaneTypes];

/**
 * 任务状态 ↔ 看板列映射（docs/02 §8.1 taskColumnStatusList）：
 * wait→wait, doing→developing, done→developed, pause→pause, cancel→canceled, closed→closed
 */
export const TASK_STATUS_TO_COLUMN: Record<string, string> = {
  wait: 'wait',
  doing: 'developing',
  done: 'developed',
  pause: 'pause',
  cancel: 'canceled',
  closed: 'closed',
};

/** 拖拽目标列 → 需要执行的任务动作（docs/02 §8.1 拖拽=动作语义） */
export const COLUMN_TO_TASK_ACTION: Record<
  string,
  | 'start'
  | 'pause'
  | 'restart'
  | 'finish'
  | 'cancel'
  | 'close'
  | 'activate'
  | 'startOrRestart'
  | 'none'
> = {
  wait: 'none', // 拖回 wait 由 activate→backToWait 链处理
  developing: 'startOrRestart', // start(仅wait)/restart(仅pause)/activate(终态)
  developed: 'finish',
  pause: 'pause',
  canceled: 'cancel',
  closed: 'close',
};

/** 默认看板模板（docs/04 §9.4；执行创建时惰性初始化） */
export const DEFAULT_KANBAN = {
  lanes: [
    { type: 'story', name: '需求', color: '#7ec5ff', order: 20 },
    { type: 'bug', name: 'Bug', color: '#ba55d3', order: 25 },
    { type: 'task', name: '任务', color: '#4169e1', order: 30 },
  ],
  columns: [
    { type: 'wait', name: '未开始', parentId: 0, order: 10 },
    { type: 'develop', name: '开发', parentId: 0, order: 20 },
    { type: 'developing', name: '研发中', parentType: 'develop', order: 21 },
    { type: 'developed', name: '研发完毕', parentType: 'develop', order: 22 },
    { type: 'pause', name: '已暂停', parentId: 0, order: 30 },
    { type: 'canceled', name: '已取消', parentId: 0, order: 40 },
    { type: 'closed', name: '已关闭', parentId: 0, order: 50 },
  ],
} as const;
