import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { DataScopeService } from '../data-scope/data-scope.service.js';
import { ZtProgram } from './entities/zt-program.entity.js';
import { ZtProduct } from '../product/entities/zt-product.entity.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import {
  CloseProgramDto,
  CreateProgramDto,
  UpdateProgramDto,
} from './dto/program.dto.js';
import { SysAcl } from '../system/entities/sys-acl.entity.js';

/** 项目集（docs/03 §4.2；层级 grade/path 自动；状态流转含子级校验） */
@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(ZtProgram)
    private readonly programRepo: Repository<ZtProgram>,
    @InjectRepository(ZtProduct)
    private readonly productRepo: Repository<ZtProduct>,
    @InjectRepository(ZtProject)
    private readonly projectRepo: Repository<ZtProject>,
    @InjectRepository(SysAcl) private readonly aclRepo: Repository<SysAcl>,
    private readonly dataScope: DataScopeService,
  ) {}

  async create(dto: CreateProgramDto, operatorId: string): Promise<ZtProgram> {
    const parent = dto.parentId
      ? await this.mustFind(String(dto.parentId))
      : null;
    const created = await this.programRepo.save(
      this.programRepo.create({
        name: dto.name,
        code: dto.code ?? '',
        pmId: dto.pmId ?? '',
        budget: dto.budget ?? 0,
        budgetUnit: dto.budgetUnit ?? 'CNY',
        begin: dto.begin ? new Date(dto.begin) : null,
        end: dto.end ? new Date(dto.end) : null,
        desc: dto.desc ?? null,
        acl: dto.acl ?? 'open',
        whitelist: dto.whitelist ?? null,
        sortNo: dto.sortNo ?? 0,
        parentId: parent ? Number(parent.id) : 0,
        grade: parent ? parent.grade + 1 : 1,
        createdBy: operatorId,
        pathStr: '',
      }),
    );
    created.pathStr = parent
      ? `${parent.pathStr}${created.id},`
      : `,${created.id},`;
    const saved = await this.programRepo.save(created);
    await this.syncWhitelist(saved.id, saved.acl, saved.whitelist);
    return saved;
  }

  /** 树形列表（DataScope 过滤：受限用户仅可见集合内） */
  async list(operatorId: string): Promise<ZtProgram[]> {
    const unrestricted = await this.dataScope.isUnrestricted(operatorId);
    const viewIds = await this.dataScope.getViewIds(operatorId, 'program');
    const qb = this.programRepo.createQueryBuilder('p').where('p.deleted = 0');
    if (unrestricted) {
      // 全量
    } else if (viewIds.length > 0) {
      qb.andWhere('p.id IN (:...ids)', { ids: viewIds });
    } else {
      return [];
    }
    return qb.orderBy('p.sortNo', 'ASC').addOrderBy('p.id', 'ASC').getMany();
  }

  async get(operatorId: string, id: string): Promise<ZtProgram> {
    await this.dataScope.assertCanView(operatorId, 'program', id);
    return this.mustFind(id);
  }

  async update(
    operatorId: string,
    id: string,
    dto: UpdateProgramDto,
  ): Promise<ZtProgram> {
    await this.dataScope.assertCanView(operatorId, 'program', id);
    const program = await this.mustFind(id);
    if (dto.name !== undefined) program.name = dto.name;
    if (dto.code !== undefined) program.code = dto.code;
    if (dto.pmId !== undefined) program.pmId = dto.pmId;
    if (dto.budget !== undefined) program.budget = dto.budget;
    if (dto.end !== undefined) program.end = new Date(dto.end);
    if (dto.desc !== undefined) program.desc = dto.desc;
    if (dto.sortNo !== undefined) program.sortNo = dto.sortNo;
    const aclChanged = dto.acl !== undefined && dto.acl !== program.acl;
    if (dto.acl !== undefined) program.acl = dto.acl;
    if (dto.whitelist !== undefined) program.whitelist = dto.whitelist;
    const saved = await this.programRepo.save(program);
    if (aclChanged || dto.whitelist !== undefined) {
      await this.syncWhitelist(saved.id, saved.acl, saved.whitelist);
      await this.dataScope.invalidateUser();
    }
    return saved;
  }

  /** 删除约束：有子级/产品/项目禁删（4002，docs/03 §4.2） */
  async remove(operatorId: string, id: string): Promise<void> {
    await this.dataScope.assertCanView(operatorId, 'program', id);
    await this.mustFind(id);
    const children = await this.programRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    if (children > 0)
      throw new BusinessException(
        ErrorCodes.PROGRAM.HAS_UNCLOSED_CHILDREN,
        '存在子项目集',
      );
    const products = await this.productRepo.count({
      where: { programId: Number(id), deleted: 0 },
    });
    const projects = await this.projectRepo.count({
      where: { programId: Number(id), deleted: 0 },
    });
    if (products + projects > 0) {
      throw new BusinessException(
        ErrorCodes.PROGRAM.HAS_UNCLOSED_CHILDREN,
        '项目集下仍有产品或项目',
      );
    }
    await this.programRepo.update(id, { deleted: 1 });
    await this.aclRepo.delete({ objectType: 'program', objectId: id });
    await this.dataScope.invalidateUser();
  }

  /** 状态流转（docs/02 §3.5 状态机） */
  async start(operatorId: string, id: string): Promise<ZtProgram> {
    const p = await this.mustFindVisible(operatorId, id);
    if (p.status !== 'wait' && p.status !== 'suspended') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${p.status} 不允许 start`,
      );
    }
    if (!p.realBegan) p.realBegan = new Date();
    p.status = 'doing';
    return this.programRepo.save(p);
  }

  async suspend(operatorId: string, id: string): Promise<ZtProgram> {
    const p = await this.mustFindVisible(operatorId, id);
    if (p.status !== 'doing') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${p.status} 不允许 suspend`,
      );
    }
    p.status = 'suspended';
    p.suspendedDate = new Date();
    return this.programRepo.save(p);
  }

  async close(
    operatorId: string,
    id: string,
    dto: CloseProgramDto,
  ): Promise<ZtProgram> {
    const p = await this.mustFindVisible(operatorId, id);
    if (p.status === 'closed') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '已关闭',
      );
    }
    const allChildren = await this.programRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    if (allChildren > 0) {
      const closedChildren = await this.programRepo.count({
        where: { parentId: Number(id), status: 'closed', deleted: 0 },
      });
      if (closedChildren !== allChildren) {
        throw new BusinessException(
          ErrorCodes.EXECUTION.CASCADE_STATUS_UNMET,
          '存在未关闭子项目集',
        );
      }
    }
    p.status = 'closed';
    p.closedReason = dto.closedReason;
    if (dto.closedReason === 'cancel') p.canceledById = operatorId;
    p.realEnd = new Date();
    return this.programRepo.save(p);
  }

  async activate(operatorId: string, id: string): Promise<ZtProgram> {
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
    return this.programRepo.save(p);
  }

  /** 概览（docs/03 §4.2 summary；P2 计数版，明细随 F2 扩展） */
  async summary(operatorId: string, id: string) {
    await this.dataScope.assertCanView(operatorId, 'program', id);
    await this.mustFind(id);
    const products = await this.productRepo.count({
      where: { programId: Number(id), deleted: 0 },
    });
    const projects = await this.projectRepo.count({
      where: { programId: Number(id), deleted: 0 },
    });
    const childPrograms = await this.programRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    return { products, projects, childPrograms };
  }

  private async mustFindVisible(
    operatorId: string,
    id: string,
  ): Promise<ZtProgram> {
    await this.dataScope.assertCanView(operatorId, 'program', id);
    return this.mustFind(id);
  }

  private async mustFind(id: string): Promise<ZtProgram> {
    const program = await this.programRepo.findOne({
      where: { id, deleted: 0 },
    });
    if (!program)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '项目集不存在',
      );
    return program;
  }

  /** whitelist 双写 sys_acl（docs/04 §3） */
  private async syncWhitelist(
    objectId: string,
    acl: string,
    whitelist: string[] | null,
  ): Promise<void> {
    await this.aclRepo.delete({ objectType: 'program', objectId });
    if (acl !== 'open' && whitelist?.length) {
      await this.aclRepo.save(
        whitelist.map((userId) =>
          this.aclRepo.create({
            userId,
            objectType: 'program',
            objectId,
            source: 'whitelist',
          }),
        ),
      );
    }
  }
}
