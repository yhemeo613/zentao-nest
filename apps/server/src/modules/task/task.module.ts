import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtTask } from './entities/zt-task.entity.js';
import { ZtEffort } from './entities/zt-effort.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { OaModule } from '../oa/oa.module.js';
import { StoryModule } from '../story/story.module.js';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';

@Module({
  imports: [
    OaModule,
    TypeOrmModule.forFeature([ZtTask, ZtEffort, ZtStory]),
    StoryModule,
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
