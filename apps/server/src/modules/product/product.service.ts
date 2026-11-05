import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { DataScopeService } from '../data-scope/data-scope.service.js';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { ZtProduct } from './entities/zt-product.entity.js';
import { ZtModule } from './entities/zt-module.entity.js';
import {
  CreateModuleDto,
  CreateProductDto,
  UpdateModuleDto,
  UpdateProductDto,
} from './dto/product.dto.js';

export interface ModuleNode extends ZtModule {
  children: ModuleNode[];
}

/** 产品与模块树（docs/03 §4.3；产品关闭语义=close 而非删除） */
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ZtProduct)
    private readonly productRepo: Repository<ZtProduct>,
    @InjectRepository(ZtModule)
    private readonly moduleRepo: Repository<ZtModule>,
    @InjectRepository(SysAcl) private readonly aclRepo: Repository<SysAcl>,
    private readonly dataScope: DataScopeService,
  ) {}

  async create(dto: CreateProductDto, operatorId: string): Promise<ZtProduct> {
    const created = await this.productRepo.save(
      this.productRepo.create({
        programId: dto.programId ?? 0,
        name: dto.name,
        code: dto.code ?? '',
        poId: dto.poId ?? '',
        qdId: dto.qdId ?? '',
        rdId: dto.rdId ?? '',
        acl: dto.acl ?? 'open',
        whitelist: dto.whitelist ?? null,
        desc: dto.desc ?? null,
        sortNo: dto.sortNo ?? 0,
        createdBy: operatorId,
      }),
    );
    await this.syncWhitelist(created.id, created.acl, created.whitelist);
    return created;
  }

  async list(operatorId: string): Promise<ZtProduct[]> {
    const unrestricted = await this.dataScope.isUnrestricted(operatorId);
    const qb = this.productRepo.createQueryBuilder('p').where('p.deleted = 0');
    if (!unrestricted) {
      // 产品可见性 P2 简化：private 产品按 sys_acl(product) 白名单过滤（team/干系人继承随 P3 需求域完善）
      const acls = await this.aclRepo.find({
        where: { userId: operatorId, objectType: 'product' },
      });
      const allowed = new Set(acls.map((a) => a.objectId));
      const all = await qb
        .orderBy('p.sortNo', 'ASC')
        .addOrderBy('p.id', 'ASC')
        .getMany();
      return all.filter((p) => p.acl === 'open' || allowed.has(p.id));
    }
    return qb.orderBy('p.sortNo', 'ASC').addOrderBy('p.id', 'ASC').getMany();
  }

  async get(operatorId: string, id: string): Promise<ZtProduct> {
    await this.assertVisible(operatorId, id);
    return this.mustFind(id);
  }

  async update(
    operatorId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ZtProduct> {
    await this.assertVisible(operatorId, id);
    const product = await this.mustFind(id);
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.code !== undefined) product.code = dto.code;
    if (dto.poId !== undefined) product.poId = dto.poId;
    if (dto.qdId !== undefined) product.qdId = dto.qdId;
    if (dto.rdId !== undefined) product.rdId = dto.rdId;
    if (dto.desc !== undefined) product.desc = dto.desc;
    if (dto.sortNo !== undefined) product.sortNo = dto.sortNo;
    return this.productRepo.save(product);
  }

  /** 关闭产品（禅道语义：产品不物理删除，docs/03 §4.3） */
  async close(operatorId: string, id: string): Promise<ZtProduct> {
    await this.assertVisible(operatorId, id);
    const product = await this.mustFind(id);
    if (product.status === 'closed') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '产品已关闭',
      );
    }
    product.status = 'closed';
    product.closedDate = new Date();
    return this.productRepo.save(product);
  }

  async activate(operatorId: string, id: string): Promise<ZtProduct> {
    await this.assertVisible(operatorId, id);
    const product = await this.mustFind(id);
    if (product.status !== 'closed') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '仅关闭状态可激活',
      );
    }
    product.status = 'active';
    product.closedDate = null;
    return this.productRepo.save(product);
  }

  /** 模块树（docs/03 §4.3 /products/:id/modules） */
  async moduleTree(productId: string): Promise<ModuleNode[]> {
    const list = await this.moduleRepo.find({
      where: { rootType: 'product', rootId: productId, deleted: 0 },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
    const nodes = new Map<string, ModuleNode>(
      list.map((m) => [m.id, { ...m, children: [] }]),
    );
    const roots: ModuleNode[] = [];
    for (const node of nodes.values()) {
      const parent = nodes.get(node.parentId.toString());
      parent ? parent.children.push(node) : roots.push(node);
    }
    return roots;
  }

  async createModule(
    dto: CreateModuleDto,
    operatorId: string,
  ): Promise<ZtModule> {
    const parent = dto.parentId
      ? await this.mustFindModule(String(dto.parentId))
      : null;
    const created = await this.moduleRepo.save(
      this.moduleRepo.create({
        rootType: 'product',
        rootId: dto.rootId,
        name: dto.name,
        ownerId: dto.ownerId ?? '',
        sortNo: dto.sortNo ?? 0,
        parentId: parent ? Number(parent.id) : 0,
        grade: parent ? parent.grade + 1 : 1,
        pathStr: '',
      }),
    );
    created.pathStr = parent
      ? `${parent.pathStr ?? ''}${created.id},`
      : `,${created.id},`;
    return this.moduleRepo.save(created);
  }

  async updateModule(id: string, dto: UpdateModuleDto): Promise<ZtModule> {
    const module_ = await this.mustFindModule(id);
    if (dto.name !== undefined) module_.name = dto.name;
    if (dto.ownerId !== undefined) module_.ownerId = dto.ownerId;
    if (dto.sortNo !== undefined) module_.sortNo = dto.sortNo;
    return this.moduleRepo.save(module_);
  }

  async removeModule(id: string): Promise<void> {
    await this.mustFindModule(id);
    const children = await this.moduleRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    if (children > 0) {
      throw new BusinessException(
        ErrorCodes.PRODUCT.MODULE_TREE_CYCLE,
        '存在子模块',
      );
    }
    await this.moduleRepo.update(id, { deleted: 1 });
  }

  private async assertVisible(operatorId: string, id: string): Promise<void> {
    const product = await this.mustFind(id);
    if (product.acl === 'open') return;
    if (await this.dataScope.isUnrestricted(operatorId)) return;
    const hit = await this.aclRepo.findOne({
      where: { userId: operatorId, objectType: 'product', objectId: id },
    });
    if (!hit)
      throw new BusinessException(ErrorCodes.AUTH.DATA_FORBIDDEN, '无数据权限');
  }

  private async mustFind(id: string): Promise<ZtProduct> {
    const product = await this.productRepo.findOne({
      where: { id, deleted: 0 },
    });
    if (!product)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '产品不存在',
      );
    return product;
  }

  private async mustFindModule(id: string): Promise<ZtModule> {
    const module_ = await this.moduleRepo.findOne({
      where: { id, deleted: 0 },
    });
    if (!module_)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '模块不存在',
      );
    return module_;
  }

  private async syncWhitelist(
    objectId: string,
    acl: string,
    whitelist: string[] | null,
  ): Promise<void> {
    await this.aclRepo.delete({ objectType: 'product', objectId });
    if (acl !== 'open' && whitelist?.length) {
      await this.aclRepo.save(
        whitelist.map((userId) =>
          this.aclRepo.create({
            userId,
            objectType: 'product',
            objectId,
            source: 'whitelist',
          }),
        ),
      );
    }
    await this.dataScope.invalidateUser();
  }
}
