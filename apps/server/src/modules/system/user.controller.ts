import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
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
import { UserService } from './user.service.js';
import {
  AssignRolesDto,
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user.dto.js';
import { SysUser } from './entities/sys-user.entity.js';

@ApiTags('system/users')
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
@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get()
  @Permissions(PERMS.user.browse, '用户列表')
  @ApiOperation({
    summary: '用户分页列表',
    description:
      'keyword 模糊匹配 账号/姓名/昵称；deptId 精确筛选；软删用户不返回。',
  })
  @ApiOkResponse({
    description: '分页用户列表（脱敏，无 password）',
    schema: envelopedPage(SysUser),
  })
  list(@Query() query: UserQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  @Permissions(PERMS.user.view, '用户详情')
  @ApiOperation({
    summary: '用户详情',
    description: '含 roleIds（全局授权角色）。',
  })
  @ApiOkResponse({
    description: '用户详情（含 roleIds，脱敏）',
    schema: enveloped(SysUser),
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.users.get(id);
  }

  @Post()
  @Permissions(PERMS.user.create, '创建用户')
  @ApiOperation({
    summary: '创建用户',
    description:
      '账号唯一（重复 5301）；密码 bcrypt(12) 哈希；roleIds 非空时同时写全局授权。',
  })
  @ApiOkResponse({
    description: '创建成功（脱敏）',
    schema: enveloped(SysUser),
  })
  @ApiResponse({
    status: 400,
    description: '参数校验失败(3001)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 400,
    description: '账号已存在(5301)',
    schema: { example: ERRORS.badRequest },
  })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtUser) {
    return this.users.create(dto, user.id);
  }

  @Put(':id')
  @Permissions(PERMS.user.edit, '编辑用户')
  @ApiOperation({
    summary: '编辑用户',
    description:
      '仅更新提交字段；password 提供时重置密码（bcrypt 重哈希）并失效该用户权限缓存。',
  })
  @ApiOkResponse({
    description: '更新成功（脱敏）',
    schema: enveloped(SysUser),
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.users.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions(PERMS.user.delete, '删除用户')
  @ApiOperation({
    summary: '删除用户',
    description: '软删（deleted=1），账号保留防重名。',
  })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.users.remove(id);
  }

  @Put(':id/roles')
  @Permissions(PERMS.user.edit, '分配角色')
  @ApiOperation({
    summary: '分配角色',
    description:
      '全量替换该用户在该 project 维度的角色，并失效其权限缓存（即时生效）。',
  })
  @ApiOkResponse({
    description: '分配成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  assignRoles(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.users.assignRoles(id, dto.roleIds, dto.projectId ?? 0);
  }
}
