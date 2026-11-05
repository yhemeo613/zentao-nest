import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsArray, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PERMS } from '@zentao/shared';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import {
  ERRORS,
  enveloped,
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { AclService, SetAclDto } from './acl.service.js';
import { SysAcl } from './entities/sys-acl.entity.js';

export class SetAclRequest implements SetAclDto {
  @ApiProperty({
    description: '对象类型（program|product|project|execution|kanban）',
    example: 'project',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  objectType: string;

  @ApiProperty({ description: '对象 ID', example: '1', minLength: 1 })
  @IsString()
  @MinLength(1)
  objectId: string;

  @ApiProperty({
    description: '白名单用户 ID 全量数组（替换式，空数组=清空白名单）',
    example: ['2', '3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

@ApiTags('system/acl')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: '未登录(2001)/凭证无效(2002)',
  schema: { example: ERRORS.unauthorized },
})
@ApiResponse({
  status: 403,
  description: '无功能权限(2003)',
  schema: { example: ERRORS.forbidden },
})
@Controller('acl')
export class AclController {
  constructor(private readonly acl: AclService) {}

  @Get()
  @Permissions(PERMS.acl.browse, '白名单查询')
  @ApiOperation({
    summary: '对象白名单查询',
    description: '按 objectType+objectId 查询白名单记录（含 source 来源）。',
  })
  @ApiOkResponse({
    description: '白名单记录列表',
    schema: envelopedPage(SysAcl),
  })
  list(
    @Query('objectType') objectType: string,
    @Query('objectId') objectId: string,
  ) {
    return this.acl.list(objectType, objectId);
  }

  @Put()
  @Permissions(PERMS.acl.manage, '白名单维护')
  @ApiOperation({
    summary: '全量替换对象白名单',
    description:
      'replace 语义（对齐禅道 updateWhitelist）；影响 P2 可见集计算的缓存失效。',
  })
  @ApiOkResponse({
    description: '设置成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 400,
    description: '参数校验失败(3001)',
    schema: { example: ERRORS.badRequest },
  })
  set(@Body() dto: SetAclRequest) {
    return this.acl.set(dto);
  }
}
