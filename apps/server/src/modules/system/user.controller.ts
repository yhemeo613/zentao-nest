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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { PERMS } from '@zentao/shared';
import { UserService } from './user.service.js';
import {
  AssignRolesDto,
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user.dto.js';

@ApiTags('system/users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get()
  @Permissions(PERMS.user.browse, '用户列表')
  @ApiOperation({ summary: '用户分页列表（keyword/deptId 筛选）' })
  list(@Query() query: UserQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  @Permissions(PERMS.user.view, '用户详情')
  @ApiOperation({ summary: '用户详情（含角色 IDs）' })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.users.get(id);
  }

  @Post()
  @Permissions(PERMS.user.create, '创建用户')
  @ApiOperation({ summary: '创建用户（账号唯一 5301）' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtUser) {
    return this.users.create(dto, user.id);
  }

  @Put(':id')
  @Permissions(PERMS.user.edit, '编辑用户')
  @ApiOperation({ summary: '编辑用户/重置密码' })
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.users.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions(PERMS.user.delete, '删除用户')
  @ApiOperation({ summary: '删除用户（软删）' })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.users.remove(id);
  }

  @Put(':id/roles')
  @Permissions(PERMS.user.edit, '分配角色')
  @ApiOperation({ summary: '分配角色（全量替换，project 维度）' })
  assignRoles(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.users.assignRoles(id, dto.roleIds, dto.projectId ?? 0);
  }
}
