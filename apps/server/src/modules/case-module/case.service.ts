import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtCase } from './entities/zt-case.entity.js';
import { ZtCaseStep } from './entities/zt-case-step.entity.js';
import { ZtCaseSpec } from './entities/zt-case-spec.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import {
  CreateCaseDto,
  ReviewCaseDto,
  RunCaseDto,
  UpdateCaseDto,
} from './dto/case.dto.js';

/** 用例（docs/02 §7.2：默认免评审；步骤版本化整套重插；storyChanged 确认机制） */
@Injectable()
export class CaseService {
  constructor(
    @InjectRepository(ZtCase) private readonly caseRepo: Repository<ZtCase>,
    @InjectRepository(ZtCaseStep)
    private readonly stepRepo: Repository<ZtCaseStep>,
    @InjectRepository(ZtCaseSpec)
    private readonly specRepo: Repository<ZtCaseSpec>,
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
  ) {}

  async create(dto: CreateCaseDto, operatorId: string): Promise<ZtCase> {
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
      storyVersion = story.version;
    }
    const created = await this.caseRepo.save(
      this.caseRepo.create({
        productId: Number(dto.productId),
        moduleId: dto.moduleId ?? 0,
        storyId: dto.storyId ? Number(dto.storyId) : 0,
        storyVersion,
        title: dto.title,
        precondition: dto.precondition ?? null,
        pri: dto.pri ?? 3,
        status: 'normal', // 默认免评审（docs/02 §7.2 needReview=0）
        version: 1,
        openedBy: operatorId,
        createdBy: operatorId,
      }),
    );
    await this.insertSteps(created.id, 1, dto.steps);
    await this.specRepo.save(
      this.specRepo.create({
        caseId: created.id,
        version: 1,
        title: created.title,
        precondition: dto.precondition ?? null,
      }),
    );
    return created;
  }

  async list(query: { productId?: string; storyId?: string; status?: string }) {
    const qb = this.caseRepo.createQueryBuilder('c').where('c.deleted = 0');
    if (query.productId)
      qb.andWhere('c.product_id = :pid', { pid: query.productId });
    if (query.storyId) qb.andWhere('c.story_id = :sid', { sid: query.storyId });
    if (query.status) qb.andWhere('c.status = :st', { st: query.status });
    return qb.orderBy('c.id', 'DESC').limit(200).getMany();
  }

  async get(id: string, version?: number) {
    const c = await this.mustFind(id);
    const v = version ?? c.version;
    const steps = await this.stepRepo.find({
      where: { caseId: id, version: v },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
    const spec = await this.specRepo.findOne({
      where: { caseId: id, version: v },
    });
    const storyChanged = c.storyId > 0 ? await this.isStoryChanged(c) : false;
    return { ...c, steps, spec, storyChanged };
  }

  /** 编辑：title/precondition/steps 任一变化 → version+1 整套重插（docs/02 §7.2 tao.php:492-523） */
  async update(id: string, dto: UpdateCaseDto): Promise<ZtCase> {
    const c = await this.mustFind(id);
    const currentSteps = await this.stepRepo.find({
      where: { caseId: id, version: c.version },
    });
    const stepsSignature = (
      arr: Array<{ stepDesc: string; expect?: string }>,
    ) => arr.map((s) => `${s.stepDesc}|${s.expect ?? ''}`).join('\n');
    const stepChanged =
      dto.steps !== undefined &&
      stepsSignature(dto.steps) !==
        stepsSignature(
          currentSteps.map((s) => ({
            stepDesc: s.stepDesc ?? '',
            expect: s.expect ?? '',
          })),
        );
    const metaChanged =
      (dto.title !== undefined && dto.title !== c.title) ||
      (dto.precondition !== undefined && dto.precondition !== c.precondition);

    if (dto.title !== undefined) c.title = dto.title;
    if (dto.precondition !== undefined) c.precondition = dto.precondition;
    if (dto.pri !== undefined) c.pri = dto.pri;

    if (stepChanged || metaChanged) {
      c.version += 1;
      await this.stepRepo.save(
        this.stepRepo.create({
          caseId: c.id,
          version: c.version,
          parentId: 0,
          type: 'step',
          stepDesc: '（版本快照占位：实际步骤见 steps 接口）',
          sortNo: 0,
        }),
      );
      if (dto.steps?.length) {
        await this.stepRepo.delete({ caseId: id, version: c.version });
        await this.insertSteps(id, c.version, dto.steps);
      }
      await this.specRepo.save(
        this.specRepo.create({
          caseId: id,
          version: c.version,
          title: c.title,
          precondition: c.precondition ?? null,
        }),
      );
    }
    return this.caseRepo.save(c);
  }

  /** 评审（docs/02 §7.2）：仅 wait；pass→normal / clarify 留 wait（4901 已评审拦截） */
  async review(
    operatorId: string,
    id: string,
    dto: ReviewCaseDto,
  ): Promise<ZtCase> {
    const c = await this.mustFind(id);
    if (c.status !== 'wait') {
      throw new BusinessException(
        ErrorCodes.CASE.ALREADY_REVIEWED,
        `状态 ${c.status} 不可评审`,
      );
    }
    if (dto.result === 'pass') c.status = 'normal';
    c.reviewedBy = operatorId;
    c.reviewedDate = new Date();
    return this.caseRepo.save(c);
  }

  /** storyChanged 确认（docs/02 §7.2）：storyVersion 同步至需求当前版本 */
  async confirmStoryChange(id: string): Promise<ZtCase> {
    const c = await this.mustFind(id);
    if (c.storyId === 0)
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '用例未关联需求',
      );
    const story = await this.storyRepo.findOne({
      where: { id: String(c.storyId), deleted: 0 },
    });
    if (!story)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '关联需求不存在',
      );
    if (story.version === c.storyVersion) return c;
    c.storyVersion = story.version;
    return this.caseRepo.save(c);
  }

  /** runCase 三写（docs/02 §7.3 createResult）：case.lastRun* + zt_test_result +（run 更新由 testtask 服务组合） */
  async recordRun(
    caseId: string,
    dto: RunCaseDto,
    runner: string,
  ): Promise<{ caseResult: string }> {
    const c = await this.mustFind(caseId);
    // 聚合规则：任一 fail → fail；否则首个非 pass/n-a（blocked）→ blocked；默认 pass（docs/02 §7.3 model.php:1456-1462）
    let caseResult = 'pass';
    for (const s of dto.steps) {
      if (s.result === 'fail') {
        caseResult = 'fail';
        break;
      }
      if (s.result === 'blocked' && caseResult === 'pass')
        caseResult = 'blocked';
    }
    c.lastRunner = runner;
    c.lastRunDate = new Date();
    c.lastRunResult = caseResult;
    await this.caseRepo.save(c);
    return { caseResult };
  }

  async insertSteps(
    caseId: string,
    version: number,
    steps: Array<{
      stepDesc: string;
      expect?: string;
      type?: 'step' | 'group';
    }>,
  ): Promise<void> {
    let sort = 0;
    for (const s of steps) {
      await this.stepRepo.save(
        this.stepRepo.create({
          caseId,
          version,
          parentId: 0,
          type: s.type ?? 'step',
          stepDesc: s.stepDesc,
          expect: s.expect ?? null,
          sortNo: sort++,
        }),
      );
    }
  }

  private async isStoryChanged(c: ZtCase): Promise<boolean> {
    const story = await this.storyRepo.findOne({
      where: { id: String(c.storyId), deleted: 0 },
    });
    return !!story && story.version !== c.storyVersion;
  }

  private async mustFind(id: string): Promise<ZtCase> {
    const c = await this.caseRepo.findOne({ where: { id, deleted: 0 } });
    if (!c)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '用例不存在',
      );
    return c;
  }
}
