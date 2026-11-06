import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtCaseLib } from './entities/caselib.entities.js';
import { ZtTestSuite, ZtSuiteCase } from './entities/caselib.entities.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';
import { ZtTestTask } from '../testtask/entities/zt-test-task.entity.js';
import { ZtTestRun } from '../testtask/entities/zt-test-run.entity.js';
import { ZtTestResult } from '../testtask/entities/zt-test-result.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { ZtCaseLib as CaseLibEntity } from './entities/caselib.entities.js';
import { ZtTestReport } from '../webhook/entities/webhook.entities.js';

/** 用例库 + 套件 + 测试报告（docs/03 §4.20-4.22 精简合并服务） */
@Injectable()
export class CaselibService {
  constructor(
    @InjectRepository(ZtCaseLib)
    private readonly libRepo: Repository<ZtCaseLib>,
    @InjectRepository(ZtTestSuite)
    private readonly suiteRepo: Repository<ZtTestSuite>,
    @InjectRepository(ZtSuiteCase)
    private readonly suiteCaseRepo: Repository<ZtSuiteCase>,
    @InjectRepository(ZtCase) private readonly caseRepo: Repository<ZtCase>,
    @InjectRepository(ZtTestTask)
    private readonly testTaskRepo: Repository<ZtTestTask>,
    @InjectRepository(ZtTestRun)
    private readonly runRepo: Repository<ZtTestRun>,
    @InjectRepository(ZtTestResult)
    private readonly resultRepo: Repository<ZtTestResult>,
    @InjectRepository(ZtBug) private readonly bugRepo: Repository<ZtBug>,
    @InjectRepository(ZtTestReport)
    private readonly reportRepo: Repository<ZtTestReport>,
  ) {}

  // ---- 用例库 ----
  async createLib(
    dto: { name: string; desc?: string },
    operatorId: string,
  ): Promise<CaseLibEntity> {
    return this.libRepo.save(
      this.libRepo.create({
        name: dto.name,
        desc: dto.desc ?? null,
        ownerId: operatorId,
        createdBy: operatorId,
      }),
    );
  }

  async listLibs() {
    return this.libRepo.find({ where: { deleted: 0 }, order: { id: 'ASC' } });
  }

  /** 库内用例（禅道语义：库用例复用 zt_case，lib 字段关联；一期返回说明，F3 页面完善） */
  async libCases(libId: string) {
    await this.mustFindLib(libId);
    return {
      libId,
      note: '库用例复用 zt_case（productId=0 + lib 关联）随 F3 用例库页面完善',
      cases: [],
    };
  }

  /** 导入库用例到产品（docs/03 §4.20 import-to-product：复制用例到产品） */
  async importToProduct(
    libId: string,
    productId: string,
    caseIds: string[],
    operatorId: string,
  ): Promise<number> {
    await this.mustFindLib(libId);
    let imported = 0;
    for (const caseId of caseIds) {
      const c = await this.caseRepo.findOne({
        where: { id: caseId, deleted: 0 },
      });
      if (!c) continue;
      await this.caseRepo.save(
        this.caseRepo.create({
          productId: Number(productId),
          moduleId: c.moduleId,
          storyId: 0,
          storyVersion: 1,
          title: c.title,
          precondition: c.precondition,
          pri: c.pri,
          type: c.type,
          status: 'normal',
          version: 1,
          openedBy: operatorId,
          createdBy: operatorId,
        }),
      );
      imported += 1;
    }
    return imported;
  }

  async updateLib(
    id: string,
    dto: { name?: string; desc?: string },
  ): Promise<CaseLibEntity> {
    const lib = await this.mustFindLib(id);
    if (dto.name !== undefined) lib.name = dto.name;
    if (dto.desc !== undefined) lib.desc = dto.desc;
    return this.libRepo.save(lib);
  }

  async removeLib(id: string): Promise<void> {
    await this.mustFindLib(id);
    await this.libRepo.update(id, { deleted: 1 });
  }

  // ---- 套件 ----
  async createSuite(
    productId: string,
    dto: { name: string; type?: string; desc?: string },
    operatorId: string,
  ) {
    return this.suiteRepo.save(
      this.suiteRepo.create({
        productId: Number(productId),
        name: dto.name,
        type: dto.type ?? 'feature',
        desc: dto.desc ?? null,
        createdBy: operatorId,
      }),
    );
  }

