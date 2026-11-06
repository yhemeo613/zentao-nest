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
import { WebhookService } from './webhook.service.js';
import { ZtWebhook } from './entities/webhook.entities.js';

@ApiTags('webhook')
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
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhooks: WebhookService) {}

  @Get()
  @Permissions(PERMS.webhook.browse, 'webhook列表')
  @ApiOperation({ summary: 'webhook 列表' })
  @ApiResponse({
    status: 200,
    description: '列表',
    schema: envelopedPage(ZtWebhook),
  })
  list() {
    return this.webhooks.list();
  }

  @Post()
  @Permissions(PERMS.webhook.create, '创建webhook')
  @ApiOperation({
    summary: '创建 webhook',
    description: 'type 枚举校验；URL 必须 https（5501）。',
  })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: envelopedPage(ZtWebhook),
  })
  create(
    @Body()
    dto: {
      type: string;
      name: string;
      url: string;
      secret?: string;
      actions?: string[];
    },
    @CurrentUser() user: JwtUser,
  ) {
    if (dto.actions) this.webhooks.validateActions(dto.actions);
    return this.webhooks.create(dto, user.id);
  }

  @Put(':id')
  @Permissions(PERMS.webhook.edit, '编辑webhook')
  @ApiOperation({ summary: '编辑 webhook' })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body()
    dto: { name?: string; url?: string; secret?: string; actions?: string[] },
  ) {
    void user;
    if (dto.actions) this.webhooks.validateActions(dto.actions);
    return this.webhooks.update(String(id), dto);
  }

  @Delete(':id')
  @Permissions(PERMS.webhook.delete, '删除webhook')
  @ApiOperation({ summary: '删除 webhook（软删）' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: envelopedInline({ nullable: true }),
  })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.webhooks.remove(String(id));
  }

  @Get(':id/logs')
  @Permissions(PERMS.webhook.browse, 'webhook投递日志')
  @ApiOperation({ summary: '投递日志（投递器随 P7）' })
  @ApiResponse({
    status: 200,
    description: '日志列表',
    schema: envelopedPage(ZtWebhook),
  })
  logs(@Param('id', ParseIntPipe) id: string) {
    return this.webhooks.logs(String(id));
  }
}
