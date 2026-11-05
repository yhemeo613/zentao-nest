import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtRelease } from './entities/zt-release.entity.js';
import { ZtReleaseRelated } from './entities/zt-release-related.entity.js';
import { ZtBuild } from '../build/entities/zt-build.entity.js';
import { ZtBuildStory } from '../build/entities/zt-build-story.entity.js';
import { ZtBuildBug } from '../build/entities/zt-build-bug.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { StoryService } from '../story/story.service.js';
import { BuildService } from '../build/build.service.js';
import { CreateReleaseDto } from '../build/dto/build.dto.js';

/** 发布（docs/02 §5.3：创建汇总构建范围；publish → 需求 stage=released；normal↔terminate） */
@Injectable()
export class ReleaseService {
  constructor(
    @InjectRepository(ZtRelease)
    private readonly releaseRepo: Repository<ZtRelease>,
    @InjectRepository(ZtReleaseRelated)
    private readonly relatedRepo: Repository<ZtReleaseRelated>,
    @InjectRepository(ZtBuild) private readonly buildRepo: Repository<ZtBuild>,
    @InjectRepository(ZtBuildStory)
    private readonly buildStoryRepo: Repository<ZtBuildStory>,
    @InjectRepository(ZtBuildBug)
    private readonly buildBugRepo: Repository<ZtBuildBug>,
    @InjectRepository(ZtBug) private readonly bugRepo: Repository<ZtBug>,
    private readonly storyService: StoryService,
    private readonly buildService: BuildService,
  ) {}

  /** 创建：按构建汇总 stories/bugs（isSync 语义简化为始终汇总，docs/02 §5.3） */
  async create(dto: CreateReleaseDto, operatorId: string): Promise<ZtRelease> {
    const builds = await this.buildService.getBuildsByIdList(dto.buildIds);
    if (builds.length !== dto.buildIds.length) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '部分构建不存在',
      );
    }
    const storyIds = new Set<string>();
    const bugIds = new Set<string>();
    for (const b of builds) {
      const bs = await this.buildStoryRepo.find({ where: { buildId: b.id } });
      bs.forEach((l) => storyIds.add(l.storyId));
      const bb = await this.buildBugRepo.find({ where: { buildId: b.id } });
      bb.forEach((l) => bugIds.add(l.bugId));
    }
    // 遗留 Bug = 构建 bugs 中仍未 resolved/closed 的
    const bugList = bugIds.size
      ? await this.bugRepo.find({ where: [...bugIds].map((id) => ({ id })) })
      : [];
    const leftBugs = bugList
      .filter((b) => ['active', 'resolved'].includes(b.status))
      .map((b) => b.id);

    const created = await this.releaseRepo.save(
      this.releaseRepo.create({
        productId: Number(dto.productId),
        projectIds: dto.projectIds ?? '0',
        buildIds: dto.buildIds.join(','),
        name: dto.name,
        date: new Date(dto.date),
        desc: dto.desc ?? null,
        stories: [...storyIds].join(','),
        bugs: [...bugIds].join(','),
        leftBugs: leftBugs.join(','),
        status: 'wait',
        createdBy: operatorId,
      }),
    );
    // related 规范化表（docs/04 §6）
    const rows: Array<{ objectType: string; objectId: string }> = [];
    storyIds.forEach((sid) =>
      rows.push({ objectType: 'story', objectId: sid }),
    );
    bugIds.forEach((bid) => rows.push({ objectType: 'bug', objectId: bid }));
    dto.buildIds.forEach((bid) =>
      rows.push({ objectType: 'build', objectId: bid }),
    );
    if (rows.length) {
      await this.relatedRepo.save(
        rows.map((r) =>
          this.relatedRepo.create({ releaseId: created.id, ...r }),
        ),
      );
    }
    return created;
  }

  async list(productId?: string) {
    const qb = this.releaseRepo.createQueryBuilder('r').where('r.deleted = 0');
    if (productId) qb.andWhere('r.product_id = :pid', { pid: productId });
    return qb.orderBy('r.id', 'DESC').getMany();
  }

  async get(id: string) {
    const release = await this.mustFind(id);
    const related = await this.relatedRepo.find({ where: { releaseId: id } });
    return { ...release, related };
  }

  /**
   * publish（docs/02 §5.3 changeStatus:917-925）：wait → normal；
   * 触发 setStoriesStage：需求 stage=released（setStage 引擎读取 normal 发布关联）。
   */
  async publish(operatorId: string, id: string): Promise<ZtRelease> {
    const release = await this.mustFind(id);
    if (release.status !== 'wait' && release.status !== 'fail') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${release.status} 不允许发布`,
      );
    }
    release.status = 'normal';
    release.releasedDate = new Date();
    const saved = await this.releaseRepo.save(release);
    // setStoriesStage：逐需求重算（setStage 引擎含 released 规则）
    const storyLinks = await this.relatedRepo.find({
      where: { releaseId: id, objectType: 'story' },
    });
    for (const link of storyLinks) {
      await this.storyService.setStage(link.objectId, 'publishRelease');
    }
    void operatorId;
    return saved;
  }

  /** normal ↔ terminate（terminate 后仅 activate 可回，docs/02 §5.3 isClickable） */
  async changeStatus(
    operatorId: string,
    id: string,
    action: 'activate' | 'terminate',
  ): Promise<ZtRelease> {
    const release = await this.mustFind(id);
    if (action === 'terminate') {
      if (release.status !== 'normal') {
        throw new BusinessException(
          ErrorCodes.BUILD_RELEASE.RELEASE_ACTION_INVALID,
          `状态 ${release.status} 不允许停止维护`,
        );
      }
      release.status = 'terminate';
    } else {
      if (release.status !== 'terminate') {
        throw new BusinessException(
          ErrorCodes.BUILD_RELEASE.RELEASE_ACTION_INVALID,
          `状态 ${release.status} 不允许激活`,
        );
      }
      release.status = 'normal';
    }
    void operatorId;
    return this.releaseRepo.save(release);
  }

  async remove(id: string): Promise<void> {
    const release = await this.mustFind(id);
    if (release.status === 'normal') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '已发布版本不可删除，请先停止维护',
      );
    }
    await this.releaseRepo.update(id, { deleted: 1 });
    await this.relatedRepo.delete({ releaseId: id });
  }

  private async mustFind(id: string): Promise<ZtRelease> {
    const release = await this.releaseRepo.findOne({
      where: { id, deleted: 0 },
    });
    if (!release)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '发布不存在',
      );
    return release;
  }
}
