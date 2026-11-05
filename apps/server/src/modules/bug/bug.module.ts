import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtBug } from './entities/zt-bug.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtStorySpec } from '../story/entities/zt-story-spec.entity.js';
import { StoryModule } from '../story/story.module.js';
import { BugController } from './bug.controller.js';
import { BugService } from './bug.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZtBug, ZtStory, ZtStorySpec]),
    StoryModule,
  ],
  controllers: [BugController],
  providers: [BugService],
  exports: [BugService],
})
export class BugModule {}
