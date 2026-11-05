import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtProjectStory } from '../project/entities/zt-project-story.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtPlanStory } from '../plan/entities/zt-plan-story.entity.js';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { StoryModule } from '../story/story.module.js';
import { ProjectStoryController } from './projectstory.controller.js';
import { ProjectStoryService } from './projectstory.service.js';

/** 项目/执行-需求范围（P4 启用；docs/03 §4.8/4.9 stories 端点） */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZtProjectStory,
      ZtStory,
      ZtPlanStory,
      ZtTeam,
      SysAcl,
      ZtExecution,
    ]),
    StoryModule,
  ],
  controllers: [ProjectStoryController],
  providers: [ProjectStoryService],
  exports: [ProjectStoryService],
})
export class ProjectStoryModule {}
