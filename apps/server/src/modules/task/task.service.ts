import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ErrorCodes,
  deriveParentStatus,
  deriveStatusOnEffort,
  TASK_TRANSITIONS,
} from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtTask } from './entities/zt-task.entity.js';
import { ZtEffort } from './entities/zt-effort.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { StoryService } from '../story/story.service.js';
import { ActivityService } from '../oa/activity.service.js';
import {
  ActivateTaskDto,
  AssignTaskDto,
  CreateTaskDto,
  FinishTaskDto,
  RecordEffortDto,
  StartTaskDto,
  UpdateTaskDto,
} from './dto/task.dto.js';

/**
 * 任务（docs/02 §6 状态机 + 工时隐式迁移 + 父子聚合）。
 * 状态流转三层：TASK_TRANSITIONS 入口校验 → 动作语义 → 落库副作用（父聚合 + story setStage）。
 * 简化声明（台账）：多人任务 mode=linear/multi 预留（P3.5）； consumed 只增不减校验 4702。
 */
@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(ZtTask) private readonly taskRepo: Repository<ZtTask>,
    @InjectRepository(ZtEffort)
    private readonly effortRepo: Repository<ZtEffort>,
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    private readonly storyService: StoryService,
    private readonly activity: ActivityService,
  ) {}

  async create(dto: CreateTaskDto, operatorId: string): Promise<ZtTask> {
    let storyVersion = 1;
    if (dto.storyId) {
      const story = await this.storyRepo.findOne({
        where: { id: dto.storyId, deleted: 0 },
      });
      if (!story)
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          '关联需求不存在',
        );
      storyVersion = story.version; // 锁定版本快照（docs/02 §4.3）
    }
    const created = await this.taskRepo.save(
      this.taskRepo.create({
        projectId: Number(dto.projectId),
        executionId: Number(dto.executionId),
        storyId: dto.storyId ? Number(dto.storyId) : 0,
        storyVersion,
        name: dto.name,
        type: dto.type ?? 'devel',
        pri: dto.pri ?? 3,
        estimate: dto.estimate,
        desc: dto.desc ?? null,
        assignedTo: dto.assignedTo ?? '',
        assignedAt: dto.assignedTo ? new Date() : null,
        estStarted: dto.estStarted ? new Date(dto.estStarted) : null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        openedBy: operatorId,
        createdBy: operatorId,
      }),
    );
    if (dto.storyId) await this.refreshStoryStage(dto.storyId, 'startTask');
    return created;
  }

  async list(query: {
    executionId?: string;
    projectId?: string;
    storyId?: string;
    status?: string;
    assignedTo?: string;
  }) {
    const qb = this.taskRepo.createQueryBuilder('t').where('t.deleted = 0');
    if (query.executionId)
      qb.andWhere('t.execution_id = :eid', { eid: query.executionId });
    if (query.projectId)
      qb.andWhere('t.project_id = :pid', { pid: query.projectId });
    if (query.storyId) qb.andWhere('t.story_id = :sid', { sid: query.storyId });
    if (query.assignedTo)
      qb.andWhere('t.assigned_to = :at', { at: query.assignedTo });
    if (query.status) {
      const statuses = query.status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length)
        qb.andWhere('t.status IN (:...sts)', { sts: statuses });
    }
    return qb.orderBy('t.id', 'DESC').limit(200).getMany();
  }

  async get(id: string) {
    const task = await this.mustFind(id);
    const efforts = await this.effortRepo.find({
      where: { objectType: 'task', objectId: id, deleted: 0 },
      order: { id: 'ASC' },
    });
    const children = await this.taskRepo.find({
      where: { parentId: Number(id), deleted: 0 },
    });
    return { ...task, efforts, children };
  }

  /** 通用流转入口：TASK_TRANSITIONS 前置校验（3006），动作语义由调用方法完成 */
  private assertTransition(action: string, status: string): void {
    const allowed = TASK_TRANSITIONS[action];
    if (allowed && !allowed.includes(status)) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${status} 不允许 ${action}`,
      );
    }
  }

  /** start（仅 wait；left=0 直接完成，docs/02 §6.1 zen.php:834-840） */
  async start(
    operatorId: string,
    id: string,
    dto: StartTaskDto,
  ): Promise<ZtTask> {
    const task = await this.mustFind(id);
    this.assertTransition('start', task.status);
    if (dto.consumed < Number(task.consumed)) {
      throw new BusinessException(
        ErrorCodes.TASK.CONSUMED_IMMUTABLE,
        'consumed 不得小于旧值',
      );
    }
    task.realStarted = dto.realStarted ? new Date(dto.realStarted) : new Date();
    task.assignedTo = task.assignedTo || operatorId;
    await this.applyEffortSilent(
      task,
      operatorId,
      dto.consumed,
      dto.left,
      '开始任务',
    );
    if (dto.left === 0 && task.status !== 'done') {
      task.status = 'done';
      task.finishedBy = operatorId;
      task.finishedAt = new Date();
    } else if (task.status === 'wait') {
      task.status = 'doing';
    }
    const saved = await this.taskRepo.save(task);
    await this.afterStatusChange(saved, operatorId, 'startTask');
    return saved;
  }

  /** restart（仅 pause → doing，action=Restarted 语义） */
  async restart(operatorId: string, id: string): Promise<ZtTask> {
    const task = await this.mustFind(id);
    this.assertTransition('restart', task.status);
    task.status = 'doing';
    const saved = await this.taskRepo.save(task);
    await this.afterStatusChange(saved, operatorId, 'startTask');
    return saved;
  }

  /** pause（仅 doing；同步暂停 doing 子任务，docs/02 §6.3 向下传播） */
  async pause(operatorId: string, id: string): Promise<ZtTask> {
    const task = await this.mustFind(id);
    this.assertTransition('pause', task.status);
    task.status = 'pause';
    const saved = await this.taskRepo.save(task);
    if (saved.isParent === 1) {
      const children = await this.taskRepo.find({
        where: { parentId: Number(id), status: 'doing', deleted: 0 },
      });
      for (const c of children) {
        c.status = 'pause';
        await this.taskRepo.save(c);
      }
    }
    await this.afterStatusChange(saved, operatorId, 'startTask');
    return saved;
  }

  /** finish（consumed=旧+新增；effort left=0；done，docs/02 §6.1） */
  async finish(
    operatorId: string,
    id: string,
    dto: FinishTaskDto,
  ): Promise<ZtTask> {
    const task = await this.mustFind(id);
    this.assertTransition('finish', task.status);
    if (dto.consumed <= 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.MISSING_REQUIRED,
        '完成消耗须 >0',
      );
    }
    task.realStarted = new Date(dto.realStarted);
    await this.applyEffortSilent(
      task,
      operatorId,
      dto.consumed,
      0,
      dto.work ?? '完成任务',
    );
    task.status = 'done';
    task.finishedBy = operatorId;
    task.finishedAt = new Date(dto.finishedDate);
    const saved = await this.taskRepo.save(task);
    await this.afterStatusChange(saved, operatorId, 'finishTask');
    return saved;
  }

  /** cancel（→ cancel；assignedTo=openedBy；来源 bug 清 toTask 语义简化） */
  async cancel(operatorId: string, id: string): Promise<ZtTask> {
    const task = await this.mustFind(id);
    this.assertTransition('cancel', task.status);
    task.status = 'cancel';
    task.canceledBy = operatorId;
    task.canceledAt = new Date();
    task.assignedTo = task.openedBy;
    const saved = await this.taskRepo.save(task);
    await this.afterStatusChange(saved, operatorId, 'cancelTask');
    return saved;
  }

  /** close（仅 done/cancel；closedReason 自动映射，docs/02 §6.1） */
  async close(operatorId: string, id: string): Promise<ZtTask> {
    const task = await this.mustFind(id);
    this.assertTransition('close', task.status);
    task.status = 'closed';
    task.closedReason = task.status === 'cancel' ? 'cancel' : 'done';
    task.closedReason =
      task.status === 'closed' && Number(task.consumed) === 0
        ? 'cancel'
        : 'done';
    task.closedBy = operatorId;
    task.closedAt = new Date();
    const saved = await this.taskRepo.save(task);
    await this.afterStatusChange(saved, operatorId, 'closeTask');
    return saved;
  }

  /** activate 返工（done/closed/cancel → doing；left 必填 4706） */
  async activate(
    operatorId: string,
    id: string,
    dto: ActivateTaskDto,
  ): Promise<ZtTask> {
    const task = await this.mustFind(id);
    this.assertTransition('activate', task.status);
    if (dto.left <= 0) {
      throw new BusinessException(
        ErrorCodes.TASK.LEFT_REQUIRED,
        '返工剩余工时须 >0',
      );
    }
    task.left = dto.left;
    task.status = 'doing';
    task.activatedDate = new Date();
    task.finishedBy = '';
    task.finishedAt = null;
    task.closedBy = '';
    task.closedAt = null;
    const saved = await this.taskRepo.save(task);
    await this.afterStatusChange(saved, operatorId, 'activateTask');
    return saved;
  }

  /** 指派（未完成任务 left 须 >0，4706） */
  async assign(id: string, dto: AssignTaskDto): Promise<ZtTask> {
    const task = await this.mustFind(id);
    if (
      task.isParent === 0 &&
      !['done', 'closed'].includes(task.status) &&
      Number(task.left) === 0
    ) {
      throw new BusinessException(
        ErrorCodes.TASK.LEFT_REQUIRED,
        '未完成任务指派须剩余工时 >0',
      );
    }
    task.assignedTo = dto.assignedTo;
    task.assignedAt = new Date();
    return this.taskRepo.save(task);
  }

  /** 编辑（不改状态与工时） */
  async update(id: string, dto: UpdateTaskDto): Promise<ZtTask> {
    const task = await this.mustFind(id);
    if (dto.name !== undefined) task.name = dto.name;
    if (dto.desc !== undefined) task.desc = dto.desc;
    if (dto.deadline !== undefined) task.deadline = new Date(dto.deadline);
    if (dto.pri !== undefined) task.pri = dto.pri;
    return this.taskRepo.save(task);
  }

  /**
   * 记工时（docs/02 §6.4 隐式状态驱动）：
   * date≤今天（4703）；effort 落库 → consumed=Σ / left=最后一条 → deriveStatusOnEffort 隐式迁移 → 父聚合 → story setStage。
   */
  async recordEffort(
    operatorId: string,
    taskId: string,
    dto: RecordEffortDto,
  ): Promise<ZtTask> {
    const task = await this.mustFind(taskId);
    const today = new Date();
    const date = new Date(dto.date);
    if (date > today) {
      throw new BusinessException(
        ErrorCodes.TASK.EFFORT_DATE_FUTURE,
        '工时日期不能晚于今天',
      );
    }
    await this.applyEffortSilent(
      task,
      operatorId,
      dto.consumed,
      dto.left,
      dto.work,
      date,
    );

    // 隐式状态迁移（shared 纯函数）
    const derived = deriveStatusOnEffort(
      task.status,
      dto.left,
      Number(task.consumed),
    );
    let action: string | null = null;
    if (derived) {
      task.status = derived.status;
      action = derived.action;
      if (derived.status === 'done') {
        task.finishedBy = operatorId;
        task.finishedAt = new Date();
      }
      if (derived.action === 'Started') task.assignedTo = operatorId;
    }
    const saved = await this.taskRepo.save(task);
    if (saved.parentId > 0) await this.aggregateParent(saved.parentId);
    await this.afterStatusChange(saved, operatorId, 'recordEffort');
    void action;
    return saved;
  }

  /** 删除工时（软删 + 全量重算；consumed 归零回 wait，docs/02 §6.4） */
  async deleteEffort(operatorId: string, effortId: string): Promise<ZtTask> {
    const effort = await this.effortRepo.findOne({
      where: { id: effortId, deleted: 0 },
    });
    if (!effort)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '工时记录不存在',
      );
    await this.effortRepo.update(effortId, { deleted: 1 });
    const task = await this.mustFind(effort.objectId);
    await this.recomputeEffortAggregates(task);
    if (Number(task.consumed) === 0 && task.status !== 'closed') {
      task.status = 'wait';
      task.finishedBy = '';
      task.finishedAt = null;
    }
    const saved = await this.taskRepo.save(task);
    if (saved.parentId > 0) await this.aggregateParent(saved.parentId);
    await this.afterStatusChange(saved, operatorId, 'deleteEffort');
    return saved;
  }

  /** 拆分子任务（docs/02 §6.3：父 isParent=1；工时聚合） */
  async split(
    operatorId: string,
    parentId: string,
    children: Array<{
      name: string;
      estimate: number;
      type?: string;
      assignedTo?: string;
    }>,
  ): Promise<ZtTask[]> {
    const parent = await this.mustFind(parentId);
    const created: ZtTask[] = [];
    for (const c of children) {
      const child = await this.taskRepo.save(
        this.taskRepo.create({
          projectId: parent.projectId,
          parentId: Number(parent.id),
          executionId: parent.executionId,
          storyId: parent.storyId,
          storyVersion: parent.storyVersion,
          name: c.name,
          type: c.type ?? parent.type,
          pri: parent.pri,
          estimate: c.estimate,
          assignedTo: c.assignedTo ?? '',
          openedBy: operatorId,
          createdBy: operatorId,
        }),
      );
      child.pathStr = parent.pathStr
        ? `${parent.pathStr}${child.id},`
        : `,${child.id},`;
      await this.taskRepo.save(child);
      created.push(child);
    }
    parent.isParent = 1;
    await this.taskRepo.save(parent);
    await this.aggregateParent(Number(parent.id));
    return created;
  }

  /** 父任务聚合（docs/02 §6.3 computeWorkingHours + deriveParentStatus） */
  private async aggregateParent(parentId: number): Promise<void> {
    const parent = await this.taskRepo.findOne({
      where: { id: String(parentId) },
    });
    if (!parent) return;
    const children = await this.taskRepo.find({
      where: { parentId, deleted: 0 },
    });
    const alive = children.filter((c) => c.status !== 'cancel');
    parent.estimate = alive.reduce((acc, c) => acc + Number(c.estimate), 0);
    parent.consumed = alive.reduce((acc, c) => acc + Number(c.consumed), 0);
    parent.left = alive
      .filter((c) => c.status !== 'closed')
      .reduce((acc, c) => acc + Number(c.left), 0);
    const derived = deriveParentStatus(children.map((c) => c.status));
    if (
      ['doing', 'done'].includes(derived) &&
      !['closed', 'cancel'].includes(parent.status)
    ) {
      parent.status = derived;
      if (derived === 'done') {
        parent.finishedBy = parent.finishedBy || parent.openedBy;
        parent.finishedAt = parent.finishedAt ?? new Date();
      }
    }
    await this.taskRepo.save(parent);
    if (parent.parentId > 0) await this.aggregateParent(parent.parentId);
    if (parent.storyId > 0)
      await this.refreshStoryStage(String(parent.storyId), 'finishTask');
  }

  /** consumed=Σeffort（软删外）/ left=最后一条（docs/02 §6.4 聚合规则） */
  private async recomputeEffortAggregates(task: ZtTask): Promise<void> {
    const efforts = await this.effortRepo.find({
      where: { objectType: 'task', objectId: task.id, deleted: 0 },
      order: { id: 'ASC' },
    });
    task.consumed = efforts.reduce((acc, e) => acc + Number(e.consumed), 0);
    task.left = efforts.length ? Number(efforts[efforts.length - 1].left) : 0;
  }

  /** 静默写入 effort 行并重算聚合（供 start/finish/effort 复用） */
  private async applyEffortSilent(
    task: ZtTask,
    operatorId: string,
    consumed: number,
    left: number,
    work: string,
    date?: Date,
  ): Promise<void> {
    await this.effortRepo.save(
      this.effortRepo.create({
        objectType: 'task',
        objectId: task.id,
        projectId: task.projectId,
        executionId: task.executionId,
        userId: operatorId,
        date: date ?? new Date(),
        consumed,
        left,
        work,
      }),
    );
    await this.recomputeEffortAggregates(task);
  }

  /** 状态变化后公共副作用：父聚合 + story setStage（docs/02 §6.1 afterChangeStatus） */
  private async afterStatusChange(
    task: ZtTask,
    operatorId: string,
    trigger: string,
  ): Promise<void> {
    if (task.parentId > 0) await this.aggregateParent(task.parentId);
    if (task.storyId > 0)
      await this.refreshStoryStage(String(task.storyId), trigger);
    // P5：审计日志 + 指派通知（动作矩阵 docs/02 §9.2 task 分支）
    const actionName =
      trigger === 'startTask'
        ? 'started'
        : trigger === 'finishTask'
          ? 'finished'
          : trigger === 'cancelTask'
            ? 'canceled'
            : trigger === 'closeTask'
              ? 'closed'
              : trigger === 'activateTask'
                ? 'activated'
                : 'recordEffort';
    await this.activity.log({
      objectType: 'task',
      objectId: task.id,
      actor: operatorId,
      action: actionName,
      projectId: task.projectId,
      executionId: task.executionId,
    });
    if (task.assignedTo && task.assignedTo !== operatorId) {
      await this.activity.notify({
        toUserId: task.assignedTo,
        objectType: 'task',
        objectId: task.id,
        action: 'assigned',
        subject: '任务【' + task.name + '】状态更新：' + task.status,
        data: { status: task.status, by: operatorId },
      });
    }
  }

  /** story stage 任务维度推进（docs/02 §4.4 setStageFromTasks：design/devel/test 三桶） */
  private async refreshStoryStage(
    storyId: string,
    trigger: string,
  ): Promise<void> {
    const tasks = await this.taskRepo.find({
      where: { storyId: Number(storyId), deleted: 0 },
    });
    const bucket = (type: string): string => {
      const rel = tasks.filter((t) =>
        type === 'devel' ? ['devel'].includes(t.type) : t.type === type,
      );
      if (rel.length === 0) return 'none';
      if (rel.some((t) => ['doing', 'pause'].includes(t.status)))
        return 'doing';
      if (rel.every((t) => ['done', 'closed', 'cancel'].includes(t.status)))
        return 'done';
      return 'wait';
    };
    const stats = {
      design: bucket('design'),
      devel: bucket('devel'),
      test: bucket('test'),
    };
    await this.storyService.setStageFromTasks(storyId, stats);
    await this.storyService.setStage(storyId, trigger);
  }

  /** 删除守卫：有子任务/已耗工时拒绝（docs/06 §5 事务纪律简化版） */
  async removeWithGuard(id: string): Promise<void> {
    const task = await this.mustFind(id);
    const children = await this.taskRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    if (children > 0)
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '存在子任务，禁止删除',
      );
    if (Number(task.consumed) > 0)
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '已有工时消耗，禁止删除',
      );
    await this.taskRepo.update(id, { deleted: 1 });
    if (task.parentId > 0) await this.aggregateParent(task.parentId);
  }

  private async mustFind(id: string): Promise<ZtTask> {
    const task = await this.taskRepo.findOne({ where: { id, deleted: 0 } });
    if (!task)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '任务不存在',
      );
    return task;
  }
}

function noopUnused(): void {
  void In;
}
void noopUnused;

undefined;
