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
import { BugService } from './bug.service.js';
import { ZtBug } from './entities/zt-bug.entity.js';
import {
  ActivateBugDto,
  ConvertBugToStoryDto,
  CreateBugDto,
  ResolveBugDto,
  BugQueryDto,
} from './dto/bug.dto.js';

const TR_ERR = {
  status: 400,
  description:
    '非法流转(3006)/解决方案字段冲突(4801)/不可解决(4802)/缺发现构建(4803)',
  schema: { example: ERRORS.invalidTransition },
} as const;

@ApiTags('bug')
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
export class BugController {
  constructor(private readonly bugs: BugService) {}

  @Get('bugs')
  @Permissions(PERMS.bug.browse, 'Bug列表')
  @ApiOperation({ summary: 'Bug 列表（productId/status/storyId/assignedTo）' })
  @ApiOkResponse({ description: 'Bug 列表', schema: envelopedPage(ZtBug) })
  list(@Query() query: BugQueryDto) {
    return this.bugs.list(query);
  }

  @Get('bugs/:id')
  @Permissions(PERMS.bug.view, 'Bug详情')
  @ApiOperation({ summary: 'Bug 详情' })
  @ApiOkResponse({ description: 'Bug 详情', schema: enveloped(ZtBug) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.bugs.get(id);
  }

  @Post('bugs')
  @Permissions(PERMS.bug.create, '创建Bug')
  @ApiOperation({
    summary: '创建 Bug',
    description:
      '初始 active；可携带 case/result/testtask 溯源字段（fail 转 Bug，docs/02 §7.3）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtBug) })
  create(@Body() dto: CreateBugDto, @CurrentUser() user: JwtUser) {
    return this.bugs.create(dto, user.id);
  }

  @Post('bugs/:id/confirm')
  @Permissions(PERMS.bug.confirm, '确认Bug')
  @ApiOperation({
    summary: '确认 Bug',
    description:
      '仅 active 且未确认；仅置 confirmed=1 不改状态（docs/02 §7.1）。',
  })
  @ApiOkResponse({ description: '确认成功', schema: enveloped(ZtBug) })
  @ApiResponse(TR_ERR)
  confirm(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.bugs.confirm(user.id, id);
  }

  @Post('bugs/:id/resolve')
  @Permissions(PERMS.bug.resolve, '解决Bug')
  @ApiOperation({
    summary: '解决 Bug',
    description:
      'active → resolved；fixed 必填解决构建（4801）、duplicate 必填重复 ID；指派默认回开单人。',
  })
  @ApiOkResponse({ description: '解决成功', schema: enveloped(ZtBug) })
  @ApiResponse(TR_ERR)
  resolve(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ResolveBugDto,
  ) {
    return this.bugs.resolve(user.id, id, dto);
  }

  @Post('bugs/:id/activate')
  @Permissions(PERMS.bug.activate, '激活Bug')
  @ApiOperation({
    summary: '激活 Bug（重开）',
    description:
      'resolved/closed → active；activatedCount+1；指派默认=原解决人；清解决字段。',
  })
  @ApiOkResponse({ description: '激活成功', schema: enveloped(ZtBug) })
  @ApiResponse(TR_ERR)
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ActivateBugDto,
  ) {
    return this.bugs.activate(user.id, id, dto);
  }

  @Post('bugs/:id/close')
  @Permissions(PERMS.bug.close, '关闭Bug')
  @ApiOperation({ summary: '关闭 Bug（仅 resolved 可关）' })
  @ApiOkResponse({ description: '关闭成功', schema: enveloped(ZtBug) })
  @ApiResponse(TR_ERR)
  close(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.bugs.close(user.id, id);
  }

  @Put('bugs/:id/assign')
  @Permissions(PERMS.bug.assign, 'Bug指派')
  @ApiOperation({ summary: '指派 Bug' })
  @ApiOkResponse({ description: '指派成功', schema: enveloped(ZtBug) })
  assign(
    @Param('id', ParseIntPipe) id: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    return this.bugs.assign(id, assignedTo);
  }

  @Post('bugs/:id/convert-to-story')
  @Permissions(PERMS.bug.create, 'Bug转需求')
  @ApiOperation({
    summary: 'Bug 转需求',
    description:
      '独立动作（非 resolve 分支，docs/02 §4.5）：创建需求 → Bug 置 closed/resolution=tostory + toStoryId 回写。',
  })
  @ApiOkResponse({ description: '返回新建需求', schema: enveloped(ZtBug) })
  @ApiResponse(TR_ERR)
  convertToStory(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ConvertBugToStoryDto,
  ) {
    return this.bugs.convertToStory(user.id, id, dto);
  }

  @Delete('bugs/:id')
  @Permissions(PERMS.bug.delete, '删除Bug')
  @ApiOperation({ summary: '删除 Bug（软删）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  async remove(@Param('id', ParseIntPipe) id: string) {
    await this.bugs.removeWithGuard(id);
    return null;
  }
}
