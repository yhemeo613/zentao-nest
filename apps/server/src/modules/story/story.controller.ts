import {
  Body,
  Controller,
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
import { StoryService } from './story.service.js';
import { ZtStory } from './entities/zt-story.entity.js';
import {
  AssignStoryDto,
  ChangeStoryDto,
  CloseStoryDto,
  CreateStoryDto,
  ReviewStoryDto,
  StoryQueryDto,
  SubdivideStoryDto,
} from './dto/story.dto.js';

@ApiTags('story')
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
export class StoryController {
  constructor(private readonly stories: StoryService) {}

  @Get('stories')
  @Permissions(PERMS.story.browse, '需求列表')
  @ApiOperation({
    summary: '需求列表（productId/status/moduleId/keyword 筛选）',
  })
  @ApiOkResponse({ description: '需求列表', schema: envelopedPage(ZtStory) })
  list(@Query() query: StoryQueryDto) {
    return this.stories.list(query);
  }

  @Get('stories/:id')
  @Permissions(PERMS.story.view, '需求详情')
  @ApiOperation({
    summary: '需求详情（含当前版本 spec 与评审人行；?version= 查历史版本）',
  })
  @ApiOkResponse({ description: '需求详情', schema: enveloped(ZtStory) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(
    @Param('id', ParseIntPipe) id: string,
    @Query('version') version?: string,
  ) {
    return this.stories.get(id, version ? Number(version) : undefined);
  }

  @Post('stories')
  @Permissions(PERMS.story.create, '创建需求')
  @ApiOperation({
    summary: '创建需求',
    description:
      'status=draft 存草稿；status=active 提请评审（needReview 默认开启 → 落为 reviewing，需 reviewerIds）；生成 spec v1。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtStory) })
  @ApiResponse({
    status: 400,
    description: '提审缺评审人(4201)',
    schema: { example: ERRORS.badRequest },
  })
  create(@Body() dto: CreateStoryDto, @CurrentUser() user: JwtUser) {
    return this.stories.create(dto, user.id);
  }

  @Post('stories/:id/review')
  @Permissions(PERMS.story.review, '评审需求')
  @ApiOperation({
    summary: '评审需求',
    description:
      '仅 reviewing 可评且须为该版本登记评审人；v1 无 revert / v>1 无 reject（4202）；全员评完按 allpass 裁决出四落点。',
  })
  @ApiOkResponse({
    description: '评审处理成功（未全员评完时返回当前需求）',
    schema: enveloped(ZtStory),
  })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)/版本裁剪(4202)/重复评审(4901)',
    schema: { example: ERRORS.invalidTransition },
  })
  review(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ReviewStoryDto,
  ) {
    return this.stories.review(user.id, id, dto);
  }

  @Post('stories/:id/change')
  @Permissions(PERMS.story.change, '变更需求')
  @ApiOperation({
    summary: '变更需求',
    description:
      'title/spec/verify/优先级/预估任一变化 → version+1 + 新版 spec；submitReview=true → reviewing（需 reviewerIds），false → changing。',
  })
  @ApiOkResponse({
    description: '变更成功（无变化时原样返回）',
    schema: enveloped(ZtStory),
  })
  change(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ChangeStoryDto,
  ) {
    return this.stories.change(user.id, id, dto);
  }

  @Post('stories/:id/recall-change')
  @Permissions(PERMS.story.recallChange, '撤回变更')
  @ApiOperation({
    summary: '撤回变更（version-1 → active；删当前版 spec/review）',
  })
  @ApiOkResponse({ description: '撤回成功', schema: enveloped(ZtStory) })
  @ApiResponse({
    status: 400,
    description: 'v1 无可撤回(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  recallChange(@Param('id', ParseIntPipe) id: string) {
    return this.stories.recallChange(id);
  }

  @Post('stories/:id/recall-review')
  @Permissions(PERMS.story.recallReview, '撤回评审')
  @ApiOperation({ summary: '撤回评审（reviewing → draft(v1)/changing(v>1)）' })
  @ApiOkResponse({ description: '撤回成功', schema: enveloped(ZtStory) })
  @ApiResponse({
    status: 400,
    description: '非 reviewing(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  recallReview(@Param('id', ParseIntPipe) id: string) {
    return this.stories.recallReview(id);
  }

  @Post('stories/:id/close')
  @Permissions(PERMS.story.close, '关闭需求')
  @ApiOperation({
    summary: '关闭需求',
    description:
      '非 closed 可关；duplicate 必填重复需求 ID；有未关闭子需求默认拒绝（4203，force=true 放行）。',
  })
  @ApiOkResponse({ description: '关闭成功', schema: enveloped(ZtStory) })
  @ApiResponse({
    status: 400,
    description: '有未关子需求(4203)/缺字段(3003)',
    schema: { example: ERRORS.badRequest },
  })
  close(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: CloseStoryDto,
  ) {
    return this.stories.close(user.id, id, dto);
  }

  @Post('stories/:id/activate')
  @Permissions(PERMS.story.activate, '激活需求')
  @ApiOperation({
    summary:
      '激活需求（closed → active；按关闭前状态恢复随 P5 action 档案完善）',
  })
  @ApiOkResponse({ description: '激活成功', schema: enveloped(ZtStory) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.stories.activate(user.id, id);
  }

  @Put('stories/:id/assign')
  @Permissions(PERMS.story.assign, '需求指派')
  @ApiOperation({ summary: '指派需求负责人' })
  @ApiOkResponse({ description: '指派成功', schema: enveloped(ZtStory) })
  assign(@Param('id', ParseIntPipe) id: string, @Body() dto: AssignStoryDto) {
    return this.stories.assign(id, dto);
  }

  @Post('stories/:id/subdivide')
  @Permissions(PERMS.story.subdivide, '拆分需求')
  @ApiOperation({
    summary: '拆分需求',
    description:
      '子需求继承产品/分支；父 isParent=1、estimate=Σ子（docs/02 §4.5）。',
  })
  @ApiOkResponse({
    description: '返回子需求列表',
    schema: envelopedPage(ZtStory),
  })
  @ApiResponse({
    status: 400,
    description: '不可拆分(4204)',
    schema: { example: ERRORS.badRequest },
  })
  subdivide(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: SubdivideStoryDto,
  ) {
    return this.stories.subdivide(user.id, id, dto);
  }
}
