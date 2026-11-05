import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { DataScopeModule } from '../data-scope/data-scope.module.js';
import { ExecutionController } from './execution.controller.js';
import { ExecutionService } from './execution.service.js';
import { ZtExecution } from './entities/zt-execution.entity.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import { ZtProgram } from '../program/entities/zt-program.entity.js';

@Module({
  imports: [
    DataScopeModule,
    TypeOrmModule.forFeature([ZtExecution, ZtProject, ZtProgram, ZtTeam]),
  ],
  controllers: [ExecutionController],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
