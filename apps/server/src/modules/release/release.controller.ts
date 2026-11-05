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
import { ReleaseService } from './release.service.js';
import { ZtRelease } from './entities/zt-release.entity.js';
import {
  ChangeReleaseStatusDto,
  CreateReleaseDto,
} from '../build/dto/build.dto.js';

@ApiTags('release')
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
export class ReleaseController {
  constructor(private readonly releases: ReleaseService) {}

  @Get('releases')
  @Permissions(PERMS.release.browse, '发布列表')
  @ApiOperation({ summary: '发布列表（?productId=）' })
  @ApiOkResponse({ description: '发布列表', schema: envelopedPage(ZtRelease) })
  list(@Query('productId') productId?: string) {
    return this.releases.list(productId);
  }

  @Get('releases/:id')
  @Permissions(PERMS.release.view, '发布详情')
  @ApiOperation({ summary: '发布详情（含关联对象）' })
  @ApiOkResponse({ description: '发布详情', schema: enveloped(ZtRelease) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.releases.get(id);
  }

  @Post('releases')
  @Permissions(PERMS.release.create, '创建发布')
  @ApiOperation({
    summary: '创建发布',
    description:
      '按关联构建汇总范围需求/修复 Bug/遗留 Bug（docs/02 §5.3）；初始 wait。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtRelease) })
  @ApiResponse({
    status: 404,
    description: '构建不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  create(@Body() dto: CreateReleaseDto, @CurrentUser() user: JwtUser) {
    return this.releases.create(dto, user.id);
  }

  @Post('releases/:id/publish')
  @Permissions(PERMS.release.publish, '发布')
  @ApiOperation({
    summary: '发布',
    description:
      'wait/fail → normal；触发范围需求 stage=released（docs/02 §5.3 setStoriesStage）。',
  })
  @ApiOkResponse({ description: '发布成功', schema: enveloped(ZtRelease) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  publish(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.releases.publish(user.id, id);
  }

  @Post('releases/:id/change-status')
  @Permissions(PERMS.release.changeStatus, '发布状态维护')
  @ApiOperation({
    summary: '停止维护/重新激活',
    description: 'normal↔terminate（docs/02 §5.3）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtRelease) })
  @ApiResponse({
    status: 400,
    description: '操作非法(4402)',
    schema: { example: ERRORS.invalidTransition },
  })
  changeStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ChangeReleaseStatusDto,
  ) {
    return this.releases.changeStatus(user.id, id, dto.action);
  }

  @Delete('releases/:id')
  @Permissions(PERMS.release.delete, '删除发布')
  @ApiOperation({ summary: '删除发布（软删；已发布须先停止维护 3007）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.releases.remove(id);
  }
}
