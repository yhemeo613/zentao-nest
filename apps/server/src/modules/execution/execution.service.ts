import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { DataScopeService } from '../data-scope/data-scope.service.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import { ZtProgram } from '../program/entities/zt-program.entity.js';
import { MODEL_EXECUTION_TYPE } from '../project/dto/project.dto.js';
import { ZtExecution } from './entities/zt-execution.entity.js';
import {
  CloseExecutionDto,
  CreateExecutionDto,
  STAGE_ATTRIBUTES,
  UpdateExecutionDto,
} from './dto/execution.dto.js';

/**
 * 执行（docs/03 §4.9；状态机 docs/02 §3.5）：
 * - type 由项目 model 自动映射（scrum→sprint/waterfall→stage/kanban→kanban）；
 * - 回 wait 拒绝条件：有 realBegan（4602，任务工时条件 P3 任务域落地后补充）；
 * - close/suspend 级联：子阶段须全部 closed/suspended（4603）；
 * - start 触发 syncPPE：执行→项目→项目集 逐级 wait→doing。
 */
@Injectable()
export class ExecutionService {
  constructor(
    @InjectRepository(ZtExecution)
    private readonly executionRepo: Repository<ZtExecution>,
    @InjectRepository(ZtProject)
    private readonly projectRepo: Repository<ZtProject>,
    @InjectRepository(ZtProgram)
    private readonly programRepo: Repository<ZtProgram>,
    private readonly dataScope: DataScopeService,
  ) {}

