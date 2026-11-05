import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { ZtProgram } from '../program/entities/zt-program.entity.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';
import { DataScopeService } from './data-scope.service.js';

/**
 * 数据权限模块（ADR D005）：DataScopeService 单一 provide 点。
 * 依赖仓储集中在此 forFeature，业务模块仅 import 本模块。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SysAcl,
      ZtTeam,
      ZtProgram,
      ZtProject,
      ZtExecution,
    ]),
  ],
  providers: [DataScopeService],
  exports: [DataScopeService],
})
export class DataScopeModule {}
