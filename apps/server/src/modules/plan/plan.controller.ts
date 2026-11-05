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
import { PlanService } from './plan.service.js';
import { ZtPlan } from './entities/zt-plan.entity.js';
import {
  CreatePlanDto,
  LinkPlanStoriesDto,
  UpdatePlanDto,
} from './dto/plan.dto.js';

@ApiTags('plan')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: '未登录(2001)',
  schema: { example: ERRORS.unauthorized },
})
@ApiResponse({
  status: 403,
  description: '无功能权限(2003)',
  schema: { example: ERRORS.forbidden },
})
@Controller()
export class PlanController {
  constructor(private readonly plans: PlanService) {}

  @Get('plans')
  @Permissions(PERMS.plan.browse, '计划列表')
  @ApiOperation({ summary: '计划列表（?productId=）' })
  @ApiOkResponse({ description: '计划列表', schema: envelopedPage(ZtPlan) })
  list(@Query('productId') productId?: string) {
    return this.plans.list(productId);
  }

  @Get('plans/:id')
  @Permissions(PERMS.plan.view, '计划详情')
  @ApiOperation({ summary: '计划详情（含已关联需求）' })
  @ApiOkResponse({ description: '计划详情', schema: enveloped(ZtPlan) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.plans.get(id);
  }

  @Post('plans')
  @Permissions(PERMS.plan.create, '创建计划')
  @ApiOperation({
    summary: '创建计划',
    description: 'isFuture=1 时 begin/end 存 2038-01-01 约定（docs/02 §5.1）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtPlan) })
  create(@Body() dto: CreatePlanDto, @CurrentUser() user: JwtUser) {
    return this.plans.create(dto, user.id);
  }

  @Put('plans/:id')
  @Permissions(PERMS.plan.edit, '编辑计划')
  @ApiOperation({ summary: '编辑计划（标题/延期/描述）' })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtPlan) })
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }

  @Delete('plans/:id')
  @Permissions(PERMS.plan.delete, '删除计划')
  @ApiOperation({ summary: '删除计划（软删；仍关联需求拒绝 3007）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 400,
    description: '仍关联需求(3007)',
    schema: { example: ERRORS.badRequest },
  })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.plans.remove(id);
  }

  @Post('plans/:id/start')
  @Permissions(PERMS.plan.start, '计划开始')
  @ApiOperation({ summary: '计划开始（wait → doing）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtPlan) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  start(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.plans.changeStatus(user.id, id, 'start');
  }

  @Post('plans/:id/finish')
  @Permissions(PERMS.plan.finish, '计划完成')
  @ApiOperation({ summary: '计划完成（doing → done）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtPlan) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  finish(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.plans.changeStatus(user.id, id, 'finish');
  }

  @Post('plans/:id/close')
  @Permissions(PERMS.plan.close, '计划关闭')
  @ApiOperation({ summary: '计划关闭（wait/doing/done → closed）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtPlan) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  close(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.plans.changeStatus(user.id, id, 'close');
  }

  @Post('plans/:id/activate')
  @Permissions(PERMS.plan.activate, '计划激活')
  @ApiOperation({ summary: '计划激活（done/closed → doing）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtPlan) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.plans.changeStatus(user.id, id, 'activate');
  }

  @Post('plans/:id/stories')
  @Permissions(PERMS.plan.linkStory, '计划关联需求')
  @ApiOperation({
    summary: '关联需求',
    description: '追加式；触发需求 stage=planned（docs/02 §5.1）。',
  })
  @ApiOkResponse({
    description: '新关联数',
    schema: envelopedInline({ type: 'integer', example: 2 }),
  })
  linkStories(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: LinkPlanStoriesDto,
  ) {
    return this.plans.linkStories(id, dto);
  }

  @Delete('plans/:id/stories/:storyId')
  @Permissions(PERMS.plan.unlinkStory, '计划解除关联需求')
  @ApiOperation({ summary: '解除需求关联（触发 stage 回退）' })
  @ApiOkResponse({
    description: '解除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  unlinkStory(
    @Param('id', ParseIntPipe) id: string,
    @Param('storyId', ParseIntPipe) storyId: string,
  ) {
    return this.plans.unlinkStory(id, storyId);
  }
}
