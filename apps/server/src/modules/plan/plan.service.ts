import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtPlan } from './entities/zt-plan.entity.js';
import { ZtPlanStory } from './entities/zt-plan-story.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { StoryService } from '../story/story.service.js';
import {
  CreatePlanDto,
  LinkPlanStoriesDto,
  UpdatePlanDto,
} from './dto/plan.dto.js';

/** 计划（docs/02 §5.1：四态流转 + linkStory 驱动需求 stage=planned） */
@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(ZtPlan) private readonly planRepo: Repository<ZtPlan>,
    @InjectRepository(ZtPlanStory)
    private readonly planStoryRepo: Repository<ZtPlanStory>,
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    private readonly storyService: StoryService,
  ) {}

  async create(dto: CreatePlanDto, operatorId: string): Promise<ZtPlan> {
    const isFuture = dto.isFuture === 1;
    return this.planRepo.save(
      this.planRepo.create({
        productId: Number(dto.productId),
        title: dto.title,
        desc: dto.desc ?? null,
        begin: isFuture ? new Date('2038-01-01') : new Date(dto.begin),
        end: isFuture ? new Date('2038-01-01') : new Date(dto.end),
        isFuture: isFuture ? 1 : 0,
        createdBy: operatorId,
      }),
    );
  }

  async list(productId?: string): Promise<ZtPlan[]> {
    const qb = this.planRepo.createQueryBuilder('p').where('p.deleted = 0');
    if (productId) qb.andWhere('p.product_id = :pid', { pid: productId });
    return qb.orderBy('p.id', 'DESC').getMany();
  }

  async get(id: string) {
    const plan = await this.mustFind(id);
    const links = await this.planStoryRepo.find({ where: { planId: id } });
    const stories = links.length
      ? await this.storyRepo.find({
          where: links.map((l) => ({ id: l.storyId })),
        })
      : [];
    return { ...plan, stories };
  }

  async update(id: string, dto: UpdatePlanDto): Promise<ZtPlan> {
    const plan = await this.mustFind(id);
    if (dto.title !== undefined) plan.title = dto.title;
    if (dto.end !== undefined && plan.isFuture === 0)
      plan.end = new Date(dto.end);
    if (dto.desc !== undefined) plan.desc = dto.desc;
    return this.planRepo.save(plan);
  }

  async remove(id: string): Promise<void> {
    await this.mustFind(id);
    const links = await this.planStoryRepo.count({ where: { planId: id } });
    if (links > 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '计划仍关联需求，先解除关联',
      );
    }
    await this.planRepo.update(id, { deleted: 1 });
  }

  /** 四态流转（docs/03 §4.5：start/finish/close/activate） */
  async changeStatus(
    operatorId: string,
    id: string,
    action: string,
  ): Promise<ZtPlan> {
    const plan = await this.mustFind(id);
    const map: Record<string, { from: string[]; to: string }> = {
      start: { from: ['wait'], to: 'doing' },
      finish: { from: ['doing'], to: 'done' },
      close: { from: ['wait', 'doing', 'done'], to: 'closed' },
      activate: { from: ['done', 'closed'], to: 'doing' },
    };
    const rule = map[action];
    if (!rule)
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '未知状态动作',
      );
    if (!rule.from.includes(plan.status)) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${plan.status} 不允许 ${action}`,
      );
    }
    plan.status = rule.to;
    if (action === 'finish') plan.finishedDate = new Date();
    if (action === 'close') {
      plan.closedDate = new Date();
      plan.closedReason = 'done';
    }
    if (action === 'activate') {
      plan.finishedDate = null;
      plan.closedDate = null;
      plan.closedReason = '';
    }
    void operatorId;
    return this.planRepo.save(plan);
  }

  /** 关联需求（docs/02 §5.1 linkStory：写关联表 + 触发 setStage→planned） */
  async linkStories(id: string, dto: LinkPlanStoriesDto): Promise<number> {
    const plan = await this.mustFind(id);
    let linked = 0;
    for (const storyId of dto.storyIds) {
      const story = await this.storyRepo.findOne({
        where: { id: storyId, deleted: 0 },
      });
      if (!story)
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          `需求 ${storyId} 不存在`,
        );
      const exists = await this.planStoryRepo.findOne({
        where: { planId: id, storyId },
      });
      if (exists) continue;
      await this.planStoryRepo.save(
        this.planStoryRepo.create({ planId: id, storyId }),
      );
      story.plan = String(plan.id);
      await this.storyRepo.save(story);
      await this.storyService.setStage(storyId, 'linkPlan');
      linked += 1;
    }
    return linked;
  }

  /** 解除关联（触发 setStage unlinkPlan → 回 projected/wait） */
  async unlinkStory(planId: string, storyId: string): Promise<void> {
    await this.mustFind(planId);
    await this.planStoryRepo.delete({ planId, storyId });
    const story = await this.storyRepo.findOne({ where: { id: storyId } });
    if (story) {
      story.plan = '';
      await this.storyRepo.save(story);
      await this.storyService.setStage(storyId, 'unlinkPlan');
    }
  }

  /** 供 setStage 引擎查询计划关联（P3-b 任务维度也复用） */
  async getLinkedStoryIds(planId: string): Promise<string[]> {
    const links = await this.planStoryRepo.find({ where: { planId } });
    return links.map((l) => l.storyId);
  }

  async getPlansOfStory(storyId: string): Promise<ZtPlan[]> {
    const links = await this.planStoryRepo.find({ where: { storyId } });
    if (!links.length) return [];
    return this.planRepo.find({
      where: links.map((l) => ({ id: l.planId })),
      order: { id: 'ASC' },
    });
  }

  private async mustFind(id: string): Promise<ZtPlan> {
    const plan = await this.planRepo.findOne({ where: { id, deleted: 0 } });
    if (!plan)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '计划不存在',
      );
    return plan;
  }
}

// In 语义保留（避免未使用告警）
void In;
