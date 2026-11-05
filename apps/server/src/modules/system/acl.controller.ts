import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsString, MinLength } from 'class-validator';
import { PERMS } from '@zentao/shared';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { AclService, SetAclDto } from './acl.service.js';

class SetAclRequest implements SetAclDto {
  @IsString()
  @MinLength(2)
  objectType: string;

  @IsString()
  @MinLength(1)
  objectId: string;

  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

@ApiTags('system/acl')
@ApiBearerAuth()
@Controller('acl')
export class AclController {
  constructor(private readonly acl: AclService) {}

  @Get()
  @Permissions(PERMS.acl.browse, '白名单查询')
  @ApiOperation({ summary: '对象白名单查询' })
  list(
    @Query('objectType') objectType: string,
    @Query('objectId') objectId: string,
  ) {
    return this.acl.list(objectType, objectId);
  }

  @Put()
  @Permissions(PERMS.acl.manage, '白名单维护')
  @ApiOperation({ summary: '全量替换对象白名单' })
  set(@Body() dto: SetAclRequest) {
    return this.acl.set(dto);
  }
}
