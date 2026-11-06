import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes, KanbanLaneTypes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtKanbanLane } from './entities/zt-kanban-lane.entity.js';
import { ZtKanbanColumn } from './entities/zt-kanban-column.entity.js';
import { ZtKanbanCell } from './entities/zt-kanban-cell.entity.js';
import { ZtTask } from '../task/entities/zt-task.entity.js';
import { TaskService } from '../task/task.service.js';

export interface BoardView {
  executionId: string;
  lanes: ZtKanbanLane[];
  columns: ZtKanbanColumn[];
  cells: Array<ZtKanbanCell & { cardTasks: ZtTask[] }>;
  wipExceeded: Array<{ columnId: string; limit: number; current: number }>;
}

/**
 * 看板（docs/02 §8.1 / docs/03 §4.14）：
 * - 首访惰性初始化默认泳道（story/bug/task）与任务列（wait/develop父子/pause/canceled/closed）；
 * - 拖拽 = 按目标列映射任务动作（startOrRestart/finish/pause/cancel/close），服务端唯一事实源；
 * - WIP 超限仅统计返回 + 广播警告，不拦截（docs/02 §8.1 禅道语义）；
 * - 卡片即任务本体：cell.cards 存任务 ID 串（无独立卡片表，ADR D007）。
 */
