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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PERMS } from '@zentao/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import {
  ERRORS,
  enveloped,
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { RoleService } from './role.service.js';
import { SysRole } from './entities/sys-role.entity.js';
import {
  CreateRoleDto,
  SetRolePermissionsDto,
  UpdateRoleDto,
} from './dto/role.dto.js';

@ApiTags('system/roles')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: '未登录(2001)/凭证无效(2002)',
  schema: { example: ERRORS.unauthorized },
})
@ApiResponse({
  status: 403,
  description: '无功能权限(2003)',
  schema: { example: ERRORS.forbidden },
})
@Controller()
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  @Get('roles')
  @Permissions(PERMS.group.browse, '角色列表')
  @ApiOperation({
    summary: '角色列表',
    description: '全量角色（含 is_super 标记），软删不含。',
  })
  @ApiOkResponse({ description: '角色列表', schema: envelopedPage(SysRole) })
  list() {
    return this.roles.list();
  }

  @Post('roles')
  @Permissions(PERMS.group.create, '创建角色')
  @ApiOperation({
    summary: '创建角色',
    description: 'code 唯一（重复 5302）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(SysRole) })
  @ApiResponse({
    status: 400,
    description: '参数校验失败(3001)/编码重复(5302)',
    schema: { example: ERRORS.badRequest },
  })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: JwtUser) {
    return this.roles.create(dto, user.id);
  }

  @Put('roles/:id')
  @Permissions(PERMS.group.edit, '编辑角色')
  @ApiOperation({
    summary: '编辑角色',
    description: '仅名称与备注；code 不可变更。',
  })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(SysRole) })
  @ApiResponse({
    status: 404,
    description: '角色不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Delete('roles/:id')
  @Permissions(PERMS.group.delete, '删除角色')
  @ApiOperation({
    summary: '删除角色',
    description: '软删；超级管理员角色禁删；有成员禁删（5303）。',
  })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 400,
    description: '超管禁删/有成员(5303)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.roles.remove(id);
  }

  @Get('permissions')
  @Permissions(PERMS.group.browse, '权限点树')
  @ApiOperation({
    summary: '权限点树',
    description:
      '按 module 分组的 action 列表（含 status: active|deprecated），前端授权勾选树数据源。',
  })
  @ApiOkResponse({
    description: '权限点树',
    schema: envelopedInline({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          module: { type: 'string', example: 'user' },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', example: 'user.browse' },
                name: { type: 'string', example: '用户列表' },
                status: { type: 'string', example: 'active' },
              },
            },
          },
        },
      },
    }),
  })
  permissionTree() {
    return this.roles.permissionTree();
  }

  @Get('roles/:id/permissions')
  @Permissions(PERMS.group.browse, '角色权限点')
  @ApiOperation({
    summary: '角色当前权限点',
    description: '该角色被授予的全部 module.action 数组。',
  })
  @ApiOkResponse({
    description: '权限点数组',
    schema: envelopedInline({
      type: 'array',
      items: { type: 'string', example: 'user.browse' },
    }),
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  getPermissions(@Param('id', ParseIntPipe) id: string) {
    return this.roles.getPermissions(id);
  }

  @Put('roles/:id/permissions')
  @Permissions(PERMS.group.updatePriv, '角色授权')
  @ApiOperation({
    summary: '全量替换角色权限',
    description:
      '删后重插（对齐禅道 updatePrivByGroup）；授权变更触发该角色全部用户权限缓存失效（即时生效）；超管角色不可显式授权。',
  })
  @ApiOkResponse({
    description: '授权成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 400,
    description: '超管角色禁授权(3007)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  setPermissions(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.roles.setPermissions(id, dto);
  }
}