  async create(
    operatorId: string,
    dto: CreateExecutionDto,
  ): Promise<ZtExecution> {
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId, deleted: 0 },
    });
    if (!project)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '项目不存在',
      );

    const parent = dto.parentId ? await this.mustFind(dto.parentId) : null;
    if (parent && Number(parent.projectId) !== Number(dto.projectId)) {
      throw new BusinessException(
        ErrorCodes.EXECUTION.TYPE_MODEL_MISMATCH,
        '父阶段不属于该项目',
      );
    }

    // 子阶段类型继承父阶段（stage）；顶层执行由项目 model 映射（docs/02 §3.1）
    const type = parent
      ? parent.type
      : (MODEL_EXECUTION_TYPE[project.model] ?? 'sprint');

    // 瀑布属性校验
    if (dto.attribute && !STAGE_ATTRIBUTES.includes(dto.attribute)) {
      throw new BusinessException(
        ErrorCodes.EXECUTION.TYPE_MODEL_MISMATCH,
        '工序属性非法',
      );
    }
    if (dto.percent !== undefined && type === 'stage') {
      // 同级占比合计 ≤100（4604，对齐 zt_stage percent 规则）
      const siblings = await this.executionRepo.find({
        where: {
          projectId: Number(dto.projectId),
          parentId: parent ? Number(parent.id) : Number(project.id),
          deleted: 0,
        },
      });
      const sum =
        siblings.reduce((acc, s) => acc + Number(s.percent ?? 0), 0) +
        dto.percent;
      if (sum > 100) {
        throw new BusinessException(
          ErrorCodes.EXECUTION.STAGE_PERCENT_OVERFLOW,
          `同级阶段占比合计 ${sum}% 超 100`,
        );
      }
    }

    const created = await this.executionRepo.save(
      this.executionRepo.create({
        projectId: Number(dto.projectId),
        type,
        grade: parent ? parent.grade + 1 : 1,
        parentId: parent ? Number(parent.id) : Number(project.id),
        name: dto.name,
        attribute: dto.attribute ?? '',
        begin: new Date(dto.begin),
        end: new Date(dto.end),
        days: dto.days ?? 0,
        sprintGoal: dto.sprintGoal ?? '',
        milestone: dto.milestone ?? 0,
        percent: dto.percent ?? 0,
        createdBy: operatorId,
        pathStr: '',
      }),
    );
    created.pathStr = parent
      ? `${parent.pathStr}${created.id},`
      : `,${dto.projectId},${created.id},`;
    return this.executionRepo.save(created);
  }

  async list(operatorId: string, projectId: string): Promise<ZtExecution[]> {
    const unrestricted = await this.dataScope.isUnrestricted(operatorId);
    const viewIds = await this.dataScope.getViewIds(operatorId, 'execution');
    const qb = this.executionRepo
      .createQueryBuilder('e')
      .where('e.deleted = 0')
      .andWhere('e.project_id = :pid', { pid: projectId });
    if (!unrestricted) {
      if (viewIds.length === 0) return [];
      qb.andWhere('e.id IN (:...ids)', { ids: viewIds });
    }
    return qb.orderBy('e.sortNo', 'ASC').addOrderBy('e.id', 'ASC').getMany();
  }

  async get(operatorId: string, id: string): Promise<ZtExecution> {
    await this.dataScope.assertCanView(operatorId, 'execution', id);
    return this.mustFind(id);
  }

  async update(
    operatorId: string,
    id: string,
    dto: UpdateExecutionDto,
  ): Promise<ZtExecution> {
    await this.dataScope.assertCanView(operatorId, 'execution', id);
    const execution = await this.mustFind(id);
    if (dto.name !== undefined) execution.name = dto.name;
    if (dto.end !== undefined) execution.end = new Date(dto.end);
    if (dto.sprintGoal !== undefined) execution.sprintGoal = dto.sprintGoal;
    if (dto.sortNo !== undefined) execution.sortNo = dto.sortNo;
    return this.executionRepo.save(execution);
  }

  /** 延期（docs/02 §3.5 putoff）：end 顺延 */
  async putoff(
    operatorId: string,
    id: string,
    end: string,
  ): Promise<ZtExecution> {
    await this.dataScope.assertCanView(operatorId, 'execution', id);
    const execution = await this.mustFind(id);
    if (execution.status === 'closed') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '已关闭，不能延期',
      );
    }
    execution.end = new Date(end);
    return this.executionRepo.save(execution);
  }

  async remove(operatorId: string, id: string): Promise<void> {
    await this.dataScope.assertCanView(operatorId, 'execution', id);
    await this.mustFind(id);
    const children = await this.executionRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    if (children > 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '存在子阶段，禁止删除',
      );
    }
    await this.executionRepo.update(id, { deleted: 1 });
    await this.dataScope.invalidateUser();
  }

  // ---------- 状态流转（docs/02 §3.5 执行状态机表） ----------

  async start(operatorId: string, id: string): Promise<ZtExecution> {
    const e = await this.mustFindVisible(operatorId, id);
    if (e.status !== 'wait' && e.status !== 'suspended') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${e.status} 不允许 start`,
      );
    }
    if (!e.realBegan) e.realBegan = new Date();
    e.status = 'doing';
    const saved = await this.executionRepo.save(e);
    // syncPPE：执行开始 → 项目 → 项目集（docs/02 §3.5 传播链）
    await this.propagateUp(Number(e.projectId));
    return saved;
  }

  async suspend(operatorId: string, id: string): Promise<ZtExecution> {
    const e = await this.mustFindVisible(operatorId, id);
    if (e.status !== 'doing') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${e.status} 不允许 suspend`,
      );
    }
    // 级联：子阶段须全部 suspended/closed（docs/02 §3.5 changeStatus2Inactive）
    const children = await this.executionRepo.find({
      where: { parentId: Number(id), deleted: 0 },
    });
    const bad = children.filter(
      (c) => c.status !== 'suspended' && c.status !== 'closed',
    );
    if (bad.length > 0) {
      throw new BusinessException(
        ErrorCodes.EXECUTION.CASCADE_STATUS_UNMET,
        '存在未挂起/未关闭的子阶段',
      );
    }
    e.status = 'suspended';
    return this.executionRepo.save(e);
  }

  async activate(operatorId: string, id: string): Promise<ZtExecution> {
    const e = await this.mustFindVisible(operatorId, id);
    if (e.status !== 'suspended' && e.status !== 'closed') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${e.status} 不允许 activate`,
      );
    }
    // 无 realBegan 且无消耗 → 回 wait（docs/02 §3.5 execution/model.php:958 对齐）
    e.status = e.realBegan || Number(e.consumed) > 0 ? 'doing' : 'wait';
    e.realEnd = null;
    const saved = await this.executionRepo.save(e);
    if (saved.status === 'doing')
      await this.propagateUp(Number(saved.projectId));
    return saved;
  }

  async close(
    operatorId: string,
    id: string,
    dto: CloseExecutionDto,
  ): Promise<ZtExecution> {
    const e = await this.mustFindVisible(operatorId, id);
    if (e.status === 'closed')
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '已关闭',
      );
    // 级联：子阶段须全部 closed（docs/02 §3.5 changeStatus2Inactive:783-815）
    const children = await this.executionRepo.find({
      where: { parentId: Number(id), deleted: 0 },
    });
    const bad = children.filter((c) => c.status !== 'closed');
    if (bad.length > 0) {
      throw new BusinessException(
        ErrorCodes.EXECUTION.CASCADE_STATUS_UNMET,
        '存在未关闭子阶段',
      );
    }
    e.status = 'closed';
    if (!e.realEnd) e.realEnd = new Date();
    // closedReason 明细随操作日志（P5 zt_action_log）落档；实体无冗余列（docs/04 §3）
    void dto;
    return this.executionRepo.save(e);
  }

  /** 回 wait 校验（4602）：有 realBegan 拒绝——独立端点供 wait 语义管理，activate 内部已覆盖 */
  async backToWait(operatorId: string, id: string): Promise<ZtExecution> {
    const e = await this.mustFindVisible(operatorId, id);
    if (e.realBegan || Number(e.consumed) > 0) {
      throw new BusinessException(
        ErrorCodes.EXECUTION.BACK_TO_WAIT_REJECTED,
        '已开始或有工时消耗，不能回到 wait',
      );
    }
    if (e.status !== 'doing') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${e.status} 不允许回 wait`,
      );
    }
    e.status = 'wait';
    e.realBegan = null;
    return this.executionRepo.save(e);
  }

  /**
   * syncPPE 向上传播（docs/02 §3.5）：
   * 执行 doing → 所属项目 wait→doing → 所属项目集 wait→doing。
   * 完整链路（任务驱动）随 P3 任务域补充；P2 由执行显式 start/activate 触发。
   */
  private async propagateUp(projectId: number): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: String(projectId), deleted: 0 },
    });
    if (!project) return;
    if (project.status === 'wait') {
      project.status = 'doing';
      if (!project.realBegan) project.realBegan = new Date();
      await this.projectRepo.save(project);
    }
    if (project.programId === 0) return;
    const program = await this.programRepo.findOne({
      where: { id: String(project.programId), deleted: 0 },
    });
    if (program && program.status === 'wait') {
      program.status = 'doing';
      if (!program.realBegan) program.realBegan = new Date();
      await this.programRepo.save(program);
    }
  }

  private async mustFindVisible(
    operatorId: string,
    id: string,
  ): Promise<ZtExecution> {
    await this.dataScope.assertCanView(operatorId, 'execution', id);
    return this.mustFind(id);
  }

  private async mustFind(id: string): Promise<ZtExecution> {
    const execution = await this.executionRepo.findOne({
      where: { id, deleted: 0 },
    });
    if (!execution)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '执行不存在',
      );
    return execution;
  }
}
