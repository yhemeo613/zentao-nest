import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes, TESTTASK_TRANSITIONS } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtTestTask } from './entities/zt-test-task.entity.js';
import { ZtTestRun } from './entities/zt-test-run.entity.js';
import { ZtTestResult } from './entities/zt-test-result.entity.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';
import { ZtCaseStep } from '../case-module/entities/zt-case-step.entity.js';
import { CaseService } from '../case-module/case.service.js';
import {
  CloseTestTaskDto,
  CreateTestTaskDto,
  LinkCasesDto,
  RunCaseBodyDto,
} from './dto/testtask.dto.js';

/**
 * 测试单（docs/02 §7.3）：
 * 状态机 wait/doing/done(=已关闭)/blocked；wait→doing 由首次 runCase 自动触发（updateStatus）；
 * runCase 三写：case.lastRun* + zt_test_result + test_run；无自动 done。
 */
@Injectable()
export class TestTaskService {
  constructor(
    @InjectRepository(ZtTestTask)
    private readonly taskRepo: Repository<ZtTestTask>,
    @InjectRepository(ZtTestRun)
    private readonly runRepo: Repository<ZtTestRun>,
    @InjectRepository(ZtTestResult)
    private readonly resultRepo: Repository<ZtTestResult>,
    @InjectRepository(ZtCase) private readonly caseRepo: Repository<ZtCase>,
    @InjectRepository(ZtCaseStep)
    private readonly stepRepo: Repository<ZtCaseStep>,
    private readonly caseService: CaseService,
  ) {}

  async create(
    dto: CreateTestTaskDto,
    operatorId: string,
  ): Promise<ZtTestTask> {
    return this.taskRepo.save(
      this.taskRepo.create({
        productId: Number(dto.productId),
        projectId: dto.projectId ? Number(dto.projectId) : 0,
        executionId: dto.executionId ? Number(dto.executionId) : 0,
        buildId: Number(dto.buildId),
        name: dto.name,
        ownerId: dto.ownerId,
        begin: new Date(dto.begin),
        end: new Date(dto.end),
        desc: dto.desc ?? null,
        status: 'wait',
        createdBy: operatorId,
      }),
    );
  }

  async list(productId?: string): Promise<ZtTestTask[]> {
    const qb = this.taskRepo.createQueryBuilder('t').where('t.deleted = 0');
    if (productId) qb.andWhere('t.product_id = :pid', { pid: productId });
    return qb.orderBy('t.id', 'DESC').getMany();
  }

  async get(id: string) {
    const task = await this.mustFind(id);
    const runs = await this.runRepo.find({ where: { taskId: id } });
    return { ...task, runs };
  }

