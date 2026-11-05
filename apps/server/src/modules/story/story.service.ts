import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes, StoryStatus } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtStory } from './entities/zt-story.entity.js';
import { ZtStorySpec } from './entities/zt-story-spec.entity.js';
import { ZtStoryReview } from './entities/zt-story-review.entity.js';
import { ZtPlanStory } from '../plan/entities/zt-plan-story.entity.js';
import { ZtProjectStory } from '../project/entities/zt-project-story.entity.js';
import { ZtReleaseRelated } from '../release/entities/zt-release-related.entity.js';
import { ZtRelease } from '../release/entities/zt-release.entity.js';
import { ActivityService } from '../oa/activity.service.js';
import {
  AssignStoryDto,
  ChangeStoryDto,
  CloseStoryDto,
  CreateStoryDto,
  ReviewStoryDto,
  StoryQueryDto,
  SubdivideStoryDto,
} from './dto/story.dto.js';

/**
 * 需求（docs/02 §4 流程规格；状态机五态 + 评审四结果 + 版本化 spec + setStage 引擎）。
 * 简化声明（台账）：needReview 默认开启（active→reviewing），配置化随 P5 sys_config；
 * activate 简化恢复 active（action.extra 恢复随 P5）；孪生需求 twins 不做（多分支场景）。
 */
@Injectable()
export class StoryService {
  constructor(
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    @InjectRepository(ZtStorySpec)
    private readonly specRepo: Repository<ZtStorySpec>,
    @InjectRepository(ZtStoryReview)
    private readonly reviewRepo: Repository<ZtStoryReview>,
    @InjectRepository(ZtPlanStory)
    private readonly planStoryRepo: Repository<ZtPlanStory>,
    @InjectRepository(ZtProjectStory)
    private readonly projectStoryRepo: Repository<ZtProjectStory>,
    @InjectRepository(ZtReleaseRelated)
    private readonly releaseRelatedRepo: Repository<ZtReleaseRelated>,
    @InjectRepository(ZtRelease)
    private readonly releaseRepo: Repository<ZtRelease>,
    private readonly activity: ActivityService,
  ) {}

  async create(dto: CreateStoryDto, operatorId: string): Promise<ZtStory> {
    // 初始状态（docs/02 §4.2）：draft 保存 → draft；active 提交 → reviewing（needReview 默认开启）
    const initialStatus =
      dto.status === StoryStatus.Draft
        ? StoryStatus.Draft
        : StoryStatus.Reviewing;
    if (initialStatus === StoryStatus.Reviewing && !dto.reviewerIds?.length) {
      throw new BusinessException(
        ErrorCodes.STORY.REVIEW_LIST_CONFLICT,
        '提请评审需指定评审人',
      );
    }

    const created = await this.storyRepo.save(
      this.storyRepo.create({
        productId: Number(dto.productId),
        branchId: dto.branchId ?? 0,
        moduleId: dto.moduleId ?? 0,
        title: dto.title,
        type: dto.type ?? 'story',
        pri: dto.pri ?? 3,
        estimate: dto.estimate ?? 0,
        status: initialStatus,
        source: dto.source ?? '',
        sourceNote: dto.sourceNote ?? '',
        keywords: dto.keywords ?? '',
        assignedTo: dto.assignedTo ?? '',
        fromBugId: dto.fromBugId ?? 0,
        createdBy: operatorId,
        openedBy: operatorId,
        openedAt: new Date(),
      }),
    );
    created.rootId = Number(created.id);
    created.pathStr = `,${created.id},`;
    created.grade = 1;
    await this.storyRepo.save(created);

    // spec v1（docs/02 §4.3）
    await this.specRepo.save(
      this.specRepo.create({
        storyId: created.id,
        version: 1,
        title: created.title,
        spec: dto.spec,
        verify: dto.verify,
      }),
    );
    // 评审人行（docs/02 §4.2 zt_story_review，result='' 待评）
    if (initialStatus === StoryStatus.Reviewing && dto.reviewerIds?.length) {
      await this.reviewRepo.save(
        dto.reviewerIds.map((rid) =>
          this.reviewRepo.create({
            storyId: created.id,
            version: 1,
            reviewerId: rid,
            result: '',
          }),
        ),
      );
    }
    // Bug 转需求回写（docs/02 §4.5 closeBugWhenToStory 由 bug 模块联动；此处仅挂 fromBugId）
    await this.activity.log({
      objectType: 'story',
      objectId: created.id,
      actor: operatorId,
      action: 'opened',
      extra: initialStatus,
    });
    if (initialStatus === StoryStatus.Reviewing && dto.reviewerIds?.length) {
      for (const rid of dto.reviewerIds) {
        await this.activity.notify({
          toUserId: rid,
          objectType: 'story',
          objectId: created.id,
          action: 'submitreview',
          subject: `需求【${created.title}】待评审`,
        });
      }
    }
    return created;
  }

