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
import { ProjectService } from './project.service.js';
import { ZtProject } from './entities/zt-project.entity.js';
import { ZtProjectProduct } from './entities/zt-project-product.entity.js';
import {
  CloseProjectDto,
  CreateProjectDto,
  SetProjectProductsDto,
  UpdateProjectDto,
} from './dto/project.dto.js';

@ApiTags('project')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: '未登录(2001)',
  schema: { example: ERRORS.unauthorized },
})
@ApiResponse({
  status: 403,
  description: '无功能权限(2003) 或 无数据权限(2004)',
  schema: { example: ERRORS.forbidden },
})
@Controller()
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  @Get('projects')
  @Permissions(PERMS.project.browse, '项目列表')
  @ApiOperation({
    summary: '项目列表',
    description: '按 DataScope 可见集过滤；?programId= 按项目集筛选。',
  })
  @ApiOkResponse({ description: '项目列表', schema: envelopedPage(ZtProject) })
  list(@CurrentUser() user: JwtUser, @Query('programId') programId?: string) {
    return this.projects.list(user.id, programId);
  }

  @Get('projects/:id')
  @Permissions(PERMS.project.view, '项目详情')
  @ApiOperation({ summary: '项目详情（private 白名单外 2004）' })
  @ApiOkResponse({ description: '项目详情', schema: enveloped(ZtProject) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.projects.get(user.id, id);
  }

  @Post('projects')
  @Permissions(PERMS.project.create, '创建项目')
  @ApiOperation({
    summary: '创建项目',
    description:
      'code 唯一（3004）；multiple=0 自动创建影子迭代（type 由 model 映射：scrum→sprint/waterfall→stage/kanban→kanban）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtProject) })
  @ApiResponse({
    status: 400,
    description: '参数校验失败(3001)/编码重复(3004)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 404,
    description: '项目集不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: JwtUser) {
    return this.projects.create(dto, user.id);
  }

  @Put('projects/:id')
  @Permissions(PERMS.project.edit, '编辑项目')
  @ApiOperation({ summary: '编辑项目（名称/PM/延期/描述）' })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtProject) })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(user.id, id, dto);
  }

  @Delete('projects/:id')
  @Permissions(PERMS.project.delete, '删除项目')
  @ApiOperation({ summary: '删除项目（软删；有执行拒绝 3007）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 400,
    description: '有执行(3007)',
    schema: { example: ERRORS.badRequest },
  })
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.projects.remove(user.id, id);
  }

  @Put('projects/:id/products')
  @Permissions(PERMS.project.manageProducts, '项目关联产品')
  @ApiOperation({
    summary: '全量替换项目-产品关联',
    description: '产品必须存在（3005）；项目圈选产品需求的入口。',
  })
  @ApiOkResponse({
    description: '关联成功（返回关联列表）',
    schema: envelopedPage(ZtProjectProduct),
  })
  @ApiResponse({
    status: 404,
    description: '产品不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  setProducts(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: SetProjectProductsDto,
  ) {
    return this.projects.setProducts(user.id, id, dto);
  }

  @Get('projects/:id/products')
  @Permissions(PERMS.project.view, '项目产品列表')
  @ApiOperation({ summary: '项目已关联产品（含产品名）' })
  @ApiOkResponse({
    description: '关联列表',
    schema: envelopedPage(ZtProjectProduct),
  })
  getProducts(@Param('id', ParseIntPipe) id: string) {
    return this.projects.getProducts(id);
  }

  @Post('projects/:id/start')
  @Permissions(PERMS.project.start, '项目开始')
  @ApiOperation({
    summary: '开始项目',
    description:
      'wait/suspended → doing；向上传播所属项目集 wait→doing（syncPPE）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProject) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  start(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.projects.start(user.id, id);
  }

  @Post('projects/:id/suspend')
  @Permissions(PERMS.project.suspend, '项目挂起')
  @ApiOperation({ summary: '挂起项目（doing → suspended）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProject) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  suspend(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.projects.suspend(user.id, id);
  }

  @Post('projects/:id/close')
  @Permissions(PERMS.project.close, '关闭项目')
  @ApiOperation({
    summary: '关闭项目',
    description: '存在未关闭执行拒绝（4603）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProject) })
  @ApiResponse({
    status: 400,
    description: '级联不满足(4603)',
    schema: { example: ERRORS.invalidTransition },
  })
  close(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: CloseProjectDto,
  ) {
    return this.projects.close(user.id, id, dto);
  }

  @Post('projects/:id/activate')
  @Permissions(PERMS.project.activate, '激活项目')
  @ApiOperation({ summary: '激活项目（closed/suspended → doing/wait）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProject) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.projects.activate(user.id, id);
  }
}
