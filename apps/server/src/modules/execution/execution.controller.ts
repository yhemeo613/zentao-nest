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
import { ExecutionService } from './execution.service.js';
import { ZtExecution } from './entities/zt-execution.entity.js';
import {
  CloseExecutionDto,
  CreateExecutionDto,
  UpdateExecutionDto,
} from './dto/execution.dto.js';

@ApiTags('execution')
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
export class ExecutionController {
  constructor(private readonly executions: ExecutionService) {}

  @Get('executions')
  @Permissions(PERMS.execution.browse, '执行列表')
  @ApiOperation({
    summary: '执行列表',
    description: '?projectId= 必按项目筛选；DataScope 可见集过滤。',
  })
  @ApiOkResponse({
    description: '执行列表',
    schema: envelopedPage(ZtExecution),
  })
  list(@CurrentUser() user: JwtUser, @Query('projectId') projectId: string) {
    return this.executions.list(user.id, projectId);
  }

  @Get('executions/:id')
  @Permissions(PERMS.execution.view, '执行详情')
  @ApiOperation({ summary: '执行详情' })
  @ApiOkResponse({ description: '执行详情', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.executions.get(user.id, id);
  }

  @Post('executions')
  @Permissions(PERMS.execution.create, '创建执行')
  @ApiOperation({
    summary: '创建执行',
    description:
      'type 由项目 model 自动映射（scrum→sprint/waterfall→stage/kanban→kanban）；parentId 提供时创建瀑布子阶段（grade=父+1）；stage 占比同级合计≤100（4604）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 400,
    description: '占比超限(4604)/类型不匹配(4601)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 404,
    description: '项目不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  create(@Body() dto: CreateExecutionDto, @CurrentUser() user: JwtUser) {
    return this.executions.create(user.id, dto);
  }

  @Put('executions/:id')
  @Permissions(PERMS.execution.edit, '编辑执行')
  @ApiOperation({ summary: '编辑执行（名称/结束日期/冲刺目标/排序）' })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtExecution) })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateExecutionDto,
  ) {
    return this.executions.update(user.id, id, dto);
  }

  @Delete('executions/:id')
  @Permissions(PERMS.execution.delete, '删除执行')
  @ApiOperation({ summary: '删除执行（软删；有子阶段拒绝 3007）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.executions.remove(user.id, id);
  }

  @Post('executions/:id/start')
  @Permissions(PERMS.execution.start, '执行开始')
  @ApiOperation({
    summary: '开始执行',
    description:
      'wait/suspended → doing；向上传播 项目→项目集 wait→doing（syncPPE，docs/02 §3.5）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  start(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.executions.start(user.id, id);
  }

  @Post('executions/:id/putoff')
  @Permissions(PERMS.execution.putoff, '执行延期')
  @ApiOperation({ summary: '延期执行（顺延 end）' })
  @ApiOkResponse({ description: '延期成功', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 400,
    description: '已关闭(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  putoff(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body('end') end: string,
  ) {
    return this.executions.putoff(user.id, id, end);
  }

  @Post('executions/:id/suspend')
  @Permissions(PERMS.execution.suspend, '执行挂起')
  @ApiOperation({
    summary: '挂起执行',
    description: 'doing → suspended；子阶段须全部 suspended/closed（4603）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 400,
    description: '级联不满足(4603)',
    schema: { example: ERRORS.invalidTransition },
  })
  suspend(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.executions.suspend(user.id, id);
  }

  @Post('executions/:id/activate')
  @Permissions(PERMS.execution.activate, '执行激活')
  @ApiOperation({
    summary: '激活执行',
    description:
      'suspended/closed → doing（有 realBegan 或消耗）否则 wait（对齐禅道 958 行）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.executions.activate(user.id, id);
  }

  @Post('executions/:id/back-to-wait')
  @Permissions(PERMS.execution.edit, '执行回退 wait')
  @ApiOperation({
    summary: '回退到 wait',
    description:
      '有 realBegan 或工时消耗拒绝（4602，docs/02 §3.5 715-726 对齐）。',
  })
  @ApiOkResponse({ description: '回退成功', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 400,
    description: '回 wait 被拒(4602)',
    schema: { example: ERRORS.invalidTransition },
  })
  backToWait(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.executions.backToWait(user.id, id);
  }

  @Post('executions/:id/close')
  @Permissions(PERMS.execution.close, '关闭执行')
  @ApiOperation({
    summary: '关闭执行',
    description: '子阶段须全部 closed（4603）；记 realEnd。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtExecution) })
  @ApiResponse({
    status: 400,
    description: '级联不满足(4603)',
    schema: { example: ERRORS.invalidTransition },
  })
  close(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: CloseExecutionDto,
  ) {
    return this.executions.close(user.id, id, dto);
  }
}
