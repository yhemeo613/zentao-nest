import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMS } from '@zentao/shared';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { envelopedInline } from '../../common/swagger/swagger.helper.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtTask } from '../task/entities/zt-task.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';

/** 统计聚合（docs/03 §4.23 一期指标；Redis 缓存随 P7 观测统一接入） */
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportController {
  constructor(
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    @InjectRepository(ZtTask) private readonly taskRepo: Repository<ZtTask>,
    @InjectRepository(ZtBug) private readonly bugRepo: Repository<ZtBug>,
    @InjectRepository(ZtCase) private readonly caseRepo: Repository<ZtCase>,
  ) {}

  @Get('project/:id/overview')
  @Permissions(PERMS.report.view, '项目概览统计')
  @ApiOperation({ summary: '项目概览：需求（项目范围）/任务/Bug 状态分布' })
  @ApiResponse({
    status: 200,
    description: '概览',
    schema: envelopedInline({ type: 'object' }),
  })
  async projectOverview(@Param('id', ParseIntPipe) id: string) {
    const pid = Number(id);
    // 需求走项目范围关联（zt_story 无 project_id 列，docs/04 §4）
    const storyRows: Array<{ status: string; n: string }> =
      (await this.storyRepo.manager.query(
        'SELECT s.status AS status, COUNT(*) AS n FROM zt_story s JOIN zt_project_story ps ON ps.story_id = s.id AND ps.scope_type = ? WHERE s.deleted = 0 AND ps.scope_id = ? GROUP BY s.status',
        ['project', pid],
      )) as never;
    const taskRows: Array<{ status: string; n: string }> =
      (await this.taskRepo.manager.query(
        'SELECT status, COUNT(*) AS n FROM zt_task WHERE deleted = 0 AND project_id = ? GROUP BY status',
        [pid],
      )) as never;
    const bugRows: Array<{ status: string; n: string }> =
      (await this.bugRepo.manager.query(
        'SELECT status, COUNT(*) AS n FROM zt_bug WHERE deleted = 0 AND project_id = ? GROUP BY status',
        [pid],
      )) as never;
    const toMap = (rows: Array<{ status: string; n: string }>) =>
      rows.reduce<Record<string, number>>(
        (acc, r) => ((acc[r.status] = Number(r.n)), acc),
        {},
      );
    return {
      story: toMap(storyRows),
      task: toMap(taskRows),
      bug: toMap(bugRows),
    };
  }

  @Get('execution/:id/workload')
  @Permissions(PERMS.report.view, '执行负载统计')
  @ApiOperation({ summary: '执行负载：成员任务分布与工时' })
  @ApiResponse({
    status: 200,
    description: '成员负载',
    schema: envelopedInline({ type: 'object' }),
  })
  async executionWorkload(@Param('id', ParseIntPipe) id: string) {
    const rows: Array<{
      account: string;
      tasks: string;
      consumed: string;
      left: string;
    }> = (await this.taskRepo.manager.query(
      "SELECT assigned_to AS account, COUNT(*) AS tasks, SUM(consumed) AS consumed, SUM(`left`) AS `left` FROM zt_task WHERE deleted = 0 AND execution_id = ? AND assigned_to != '' GROUP BY assigned_to",
      [Number(id)],
    )) as never;
    return {
      members: rows.map((r) => ({
        userId: r.account,
        tasks: Number(r.tasks),
        consumed: Number(r.consumed),
        left: Number(r.left),
      })),
    };
  }

  @Get('product/:id/quality')
  @Permissions(PERMS.report.view, '产品质量统计')
  @ApiOperation({ summary: '产品质量：Bug 状态分布、用例通过率、缺陷密度' })
  @ApiResponse({
    status: 200,
    description: '质量指标',
    schema: envelopedInline({ type: 'object' }),
  })
  async productQuality(@Param('id', ParseIntPipe) id: string) {
    const pid = Number(id);
    const bugs = await this.bugRepo.find({
      where: { productId: pid, deleted: 0 },
    });
    const cases = await this.caseRepo.find({
      where: { productId: pid, deleted: 0 },
    });
    const stories = await this.storyRepo.count({
      where: { productId: pid, deleted: 0 },
    });
    const bugByStatus = bugs.reduce<Record<string, number>>(
      (acc, b) => ((acc[b.status] = (acc[b.status] ?? 0) + 1), acc),
      {},
    );
    const ran = cases.filter((c) => c.lastRunResult);
    const passed = ran.filter((c) => c.lastRunResult === 'pass').length;
    return {
      bugs: bugByStatus,
      totalBugs: bugs.length,
      caseTotal: cases.length,
      caseRan: ran.length,
      casePassRate: ran.length
        ? Number(((passed / ran.length) * 100).toFixed(1))
        : null,
      defectDensity:
        stories > 0 ? Number((bugs.length / stories).toFixed(2)) : null,
    };
  }

  @Get('products/:id/roadmap')
  @Permissions(PERMS.report.view, '产品路线图')
  @ApiOperation({ summary: '产品路线图（按需求 stage 聚合）' })
  @ApiResponse({
    status: 200,
    description: 'stage 分布',
    schema: envelopedInline({ type: 'object' }),
  })
  async roadmap(@Param('id', ParseIntPipe) id: string) {
    const rows: Array<{ stage: string; n: string }> =
      (await this.storyRepo.manager.query(
        'SELECT stage, COUNT(*) AS n FROM zt_story WHERE deleted = 0 AND product_id = ? GROUP BY stage',
        [Number(id)],
      )) as never;
    return rows.reduce<Record<string, number>>(
      (acc, r) => ((acc[r.stage] = Number(r.n)), acc),
      {},
    );
  }
}
