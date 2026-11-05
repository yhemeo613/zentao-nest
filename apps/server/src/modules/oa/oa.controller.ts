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
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { OaService } from './oa.service.js';
import { CreateEffortDto, CreateTodoDto, UpdateTodoDto } from './dto/oa.dto.js';

@ApiTags('oa')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: '未登录(2001)',
  schema: { example: ERRORS.unauthorized },
})
@ApiResponse({
  status: 403,
  description: '无功能权限(2003)/无数据权限(2004)',
  schema: { example: ERRORS.forbidden },
})
@Controller()
export class OaController {
  constructor(private readonly oa: OaService) {}

  // ---- 待办 ----
  @Get('todos')
  @Permissions(PERMS.todo.browse, '待办列表')
  @ApiOperation({
    summary: '我的待办（assignedTo=自己；?status=wait,doing 筛选）',
  })
  @ApiResponse({
    status: 200,
    description: '待办列表',
    schema: envelopedPage(Object),
  })
  myTodos(@CurrentUser() user: JwtUser, @Query('status') status?: string) {
    return this.oa.myTodos(user.id, status);
  }

  @Post('todos')
  @Permissions(PERMS.todo.create, '创建待办')
  @ApiOperation({
    summary: '创建待办',
    description: 'type=custom 须填名称；关联类型须带 objectId（5101）。',
  })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: envelopedPage(Object),
  })
  createTodo(@Body() dto: CreateTodoDto, @CurrentUser() user: JwtUser) {
    return this.oa.createTodo(dto, user.id);
  }

  @Put('todos/:id')
  @Permissions(PERMS.todo.edit, '编辑待办')
  @ApiOperation({ summary: '编辑待办（仅本人/被指派，2004）' })
  updateTodo(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.oa.updateTodo(user.id, id, dto);
  }

  @Post('todos/:id/start')
  @Permissions(PERMS.todo.start, '开始待办')
  @ApiOperation({ summary: '开始待办（wait → doing）' })
  start(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.oa.changeTodoStatus(user.id, id, 'start');
  }

  @Post('todos/:id/finish')
  @Permissions(PERMS.todo.finish, '完成待办')
  @ApiOperation({ summary: '完成待办（wait/doing → done）' })
  finish(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.oa.changeTodoStatus(user.id, id, 'finish');
  }

  @Post('todos/:id/close')
  @Permissions(PERMS.todo.close, '关闭待办')
  @ApiOperation({ summary: '关闭待办（→ closed）' })
  close(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.oa.changeTodoStatus(user.id, id, 'close');
  }

  @Post('todos/:id/activate')
  @Permissions(PERMS.todo.activate, '激活待办')
  @ApiOperation({ summary: '激活待办（done/closed → doing）' })
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.oa.changeTodoStatus(user.id, id, 'activate');
  }

  @Delete('todos/:id')
  @Permissions(PERMS.todo.delete, '删除待办')
  @ApiOperation({ summary: '删除待办（软删）' })
  removeTodo(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.oa.removeTodo(user.id, id);
  }

  // ---- 工时日志 ----
  @Post('efforts')
  @Permissions(PERMS.effort.create, '工时填报')
  @ApiOperation({
    summary: '独立工时填报',
    description:
      'date≤今天（4703）；task 类型走 /tasks/:id/efforts（含隐式状态迁移）。',
  })
  @ApiResponse({
    status: 200,
    description: '填报成功',
    schema: envelopedPage(Object),
  })
  createEffort(@CurrentUser() user: JwtUser, @Body() dto: CreateEffortDto) {
    return this.oa.createEffort(user.id, dto);
  }

  @Get('efforts')
  @Permissions(PERMS.effort.browse, '工时日志')
  @ApiOperation({ summary: '我的工时日志（?begin=&end= 区间）' })
  @ApiResponse({
    status: 200,
    description: '工时列表',
    schema: envelopedPage(Object),
  })
  myEfforts(
    @CurrentUser() user: JwtUser,
    @Query('begin') begin?: string,
    @Query('end') end?: string,
  ) {
    return this.oa.myEfforts(user.id, begin, end);
  }

  // ---- 通知 ----
  @Get('notifications')
  @ApiOperation({ summary: '我的通知（?unread=1 仅未读）' })
  @ApiResponse({
    status: 200,
    description: '通知列表',
    schema: envelopedPage(Object),
  })
  myNotifications(
    @CurrentUser() user: JwtUser,
    @Query('unread') unread?: string,
  ) {
    return this.oa.myNotifications(user.id, unread === '1');
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: '未读通知计数' })
  @ApiResponse({
    status: 200,
    description: '未读数',
    schema: envelopedInline({ type: 'integer' }),
  })
  unreadCount(@CurrentUser() user: JwtUser) {
    return this.oa.unreadCount(user.id);
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: '标记已读（仅收件人 2004）' })
  markRead(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.oa.markRead(user.id, id);
  }

  // ---- 操作日志 ----
  @Get('actions')
  @ApiOperation({ summary: '动态流（objectType+objectId）' })
  @ApiResponse({
    status: 200,
    description: '日志列表',
    schema: envelopedPage(Object),
  })
  actions(
    @Query('objectType') objectType: string,
    @Query('objectId') objectId: string,
  ) {
    return this.oa.actions(objectType, objectId);
  }

  @Get('actions/:id')
  @ApiOperation({ summary: '日志明细（含字段级 history）' })
  @ApiResponse({
    status: 200,
    description: '日志明细',
    schema: envelopedPage(Object),
  })
  actionDetail(@Param('id', ParseIntPipe) id: string) {
    return this.oa.actionDetail(id);
  }
}
