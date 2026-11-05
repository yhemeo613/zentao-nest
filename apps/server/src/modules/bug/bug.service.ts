import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtBug } from './entities/zt-bug.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtStorySpec } from '../story/entities/zt-story-spec.entity.js';
import { StoryService } from '../story/story.service.js';
import { ActivityService } from '../oa/activity.service.js';
import { StoryStatus } from '@zentao/shared';
import {
  ActivateBugDto,
  ConvertBugToStoryDto,
  CreateBugDto,
  ResolveBugDto,
} from './dto/bug.dto.js';

/** 缺陷（docs/02 §7.1：confirm 仅标记；resolve 前置/必填联动；activate 重开计数；转需求独立动作） */
@Injectable()
export class BugService {
  constructor(
    @InjectRepository(ZtBug) private readonly bugRepo: Repository<ZtBug>,
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    @InjectRepository(ZtStorySpec)
    private readonly specRepo: Repository<ZtStorySpec>,
    private readonly storyService: StoryService,
    private readonly activity: ActivityService,
  ) {}

  async create(dto: CreateBugDto, operatorId: string): Promise<ZtBug> {
    const created = await this.bugRepo.save(
      this.bugRepo.create({
        productId: Number(dto.productId),
        moduleId: dto.moduleId ?? 0,
        projectId: dto.projectId ? Number(dto.projectId) : 0,
        executionId: dto.executionId ? Number(dto.executionId) : 0,
        storyId: dto.storyId ? Number(dto.storyId) : 0,
        caseId: dto.caseId ? Number(dto.caseId) : 0,
        caseVersion: 0,
        resultId: dto.resultId ?? 0,
        testtaskId: dto.testtaskId ?? 0,
        openedBuild: dto.openedBuild,
        title: dto.title,
        keywords: '',
        severity: dto.severity ?? 3,
        pri: dto.pri ?? 3,
        os: dto.os ?? '',
        browser: dto.browser ?? '',
        steps: dto.steps,
        status: 'active',
        assignedTo: dto.assignedTo ?? '',
        assignedAt: dto.assignedTo ? new Date() : null,
        openedBy: operatorId,
        createdBy: operatorId,
      }),
    );
    // 指派通知（docs/02 §9.2 bug: assigned）
    if (created.assignedTo) {
      await this.activity.log({
        objectType: 'bug',
        objectId: created.id,
        actor: operatorId,
        action: 'assigned',
        extra: created.assignedTo,
      });
      await this.activity.notify({
        toUserId: created.assignedTo,
        objectType: 'bug',
        objectId: created.id,
        action: 'assigned',
        subject: 'Bug【' + created.title + '】指派给你',
      });
    }
    return created;
  }

