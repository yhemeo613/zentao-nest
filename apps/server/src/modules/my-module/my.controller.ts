import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import {
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { ZtTask } from '../task/entities/zt-task.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';
import { ZtTestTask } from '../testtask/entities/zt-test-task.entity.js';
import { ZtProduct } from '../product/entities/zt-product.entity.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';

/**
 * 我的地盘 + 全局搜索（docs/03 §4.17/§7；登录即可，数据集=可见范围∩与我相关，docs/02 §2.1）。
 * 可见性精细过滤随 DataScope 接入深化；当前以 assignedTo/openedBy 维度聚合（对齐禅道 my 模块口径）。
 */
@ApiTags('my')
@ApiBearerAuth()
@Controller('my')
export class MyController {
  constructor(
    @InjectRepository(ZtTask) private readonly taskRepo: Repository<ZtTask>,
    @InjectRepository(ZtBug) private readonly bugRepo: Repository<ZtBug>,
    @InjectRepository(ZtStory) private readonly storyRepo: Repository<ZtStory>,
    @InjectRepository(ZtCase) private readonly caseRepo: Repository<ZtCase>,
    @InjectRepository(ZtTestTask)
    private readonly testTaskRepo: Repository<ZtTestTask>,
    @InjectRepository(ZtProduct)
    private readonly productRepo: Repository<ZtProduct>,
    @InjectRepository(ZtProject)
    private readonly projectRepo: Repository<ZtProject>,
    @InjectRepository(ZtExecution)
    private readonly executionRepo: Repository<ZtExecution>,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: '我的地盘汇总（指派给我的各类计数 + 今日工时）' })
  @ApiResponse({
    status: 200,
    description: '计数汇总',
    schema: envelopedInline({ type: 'object' }),
  })
  async summary(@CurrentUser() user: JwtUser) {
    const uid = user.id;
    const [tasks, bugs, stories, testTasks] = await Promise.all([
      this.taskRepo.count({ where: { assignedTo: uid, deleted: 0 } }),
      this.bugRepo.count({ where: { assignedTo: uid, deleted: 0 } }),
      this.storyRepo.count({ where: { assignedTo: uid, deleted: 0 } }),
      this.testTaskRepo.count({ where: { ownerId: uid, deleted: 0 } }),
    ]);
    return {
      tasks,
      bugs,
      stories,
      testTasks,
      todo: await this.todoCount(uid),
    };
  }

  private async todoCount(uid: string): Promise<number> {
    return this.taskRepo.manager
      .query(
        "SELECT COUNT(*) AS n FROM zt_todo WHERE deleted = 0 AND (assigned_to = ? OR user_id = ?) AND status IN ('wait','doing')",
        [uid, uid],
      )
      .then((rows: Array<{ n: number }>) => Number(rows[0]?.n ?? 0));
  }

  @Get('tasks')
  @ApiOperation({ summary: '指派给我的任务' })
  @ApiResponse({
    status: 200,
    description: '任务列表',
    schema: envelopedPage(Object),
  })
  async myTasks(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
  ) {
    const where: Record<string, unknown> = { assignedTo: user.id, deleted: 0 };
    if (status) where.status = status;
    return this.taskRepo.find({ where, order: { id: 'DESC' }, take: 100 });
  }

  @Get('bugs')
  @ApiOperation({ summary: '指派给我的 Bug' })
  @ApiResponse({
    status: 200,
    description: 'Bug 列表',
    schema: envelopedPage(Object),
  })
  async myBugs(@CurrentUser() user: JwtUser) {
    return this.bugRepo.find({
      where: { assignedTo: user.id, deleted: 0 },
      order: { id: 'DESC' },
      take: 100,
    });
  }

  @Get('stories')
  @ApiOperation({ summary: '指派给我的需求' })
  @ApiResponse({
    status: 200,
    description: '需求列表',
    schema: envelopedPage(Object),
  })
  async myStories(@CurrentUser() user: JwtUser) {
    return this.storyRepo.find({
      where: { assignedTo: user.id, deleted: 0 },
      order: { id: 'DESC' },
      take: 100,
    });
  }

  @Get('testtasks')
  @ApiOperation({ summary: '我负责的测试单' })
  @ApiResponse({
    status: 200,
    description: '测试单列表',
    schema: envelopedPage(Object),
  })
  async myTestTasks(@CurrentUser() user: JwtUser) {
    return this.testTaskRepo.find({
      where: { ownerId: user.id, deleted: 0 },
      order: { id: 'DESC' },
      take: 100,
    });
  }

  /** 全局搜索（docs/03 §7：按类型 LIKE，可见性粗筛=open；深过滤随 DataScope 深化） */
  @Get('search')
  @ApiOperation({
    summary: '全局搜索',
    description:
      '?q=关键字&types=story,task,bug,case,product,project,execution',
  })
  @ApiResponse({
    status: 200,
    description: '分组结果',
    schema: envelopedInline({ type: 'object' }),
  })
  async search(
    @CurrentUser() user: JwtUser,
    @Query('q') q: string,
    @Query('types') types?: string,
  ) {
    void user;
    if (!q || q.trim().length === 0) return {};
    const kw = `%${q.trim()}%`;
    const wanted = (types ?? 'story,task,bug,case,product,project,execution')
      .split(',')
      .map((t) => t.trim());
    const out: Record<string, unknown[]> = {};
    // LIKE 检索（各自白名单字段）
    if (wanted.includes('story'))
      out.story = await this.storyRepo
        .createQueryBuilder('s')
        .where('s.deleted = 0')
        .andWhere('s.title LIKE :kw', { kw })
        .take(10)
        .getMany();
    if (wanted.includes('task'))
      out.task = await this.taskRepo
        .createQueryBuilder('t')
        .where('t.deleted = 0')
        .andWhere('t.name LIKE :kw', { kw })
        .take(10)
        .getMany();
    if (wanted.includes('bug'))
      out.bug = await this.bugRepo
        .createQueryBuilder('b')
        .where('b.deleted = 0')
        .andWhere('b.title LIKE :kw', { kw })
        .take(10)
        .getMany();
    if (wanted.includes('case'))
      out.case = await this.caseRepo
        .createQueryBuilder('c')
        .where('c.deleted = 0')
        .andWhere('c.title LIKE :kw', { kw })
        .take(10)
        .getMany();
    if (wanted.includes('product'))
      out.product = await this.productRepo
        .createQueryBuilder('p')
        .where('p.deleted = 0')
        .andWhere('p.name LIKE :kw', { kw })
        .take(10)
        .getMany();
    if (wanted.includes('project'))
      out.project = await this.projectRepo
        .createQueryBuilder('p')
        .where('p.deleted = 0')
        .andWhere('p.name LIKE :kw', { kw })
        .take(10)
        .getMany();
    if (wanted.includes('execution'))
      out.execution = await this.executionRepo
        .createQueryBuilder('e')
        .where('e.deleted = 0')
        .andWhere('e.name LIKE :kw', { kw })
        .take(10)
        .getMany();
    return out;
  }
}
