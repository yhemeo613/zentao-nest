import { Module } from '@nestjs/common';
import { OaModule } from '../oa/oa.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtStory } from './entities/zt-story.entity.js';
import { ZtStorySpec } from './entities/zt-story-spec.entity.js';
import { ZtStoryReview } from './entities/zt-story-review.entity.js';
import { ZtStoryStage } from './entities/zt-story-stage.entity.js';
import { ZtPlanStory } from '../plan/entities/zt-plan-story.entity.js';
import { ZtProjectStory } from '../project/entities/zt-project-story.entity.js';
import { ZtReleaseRelated } from '../release/entities/zt-release-related.entity.js';
import { ZtRelease } from '../release/entities/zt-release.entity.js';
import { StoryController } from './story.controller.js';
import { StoryService } from './story.service.js';

@Module({
  imports: [
    OaModule,
    TypeOrmModule.forFeature([
      ZtStory,
      ZtStorySpec,
      ZtStoryReview,
      ZtStoryStage,
      ZtPlanStory,
      ZtProjectStory,
      ZtReleaseRelated,
      ZtRelease,
    ]),
  ],
  controllers: [StoryController],
  providers: [StoryService],
  exports: [StoryService],
})
export class StoryModule {}
