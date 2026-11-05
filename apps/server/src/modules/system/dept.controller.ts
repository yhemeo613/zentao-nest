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
  ApiProperty,
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
import { DeptService } from './dept.service.js';
import { SysDept } from './entities/sys-dept.entity.js';
import { CreateDeptDto, UpdateDeptDto } from './dto/dept.dto.js';

export class DeptNodeSchema {
  @ApiProperty({ description: '部门 ID', example: '1' })
  id: string;
  @ApiProperty({ description: '父部门 ID（0=根）', example: 0 })
  parentId: number;
  @ApiProperty({ description: '物化路径（,1,5, 语义）', example: ',1,' })
  pathStr: string;
  @ApiProperty({ description: '层级深度（根=1）', example: 1 })
  grade: number;
  @ApiProperty({ description: '部门名称', example: '研发部' })
  name: string;
  @ApiProperty({ description: '负责人（账号）', example: 'admin' })
  manager: string;
  @ApiProperty({ description: '同级排序号', example: 10 })
  sortNo: number;
  @ApiProperty({ description: '子部门（递归）', type: [Object] })
  children: DeptNodeSchema[];
}

@ApiTags('system/depts')
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
@Controller('depts')
export class DeptController {
  constructor(private readonly depts: DeptService) {}

  @Get()
  @Permissions(PERMS.dept.browse, '部门树')
  @ApiOperation({
    summary: '部门树',
    description: '全量树（children 嵌套），按 sortNo,id 排序；软删不含。',
  })
  @ApiOkResponse({
    description: '部门树（DeptNode 含 children）',
    schema: envelopedPage(DeptNodeSchema),
  })
  tree() {
    return this.depts.tree();
  }

  @Post()
  @Permissions(PERMS.dept.manage, '创建部门')
  @ApiOperation({
    summary: '创建部门',
    description: '自动计算 grade（父+1）与 path 物化路径（,1,5, 语义）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(SysDept) })
  @ApiResponse({
    status: 400,
    description: '参数校验失败(3001)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 404,
    description: '父部门不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  create(@Body() dto: CreateDeptDto, @CurrentUser() user: JwtUser) {
    return this.depts.create(dto, user.id);
  }

  @Put(':id')
  @Permissions(PERMS.dept.manage, '编辑部门')
  @ApiOperation({
    summary: '编辑部门',
    description: '仅更新提交字段（名称/负责人/排序）；层级关系不变更。',
  })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(SysDept) })
  @ApiResponse({
    status: 404,
    description: '部门不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateDeptDto) {
    return this.depts.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMS.dept.manage, '删除部门')
  @ApiOperation({
    summary: '删除部门',
    description: '软删；存在子部门或挂有用户时拒绝（3007）。',
  })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 400,
    description: '有子部门/用户(3007)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 404,
    description: '部门不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.depts.remove(id);
  }
}
