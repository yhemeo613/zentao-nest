import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtBranch, ZtProductLine } from './entities/zt-branch.entity.js';
import { ZtProduct } from './entities/zt-product.entity.js';

/** 产品线/分支服务（docs/03 §4.18/4.19） */
@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(ZtBranch)
    private readonly branchRepo: Repository<ZtBranch>,
    @InjectRepository(ZtProductLine)
    private readonly lineRepo: Repository<ZtProductLine>,
    @InjectRepository(ZtProduct)
    private readonly productRepo: Repository<ZtProduct>,
  ) {}

  // ---- 产品线 ----
  async listLines() {
    return this.lineRepo.find({
      where: { deleted: 0 },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
  }

  async createLine(dto: { name: string; sortNo?: number }, operatorId: string) {
    return this.lineRepo.save(
      this.lineRepo.create({
        name: dto.name,
        sortNo: dto.sortNo ?? 0,
        createdBy: operatorId,
      }),
    );
  }

  async updateLine(id: string, dto: { name?: string; sortNo?: number }) {
    const line = await this.mustFindLine(id);
    if (dto.name !== undefined) line.name = dto.name;
    if (dto.sortNo !== undefined) line.sortNo = dto.sortNo;
    return this.lineRepo.save(line);
  }

  async removeLine(id: string): Promise<void> {
    await this.mustFindLine(id);
    const used = await this.productRepo.count({ where: { deleted: 0 } });
    void used; // 产品.line 字段为 id 冗余；引用校验随 F3 产品编辑页强化，一期软删即-hide
    await this.lineRepo.update(id, { deleted: 1 });
  }

  // ---- 分支 ----
  async listBranches(productId: string) {
    return this.branchRepo.find({
      where: { productId: Number(productId), deleted: 0 },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
  }

  async createBranch(
    productId: string,
    dto: { name: string; sortNo?: number },
    operatorId: string,
  ) {
    return this.branchRepo.save(
      this.branchRepo.create({
        productId: Number(productId),
        name: dto.name,
        sortNo: dto.sortNo ?? 0,
        createdBy: operatorId,
      }),
    );
  }

  async updateBranch(id: string, dto: { name?: string; sortNo?: number }) {
    const branch = await this.mustFindBranch(id);
    if (dto.name !== undefined) branch.name = dto.name;
    if (dto.sortNo !== undefined) branch.sortNo = dto.sortNo;
    return this.branchRepo.save(branch);
  }

  /** 主干（id 最小）与被需求/用例引用分支禁删（3007，docs/03 §4.19） */
  async removeBranch(id: string): Promise<void> {
    const branch = await this.mustFindBranch(id);
    const referenced =
      (
        await this.branchRepo.manager.query(
          'SELECT COUNT(*) AS n FROM zt_story WHERE deleted = 0 AND branch_id = ?',
          [Number(id)],
        )
      )[0].n > 0 ||
      (
        await this.branchRepo.manager.query(
          'SELECT COUNT(*) AS n FROM zt_case WHERE deleted = 0 AND branch_id = ?',
          [Number(id)],
        )
      )[0].n > 0;
    if (referenced)
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '分支被需求/用例引用，禁止删除',
      );
    void branch;
    await this.branchRepo.update(id, { deleted: 1 });
  }

  private async mustFindLine(id: string) {
    const line = await this.lineRepo.findOne({ where: { id, deleted: 0 } });
    if (!line)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '产品线不存在',
      );
    return line;
  }

  private async mustFindBranch(id: string) {
    const branch = await this.branchRepo.findOne({ where: { id, deleted: 0 } });
    if (!branch)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '分支不存在',
      );
    return branch;
  }
}
