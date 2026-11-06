import { http } from '../lib/http.js';
import type { TaskVo } from './task.js';

/** 看板（契约：board.controller + shared socket-contract，2026-11-06 以源码为准） */

export interface KanbanLaneVo {
  id: string;
  executionId: number;
  type: 'story' | 'bug' | 'task';
  name: string;
  color: string;
  sortNo: number;
}

export interface KanbanColumnVo {
  id: string;
  executionId: number;
  type: 'wait' | 'develop' | 'developing' | 'developed' | 'pause' | 'canceled' | 'closed';
  parentId: number;
  name: string;
  color: string;
  /** -1=不限 */
  wipLimit: number;
  sortNo: number;
}

export interface KanbanCellVo {
  id: string;
  executionId: number;
  laneId: string;
  columnId: string;
  type: 'story' | 'bug' | 'task';
  /** 任务 ID 逗号串，顺序=列内排序 */
  cards: string | null;
  cardTasks: TaskVo[];
}

export interface WipExceededVo {
  columnId: string;
  limit: number;
  current: number;
}

export interface BoardViewVo {
  executionId: string;
  lanes: KanbanLaneVo[];
  columns: KanbanColumnVo[];
  cells: KanbanCellVo[];
  wipExceeded: WipExceededVo[];
}

export const boardApi = {
  /** 首访惰性初始化默认泳道/列/单元格 */
  getBoard(executionId: number | string): Promise<BoardViewVo> {
    return http.get(`/executions/${executionId}/board`) as Promise<BoardViewVo>;
  },

  /** REST 拖拽端点（列→动作映射；Socket 断连时的回退路径） */
  moveTask(
    executionId: number | string,
    taskId: number | string,
    toColumnId: string,
  ): Promise<{ task: TaskVo; wipExceeded: boolean }> {
    return http.post(`/executions/${executionId}/board/tasks/${taskId}/move`, {
      toColumnId,
    }) as Promise<{
      task: TaskVo;
      wipExceeded: boolean;
    }>;
  },
};
