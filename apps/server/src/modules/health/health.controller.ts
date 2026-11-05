import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  ERRORS,
  envelopedInline,
} from '../../common/swagger/swagger.helper.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '健康检查（公开）',
    description:
      'DB/Redis 连通性探测；docker/编排探活口径（docs/01 §13）。db/redis 为 true 表示各自连通。',
  })
  @ApiOkResponse({
    description: '连通性状态',
    schema: envelopedInline({
      type: 'object',
      properties: {
        db: { type: 'boolean', example: true },
        redis: { type: 'boolean', example: true },
        uptime: { type: 'integer', example: 51, description: '进程运行秒数' },
      },
      required: ['db', 'redis', 'uptime'],
    }),
  })
  @ApiResponse({
    status: 500,
    description: '下游探测异常仍返回结构（字段 false），HTTP 保持 200',
    schema: { example: ERRORS.badRequest },
  })
  check() {
    return this.health.check();
  }
}
