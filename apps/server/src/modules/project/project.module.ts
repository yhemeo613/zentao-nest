import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';
import { DataScopeModule } from '../data-scope/data-scope.module.js';
import { ProjectController } from './project.controller.js';
import { ProjectService } from './project.service.js';
import { ZtProject } from './entities/zt-project.entity.js';
import { ZtProjectProduct } from './entities/zt-project-product.entity.js';
import { ZtProjectStory } from './entities/zt-project-story.entity.js';
import { ZtProgram } from '../program/entities/zt-program.entity.js';
import { ZtProduct } from '../product/entities/zt-product.entity.js';

@Module({
  imports: [
    DataScopeModule,
    TypeOrmModule.forFeature([
      ZtProject,
      ZtProjectProduct,
      ZtProjectStory,
      ZtProgram,
      ZtProduct,
      ZtExecution,
      SysAcl,
      ZtTeam,
    ]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
