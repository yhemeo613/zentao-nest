import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PERMS } from '@zentao/shared';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import {
  ERRORS,
  enveloped,
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { ConfigService } from './config.service.js';
import { SysConfig } from './entities/sys-config.entity.js';

export class SetConfigDto {
  @ApiProperty({
    description: '配置项数组（只读键 5503 拒绝）',
    type: [Object],
    example: [
      { module: 'story', section: 'common', key: 'needReview', value: '0' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  items: Array<{ module: string; section: string; key: string; value: string }>;
}

@ApiTags('config')
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
@Controller('configs')
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @Permissions(PERMS.config.browse, '配置列表')
  @ApiOperation({ summary: '运行时配置列表' })
  @ApiResponse({
    status: 200,
    description: '配置列表',
    schema: envelopedPage(SysConfig),
  })
  list() {
    return this.config.list();
  }

  @Put()
  @Permissions(PERMS.config.manage, '更新配置')
  @ApiOperation({
    summary: '批量更新配置',
    description: '变更即失效缓存即时生效；只读键拒绝（5503）。',
  })
  @ApiResponse({
    status: 200,
    description: '变更数',
    schema: envelopedInline({ type: 'integer' }),
  })
  set(@Body() dto: SetConfigDto) {
    return this.config.setMany(dto.items);
  }
}

// IsIn 保留引用（文档枚举提示用）
void IsIn;
void IsString;
void MinLength;
