import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtTestTask } from './entities/zt-test-task.entity.js';
import { ZtTestRun } from './entities/zt-test-run.entity.js';
import { ZtTestResult } from './entities/zt-test-result.entity.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';
import { ZtCaseStep } from '../case-module/entities/zt-case-step.entity.js';
import { CaseModule } from '../case-module/case.module.js';
import { TestTaskController } from './testtask.controller.js';
import { TestTaskService } from './testtask.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZtTestTask,
      ZtTestRun,
      ZtTestResult,
      ZtCase,
      ZtCaseStep,
    ]),
    CaseModule,
  ],
  controllers: [TestTaskController],
  providers: [TestTaskService],
  exports: [TestTaskService],
})
export class TestTaskModule {}