@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(ZtKanbanLane)
    private readonly laneRepo: Repository<ZtKanbanLane>,
    @InjectRepository(ZtKanbanColumn)
    private readonly columnRepo: Repository<ZtKanbanColumn>,
    @InjectRepository(ZtKanbanCell)
    private readonly cellRepo: Repository<ZtKanbanCell>,
    @InjectRepository(ZtTask) private readonly taskRepo: Repository<ZtTask>,
    private readonly taskService: TaskService,
  ) {}

  /** GET board：惰性初始化 + 全量视图 */
  async getBoard(executionId: string): Promise<BoardView> {
    await this.ensureInitialized(executionId);
    const lanes = await this.laneRepo.find({
      where: { executionId: Number(executionId), deleted: 0 },
      order: { sortNo: 'ASC' },
    });
    const columns = await this.columnRepo.find({
      where: { executionId: Number(executionId), deleted: 0 },
      order: { sortNo: 'ASC' },
    });
    const cells = await this.cellRepo.find({
      where: { executionId: Number(executionId) },
    });

    const allIds = cells.flatMap((c) =>
      (c.cards ?? '').split(',').filter(Boolean),
    );
    const tasks = allIds.length
      ? await this.taskRepo.find({ where: allIds.map((id) => ({ id })) })
      : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const cellViews = cells.map((cell) => {
      const ids = (cell.cards ?? '').split(',').filter(Boolean);
      const cardTasks = ids
        .map((id) => taskMap.get(id))
        .filter((t): t is ZtTask => !!t);
      return { ...cell, cardTasks };
    });

    // WIP 统计（列内卡片数 vs limit；-1 不限）
    const wipExceeded: Array<{
      columnId: string;
      limit: number;
      current: number;
    }> = [];
    for (const col of columns) {
      if (col.wipLimit >= 0) {
        const current = cells
          .filter((c) => c.columnId === col.id)
          .reduce(
            (acc, c) => acc + (c.cards ?? '').split(',').filter(Boolean).length,
            0,
          );
        if (current > col.wipLimit)
          wipExceeded.push({ columnId: col.id, limit: col.wipLimit, current });
      }
    }
    return { executionId, lanes, columns, cells: cellViews, wipExceeded };
  }

  /** 惰性初始化（幂等，docs/04 §9.4 默认模板） */
  async ensureInitialized(executionId: string): Promise<void> {
    const execId = Number(executionId);
    const hasLane = await this.laneRepo.findOne({
      where: { executionId: execId, deleted: 0 },
    });
    if (hasLane) return;

    const laneMap = new Map<string, ZtKanbanLane>();
    for (const def of [
      {
        type: KanbanLaneTypes.Story,
        name: '需求',
        color: '#7ec5ff',
        order: 20,
      },
      { type: KanbanLaneTypes.Bug, name: 'Bug', color: '#ba55d3', order: 25 },
      { type: KanbanLaneTypes.Task, name: '任务', color: '#4169e1', order: 30 },
    ]) {
      const lane = await this.laneRepo.save(
        this.laneRepo.create({
          executionId: execId,
          type: def.type,
          name: def.name,
          color: def.color,
          sortNo: def.order,
        }),
      );
      laneMap.set(def.type, lane);
    }

    // 任务列：wait/develop(父)/developing+developed(子)/pause/canceled/closed
    const colMap = new Map<string, ZtKanbanColumn>();
    const columnDefs: Array<{
      type: string;
      name: string;
      order: number;
      parentType?: string;
    }> = [
      { type: 'wait', name: '未开始', order: 10 },
      { type: 'develop', name: '开发', order: 20 },
      { type: 'developing', name: '研发中', order: 21, parentType: 'develop' },
      { type: 'developed', name: '研发完毕', order: 22, parentType: 'develop' },
      { type: 'pause', name: '已暂停', order: 30 },
      { type: 'canceled', name: '已取消', order: 40 },
      { type: 'closed', name: '已关闭', order: 50 },
    ];
    for (const def of columnDefs) {
      const parent = def.parentType ? colMap.get(def.parentType) : null;
      const col = await this.columnRepo.save(
        this.columnRepo.create({
          executionId: execId,
          type: def.type,
          parentId: parent ? Number(parent.id) : 0,
          name: def.name,
          wipLimit: -1,
          sortNo: def.order,
        }),
      );
      colMap.set(def.type, col);
    }

    // 单元格：task 泳道 × 全部列（story/bug 泳道卡片随 F3 接入，先建空格）
    const taskLane = laneMap.get('task');
    if (taskLane) {
      for (const col of colMap.values()) {
        await this.cellRepo.save(
          this.cellRepo.create({
            executionId: execId,
            laneId: taskLane.id,
            columnId: col.id,
            type: 'task',
            cards: '',
          }),
        );
      }
    }
    for (const laneType of ['story', 'bug']) {
      const lane = laneMap.get(laneType);
      if (!lane) continue;
      for (const col of colMap.values()) {
        await this.cellRepo.save(
          this.cellRepo.create({
            executionId: execId,
            laneId: lane.id,
            columnId: col.id,
            type: laneType,
            cards: '',
          }),
        );
      }
    }
  }

  /** 拖拽移动（docs/02 §8.1：拖到列=映射动作；成功后重排 cards；WIP 返回警告） */
  async moveCard(
    operatorId: string,
    executionId: string,
    taskId: string,
    toColumnId: string,
  ): Promise<{ task: ZtTask; wipExceeded: boolean }> {
    await this.ensureInitialized(executionId);
    const task = await this.taskRepo.findOne({
      where: { id: taskId, deleted: 0 },
    });
    if (!task)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '任务不存在',
      );
    if (Number(task.executionId) !== Number(executionId)) {
      throw new BusinessException(
        ErrorCodes.BOARD.MOVE_TARGET_INVALID,
        '任务不属于该执行',
      );
    }
    const toColumn = await this.columnRepo.findOne({
      where: { id: toColumnId, deleted: 0 },
    });
    if (!toColumn)
      throw new BusinessException(
        ErrorCodes.BOARD.MOVE_TARGET_INVALID,
        '目标列不存在',
      );

    // 目标列 → 任务动作（shared 映射；服务端唯一事实源）
    const type = toColumn.type;
    let updated = task;
    switch (type) {
      case 'wait':
        if (task.status === 'doing')
          updated = await this.taskService.backToWait(operatorId, task.id);
        break;
      case 'develop':
      case 'developing':
        if (task.status === 'wait')
          updated = await this.taskService.start(operatorId, task.id, {
            consumed: 0,
            left: Number(task.left) || Number(task.estimate),
          });
        else if (task.status === 'pause')
          updated = await this.taskService.restart(operatorId, task.id);
        else if (['done', 'closed', 'cancel'].includes(task.status)) {
          updated = await this.taskService.activate(operatorId, task.id, {
            left: Number(task.left) || Number(task.estimate) || 1,
          });
        }
        break;
      case 'developed':
        if (!['done', 'closed', 'cancel'].includes(task.status)) {
          updated = await this.taskService.finish(operatorId, task.id, {
            consumed:
              Number(task.estimate) - Number(task.consumed) > 0
                ? Number(task.estimate) - Number(task.consumed)
                : 1,
            realStarted: task.realStarted
              ? String(task.realStarted).slice(0, 10)
              : this.todayStr(),
            finishedDate: this.todayStr(),
          });
        }
        break;
      case 'pause':
        if (task.status === 'doing')
          updated = await this.taskService.pause(operatorId, task.id);
        break;
      case 'canceled':
        if (!['done', 'closed', 'cancel'].includes(task.status))
          updated = await this.taskService.cancel(operatorId, task.id);
        break;
      case 'closed':
        if (['done', 'cancel'].includes(task.status))
          updated = await this.taskService.close(operatorId, task.id);
        else
          throw new BusinessException(
            ErrorCodes.VALIDATION.INVALID_TRANSITION,
            `状态 ${task.status} 不可直接关闭（先完成/取消）`,
          );
        break;
      default:
        break;
    }

    // 按「新状态→列」重排 cards（状态权威，拖拽仅是入口）
    await this.placeTaskByStatus(executionId, updated);

    const wipExceeded = await this.isColumnOverWip(executionId, toColumn.id);
    return { task: updated, wipExceeded };
  }

  /** 按 TASK_STATUS_TO_COLUMN 将任务放入对应列（并从旧列移除） */
  async placeTaskByStatus(executionId: string, task: ZtTask): Promise<void> {
    const targetColType =
      {
        wait: 'wait',
        doing: 'developing',
        done: 'developed',
        pause: 'pause',
        cancel: 'canceled',
        closed: 'closed',
      }[task.status] ?? 'wait';
    const targetCol = await this.columnRepo.findOne({
      where: {
        executionId: Number(executionId),
        type: targetColType,
        deleted: 0,
      },
    });
    if (!targetCol) return;

    const cells = await this.cellRepo.find({
      where: { executionId: Number(executionId), type: 'task' },
    });
    for (const cell of cells) {
      const ids = (cell.cards ?? '').split(',').filter(Boolean);
      const has = ids.includes(task.id);
      const shouldBe = cell.columnId === targetCol.id;
      if (has && !shouldBe) {
        cell.cards = ids.filter((i) => i !== task.id).join(',');
        await this.cellRepo.save(cell);
      } else if (!has && shouldBe) {
        cell.cards = [...ids, task.id].join(',');
        await this.cellRepo.save(cell);
      }
    }
  }

  /** 列内重排序 */
  async reorder(
    executionId: string,
    columnId: string,
    taskId: string,
    ordinal: number,
  ): Promise<void> {
    const cell = await this.cellRepo.findOne({
      where: { executionId: Number(executionId), columnId, type: 'task' },
    });
    if (!cell)
      throw new BusinessException(
        ErrorCodes.BOARD.MOVE_TARGET_INVALID,
        '单元格不存在',
      );
    const ids = (cell.cards ?? '')
      .split(',')
      .filter(Boolean)
      .filter((i) => i !== taskId);
    const pos = Math.max(0, Math.min(ordinal, ids.length));
    ids.splice(pos, 0, taskId);
    cell.cards = ids.join(',');
    await this.cellRepo.save(cell);
  }

  async isColumnOverWip(
    executionId: string,
    columnId: string,
  ): Promise<boolean> {
    const col = await this.columnRepo.findOne({ where: { id: columnId } });
    if (!col || col.wipLimit < 0) return false;
    const cell = await this.cellRepo.findOne({
      where: { executionId: Number(executionId), columnId, type: 'task' },
    });
    const current = cell
      ? (cell.cards ?? '').split(',').filter(Boolean).length
      : 0;
    return current > col.wipLimit;
  }

  // ---- 列/泳道管理 ----
  async createColumn(
    executionId: string,
    dto: {
      type: string;
      name: string;
      parentId?: number;
      wipLimit?: number;
      sortNo?: number;
    },
  ) {
    await this.ensureInitialized(executionId);
    const validTypes = [
      'wait',
      'develop',
      'developing',
      'developed',
      'pause',
      'canceled',
      'closed',
    ];
    if (!validTypes.includes(dto.type)) {
      throw new BusinessException(
        ErrorCodes.BOARD.COLUMN_PARENT_INVALID,
        '列类型非法',
      );
    }
    if (dto.wipLimit !== undefined && dto.wipLimit >= 0) {
      if (dto.parentId) {
        const parent = await this.columnRepo.findOneBy({
          id: String(dto.parentId),
        });
        if (parent && parent.wipLimit >= 0) {
          const siblings = await this.columnRepo.find({
            where: { parentId: dto.parentId, deleted: 0 },
          });
          const sum =
            siblings.reduce((acc, s) => acc + Math.max(s.wipLimit, 0), 0) +
            dto.wipLimit;
          if (sum > parent.wipLimit)
            throw new BusinessException(
              ErrorCodes.BOARD.WIP_CONFIG_INVALID,
              `子列 WIP 合计 ${sum} 超父列 ${parent.wipLimit}`,
            );
        }
      }
    }
    const parent = dto.parentId
      ? await this.columnRepo.findOneBy({ id: String(dto.parentId) })
      : null;
    return this.columnRepo.save(
      this.columnRepo.create({
        executionId: Number(executionId),
        type: dto.type,
        parentId: parent ? Number(parent.id) : 0,
        name: dto.name,
        wipLimit: dto.wipLimit ?? -1,
        sortNo: dto.sortNo ?? 0,
      }),
    );
  }

  async updateColumn(
    id: string,
    dto: { name?: string; wipLimit?: number; sortNo?: number },
  ) {
    const col = await this.columnRepo.findOne({ where: { id, deleted: 0 } });
    if (!col)
      throw new BusinessException(ErrorCodes.VALIDATION.NOT_FOUND, '列不存在');
    if (dto.name !== undefined) col.name = dto.name;
    if (dto.wipLimit !== undefined) col.wipLimit = dto.wipLimit;
    if (dto.sortNo !== undefined) col.sortNo = dto.sortNo;
    return this.columnRepo.save(col);
  }

  async deleteColumn(id: string): Promise<void> {
    const col = await this.columnRepo.findOne({ where: { id, deleted: 0 } });
    if (!col)
      throw new BusinessException(ErrorCodes.VALIDATION.NOT_FOUND, '列不存在');
    const cell = await this.cellRepo.findOne({ where: { columnId: id } });
    if (cell && (cell.cards ?? '').split(',').filter(Boolean).length > 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '列内仍有卡片，禁止删除',
      );
    }
    const children = await this.columnRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    if (children > 0)
      throw new BusinessException(
        ErrorCodes.BOARD.COLUMN_PARENT_INVALID,
        '存在子列',
      );
    await this.columnRepo.update(id, { deleted: 1 });
    await this.cellRepo.delete({ columnId: id });
  }

  async createLane(
    executionId: string,
    dto: { type: string; name: string; color?: string; sortNo?: number },
  ) {
    await this.ensureInitialized(executionId);
    const dup = await this.laneRepo.findOne({
      where: { executionId: Number(executionId), type: dto.type, deleted: 0 },
    });
    if (dup)
      throw new BusinessException(
        ErrorCodes.VALIDATION.DUPLICATED,
        '泳道类型已存在',
      );
    const lane = await this.laneRepo.save(
      this.laneRepo.create({
        executionId: Number(executionId),
        type: dto.type,
        name: dto.name,
        color: dto.color ?? '',
        sortNo: dto.sortNo ?? 0,
      }),
    );
    // 新泳道建全列空格
    const columns = await this.columnRepo.find({
      where: { executionId: Number(executionId), deleted: 0 },
    });
    for (const col of columns) {
      await this.cellRepo.save(
        this.cellRepo.create({
          executionId: Number(executionId),
          laneId: lane.id,
          columnId: col.id,
          type: dto.type,
          cards: '',
        }),
      );
    }
    return lane;
  }

  async deleteLane(id: string): Promise<void> {
    const lane = await this.laneRepo.findOne({ where: { id, deleted: 0 } });
    if (!lane)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '泳道不存在',
      );
    if (lane.type === 'task')
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '任务泳道不可删除',
      );
    await this.laneRepo.update(id, { deleted: 1 });
    await this.cellRepo.delete({ laneId: id });
  }

  async getColumn(id: string): Promise<ZtKanbanColumn | null> {
    return this.columnRepo.findOne({ where: { id, deleted: 0 } });
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