  async listSuites(productId: string) {
    return this.suiteRepo.find({
      where: { productId: Number(productId), deleted: 0 },
      order: { id: 'DESC' },
    });
  }

  async addSuiteCases(suiteId: string, caseIds: string[]): Promise<number> {
    await this.mustFindSuite(suiteId);
    let added = 0;
    for (const caseId of caseIds) {
      const c = await this.caseRepo.findOne({
        where: { id: caseId, deleted: 0 },
      });
      if (!c)
        throw new BusinessException(
          ErrorCodes.VALIDATION.NOT_FOUND,
          `用例 ${caseId} 不存在`,
        );
      const exists = await this.suiteCaseRepo.findOne({
        where: { suiteId, caseId },
      });
      if (exists) continue;
      await this.suiteCaseRepo.save(
        this.suiteCaseRepo.create({ suiteId, caseId, caseVersion: c.version }),
      );
      added += 1;
    }
    return added;
  }

  async removeSuiteCase(suiteId: string, caseId: string): Promise<void> {
    await this.suiteCaseRepo.delete({ suiteId, caseId });
  }

  // ---- 测试报告（docs/03 §4.22：从 testtask 聚合生成） ----
  async createReportFromTask(
    testTaskId: string,
    dto: { title: string; goal?: string },
    operatorId: string,
  ) {
    const task = await this.testTaskRepo.findOne({
      where: { id: testTaskId, deleted: 0 },
    });
    if (!task)
      throw new BusinessException(
        ErrorCodes.REPORT.REPORT_NO_SOURCE,
        '源测试单不存在',
      );
    const runs = await this.runRepo.find({ where: { taskId: testTaskId } });
    const results = runs.length
      ? await this.resultRepo.find({
          where: runs.map((r) => ({ runId: r.id })),
          order: { id: 'DESC' },
        })
      : [];
    // 取每用例最新一条结果
    const latestByCase = new Map<string, (typeof results)[number]>();
    for (const r of results)
      if (!latestByCase.has(r.caseId)) latestByCase.set(r.caseId, r);
    const caseResults = [...latestByCase.values()].map((r) => r.caseResult);
    const total = caseResults.length;
    const passed = caseResults.filter((r) => r === 'pass').length;
    const failed = caseResults.filter((r) => r === 'fail').length;
    const blocked = caseResults.filter((r) => r === 'blocked').length;
    const failCaseIds = [...latestByCase.entries()]
      .filter(([, r]) => r.caseResult === 'fail')
      .map(([caseId]) => caseId);
    const relatedBugs = failCaseIds.length
      ? await this.bugRepo.find({
          where: failCaseIds.map((cid) => ({ caseId: Number(cid) })),
        })
      : [];

    return this.reportRepo.save({
      productId: task.productId,
      projectId: task.projectId,
      taskId: Number(task.id),
      title: dto.title,
      owner: operatorId,
      begin: task.begin,
      end: task.end,
      goal: dto.goal ?? null,
      results: {
        total,
        passed,
        failed,
        blocked,
        unexecuted: Math.max(runs.length - total, 0),
        passRate: total ? Number(((passed / total) * 100).toFixed(1)) : null,
        bugs: relatedBugs.map((b) => ({
          id: b.id,
          title: b.title,
          resolution: b.resolution,
        })),
      },
      createdBy: operatorId,
    });
  }

  async listReports(productId?: string) {
    const repo = this.reportRepo;
    const qb = repo.createQueryBuilder('r').where('r.deleted = 0');
    if (productId) qb.andWhere('r.product_id = :pid', { pid: productId });
    return qb.orderBy('r.id', 'DESC').getMany();
  }

  async getReport(id: string) {
    const repo = this.reportRepo;
    const report = await this.reportRepo.findOne({ where: { id, deleted: 0 } });
    if (!report)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '测试报告不存在',
      );
    return report;
  }

  private async mustFindLib(id: string): Promise<CaseLibEntity> {
    const lib = await this.libRepo.findOne({ where: { id, deleted: 0 } });
    if (!lib)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '用例库不存在',
      );
    return lib;
  }

  private async mustFindSuite(id: string): Promise<ZtTestSuite> {
    const suite = await this.suiteRepo.findOne({ where: { id, deleted: 0 } });
    if (!suite)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '套件不存在',
      );
    return suite;
  }
}

// In 保留（导入语义）
void In;
