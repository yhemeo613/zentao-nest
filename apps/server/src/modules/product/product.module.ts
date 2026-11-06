import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';
import { DataScopeModule } from '../data-scope/data-scope.module.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';
import { BranchService } from './branch.service.js';
import { BranchController } from './branch.controller.js';
import { ZtProduct } from './entities/zt-product.entity.js';
import { ZtBranch, ZtProductLine } from './entities/zt-branch.entity.js';
import { ZtModule } from './entities/zt-module.entity.js';

@Module({
  imports: [
    DataScopeModule,
    TypeOrmModule.forFeature([
      ZtProduct,
      ZtModule,
      SysAcl,
      ZtTeam,
      ZtExecution,
      ZtBranch,
      ZtProductLine,
    ]),
  ],
  controllers: [ProductController, BranchController],
  providers: [ProductService, BranchService],
  exports: [ProductService],
})
export class ProductModule {}