  async list(query: StoryQueryDto) {
    const qb = this.storyRepo.createQueryBuilder('s').where('s.deleted = 0');
    if (query.productId)
      qb.andWhere('s.product_id = :pid', { pid: query.productId });
    if (query.status) qb.andWhere('s.status = :st', { st: query.status });
    if (query.moduleId)
      qb.andWhere('s.module_id = :mid', { mid: query.moduleId });
    if (query.keyword)
      qb.andWhere('s.title LIKE :kw', { kw: `%${query.keyword}%` });
    return qb.orderBy('s.id', 'DESC').limit(200).getMany();
  }

  async get(id: string, version?: number) {
    const story = await this.mustFind(id);
    const v = version ?? story.version;
    const spec = await this.specRepo.findOne({
      where: { storyId: id, version: v },
    });
    const reviewers = await this.reviewRepo.find({
      where: { storyId: id, version: story.version },
    });
    return { ...story, spec, reviewers };
  }

  /**
   * 评审（docs/02 §4.2）：仅 reviewing 可评；结果按版本裁剪（v1 无 revert 4202 / v>1 无 reject 4202）；
   * 全员评完 → allpass 裁决 → setStatusByReviewResult 四落点。
   */
  async review(
    operatorId: string,
    id: string,
    dto: ReviewStoryDto,
  ): Promise<ZtStory> {
    const story = await this.mustFind(id);
    if (story.status !== StoryStatus.Reviewing) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${story.status} 不允许评审`,
      );
    }
    if (dto.result === 'revert' && story.version === 1) {
      throw new BusinessException(
        ErrorCodes.STORY.REVIEW_RESULT_VERSION_CONFLICT,
        'v1 无可撤销变更',
      );
    }
    if (dto.result === 'reject' && story.version > 1) {
      throw new BusinessException(
        ErrorCodes.STORY.REVIEW_RESULT_VERSION_CONFLICT,
        '变更版本不允许 reject',
      );
    }
    if (dto.result === 'reject') {
      if (!dto.closedReason)
        throw new BusinessException(
          ErrorCodes.VALIDATION.MISSING_REQUIRED,
          'reject 需关闭原因',
        );
      if (dto.closedReason === 'duplicate' && !dto.duplicateStoryId) {
        throw new BusinessException(
          ErrorCodes.VALIDATION.MISSING_REQUIRED,
          'duplicate 需重复需求 ID',
        );
      }
    }

    // 更新当前评审人行
    let row = await this.reviewRepo.findOne({
      where: { storyId: id, version: story.version, reviewerId: operatorId },
    });
    // 非登记评审人拒绝（docs/02 §4.2 isClickable：仅该版本待评审人可评）
    if (!row) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '当前用户不在该版本评审人列表',
      );
    }
    if (row.result)
      throw new BusinessException(
        ErrorCodes.CASE.ALREADY_REVIEWED,
        '已评审过该版本',
      );
    row.result = dto.result;
    row.reviewedAt = new Date();
    await this.reviewRepo.save(row);

    // 全员评完 → 裁决（allpass 默认规则，docs/02 §4.2 getReviewResult）
    const rows = await this.reviewRepo.find({
      where: { storyId: id, version: story.version },
    });
    if (rows.some((r) => !r.result)) return story; // 尚未全员评完

    const results = rows.map((r) => r.result);
    const final = results.every((r) => r === 'pass')
      ? 'pass'
      : results.includes('clarify')
        ? 'clarify'
        : results.includes('revert')
          ? 'revert'
          : 'reject';
    return this.applyReviewResult(story, final, dto, operatorId);
  }

  /** 四落点（docs/02 §4.2 setStatusByReviewResult，model.php:4831-4872） */
  private async applyReviewResult(
    story: ZtStory,
    final: string,
    dto: ReviewStoryDto,
    operatorId: string,
  ): Promise<ZtStory> {
    switch (final) {
      case 'pass':
        story.status = StoryStatus.Active;
        break;
      case 'clarify':
        story.status =
          story.version > 1 ? StoryStatus.Changing : StoryStatus.Draft;
        story.reviewedBy = '';
        break;
      case 'revert': {
        // version-1 + 物理删除当前版 spec/review（docs/02 §4.2 model.php:4843-4853）
        await this.specRepo.delete({
          storyId: story.id,
          version: story.version,
        });
        await this.reviewRepo.delete({
          storyId: story.id,
          version: story.version,
        });
        story.version -= 1;
        const prevSpec = await this.specRepo.findOne({
          where: { storyId: story.id, version: story.version },
        });
        if (prevSpec) story.title = prevSpec.title;
        story.status = StoryStatus.Active;
        break;
      }
      case 'reject': {
        story.status = StoryStatus.Closed;
        story.closedReason = dto.closedReason ?? 'cancel';
        story.closedBy = ''; // 由调用方（controller 传 operator）补记更准确，此处置 rejected 语义
        story.closedAt = new Date();
        story.duplicateStoryId = dto.duplicateStoryId ?? 0;
        // stage 特例：reason=done 且 type=story → released（docs/02 §4.2 model.php:4865）
        story.stage =
          dto.closedReason === 'done' && story.type === 'story'
            ? 'released'
            : 'closed';
        break;
      }
    }
    story.finalResult = final;
    story.reviewedAt = new Date();
    const saved = await this.storyRepo.save(story);
    await this.activity.log({
      objectType: 'story',
      objectId: saved.id,
      actor: operatorId,
      action: 'reviewed',
      extra: final,
    });
    if (saved.assignedTo) {
      await this.activity.notify({
        toUserId: saved.assignedTo,
        objectType: 'story',
        objectId: saved.id,
        action: 'reviewed',
        subject: `需求【${saved.title}】评审${final === 'pass' ? '通过' : final}`,
      });
    }
    if (final !== 'reject') await this.setStage(saved.id, 'reviewed');
    return this.mustFind(saved.id);
  }

  /** 变更（docs/02 §4.3）：title/spec/verify 任一变化 → version+1 + 新 spec + 评审行重置 */
  async change(
    operatorId: string,
    id: string,
    dto: ChangeStoryDto,
  ): Promise<ZtStory> {
    const story = await this.mustFind(id);
    if (story.status === StoryStatus.Closed) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '已关闭需求不可变更',
      );
    }
    if (dto.submitReview && !dto.reviewerIds?.length) {
      throw new BusinessException(
        ErrorCodes.STORY.REVIEW_LIST_CONFLICT,
        '提请评审需指定评审人',
      );
    }
    const currentSpec = await this.specRepo.findOne({
      where: { storyId: id, version: story.version },
    });
    const specChanged =
      !currentSpec ||
      currentSpec.title !== dto.title ||
      currentSpec.spec !== dto.spec ||
      currentSpec.verify !== dto.verify ||
      (dto.pri !== undefined && dto.pri !== story.pri) ||
      (dto.estimate !== undefined && dto.estimate !== Number(story.estimate));
    if (!specChanged) return story;

    story.version += 1;
    story.title = dto.title;
    if (dto.pri !== undefined) story.pri = dto.pri;
    if (dto.estimate !== undefined) story.estimate = dto.estimate;
    story.changedBy = operatorId;
    story.changedAt = new Date();
    story.reviewedBy = '';
    story.status = dto.submitReview
      ? StoryStatus.Reviewing
      : StoryStatus.Changing;
    const saved = await this.storyRepo.save(story);

    await this.specRepo.save(
      this.specRepo.create({
        storyId: saved.id,
        version: saved.version,
        title: saved.title,
        spec: dto.spec,
        verify: dto.verify,
      }),
    );
    if (dto.submitReview && dto.reviewerIds?.length) {
      await this.reviewRepo.save(
        dto.reviewerIds.map((rid) =>
          this.reviewRepo.create({
            storyId: saved.id,
            version: saved.version,
            reviewerId: rid,
            result: '',
          }),
        ),
      );
    }
    return saved;
  }

  /** 撤回变更（docs/02 §4.3 recallChange）：version-1 → active */
  async recallChange(id: string): Promise<ZtStory> {
    const story = await this.mustFind(id);
    if (story.version <= 1) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        'v1 无可撤回变更',
      );
    }
    await this.specRepo.delete({ storyId: id, version: story.version });
    await this.reviewRepo.delete({ storyId: id, version: story.version });
    story.version -= 1;
    const prevSpec = await this.specRepo.findOne({
      where: { storyId: id, version: story.version },
    });
    if (prevSpec) story.title = prevSpec.title;
    story.status = StoryStatus.Active;
    return this.storyRepo.save(story);
  }

  /** 撤回评审（docs/02 §4.3 recallReview）：reviewing → draft(v1)/changing(v>1) */
  async recallReview(id: string): Promise<ZtStory> {
    const story = await this.mustFind(id);
    if (story.status !== StoryStatus.Reviewing) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${story.status} 不允许撤回评审`,
      );
    }
    story.status = story.version > 1 ? StoryStatus.Changing : StoryStatus.Draft;
    return this.storyRepo.save(story);
  }

  /** 关闭（docs/02 §4.2 close）：非 closed 可关；未关子需求默认拦截（4203，force 放行）；duplicate 必填重复 ID */
  async close(
    operatorId: string,
    id: string,
    dto: CloseStoryDto,
  ): Promise<ZtStory> {
    const story = await this.mustFind(id);
    if (story.status === StoryStatus.Closed) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        '已关闭',
      );
    }
    if (dto.closedReason === 'duplicate' && !dto.duplicateStoryId) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.MISSING_REQUIRED,
        'duplicate 需重复需求 ID',
      );
    }
    if (story.isParent === 1 && !dto.force) {
      const unclosed = await this.storyRepo.count({
        where: {
          parentId: Number(id),
          status: In([
            StoryStatus.Draft,
            StoryStatus.Reviewing,
            StoryStatus.Active,
            StoryStatus.Changing,
          ]),
          deleted: 0,
        },
      });
      if (unclosed > 0) {
        throw new BusinessException(
          ErrorCodes.STORY.HAS_UNCLOSED_CHILDREN,
          `存在 ${unclosed} 个未关闭子需求`,
        );
      }
    }
    story.status = StoryStatus.Closed;
    story.closedReason = dto.closedReason;
    story.closedBy = operatorId;
    story.closedAt = new Date();
    story.duplicateStoryId = dto.duplicateStoryId ?? 0;
    await this.storyRepo.save(story);
    await this.activity.log({
      objectType: 'story',
      objectId: id,
      actor: operatorId,
      action: 'closed',
      extra: dto.closedReason,
    });
    await this.setStage(id, 'manual');
    return this.mustFind(id); // 返回 setStage 后最新实体（stage 已更新）
  }

  /** 激活（docs/02 §4.2 activate）：closed → active（简化恢复；extra 恢复随 P5） */
  async activate(operatorId: string, id: string): Promise<ZtStory> {
    const story = await this.mustFind(id);
    if (story.status !== StoryStatus.Closed) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${story.status} 不允许激活`,
      );
    }
    story.status = StoryStatus.Active;
    story.activatedDate = new Date();
    const saved = await this.storyRepo.save(story);
    await this.activity.log({
      objectType: 'story',
      objectId: id,
      actor: operatorId,
      action: 'activated',
    });
    await this.setStage(id, 'manual');
    return saved;
  }

  /** 指派 */
  async assign(id: string, dto: AssignStoryDto): Promise<ZtStory> {
    const story = await this.mustFind(id);
    story.assignedTo = dto.assignedTo;
    story.assignedAt = new Date();
    return this.storyRepo.save(story);
  }

  /** 拆分（docs/02 §4.5 subdivide）：子需求挂父；父 isParent=1；estimate=Σ子 */
  async subdivide(
    operatorId: string,
    id: string,
    dto: SubdivideStoryDto,
  ): Promise<ZtStory[]> {
    const parent = await this.mustFind(id);
    if (parent.status === StoryStatus.Closed) {
      throw new BusinessException(
        ErrorCodes.STORY.NOT_SUBDIVIDABLE,
        '已关闭需求不可拆分',
      );
    }
    if (parent.isParent === 1) {
      throw new BusinessException(
        ErrorCodes.STORY.NOT_SUBDIVIDABLE,
        '已拆分需求不可重复拆分',
      );
    }
    const children: ZtStory[] = [];
    for (const c of dto.children) {
      const child = await this.storyRepo.save(
        this.storyRepo.create({
          parentId: Number(parent.id),
          rootId: parent.rootId || Number(parent.id),
          pathStr: `${parent.pathStr ?? ''}pending,`,
          grade: parent.grade + 1,
          productId: Number(parent.productId),
          branchId: parent.branchId,
          moduleId: parent.moduleId,
          title: c.title,
          pri: parent.pri,
          estimate: c.estimate ?? 0,
          status: StoryStatus.Active, // 拆分子需求直接激活（评审继承父已通过语义）
          createdBy: operatorId,
          openedBy: operatorId,
          openedAt: new Date(),
        }),
      );
      child.pathStr = `${parent.pathStr ?? ','}${child.id},`;
      await this.storyRepo.save(child);
      await this.specRepo.save(
        this.specRepo.create({
          storyId: child.id,
          version: 1,
          title: child.title,
          spec: c.spec,
          verify: c.verify,
        }),
      );
      children.push(child);
    }
    parent.isParent = 1;
    parent.estimate = children.reduce((acc, c) => acc + Number(c.estimate), 0);
    await this.storyRepo.save(parent);
    return children;
  }

  /**
   * setStage 引擎（docs/02 §4.4 规则表，优先级后者覆盖前者）：
   * closed → released → 任务维度(P3-b) → projected → planned → wait；人工 stagedBy 跳过。
   */
  async setStage(storyId: string, trigger: string): Promise<void> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId, deleted: 0 },
    });
    if (!story) return;
    if (story.stagedBy && story.status !== StoryStatus.Closed) return; // 人工设阶段跳过自动计算

    let stage = 'wait';
    if (story.status === StoryStatus.Closed) {
      stage = 'closed';
    } else {
      const hasPlan = await this.planStoryRepo.count({ where: { storyId } });
      if (hasPlan > 0) stage = 'planned';
      const hasExecution = await this.projectStoryRepo.count({
        where: { storyId },
      });
      if (hasExecution > 0) stage = 'projected';
      // 发布联动：需求出现在任一 normal 发布的关联对象 → released（docs/02 §5.3）
      const releaseLinks = await this.releaseRelatedRepo.find({
        where: { objectType: 'story', objectId: In([storyId]) },
      });
      if (releaseLinks.length > 0) {
        const releases = await this.releaseRepo.find({
          where: releaseLinks.map((r) => ({
            id: r.releaseId,
            status: 'normal',
          })),
        });
        if (releases.length > 0) stage = 'released';
      }
    }
    // 任务维度结果（designing~tested）不得被基础值降级（docs/02 §4.4 优先级：任务规则高于计划/执行占位）
    const taskStages = [
      'designing',
      'designed',
      'developing',
      'developed',
      'testing',
      'tested',
    ];
    const demoting =
      taskStages.includes(story.stage) &&
      ['wait', 'planned', 'projected'].includes(stage);
    if (story.stage !== stage && !demoting) {
      story.stage = stage;
      await this.storyRepo.save(story);
    }
    void trigger; // 触发源语义留 action 日志（P5）落档
  }

  /** 供 task 域（P3-b）调用的任务维度阶段推进（docs/02 §4.4 computeStagesByTasks） */
  async setStageFromTasks(
    storyId: string,
    stats: { design: string; devel: string; test: string },
  ): Promise<void> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId, deleted: 0 },
    });
    if (!story || story.status === StoryStatus.Closed) return;
    if (story.stagedBy) return;
    // 规则表（docs/02 §4.4，逐条覆盖后面的优先）
    let stage = story.stage;
    if (
      stats.design === 'doing' &&
      (stats.devel === 'wait' || stats.devel === 'none')
    )
      stage = 'designing';
    if (stats.design === 'done' && stats.devel === 'wait') stage = 'designed';
    if (
      stats.devel === 'doing' &&
      (stats.test === 'wait' || stats.test === 'none')
    )
      stage = 'developing';
    if (
      stats.devel === 'done' &&
      (stats.test === 'wait' || stats.test === 'none')
    )
      stage = 'developed';
    if (stats.devel === 'done' && stats.test === 'doing') stage = 'testing';
    if (
      (stats.devel === 'done' || stats.devel === 'none') &&
      stats.test === 'done'
    )
      stage = 'tested';
    if (story.stage !== stage) {
      story.stage = stage;
      await this.storyRepo.save(story);
    }
  }

  private async mustFind(id: string): Promise<ZtStory> {
    const story = await this.storyRepo.findOne({ where: { id, deleted: 0 } });
    if (!story)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '需求不存在',
      );
    return story;
  }
}
