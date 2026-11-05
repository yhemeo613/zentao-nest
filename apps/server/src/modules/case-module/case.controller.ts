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
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { CaseService } from './case.service.js';
import { ZtCase } from './entities/zt-case.entity.js';
import {
  CreateCaseDto,
  ReviewCaseDto,
  RunCaseDto,
  UpdateCaseDto,
} from './dto/case.dto.js';

@ApiTags('case')
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
export class CaseController {
  constructor(private readonly cases: CaseService) {}

  @Get('cases')
  @Permissions(PERMS.case.browse, '用例列表')
  @ApiOperation({ summary: '用例列表（productId/storyId/status）' })
  @ApiOkResponse({ description: '用例列表', schema: envelopedPage(ZtCase) })
  list(
    @Query('productId') productId?: string,
    @Query('storyId') storyId?: string,
    @Query('status') status?: string,
  ) {
    return this.cases.list({ productId, storyId, status });
  }

  @Get('cases/:id')
  @Permissions(PERMS.case.view, '用例详情')
  @ApiOperation({
    summary: '用例详情（含步骤与 storyChanged 标记；?version= 查历史版本）',
  })
  @ApiOkResponse({ description: '用例详情', schema: enveloped(ZtCase) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(
    @Param('id', ParseIntPipe) id: string,
    @Query('version') version?: string,
  ) {
    return this.cases.get(id, version ? Number(version) : undefined);
  }

  @Post('cases')
  @Permissions(PERMS.case.create, '创建用例')
  @ApiOperation({
    summary: '创建用例',
    description:
      '默认免评审直接 normal（docs/02 §7.2 needReview=0）；关联需求锁定 storyVersion。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtCase) })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: JwtUser) {
    return this.cases.create(dto, user.id);
  }

  @Put('cases/:id')
  @Permissions(PERMS.case.edit, '编辑用例')
  @ApiOperation({
    summary: '编辑用例',
    description:
      'title/precondition/steps 任一变化 → version+1 整套重插（docs/02 §7.2）。',
  })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtCase) })
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateCaseDto) {
    return this.cases.update(id, dto);
  }

  @Post('cases/:id/review')
  @Permissions(PERMS.case.review, '评审用例')
  @ApiOperation({
    summary: '评审用例',
    description:
      '仅 wait 可评；pass→normal / clarify 留 wait（4901 已评审拦截）。',
  })
  @ApiOkResponse({ description: '评审成功', schema: enveloped(ZtCase) })
  @ApiResponse({
    status: 400,
    description: '已评审(4901)',
    schema: { example: ERRORS.badRequest },
  })
  review(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ReviewCaseDto,
  ) {
    return this.cases.review(user.id, id, dto);
  }

  @Post('cases/:id/confirm-story-change')
  @Permissions(PERMS.case.confirmStoryChange, '确认需求变更')
  @ApiOperation({
    summary: '确认需求变更',
    description:
      'storyVersion 同步至需求当前版本（人工确认机制，docs/02 §7.2）。',
  })
  @ApiOkResponse({ description: '确认成功', schema: enveloped(ZtCase) })
  confirmStoryChange(@Param('id', ParseIntPipe) id: string) {
    return this.cases.confirmStoryChange(id);
  }
}
