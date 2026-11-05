import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMS } from '@zentao/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { RoleService } from './role.service.js';
import {
  CreateRoleDto,
  SetRolePermissionsDto,
  UpdateRoleDto,
} from './dto/role.dto.js';

@ApiTags('system/roles')
@ApiBearerAuth()
@Controller()
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  @Get('roles')
  @Permissions(PERMS.group.browse, '角色列表')
  @ApiOperation({ summary: '角色列表' })
  list() {
    return this.roles.list();
  }

  @Post('roles')
  @Permissions(PERMS.group.create, '创建角色')
  @ApiOperation({ summary: '创建角色（code 唯一 5302）' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: JwtUser) {
    return this.roles.create(dto, user.id);
  }

  @Put('roles/:id')
  @Permissions(PERMS.group.edit, '编辑角色')
  @ApiOperation({ summary: '编辑角色' })
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Delete('roles/:id')
  @Permissions(PERMS.group.delete, '删除角色')
  @ApiOperation({ summary: '删除角色（有成员 5303）' })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.roles.remove(id);
  }

  @Get('permissions')
  @Permissions(PERMS.group.browse, '权限点树')
  @ApiOperation({ summary: '权限点树（module→action 分组）' })
  permissionTree() {
    return this.roles.permissionTree();
  }

  @Get('roles/:id/permissions')
  @Permissions(PERMS.group.browse, '角色权限点')
  @ApiOperation({ summary: '角色当前权限点' })
  getPermissions(@Param('id', ParseIntPipe) id: string) {
    return this.roles.getPermissions(id);
  }

  @Put('roles/:id/permissions')
  @Permissions(PERMS.group.updatePriv, '角色授权')
  @ApiOperation({ summary: '全量替换角色权限（授权变更触发缓存失效）' })
  setPermissions(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.roles.setPermissions(id, dto);
  }
}
