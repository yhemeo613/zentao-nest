import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtPlan } from './entities/zt-plan.entity.js';
import { ZtPlanStory } from './entities/zt-plan-story.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { StoryModule } from '../story/story.module.js';
import { PlanController } from './plan.controller.js';
import { PlanService } from './plan.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZtPlan, ZtPlanStory, ZtStory]),
    StoryModule,
  ],
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
