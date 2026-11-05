import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ActivityService } from './activity.service.js';
import { ZtTodo } from './entities/zt-todo.entity.js';
import { ZtEffort } from '../task/entities/zt-effort.entity.js';
import { ZtNotify } from './entities/zt-notify.entity.js';
import { ZtActionLog } from './entities/zt-action-log.entity.js';
import { CreateEffortDto, CreateTodoDto, UpdateTodoDto } from './dto/oa.dto.js';

/** 事务（docs/01 §6.8）：todo 四态 + effort 独立填报 + notify/action-log 查询 */
@Injectable()
export class OaService {
  constructor(
    @InjectRepository(ZtTodo) private readonly todoRepo: Repository<ZtTodo>,
    @InjectRepository(ZtEffort)
    private readonly effortRepo: Repository<ZtEffort>,
    @InjectRepository(ZtNotify)
    private readonly notifyRepo: Repository<ZtNotify>,
    @InjectRepository(ZtActionLog)
    private readonly logRepo: Repository<ZtActionLog>,
    private readonly activity: ActivityService,
  ) {}

  // ---- Todo ----
  async createTodo(dto: CreateTodoDto, operatorId: string): Promise<ZtTodo> {
    if (dto.type !== 'custom') {
      if (!dto.objectId)
        throw new BusinessException(
          ErrorCodes.OA.TODO_OBJECT_CONFLICT,
          '关联类型须携带 objectId',
        );
    } else if (!dto.name) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.MISSING_REQUIRED,
        '自建待办须填写名称',
      );
    }
    const owner = dto.assignedTo || operatorId;
    return this.todoRepo.save(
      this.todoRepo.create({
        userId: operatorId,
        type: dto.type,
        objectId: dto.objectId ? Number(dto.objectId) : 0,
        date: dto.date ? new Date(dto.date) : new Date(),
        pri: dto.pri ?? 3,
        name: dto.name ?? `【${dto.type}】#${dto.objectId ?? ''}`,
        desc: dto.desc ?? null,
        assignedTo: owner,
        createdBy: operatorId,
      }),
    );
  }

  /** 我的待办（assignedTo=自己；禅道「我的地盘」语义） */
  async myTodos(userId: string, status?: string) {
    const qb = this.todoRepo
      .createQueryBuilder('t')
      .where('t.deleted = 0')
      .andWhere('(t.assigned_to = :uid OR t.user_id = :uid)', { uid: userId });
    if (status) {
      const sts = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (sts.length) qb.andWhere('t.status IN (:...sts)', { sts });
    }
    return qb
      .orderBy('t.status', 'ASC')
      .addOrderBy('t.id', 'DESC')
      .limit(200)
      .getMany();
  }

  async updateTodo(
    operatorId: string,
    id: string,
    dto: UpdateTodoDto,
  ): Promise<ZtTodo> {
    const todo = await this.mustFindTodo(id, operatorId);
    if (dto.name !== undefined) todo.name = dto.name;
    if (dto.desc !== undefined) todo.desc = dto.desc;
    if (dto.pri !== undefined) todo.pri = dto.pri;
    if (dto.date !== undefined) todo.date = new Date(dto.date);
    await this.activity.log({
      objectType: 'todo',
      objectId: id,
      actor: operatorId,
      action: 'edited',
    });
    return this.todoRepo.save(todo);
  }

  /** 四态流转（docs/02 §11：wait→doing→done→closed，activate 可回退） */
  async changeTodoStatus(
    operatorId: string,
    id: string,
    action: string,
  ): Promise<ZtTodo> {
    const todo = await this.mustFindTodo(id, operatorId);
    const map: Record<string, { from: string[]; to: string }> = {
      start: { from: ['wait'], to: 'doing' },
      finish: { from: ['wait', 'doing'], to: 'done' },
      close: { from: ['wait', 'doing', 'done'], to: 'closed' },
      activate: { from: ['done', 'closed'], to: 'doing' },
    };
    const rule = map[action];
    if (!rule)
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '未知状态动作',
      );
    if (!rule.from.includes(todo.status)) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${todo.status} 不允许 ${action}`,
      );
    }
    todo.status = rule.to;
    if (action === 'finish') {
      todo.finishedBy = operatorId;
      todo.finishedAt = new Date();
    }
    if (action === 'close') {
      todo.closedBy = operatorId;
      todo.closedAt = new Date();
    }
    if (action === 'activate') {
      todo.finishedBy = '';
      todo.finishedAt = null;
      todo.closedBy = '';
      todo.closedAt = null;
    }
    await this.activity.log({
      objectType: 'todo',
      objectId: id,
      actor: operatorId,
      action:
        action === 'finish'
          ? 'finished'
          : action === 'close'
            ? 'closed'
            : action === 'start'
              ? 'started'
              : 'activated',
      extra: `from=${todo.status}`,
    });
    return this.todoRepo.save(todo);
  }

  async removeTodo(operatorId: string, id: string): Promise<void> {
    await this.mustFindTodo(id, operatorId);
    await this.todoRepo.update(id, { deleted: 1 });
    await this.activity.log({
      objectType: 'todo',
      objectId: id,
      actor: operatorId,
      action: 'deleted',
    });
  }

  // ---- Effort 独立填报（objectType≠task 走此入口；task 工时走 task 模块隐式迁移） ----
  async createEffort(operatorId: string, dto: CreateEffortDto) {
    const today = new Date();
    const date = new Date(dto.date);
    if (date > today)
      throw new BusinessException(
        ErrorCodes.TASK.EFFORT_DATE_FUTURE,
        '工时日期不能晚于今天',
      );
    if (dto.consumed <= 0)
      throw new BusinessException(
        ErrorCodes.VALIDATION.MISSING_REQUIRED,
        '消耗工时须 >0',
      );
    const effort = await this.effortRepo.save(
      this.effortRepo.create({
        objectType: dto.objectType,
        objectId: dto.objectId ?? '0',
        userId: operatorId,
        date,
        consumed: dto.consumed,
        left: dto.left ?? 0,
        work: dto.work,
      }),
    );
    await this.activity.log({
      objectType: dto.objectType,
      objectId: dto.objectId ?? '0',
      actor: operatorId,
      action: 'recordEffort',
      extra: `consumed=${dto.consumed}`,
    });
    return effort;
  }

  async myEfforts(userId: string, begin?: string, end?: string) {
    const qb = this.effortRepo
      .createQueryBuilder('e')
      .where('e.deleted = 0')
      .andWhere('e.user_id = :uid', { uid: userId });
    if (begin) qb.andWhere('e.date >= :b', { b: begin });
    if (end) qb.andWhere('e.date <= :e2', { e2: end });
    return qb.orderBy('e.date', 'DESC').limit(200).getMany();
  }

  // ---- Notify ----
  async myNotifications(userId: string, unreadOnly: boolean) {
    const qb = this.notifyRepo
      .createQueryBuilder('n')
      .where('n.to_user_id = :uid', { uid: userId });
    if (unreadOnly) qb.andWhere('n.status = :st', { st: 'wait' });
    return qb.orderBy('n.id', 'DESC').limit(100).getMany();
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notifyRepo.count({
      where: { toUserId: String(userId), status: 'wait' },
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const n = await this.notifyRepo.findOneBy({ id });
    if (!n)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '通知不存在',
      );
    if (n.toUserId !== userId)
      throw new BusinessException(
        ErrorCodes.AUTH.DATA_FORBIDDEN,
        '仅收件人可操作',
      );
    if (n.status === 'wait') {
      n.status = 'done';
      n.readAt = new Date();
      await this.notifyRepo.save(n);
    }
  }

  // ---- ActionLog 查询 ----
  async actions(objectType: string, objectId: string) {
    return this.activity.listActions(objectType, objectId);
  }

  async actionDetail(actionId: string) {
    const detail = await this.activity.getAction(actionId);
    if (!detail)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '日志不存在',
      );
    return detail;
  }

  private async mustFindTodo(id: string, operatorId: string): Promise<ZtTodo> {
    const todo = await this.todoRepo.findOne({ where: { id, deleted: 0 } });
    if (!todo)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '待办不存在',
      );
    if (todo.assignedTo !== operatorId && todo.userId !== operatorId) {
      // 简化：仅本人/被指派可操作（docs/03 §4.16 todo 语义）
      throw new BusinessException(ErrorCodes.AUTH.DATA_FORBIDDEN, '无数据权限');
    }
    return todo;
  }
}
