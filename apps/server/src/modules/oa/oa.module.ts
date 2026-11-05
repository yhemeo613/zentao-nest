import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtTodo } from './entities/zt-todo.entity.js';
import { ZtNotify } from './entities/zt-notify.entity.js';
import { ZtActionLog } from './entities/zt-action-log.entity.js';
import { ZtActionHistory } from './entities/zt-action-history.entity.js';
import { ZtEffort } from '../task/entities/zt-effort.entity.js';
import { ActivityService } from './activity.service.js';
import { OaController } from './oa.controller.js';
import { OaService } from './oa.service.js';

/** 事务模块（P5，docs/01 §6.8）：todo/effort/notify/activity；ActivityService 全局可复用 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZtTodo,
      ZtNotify,
      ZtActionLog,
      ZtActionHistory,
      ZtEffort,
    ]),
  ],
  controllers: [OaController],
  providers: [OaService, ActivityService],
  exports: [ActivityService],
})
export class OaModule {}