  private transition(action: string, status: string): void {
    const allowed = TESTTASK_TRANSITIONS[action];
    if (allowed && !allowed.includes(status)) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.INVALID_TRANSITION,
        `状态 ${status} 不允许 ${action}`,
      );
    }
  }

  async start(operatorId: string, id: string): Promise<ZtTestTask> {
    const t = await this.mustFind(id);
    this.transition('start', t.status);
    t.status = 'doing';
    t.realBegan = new Date();
    void operatorId;
    return this.taskRepo.save(t);
  }

  async block(operatorId: string, id: string): Promise<ZtTestTask> {
    const t = await this.mustFind(id);
    this.transition('block', t.status);
    t.status = 'blocked';
    void operatorId;
    return this.taskRepo.save(t);
  }

  async activate(operatorId: string, id: string): Promise<ZtTestTask> {
    const t = await this.mustFind(id);
    this.transition('activate', t.status);
    t.status = 'doing';
    void operatorId;
    return this.taskRepo.save(t);
  }

  /** close（docs/02 §7.3 4951：realFinishedDate 必填且晚于 begin） */
  async close(
    operatorId: string,
    id: string,
    dto: CloseTestTaskDto,
  ): Promise<ZtTestTask> {
    const t = await this.mustFind(id);
    this.transition('close', t.status);
    const finished = new Date(dto.realFinishedDate);
    if (t.begin && finished <= new Date(String(t.begin))) {
      throw new BusinessException(
        ErrorCodes.TEST_TASK.FINISH_DATE_INVALID,
        '完成日期须晚于开始日期',
      );
    }
    t.status = 'done';
    t.realFinishedDate = finished;
    void operatorId;
    return this.taskRepo.save(t);
  }

  /** 圈用例（replace 语义，docs/02 §7.3 linkCase：带用例版本快照） */
  async linkCases(id: string, dto: LinkCasesDto): Promise<ZtTestRun[]> {
    await this.mustFind(id);
    for (const caseId of dto.caseIds) {
      const c = await this.caseRepo.findOne({
        where: { id: caseId, deleted: 0 },
      });
      if (!c)
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          `用例 ${caseId} 不存在`,
        );
    }
    await this.runRepo.delete({ taskId: id });
    if (dto.caseIds.length === 0) return [];
    const cases = await this.caseRepo.find({
      where: dto.caseIds.map((cid) => ({ id: cid })),
    });
    const versionMap = new Map(cases.map((c) => [c.id, c.version]));
    return this.runRepo.save(
      dto.caseIds.map((caseId) =>
        this.runRepo.create({
          taskId: id,
          caseId,
          caseVersion: versionMap.get(caseId) ?? 1,
          status: 'normal',
        }),
      ),
    );
  }

  /**
   * 执行用例（docs/02 §7.3 createResult 三写）：
   * ① case.lastRun*（聚合由 CaseService.recordRun）② zt_test_result 插一条 ③ test_run 更新；
   * 测试单 wait → doing 自动推进（updateStatus）。
   */
  async runCase(
    operatorId: string,
    testTaskId: string,
    runId: string,
    body: RunCaseBodyDto,
  ) {
    const task = await this.mustFind(testTaskId);
    const run = await this.runRepo.findOne({
      where: { id: runId, taskId: testTaskId },
    });
    if (!run)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '执行记录不存在',
      );
    const caseId = body.caseId ?? run.caseId;
    const c = await this.caseRepo.findOne({
      where: { id: caseId, deleted: 0 },
    });
    if (!c)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '用例不存在',
      );

    // ① 用例级（聚合规则在 case 服务）
    const { caseResult } = await this.caseService.recordRun(
      caseId,
      { steps: body.steps },
      operatorId,
    );
    // ② 结果明细
    const result = await this.resultRepo.save(
      this.resultRepo.create({
        runId,
        caseId,
        version: c.version,
        caseResult,
        stepResults: body.steps,
        lastRunner: operatorId,
      }),
    );
    // ③ run 更新（result=blocked → run.status=blocked，docs/02 §7.3）
    run.lastRunner = operatorId;
    run.lastRunDate = new Date();
    run.lastRunResult = caseResult;
    run.status = caseResult === 'blocked' ? 'blocked' : 'normal';
    await this.runRepo.save(run);

    // wait → doing 自动推进（docs/02 §7.3 updateStatus：仅在 wait 时推）
    if (task.status === 'wait') {
      task.status = 'doing';
      task.realBegan = new Date();
      await this.taskRepo.save(task);
    }
    return { caseResult, resultId: result.id, taskStatus: task.status };
  }

  /** fail 转 Bug 预填（docs/02 §7.3 getBugInfoFromResult 精简版） */
  async bugPrefill(testTaskId: string, runId: string) {
    const run = await this.runRepo.findOne({
      where: { id: runId, taskId: testTaskId },
    });
    if (!run)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '执行记录不存在',
      );
    const c = await this.caseRepo.findOne({ where: { id: run.caseId } });
    const result = await this.resultRepo.findOne({
      where: { runId, caseId: run.caseId },
      order: { id: 'DESC' },
    });
    const steps = result?.stepResults ?? [];
    const failed = steps.filter((s) => s.result !== 'pass');
    const stepTexts = failed.length
      ? await this.stepRepo.find({
          where: failed.map((f) => ({ id: String(f.stepId) })),
        })
      : [];
    return {
      caseId: run.caseId,
      caseVersion: run.caseVersion,
      testtaskId: testTaskId,
      resultId: result?.id ?? 0,
      title: `【用例】${c?.title ?? ''} 执行失败`,
      steps: [
        '## 前置',
        c?.precondition ?? '（无）',
        '',
        '## 步骤',
        ...stepTexts.map((s) => `- ${s.stepDesc}`),
        '',
        '## 实际结果',
        ...failed.map(
          (f) =>
            `- 步骤 #${f.stepId}: ${f.result}${f.real ? `（${f.real}）` : ''}`,
        ),
      ].join('\n'),
    };
  }

  /** 删除守卫：非 doing 状态可删（简化纪律） */
  async removeWithGuard(id: string): Promise<void> {
    const t = await this.mustFind(id);
    if (t.status === 'doing') {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '进行中的测试单不可删除，请先关闭',
      );
    }
    await this.taskRepo.update(id, { deleted: 1 });
    await this.runRepo.delete({ taskId: id });
  }

  private async mustFind(id: string): Promise<ZtTestTask> {
    const t = await this.taskRepo.findOne({ where: { id, deleted: 0 } });
    if (!t)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '测试单不存在',
      );
    return t;
  }
}
