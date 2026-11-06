import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtKanbanLane } from './entities/zt-kanban-lane.entity.js';
import { ZtKanbanColumn } from './entities/zt-kanban-column.entity.js';
import { ZtKanbanCell } from './entities/zt-kanban-cell.entity.js';
import { ZtTask } from '../task/entities/zt-task.entity.js';
import { TaskModule } from '../task/task.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { BoardController } from './board.controller.js';
import { BoardService } from './board.service.js';
import { BoardGateway } from './board.gateway.js';

/** 实时看板（P6，docs/01 §6.9）：HTTP 全量/管理端点 + Socket.IO 网关（/ws） */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      ZtKanbanLane,
      ZtKanbanColumn,
      ZtKanbanCell,
      ZtTask,
    ]),
    TaskModule,
  ],
  controllers: [BoardController],
  providers: [BoardService, BoardGateway],
  exports: [BoardService],
})
export class BoardModule {}
