import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtBuild } from './entities/zt-build.entity.js';
import { ZtBuildStory } from './entities/zt-build-story.entity.js';
import { ZtBuildBug } from './entities/zt-build-bug.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import {
  CreateBuildDto,
  LinkBuildBugsDto,
  LinkBuildStoriesDto,
} from './dto/build.dto.js';

/** 版本（docs/02 §5.2：同名唯一 4401；linkBug 自动解决未解决 Bug——「修复构建」语义） */
@Injectable()
export class BuildService {
  constructor(
    @InjectRepository(ZtBuild) private readonly buildRepo: Repository<ZtBuild>,
    @InjectRepository(ZtBuildStory)
    private readonly buildStoryRepo: Repository<ZtBuildStory>,
    @InjectRepository(ZtBuildBug)
    private readonly buildBugRepo: Repository<ZtBuildBug>,
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    @InjectRepository(ZtBug) private readonly bugRepo: Repository<ZtBug>,
  ) {}

  /** 创建：同产品同分支 name 唯一（4401，docs/02 §5.2 model.php:528-529）；初始需求关联直收 */
  async create(dto: CreateBuildDto, operatorId: string): Promise<ZtBuild> {
    const duplicated = await this.buildRepo.findOne({
      where: {
        productId: Number(dto.productId),
        branch: '0',
        name: dto.name,
        deleted: 0,
      },
    });
    if (duplicated) {
      throw new BusinessException(
        ErrorCodes.BUILD_RELEASE.BUILD_NAME_DUPLICATED,
        `构建名称 ${dto.name} 已存在`,
      );
    }
    const created = await this.buildRepo.save(
      this.buildRepo.create({
        projectId: Number(dto.projectId ?? 0) || 0,
        productId: Number(dto.productId),
        branch: '0',
        executionId: Number(dto.executionId ?? 0) || 0,
        name: dto.name,
        scmPath: dto.scmPath ?? '',
        filePath: '',
        date: new Date(dto.date),
        builder: dto.builder,
        desc: dto.desc ?? null,
        stories: '',
        bugs: '',
        createdBy: operatorId,
      }),
    );
    if (dto.storyIds?.length) {
      await this.linkStories(String(created.id), { storyIds: dto.storyIds });
    }
    return created;
  }

  async list(productId?: string): Promise<ZtBuild[]> {
    const qb = this.buildRepo.createQueryBuilder('b').where('b.deleted = 0');
    if (productId) qb.andWhere('b.product_id = :pid', { pid: productId });
    return qb.orderBy('b.id', 'DESC').getMany();
  }

  /** 详情：关联清单展开为需求/Bug 对象（前端 BuildDetailVo 契约） */
  async get(id: string) {
    const build = await this.mustFind(id);
    const storyLinks = await this.buildStoryRepo.find({ where: { buildId: id } });
    const bugLinks = await this.buildBugRepo.find({ where: { buildId: id } });
    const stories = storyLinks.length
      ? await this.storyRepo.find({
          where: storyLinks.map((l) => ({ id: l.storyId, deleted: 0 })),
        })
      : [];
    const bugs = bugLinks.length
      ? await this.bugRepo.find({
          where: bugLinks.map((l) => ({ id: l.bugId, deleted: 0 })),
        })
      : [];
    return { ...build, stories, bugs };
  }

  /** 关联需求（docs/02 §5.2 linkStory）：追加式；关联表 + 逗号串双写，返回新关联数 */
  async linkStories(id: string, dto: LinkBuildStoriesDto): Promise<number> {
    const build = await this.mustFind(id);
    let linked = 0;
    for (const storyId of dto.storyIds) {
      const story = await this.storyRepo.findOne({
        where: { id: storyId, deleted: 0 },
      });
      if (!story) {
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          `需求 ${storyId} 不存在`,
        );
      }
      const exists = await this.buildStoryRepo.findOne({
        where: { buildId: id, storyId },
      });
      if (exists) continue;
      await this.buildStoryRepo.save(
        this.buildStoryRepo.create({ buildId: id, storyId }),
      );
      linked += 1;
    }
    if (linked > 0) await this.syncStoryColumn(build);
    return linked;
  }

  /** 解除需求关联：删关联行 + 回写逗号串 */
  async unlinkStory(buildId: string, storyId: string): Promise<void> {
    const build = await this.mustFind(buildId);
    await this.buildStoryRepo.delete({ buildId, storyId });
    await this.syncStoryColumn(build);
  }

  /**
   * 关联 Bug（docs/02 §5.2 linkBug model.php:630-660）：
   * 未解决 Bug 自动置 resolved/fixed、解决构建=本构建、指派回开单人（「修复构建」语义）。
   */
  async linkBugs(
    operatorId: string,
    id: string,
    dto: LinkBuildBugsDto,
  ): Promise<number> {
    const build = await this.mustFind(id);
    let linked = 0;
    for (const bugId of dto.bugIds) {
      const bug = await this.bugRepo.findOne({
        where: { id: bugId, deleted: 0 },
      });
      if (!bug) {
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          `Bug ${bugId} 不存在`,
        );
      }
      const exists = await this.buildBugRepo.findOne({
        where: { buildId: id, bugId },
      });
      if (exists) continue;
      await this.buildBugRepo.save(
        this.buildBugRepo.create({ buildId: id, bugId }),
      );
      linked += 1;
      // 「修复构建」副作用：仅未解决 Bug 自动置已解决
      if (bug.status === 'active') {
        bug.status = 'resolved';
        bug.resolution = 'fixed';
        bug.resolvedBy = operatorId;
        bug.resolvedAt = new Date();
        bug.resolvedBuildId = id;
        bug.assignedTo = bug.openedBy; // 回指开单人验证
        bug.assignedAt = new Date();
        await this.bugRepo.save(bug);
      }
    }
    if (linked > 0) await this.syncBugColumn(build);
    return linked;
  }

  /** 解除 Bug 关联：删关联行 + 回写逗号串（不回滚已解决状态） */
  async unlinkBug(buildId: string, bugId: string): Promise<void> {
    const build = await this.mustFind(buildId);
    await this.buildBugRepo.delete({ buildId, bugId });
    await this.syncBugColumn(build);
  }

  /** 供发布域按 ID 列表取构建（release create 汇总范围用，docs/02 §5.3） */
  async getBuildsByIdList(ids: string[]): Promise<ZtBuild[]> {
    if (!ids.length) return [];
    return this.buildRepo.find({ where: { id: In(ids), deleted: 0 } });
  }

  /** 逗号串回写：以规范化关联表为准（docs/04 §5 双写语义） */
  private async syncStoryColumn(build: ZtBuild): Promise<void> {
    const links = await this.buildStoryRepo.find({ where: { buildId: build.id } });
    build.stories = links.map((l) => l.storyId).join(',');
    await this.buildRepo.save(build);
  }

  private async syncBugColumn(build: ZtBuild): Promise<void> {
    const links = await this.buildBugRepo.find({ where: { buildId: build.id } });
    build.bugs = links.map((l) => l.bugId).join(',');
    await this.buildRepo.save(build);
  }

  private async mustFind(id: string): Promise<ZtBuild> {
    const build = await this.buildRepo.findOne({ where: { id, deleted: 0 } });
    if (!build)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '构建不存在',
      );
    return build;
  }
}
