import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes, StoryStatus } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtProjectStory } from '../project/entities/zt-project-story.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { StoryService } from '../story/story.service.js';
import { ZtPlanStory } from '../plan/entities/zt-plan-story.entity.js';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';
import { SysAcl } from '../system/entities/sys-acl.entity.js';

export type StoryScope = 'project' | 'execution';

/**
 * 项目/执行-需求范围（docs/02 §9 execution::linkStory 对齐）：
 * - 关联状态门禁：draft/reviewing/closed 不可关联；
 * - 关联后需求 stage=projected（linkProject）；解除回退（unlinkProject）；
 * - import-from-plan：同时写入项目与执行两级（docs/02 §9 linkStories:3153-3188）；
 * - 项目解除保护：已被执行占用（execution scope 存在同 story）不可移除。
 */
@Injectable()
export class ProjectStoryService {
  constructor(
    @InjectRepository(ZtProjectStory)
    private readonly psRepo: Repository<ZtProjectStory>,
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    @InjectRepository(ZtPlanStory)
    private readonly planStoryRepo: Repository<ZtPlanStory>,
    @InjectRepository(ZtTeam) private readonly teamRepo: Repository<ZtTeam>,
    @InjectRepository(SysAcl) private readonly aclRepo: Repository<SysAcl>,
    @InjectRepository(ZtExecution)
    private readonly executionRepo: Repository<ZtExecution>,
    private readonly storyService: StoryService,
  ) {}

  /** 关联校验 + 写入（docs/02 §9 linkStory:3018-3092 核心语义） */
  async link(
    scopeType: StoryScope,
    scopeId: string,
    storyIds: string[],
    projectIdForStage?: string,
  ): Promise<number> {
    let linked = 0;
    for (const storyId of storyIds) {
      const story = await this.storyRepo.findOne({
        where: { id: storyId, deleted: 0 },
      });
      if (!story)
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          `需求 ${storyId} 不存在`,
        );
      const st = story.status as string;
      if (st === 'draft' || st === 'reviewing' || st === 'closed') {
        throw new BusinessException(
          ErrorCodes.VALIDATION.BUSINESS_RULE,
          `需求 ${storyId} 状态 ${story.status} 不可关联（draft/reviewing/closed 禁止）`,
        );
      }
      const exists = await this.psRepo.findOne({
        where: { scopeType, scopeId, storyId },
      });
      if (exists) continue;
      await this.psRepo.save(
        this.psRepo.create({
          scopeType,
          scopeId,
          productId: Number(story.productId),
          branchId: story.branchId,
          storyId,
          storyVersion: story.version,
          sortNo: 0,
        }),
      );
      await this.storyService.setStage(storyId, 'linkProject');
      linked += 1;
    }
    void projectIdForStage;
    return linked;
  }

  /** 解除关联：project 层需检查无执行占用；触发 setStage 回退 */
  async unlink(
    scopeType: StoryScope,
    scopeId: string,
    storyId: string,
  ): Promise<void> {
    const link = await this.psRepo.findOne({
      where: { scopeType, scopeId, storyId },
    });
    if (!link)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '关联不存在',
      );
    if (scopeType === 'project') {
      const occupied = await this.psRepo.findOne({
        where: { scopeType: 'execution', storyId },
      });
      if (occupied) {
        throw new BusinessException(
          ErrorCodes.VALIDATION.BUSINESS_RULE,
          '需求已下挂执行，不可从项目移除',
        );
      }
    }
    await this.psRepo.delete(link.id);
    await this.storyService.setStage(storyId, 'unlinkProject');
  }

  /** 范围需求列表（join 需求详情） */
  async list(scopeType: StoryScope, scopeId: string) {
    const links = await this.psRepo.find({
      where: { scopeType, scopeId },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
    if (!links.length) return [];
    const stories = await this.storyRepo.find({
      where: links.map((l) => ({ id: l.storyId })),
    });
    const map = new Map(stories.map((s) => [s.id, s]));
    return links
      .map((l) => ({ link: l, story: map.get(l.storyId) ?? null }))
      .filter((r) => r.story)
      .map((r) => ({ ...r.link, story: r.story }));
  }

  /** import-from-plan（docs/02 §9：按计划拉需求，同时写项目与执行两级） */
  async importFromPlan(
    executionId: string,
    planId: string,
  ): Promise<{
    projectLinked: number;
    executionLinked: number;
    skipped: string[];
  }> {
    const execution = await this.executionRepo.findOne({
      where: { id: executionId, deleted: 0 },
    });
    if (!execution)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '执行不存在',
      );
    const projectId = String(execution.projectId);
    const planStories = await this.planStoryRepo.find({ where: { planId } });
    const skipped: string[] = [];
    let projectLinked = 0;
    let executionLinked = 0;
    for (const link of planStories) {
      const story = await this.storyRepo.findOne({
        where: { id: link.storyId, deleted: 0 },
      });
      if (!story) continue;
      const st: string = String(story.status);
      if (['draft', 'reviewing', 'closed'].includes(st)) {
        skipped.push(`${story.id}(${story.status})`);
        continue;
      }
      const projLink = await this.psRepo.findOne({
        where: {
          scopeType: 'project',
          scopeId: projectId,
          storyId: link.storyId,
        },
      });
      if (!projLink) {
        await this.psRepo.save(
          this.psRepo.create({
            scopeType: 'project',
            scopeId: projectId,
            productId: Number(story.productId),
            branchId: story.branchId,
            storyId: link.storyId,
            storyVersion: story.version,
          }),
        );
        projectLinked += 1;
      }
      const execLink = await this.psRepo.findOne({
        where: {
          scopeType: 'execution',
          scopeId: executionId,
          storyId: link.storyId,
        },
      });
      if (!execLink) {
        await this.psRepo.save(
          this.psRepo.create({
            scopeType: 'execution',
            scopeId: executionId,
            productId: Number(story.productId),
            branchId: story.branchId,
            storyId: link.storyId,
            storyVersion: story.version,
          }),
        );
        await this.storyService.setStage(link.storyId, 'linkProject');
        executionLinked += 1;
      }
    }
    return { projectLinked, executionLinked, skipped };
  }

  /** 需求被哪些执行占用（docs/02 §9 getExecutionStories，unlink 保护用） */
  async getExecutionsOfStory(storyId: string): Promise<string[]> {
    const links = await this.psRepo.find({
      where: { scopeType: 'execution', storyId },
    });
    return links.map((l) => l.scopeId);
  }

  /** DataScope 预留：按可见集过滤范围列表（P2 语义沿用） */
  async visibleStoryIds(
    userId: string,
    scopeType: StoryScope,
    scopeId: string,
    isUnrestricted: boolean,
  ): Promise<string[]> {
    const links = await this.psRepo.find({ where: { scopeType, scopeId } });
    if (isUnrestricted) return links.map((l) => l.storyId);
    const aclSet = new Set(
      (
        await this.aclRepo.find({
          where: {
            userId,
            objectType: scopeType === 'project' ? 'project' : 'execution',
            objectId: scopeId,
          },
        })
      ).map((a) => a.userId),
    );
    const teamHit =
      scopeType === 'project' || scopeType === 'execution'
        ? await this.teamRepo.findOne({
            where: { userId, rootType: scopeType, rootId: scopeId },
          })
        : null;
    if (aclSet.has(userId) || teamHit) return links.map((l) => l.storyId);
    return [];
  }
}
