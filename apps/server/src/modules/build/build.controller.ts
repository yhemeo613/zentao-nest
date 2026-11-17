import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
import { BuildService } from './build.service.js';
import { ZtBuild } from './entities/zt-build.entity.js';
import {
  CreateBuildDto,
  LinkBuildBugsDto,
  LinkBuildStoriesDto,
} from './dto/build.dto.js';

@ApiTags('build')
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
export class BuildController {
  constructor(private readonly builds: BuildService) {}

  @Get('builds')
  @Permissions(PERMS.build.view, '构建列表')
  @ApiOperation({ summary: '构建列表（?productId=）' })
  @ApiOkResponse({ description: '构建列表', schema: envelopedPage(ZtBuild) })
  list(@Query('productId') productId?: string) {
    return this.builds.list(productId);
  }

  @Get('builds/:id')
  @Permissions(PERMS.build.view, '构建详情')
  @ApiOperation({ summary: '构建详情（含关联需求/Bug 对象）' })
  @ApiOkResponse({ description: '构建详情', schema: enveloped(ZtBuild) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.builds.get(id);
  }

  @Post('builds')
  @Permissions(PERMS.build.create, '创建构建')
  @ApiOperation({
    summary: '创建构建',
    description:
      '同产品同分支名称唯一（4401，docs/02 §5.2）；无状态机——构建是快照；可选初始关联需求。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtBuild) })
  @ApiResponse({
    status: 400,
    description: '构建名重复(4401)',
    schema: { example: ERRORS.badRequest },
  })
  create(@Body() dto: CreateBuildDto, @CurrentUser() user: JwtUser) {
    return this.builds.create(dto, user.id);
  }

  @Post('builds/:id/stories')
  @Permissions(PERMS.build.linkStory, '构建关联需求')
  @ApiOperation({
    summary: '关联需求',
    description: '追加式；关联表 + 逗号串双写（docs/02 §5.2）。',
  })
  @ApiOkResponse({
    description: '新关联数',
    schema: envelopedInline({ type: 'integer', example: 2 }),
  })
  linkStories(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: LinkBuildStoriesDto,
  ) {
    return this.builds.linkStories(id, dto);
  }

  @Delete('builds/:id/stories/:storyId')
  @Permissions(PERMS.build.unlinkStory, '构建解除关联需求')
  @ApiOperation({ summary: '解除需求关联' })
  @ApiOkResponse({
    description: '解除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  unlinkStory(
    @Param('id', ParseIntPipe) id: string,
    @Param('storyId', ParseIntPipe) storyId: string,
  ) {
    return this.builds.unlinkStory(id, storyId);
  }

  @Post('builds/:id/bugs')
  @Permissions(PERMS.build.linkBug, '构建关联 Bug')
  @ApiOperation({
    summary: '关联 Bug',
    description:
      '未解决 Bug 自动置 resolved/fixed、解决构建=本构建、指派回开单人（docs/02 §5.2）。',
  })
  @ApiOkResponse({
    description: '新关联数',
    schema: envelopedInline({ type: 'integer', example: 1 }),
  })
  linkBugs(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: LinkBuildBugsDto,
  ) {
    return this.builds.linkBugs(user.id, id, dto);
  }

  @Delete('builds/:id/bugs/:bugId')
  @Permissions(PERMS.build.unlinkBug, '构建解除关联 Bug')
  @ApiOperation({ summary: '解除 Bug 关联（不回滚已解决状态）' })
  @ApiOkResponse({
    description: '解除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  unlinkBug(
    @Param('id', ParseIntPipe) id: string,
    @Param('bugId', ParseIntPipe) bugId: string,
  ) {
    return this.builds.unlinkBug(id, bugId);
  }
}
