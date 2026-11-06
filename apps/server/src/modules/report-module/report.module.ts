import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtTask } from '../task/entities/zt-task.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';

/** 统计聚合（docs/03 §4.23） */
@Module({
  imports: [TypeOrmModule.forFeature([ZtStory, ZtTask, ZtBug, ZtCase])],
  controllers: [ReportController],
})
export class ReportModule {}
