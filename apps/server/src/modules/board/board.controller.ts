import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
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
} from '../../common/swagger/swagger.helper.js';
import { BoardService } from './board.service.js';
import { ZtKanbanLane } from './entities/zt-kanban-lane.entity.js';
import { ZtKanbanColumn } from './entities/zt-kanban-column.entity.js';

export class BoardViewSchema {
  @ApiProperty({ description: '执行 ID', example: '1' })
  executionId: string;
  @ApiProperty({ description: '泳道', type: [ZtKanbanLane] })
  lanes: ZtKanbanLane[];
  @ApiProperty({ description: '列', type: [ZtKanbanColumn] })
  columns: ZtKanbanColumn[];
  @ApiProperty({ description: '单元格（含卡片任务）', type: [Object] })
  cells: Array<{
    id: string;
    columnId: string;
    laneId: string;
    cards: string;
    cardTasks: unknown[];
  }>;
  @ApiProperty({ description: 'WIP 超限列表', type: [Object] })
  wipExceeded: Array<{ columnId: string; limit: number; current: number }>;
}

@ApiTags('board')
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
export class BoardController {
  constructor(private readonly boards: BoardService) {}

  @Get('executions/:id/board')
  @Permissions(PERMS.execution.view, '看板全量')
  @ApiOperation({
    summary: '执行看板全量',
    description:
      '首访惰性初始化默认泳道（story/bug/task）与任务列；返回 lanes/columns/cells（含卡片任务）/wipExceeded；实时同步走 Socket.IO /ws（docs/03 §6）。',
  })
  @ApiOkResponse({
    description: '看板全量',
    schema: enveloped(BoardViewSchema),
  })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  board(@Param('id', ParseIntPipe) id: string) {
    return this.boards.getBoard(String(id));
  }

  @Post('executions/:id/board/columns')
  @Permissions(PERMS.board.manageColumn, '创建看板列')
  @ApiOperation({
    summary: '创建看板列',
    description:
      'type 枚举校验；带 parentId 时校验 WIP 子列合计≤父列（5202）。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(Object) })
  @ApiResponse({
    status: 400,
    description: '类型非法/WIP 配置非法(5201/5202)',
    schema: { example: ERRORS.badRequest },
  })
  createColumn(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body()
    dto: {
      type: string;
      name: string;
      parentId?: number;
      wipLimit?: number;
      sortNo?: number;
    },
  ) {
    void user;
    return this.boards.createColumn(String(id), dto);
  }

  @Put('board/columns/:id')
  @Permissions(PERMS.board.manageColumn, '编辑看板列')
  @ApiOperation({ summary: '编辑看板列（名称/WIP/排序）' })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(Object) })
  updateColumn(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { name?: string; wipLimit?: number; sortNo?: number },
  ) {
    return this.boards.updateColumn(String(id), dto);
  }

  @Delete('board/columns/:id')
  @Permissions(PERMS.board.manageColumn, '删除看板列')
  @ApiOperation({
    summary: '删除看板列',
    description: '列内有卡片或存在子列拒绝（3007/5201）。',
  })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  deleteColumn(@Param('id', ParseIntPipe) id: string) {
    return this.boards.deleteColumn(String(id));
  }

  @Post('executions/:id/board/lanes')
  @Permissions(PERMS.board.manageLane, '创建看板泳道')
  @ApiOperation({
    summary: '创建看板泳道',
    description: '同类型唯一（3004）；任务泳道不可删。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(Object) })
  createLane(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body()
    dto: { type: string; name: string; color?: string; sortNo?: number },
  ) {
    void user;
    return this.boards.createLane(String(id), dto);
  }

  @Delete('board/lanes/:id')
  @Permissions(PERMS.board.manageLane, '删除看板泳道')
  @ApiOperation({ summary: '删除看板泳道（任务泳道禁删 3007）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  deleteLane(@Param('id', ParseIntPipe) id: string) {
    return this.boards.deleteLane(String(id));
  }

  @Post('executions/:id/board/tasks/:taskId/move')
  @Permissions(PERMS.task.dragMove, '看板拖拽')
  @ApiOperation({
    summary: '看板拖拽（HTTP 备用通道）',
    description:
      '拖到列=映射任务动作（developing→start/restart/activate、developed→finish…）；实时通道优先走 Socket card:move。',
  })
  @ApiOkResponse({
    description: '移动成功（返回任务与 WIP 状态）',
    schema: enveloped(Object),
  })
  @ApiResponse({
    status: 400,
    description: '目标非法(5203)/非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  moveCard(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Param('taskId', ParseIntPipe) taskId: string,
    @Body() dto: { toColumnId: string },
  ) {
    return this.boards.moveCard(
      user.id,
      String(id),
      String(taskId),
      dto.toColumnId,
    );
  }
}
