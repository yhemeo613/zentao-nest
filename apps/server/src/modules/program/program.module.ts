import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { ZtProduct } from '../product/entities/zt-product.entity.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import { DataScopeModule } from '../data-scope/data-scope.module.js';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';
import { ProgramController } from './program.controller.js';
import { ProgramService } from './program.service.js';
import { ZtProgram } from './entities/zt-program.entity.js';

@Module({
  imports: [
    DataScopeModule,
    TypeOrmModule.forFeature([
      ZtProgram,
      ZtProduct,
      ZtProject,
      SysAcl,
      ZtTeam,
      ZtExecution,
    ]),
  ],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
