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
import { DeptService } from './dept.service.js';
import { CreateDeptDto, UpdateDeptDto } from './dto/dept.dto.js';

@ApiTags('system/depts')
@ApiBearerAuth()
@Controller('depts')
export class DeptController {
  constructor(private readonly depts: DeptService) {}

  @Get()
  @Permissions(PERMS.dept.browse, '部门树')
  @ApiOperation({ summary: '部门树' })
  tree() {
    return this.depts.tree();
  }

  @Post()
  @Permissions(PERMS.dept.manage, '创建部门')
  @ApiOperation({ summary: '创建部门（自动 grade/path）' })
  create(@Body() dto: CreateDeptDto, @CurrentUser() user: JwtUser) {
    return this.depts.create(dto, user.id);
  }

  @Put(':id')
  @Permissions(PERMS.dept.manage, '编辑部门')
  @ApiOperation({ summary: '编辑部门' })
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateDeptDto) {
    return this.depts.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMS.dept.manage, '删除部门')
  @ApiOperation({ summary: '删除部门（有子部门/用户禁删）' })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.depts.remove(id);
  }
}
