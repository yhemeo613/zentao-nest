import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtWebhook, ZtWebhookLog } from './entities/webhook.entities.js';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';

/** webhook 管理（docs/03 §4.24） */
@Module({
  imports: [TypeOrmModule.forFeature([ZtWebhook, ZtWebhookLog])],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