  async list(query: {
    productId?: string;
    status?: string;
    storyId?: string;
    assignedTo?: string;
  }) {
    const qb = this.bugRepo.createQueryBuilder('b').where('b.deleted = 0');
    if (query.productId)
      qb.andWhere('b.product_id = :pid', { pid: query.productId });
    if (query.storyId) qb.andWhere('b.story_id = :sid', { sid: query.storyId });
    if (query.assignedTo)
      qb.andWhere('b.assigned_to = :at', { at: query.assignedTo });
    if (query.status) {
      const statuses = query.status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length)
        qb.andWhere('b.status IN (:...sts)', { sts: statuses });
    }
    return qb.orderBy('b.id', 'DESC').limit(200).getMany();
  }

  async get(id: string): Promise<ZtBug> {
    return this.mustFind(id);
  }

  /** confirm（docs/02 §7.1）：仅 active 且未确认；只置 confirmed=1 不改状态 */
  async confirm(operatorId: string, id: string): Promise<ZtBug> {
    const bug = await this.mustFind(id);
    if (bug.status !== 'active' || bug.confirmed === 1) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '仅 active 且未确认的 Bug 可确认',
      );
    }
    bug.confirmed = 1;
    void operatorId;
    return this.bugRepo.save(bug);
  }

  /** resolve（docs/02 §7.1）：fixed→resolvedBuild 必填；duplicate→duplicateBug 必填；指派默认回开单人 */
  async resolve(
    operatorId: string,
    id: string,
    dto: ResolveBugDto,
  ): Promise<ZtBug> {
    const bug = await this.mustFind(id);
    if (bug.status !== 'active') {
      throw new BusinessException(
        ErrorCodes.BUG.NOT_RESOLVABLE,
        `状态 ${bug.status} 不可解决`,
      );
    }
    if (dto.resolution === 'fixed' && !dto.resolvedBuildId) {
      throw new BusinessException(
        ErrorCodes.BUG.RESOLUTION_FIELDS_CONFLICT,
        'fixed 需解决构建 ID',
      );
    }
    if (dto.resolution === 'duplicate' && !dto.duplicateBugId) {
      throw new BusinessException(
        ErrorCodes.BUG.RESOLUTION_FIELDS_CONFLICT,
        'duplicate 需重复 Bug ID',
      );
    }
    bug.status = 'resolved';
    bug.resolution = dto.resolution;
    bug.resolvedBy = operatorId;
    bug.resolvedAt = new Date();
    bug.confirmed = 1;
    bug.resolvedBuildId = dto.resolvedBuildId ?? '';
    bug.duplicateBugId = dto.duplicateBugId ?? 0;
    bug.assignedTo = dto.assignedTo ?? bug.openedBy; // 回开单人（docs/02 §7.1 zen.php:708-709）
    bug.assignedAt = new Date();
    const saved = await this.bugRepo.save(bug);
    await this.activity.log({
      objectType: 'bug',
      objectId: saved.id,
      actor: operatorId,
      action: 'resolved',
      extra: dto.resolution,
    });
    if (saved.assignedTo)
      await this.activity.notify({
        toUserId: saved.assignedTo,
        objectType: 'bug',
        objectId: saved.id,
        action: 'resolved',
        subject: `Bug【${saved.title}】已解决，待验证`,
      });
    return saved;
  }

  /** activate（docs/02 §7.1）：resolved/closed → active；activatedCount+1；指派默认=原解决人；清解决字段 */
  async activate(
    operatorId: string,
    id: string,
    dto: ActivateBugDto,
  ): Promise<ZtBug> {
    const bug = await this.mustFind(id);
    if (!['resolved', 'closed'].includes(bug.status)) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${bug.status} 不可激活`,
      );
    }
    if (!dto.openedBuild && !bug.openedBuild) {
      throw new BusinessException(
        ErrorCodes.BUG.OPENED_BUILD_REQUIRED,
        '激活需发现构建 ID',
      );
    }
    if (dto.openedBuild) bug.openedBuild = dto.openedBuild;
    bug.status = 'active';
    bug.activatedCount += 1;
    bug.assignedTo = dto.assignedTo ?? bug.resolvedBy;
    bug.assignedAt = new Date();
    bug.resolvedBy = '';
    bug.resolution = '';
    bug.resolvedAt = null;
    bug.resolvedBuildId = '';
    bug.closedBy = '';
    bug.closedAt = null;
    bug.duplicateBugId = 0;
    void operatorId;
    return this.bugRepo.save(bug);
  }

  /** close（docs/02 §7.1）：resolved → closed */
  async close(operatorId: string, id: string): Promise<ZtBug> {
    const bug = await this.mustFind(id);
    if (bug.status !== 'resolved') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${bug.status} 不可关闭`,
      );
    }
    bug.status = 'closed';
    bug.closedBy = operatorId;
    bug.closedAt = new Date();
    return this.bugRepo.save(bug);
  }

  /** 指派 */
  async assign(id: string, assignedTo: string): Promise<ZtBug> {
    const bug = await this.mustFind(id);
    bug.assignedTo = assignedTo;
    bug.assignedAt = new Date();
    return this.bugRepo.save(bug);
  }

  /**
   * 转需求（docs/02 §4.5 独立动作）：预填 story → 落库 → bug 置 closed/tostory + toStoryId 回写。
   * 转出的需求直接 active（Bug 已激活语境，评审语义声明在台账）。
   */
  async convertToStory(
    operatorId: string,
    id: string,
    dto: ConvertBugToStoryDto,
  ): Promise<ZtStory> {
    const bug = await this.mustFind(id);
    if (bug.status !== 'active') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '仅 active Bug 可转需求',
      );
    }
    if (bug.toStoryId > 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '该 Bug 已转过需求',
      );
    }
    const story = await this.storyRepo.save(
      this.storyRepo.create({
        productId: bug.productId,
        moduleId: bug.moduleId,
        title: dto.title,
        pri: bug.pri,
        estimate: 0,
        status: StoryStatus.Active,
        source: 'bug',
        sourceNote: `由 Bug #${bug.id} 转入`,
        fromBugId: Number(bug.id),
        assignedTo: bug.openedBy,
        createdBy: operatorId,
        openedBy: operatorId,
        openedAt: new Date(),
      }),
    );
    story.rootId = Number(story.id);
    story.pathStr = `,${story.id},`;
    story.grade = 1;
    await this.storyRepo.save(story);
    await this.specRepo.save(
      this.specRepo.create({
        storyId: story.id,
        version: 1,
        title: story.title,
        spec: dto.spec,
        verify: dto.verify,
      }),
    );
    // 回写 Bug（docs/02 §4.5 closeBugWhenToStory 语义）
    bug.toStoryId = Number(story.id);
    bug.status = 'closed';
    bug.resolution = 'tostory';
    bug.resolvedBy = operatorId;
    bug.resolvedAt = new Date();
    bug.closedBy = operatorId;
    bug.closedAt = new Date();
    bug.confirmed = 1;
    bug.assignedTo = '';
    await this.bugRepo.save(bug);
    return story;
  }

  /** 供 build.linkBug 调用（docs/02 §5.2 updateLinkedBug：未解决 Bug 自动 resolved/fixed） */
  async autoResolveByBuild(
    bugId: string,
    buildId: string,
    operatorId: string,
  ): Promise<void> {
    const bug = await this.mustFind(bugId);
    if (bug.status === 'active') {
      bug.status = 'resolved';
      bug.resolution = 'fixed';
      bug.resolvedBuildId = buildId;
      bug.resolvedBy = operatorId;
      bug.resolvedAt = new Date();
      bug.confirmed = 1;
      bug.assignedTo = bug.openedBy;
      bug.assignedAt = new Date();
      await this.bugRepo.save(bug);
    }
  }

  /** 供 build/release 汇总使用 */
  async getBugsByIdList(ids: string[]): Promise<ZtBug[]> {
    if (!ids.length) return [];
    return this.bugRepo.find({ where: ids.map((id) => ({ id })) });
  }

  /** 删除守卫：仅 closed 可删（docs/06 §5 简化纪律） */
  async removeWithGuard(id: string): Promise<void> {
    const bug = await this.mustFind(id);
    if (bug.status !== 'closed') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '仅已关闭 Bug 可删除',
      );
    }
    await this.bugRepo.update(id, { deleted: 1 });
  }

  private async mustFind(id: string): Promise<ZtBug> {
    const bug = await this.bugRepo.findOne({ where: { id, deleted: 0 } });
    if (!bug)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        'Bug 不存在',
      );
    return bug;
  }
}
