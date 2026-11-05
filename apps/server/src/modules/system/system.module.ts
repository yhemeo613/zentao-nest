import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysAcl } from './entities/sys-acl.entity.js';
import { SysDept } from './entities/sys-dept.entity.js';
import { SysPermission } from './entities/sys-permission.entity.js';
import { SysRole } from './entities/sys-role.entity.js';
import { SysRolePermission } from './entities/sys-role-permission.entity.js';
import { SysUser } from './entities/sys-user.entity.js';
import { SysUserRole } from './entities/sys-user-role.entity.js';
import { AclController } from './acl.controller.js';
import { AclService } from './acl.service.js';
import { DeptController } from './dept.controller.js';
import { DeptService } from './dept.service.js';
import { PermissionCacheService } from './permission-cache.service.js';
import { PermissionSeedService } from './permission-seed.service.js';
import { RoleController } from './role.controller.js';
import { RoleService } from './role.service.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

/** system 系统权限模块（P1 权限底座，docs/01 §6.1） */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SysUser,
      SysDept,
      SysRole,
      SysUserRole,
      SysPermission,
      SysRolePermission,
      SysAcl,
    ]),
  ],
  controllers: [UserController, DeptController, RoleController, AclController],
  providers: [
    UserService,
    DeptService,
    RoleService,
    AclService,
    PermissionCacheService,
    PermissionSeedService,
  ],
  exports: [PermissionCacheService],
})
export class SystemModule {}
