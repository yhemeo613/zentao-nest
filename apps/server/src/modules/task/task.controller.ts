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
import { TaskService } from './task.service.js';
import { ZtTask } from './entities/zt-task.entity.js';
import {
  ActivateTaskDto,
  AssignTaskDto,
  CreateTaskDto,
  FinishTaskDto,
  RecordEffortDto,
  StartTaskDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './dto/task.dto.js';

const TRANSITION_ERR = {
  status: 400,
  description: '非法流转(3006)/工时约束(4702/4703/4706)',
  schema: { example: ERRORS.invalidTransition },
} as const;

@ApiTags('task')
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
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  @Get('tasks')
  @Permissions(PERMS.task.browse, '任务列表')
  @ApiOperation({
    summary: '任务列表（executionId/projectId/storyId/status/assignedTo）',
  })
  @ApiOkResponse({ description: '任务列表', schema: envelopedPage(ZtTask) })
  list(@Query() query: TaskQueryDto) {
    return this.tasks.list(query);
  }

  @Get('tasks/:id')
  @Permissions(PERMS.task.view, '任务详情')
  @ApiOperation({ summary: '任务详情（含工时流水与子任务）' })
  @ApiOkResponse({ description: '任务详情', schema: enveloped(ZtTask) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.tasks.get(id);
  }

  @Post('tasks')
  @Permissions(PERMS.task.create, '创建任务')
  @ApiOperation({
    summary: '创建任务',
    description: '关联需求时锁定 storyVersion（docs/02 §4.3）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtTask) })
  @ApiResponse({
    status: 404,
    description: '关联需求不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: JwtUser) {
    return this.tasks.create(dto, user.id);
  }

  @Post('tasks/:id/start')
  @Permissions(PERMS.task.start, '开始任务')
  @ApiOperation({
    summary: '开始任务',
    description: '仅 wait；left=0 直接完成；consumed 不得小于旧值（4702）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTask) })
  @ApiResponse(TRANSITION_ERR)
  start(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: StartTaskDto,
  ) {
    return this.tasks.start(user.id, id, dto);
  }

  @Post('tasks/:id/restart')
  @Permissions(PERMS.task.restart, '恢复任务')
  @ApiOperation({ summary: '恢复任务（仅 pause → doing）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTask) })
  @ApiResponse(TRANSITION_ERR)
  restart(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.tasks.restart(user.id, id);
  }

  @Post('tasks/:id/pause')
  @Permissions(PERMS.task.pause, '暂停任务')
  @ApiOperation({ summary: '暂停任务（仅 doing；同步暂停 doing 子任务）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTask) })
  @ApiResponse(TRANSITION_ERR)
  pause(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.tasks.pause(user.id, id);
  }

  @Post('tasks/:id/finish')
  @Permissions(PERMS.task.finish, '完成任务')
  @ApiOperation({
    summary: '完成任务',
    description: 'consumed=旧+新增（>0）；effort left=0；→ done。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTask) })
  @ApiResponse(TRANSITION_ERR)
  finish(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: FinishTaskDto,
  ) {
    return this.tasks.finish(user.id, id, dto);
  }

  @Post('tasks/:id/cancel')
  @Permissions(PERMS.task.cancel, '取消任务')
  @ApiOperation({ summary: '取消任务（→ cancel；指派回开单人）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTask) })
  @ApiResponse(TRANSITION_ERR)
  cancel(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.tasks.cancel(user.id, id);
  }

  @Post('tasks/:id/close')
  @Permissions(PERMS.task.close, '关闭任务')
  @ApiOperation({
    summary: '关闭任务',
    description: '仅 done/cancel 可关（3006）；closedReason 自动映射。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTask) })
  @ApiResponse(TRANSITION_ERR)
  close(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.tasks.close(user.id, id);
  }

  @Post('tasks/:id/activate')
  @Permissions(PERMS.task.activate, '返工任务')
  @ApiOperation({
    summary: '返工任务',
    description: 'done/closed/cancel → doing；left 必填 >0（4706）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTask) })
  @ApiResponse(TRANSITION_ERR)
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ActivateTaskDto,
  ) {
    return this.tasks.activate(user.id, id, dto);
  }

  @Put('tasks/:id/assign')
  @Permissions(PERMS.task.assign, '任务指派')
  @ApiOperation({
    summary: '指派任务',
    description: '未完成任务指派须剩余工时 >0（4706）。',
  })
  @ApiOkResponse({ description: '指派成功', schema: enveloped(ZtTask) })
  assign(@Param('id', ParseIntPipe) id: string, @Body() dto: AssignTaskDto) {
    return this.tasks.assign(id, dto);
  }

  @Put('tasks/:id')
  @Permissions(PERMS.task.edit, '编辑任务')
  @ApiOperation({
    summary: '编辑任务（名称/描述/截止/优先级；不改状态与工时）',
  })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtTask) })
  update(@Param('id', ParseIntPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Delete('tasks/:id')
  @Permissions(PERMS.task.delete, '删除任务')
  @ApiOperation({ summary: '删除任务（软删；有子任务拒绝 3007）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  async remove(@Param('id', ParseIntPipe) id: string) {
    await this.tasks.removeWithGuard(id);
    return null;
  }

  @Post('tasks/:id/efforts')
  @Permissions(PERMS.task.recordWorkhour, '记录工时')
  @ApiOperation({
    summary: '记录工时',
    description:
      'date≤今天（4703）；隐式状态驱动：left=0→done / wait→doing / 终态且 left≠0→doing（docs/02 §6.4）；父任务聚合 + 需求 stage 推进。',
  })
  @ApiOkResponse({
    description: '记录成功（返回任务最新态）',
    schema: enveloped(ZtTask),
  })
  @ApiResponse(TRANSITION_ERR)
  recordEffort(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: RecordEffortDto,
  ) {
    return this.tasks.recordEffort(user.id, id, dto);
  }

  @Delete('tasks/:id/efforts/:effortId')
  @Permissions(PERMS.task.deleteWorkhour, '删除工时')
  @ApiOperation({ summary: '删除工时（软删+全量重算；consumed 归零回 wait）' })
  @ApiOkResponse({
    description: '删除成功（返回任务最新态）',
    schema: enveloped(ZtTask),
  })
  deleteEffort(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Param('effortId', ParseIntPipe) effortId: string,
  ) {
    return this.tasks.deleteEffort(user.id, effortId);
  }

  @Post('tasks/:id/children')
  @Permissions(PERMS.task.create, '拆分子任务')
  @ApiOperation({
    summary: '拆分子任务',
    description:
      '父 isParent=1；estimate/consumed/left=Σ子；父状态按子推导（docs/02 §6.3）。',
  })
  @ApiOkResponse({
    description: '返回子任务列表',
    schema: envelopedPage(ZtTask),
  })
  split(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body()
    body: {
      children: Array<{
        name: string;
        estimate: number;
        type?: string;
        assignedTo?: string;
      }>;
    },
  ) {
    return this.tasks.split(user.id, id, body.children);
  }
}
