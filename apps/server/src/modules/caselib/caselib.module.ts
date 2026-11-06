import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ZtCaseLib,
  ZtTestSuite,
  ZtSuiteCase,
} from './entities/caselib.entities.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';
import { ZtTestTask } from '../testtask/entities/zt-test-task.entity.js';
import { ZtTestRun } from '../testtask/entities/zt-test-run.entity.js';
import { ZtTestResult } from '../testtask/entities/zt-test-result.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { ZtTestReport } from '../webhook/entities/webhook.entities.js';
import { CaselibController } from './caselib.controller.js';
import { CaselibService } from './caselib.service.js';

/** 用例库/套件/测试报告（docs/03 §4.20-4.22） */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZtCaseLib,
      ZtTestSuite,
      ZtSuiteCase,
      ZtCase,
      ZtTestTask,
      ZtTestRun,
      ZtTestResult,
      ZtBug,
      ZtTestReport,
    ]),
  ],
  controllers: [CaselibController],
  providers: [CaselibService],
})
export class CaselibModule {}
