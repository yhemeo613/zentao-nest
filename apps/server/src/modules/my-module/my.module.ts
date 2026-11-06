import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyController } from './my.controller.js';
import { ZtTask } from '../task/entities/zt-task.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtCase } from '../case-module/entities/zt-case.entity.js';
import { ZtTestTask } from '../testtask/entities/zt-test-task.entity.js';
import { ZtProduct } from '../product/entities/zt-product.entity.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';

/** 我的地盘 + 全局搜索（docs/03 §4.17/§7） */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZtTask,
      ZtBug,
      ZtStory,
      ZtCase,
      ZtTestTask,
      ZtProduct,
      ZtProject,
      ZtExecution,
    ]),
  ],
  controllers: [MyController],
})
export class MyModule {}
