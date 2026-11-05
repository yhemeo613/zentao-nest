import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { DataScopeService } from '../data-scope/data-scope.service.js';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';
import { ZtProduct } from '../product/entities/zt-product.entity.js';
import { ZtProgram } from '../program/entities/zt-program.entity.js';
import { ZtProject } from './entities/zt-project.entity.js';
import { ZtProjectProduct } from './entities/zt-project-product.entity.js';
import {
  CloseProjectDto,
  CreateProjectDto,
  MODEL_EXECUTION_TYPE,
  SetProjectProductsDto,
  UpdateProjectDto,
} from './dto/project.dto.js';

/** 项目（docs/03 §4.8；影子迭代 multiple=0；syncPPE 语义见 execution 模块） */
@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ZtProject)
    private readonly projectRepo: Repository<ZtProject>,
    @InjectRepository(ZtProgram)
    private readonly programRepo: Repository<ZtProgram>,
    @InjectRepository(ZtProduct)
    private readonly productRepo: Repository<ZtProduct>,
    @InjectRepository(ZtProjectProduct)
    private readonly ppRepo: Repository<ZtProjectProduct>,
    @InjectRepository(ZtExecution)
    private readonly executionRepo: Repository<ZtExecution>,
    @InjectRepository(SysAcl) private readonly aclRepo: Repository<SysAcl>,
    private readonly dataScope: DataScopeService,
  ) {}

  async create(dto: CreateProjectDto, operatorId: string): Promise<ZtProject> {
    const dup = await this.projectRepo.findOne({
      where: { code: dto.code, deleted: 0 },
    });
    if (dup)
      throw new BusinessException(
        ErrorCodes.VALIDATION.DUPLICATED,
        '项目编码已存在',
      );
    if (dto.programId) {
      const program = await this.programRepo.findOne({
        where: { id: String(dto.programId), deleted: 0 },
      });
      if (!program)
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          '所属项目集不存在',
        );
    }
    const created = await this.projectRepo.save(
      this.projectRepo.create({
        programId: dto.programId ?? 0,
        name: dto.name,
        code: dto.code,
        model: dto.model,
        begin: new Date(dto.begin),
        end: new Date(dto.end),
        days: dto.days ?? 0,
        pmId: dto.pmId ?? '',
        multiple: dto.multiple ?? 1,
        acl: dto.acl ?? 'open',
        whitelist: dto.whitelist ?? null,
        desc: dto.desc ?? null,
        createdBy: operatorId,
      }),
    );
    await this.syncWhitelist(created.id, created.acl, created.whitelist);
    // 影子迭代（docs/02 §3.4 createDefaultSprint：multiple=0 自动建默认执行容器）
    if (created.multiple === 0) {
      await this.executionRepo.save(
        this.executionRepo.create({
          projectId: Number(created.id),
          type: MODEL_EXECUTION_TYPE[created.model] ?? 'sprint',
          grade: 1,
          parentId: Number(created.id),
          name: `${created.name}（默认执行）`,
          begin: created.begin,
          end: created.end,
          days: created.days,
          createdBy: operatorId,
        }),
      );
    }
    return created;
  }

  async list(operatorId: string, programId?: string): Promise<ZtProject[]> {
    const unrestricted = await this.dataScope.isUnrestricted(operatorId);
    const viewIds = await this.dataScope.getViewIds(operatorId, 'project');
    const qb = this.projectRepo.createQueryBuilder('p').where('p.deleted = 0');
    if (!unrestricted) {
      if (viewIds.length === 0) return [];
      qb.andWhere('p.id IN (:...ids)', { ids: viewIds });
    }
    if (programId) qb.andWhere('p.program_id = :pid', { pid: programId });
    return qb.orderBy('p.sortNo', 'ASC').addOrderBy('p.id', 'ASC').getMany();
  }

  async get(operatorId: string, id: string): Promise<ZtProject> {
    await this.dataScope.assertCanView(operatorId, 'project', id);
    return this.mustFind(id);
  }

  async update(
    operatorId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ZtProject> {
    await this.dataScope.assertCanView(operatorId, 'project', id);
    const project = await this.mustFind(id);
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.pmId !== undefined) project.pmId = dto.pmId;
    if (dto.end !== undefined) project.end = new Date(dto.end);
    if (dto.desc !== undefined) project.desc = dto.desc;
    return this.projectRepo.save(project);
  }

  async remove(operatorId: string, id: string): Promise<void> {
    await this.dataScope.assertCanView(operatorId, 'project', id);
    await this.mustFind(id);
    const executions = await this.executionRepo.count({
      where: { projectId: Number(id), deleted: 0 },
    });
    if (executions > 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '项目下仍有执行，禁止删除',
      );
    }
    await this.projectRepo.update(id, { deleted: 1 });
    await this.ppRepo.delete({ projectId: Number(id) });
    await this.aclRepo.delete({ objectType: 'project', objectId: id });
    await this.dataScope.invalidateUser();
  }

  /** 项目-产品关联（全量替换，docs/03 §4.8 manageProducts；产品必须存在） */
  async setProducts(
    operatorId: string,
    id: string,
    dto: SetProjectProductsDto,
  ): Promise<ZtProjectProduct[]> {
    await this.dataScope.assertCanView(operatorId, 'project', id);
    await this.mustFind(id);
    for (const item of dto.items) {
      const product = await this.productRepo.findOne({
        where: { id: item.productId, deleted: 0 },
      });
      if (!product)
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          `产品 ${item.productId} 不存在`,
        );
    }
    await this.ppRepo.delete({ projectId: Number(id) });
    // 同请求内重复产品去重（UNIQUE(project,product,branch) 语义，docs/04 §3）
    const deduped = [
      ...new Map(dto.items.map((i) => [Number(i.productId), i])).values(),
    ];
    if (deduped.length === 0) return [];
    return this.ppRepo.save(
      deduped.map((item) =>
        this.ppRepo.create({
          projectId: Number(id),
          productId: Number(item.productId),
          branchId: 0,
          plan: item.plan ?? '',
          roadmap: item.roadmap ?? '',
        }),
      ),
    );
  }

  async getProducts(
    id: string,
  ): Promise<Array<ZtProjectProduct & { productName: string }>> {
    const links = await this.ppRepo.find({ where: { projectId: Number(id) } });
    if (links.length === 0) return [];
    const products = await this.productRepo.find({
      where: links.map((l) => ({ id: l.productId.toString() })),
    });
    const nameMap = new Map(products.map((p) => [p.id, p.name]));
    return links.map((l) => ({
      ...l,
      productName: nameMap.get(l.productId.toString()) ?? '',
    }));
  }

  /** 状态流转（syncPPE 由 execution 驱动向上传播；此处为项目自身显式流转） */
  async start(operatorId: string, id: string): Promise<ZtProject> {
    const p = await this.mustFindVisible(operatorId, id);
    if (p.status !== 'wait' && p.status !== 'suspended') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${p.status} 不允许 start`,
      );
    }
    if (!p.realBegan) p.realBegan = new Date();
    p.status = 'doing';
    const saved = await this.projectRepo.save(p);
    await this.propagateUp(Number(id));
    return saved;
  }

  async suspend(operatorId: string, id: string): Promise<ZtProject> {
    const p = await this.mustFindVisible(operatorId, id);
    if (p.status !== 'doing') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${p.status} 不允许 suspend`,
      );
    }
    p.status = 'suspended';
    p.suspendedDate = new Date();
    return this.projectRepo.save(p);
  }

  async close(
    operatorId: string,
    id: string,
    dto: CloseProjectDto,
  ): Promise<ZtProject> {
    const p = await this.mustFindVisible(operatorId, id);
    if (p.status === 'closed')
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '已关闭',
      );
    const all = await this.executionRepo.count({
      where: { projectId: Number(id), deleted: 0 },
    });
    if (all > 0) {
      const closed = await this.executionRepo.count({
        where: { projectId: Number(id), status: 'closed', deleted: 0 },
      });
      if (closed !== all) {
        throw new BusinessException(
          ErrorCodes.EXECUTION.CASCADE_STATUS_UNMET,
          '存在未关闭执行',
        );
      }
    }
    p.status = 'closed';
    p.closedReason = dto.closedReason;
    if (dto.closedReason === 'cancel') p.canceledById = operatorId;
    p.realEnd = new Date();
    return this.projectRepo.save(p);
  }

  async activate(operatorId: string, id: string): Promise<ZtProject> {
    const p = await this.mustFindVisible(operatorId, id);
    if (p.status !== 'closed' && p.status !== 'suspended') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${p.status} 不允许 activate`,
      );
    }
    p.status = p.realBegan ? 'doing' : 'wait';
    p.realEnd = null;
    p.suspendedDate = null;
    return this.projectRepo.save(p);
  }

  /**
   * syncPPE 向上传播（docs/02 §3.5）：项目 doing → 所属项目集 wait→doing。
   * 链源（执行→项目）在 ExecutionService.start/putoff 内实现；此处补项目→项目集。
   */
  async propagateUp(projectId: number): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: String(projectId) },
    });
    if (!project || project.programId === 0) return;
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
  ): Promise<ZtProject> {
    await this.dataScope.assertCanView(operatorId, 'project', id);
    return this.mustFind(id);
  }

  private async mustFind(id: string): Promise<ZtProject> {
    const project = await this.projectRepo.findOne({
      where: { id, deleted: 0 },
    });
    if (!project)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '项目不存在',
      );
    return project;
  }

  private async syncWhitelist(
    objectId: string,
    acl: string,
    whitelist: string[] | null,
  ): Promise<void> {
    await this.aclRepo.delete({ objectType: 'project', objectId });
    if (acl !== 'open' && whitelist?.length) {
      await this.aclRepo.save(
        whitelist.map((userId) =>
          this.aclRepo.create({
            userId,
            objectType: 'project',
            objectId,
            source: 'whitelist',
          }),
        ),
      );
    }
  }
}
