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
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PERMS } from '@zentao/shared';
import {
  ERRORS,
  enveloped,
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { TeamService } from './team.service.js';
import { ZtTeam } from './entities/zt-team.entity.js';
import {
  AddTeamMemberDto,
  TeamQueryDto,
  UpdateTeamMemberDto,
} from './dto/team.dto.js';

@ApiTags('team')
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
@Controller('team')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get()
  @Permissions(PERMS.project.teamBrowse, '团队成员列表')
  @ApiOperation({ summary: '团队成员列表（project/execution 通用）' })
  @ApiOkResponse({ description: '成员列表', schema: envelopedPage(ZtTeam) })
  list(@Query() query: TeamQueryDto) {
    return this.teams.list(query.rootType, query.rootId);
  }

  @Post()
  @Permissions(PERMS.project.teamManage, '添加团队成员')
  @ApiOperation({
    summary: '添加成员（同对象重复添加报 3004；触发可见集缓存失效）',
  })
  @ApiOkResponse({ description: '添加成功', schema: enveloped(ZtTeam) })
  add(@Body() dto: AddTeamMemberDto) {
    return this.teams.add(dto.rootType, dto.rootId, dto);
  }

  @Put(':id')
  @Permissions(PERMS.project.teamManage, '编辑团队成员')
  @ApiOperation({ summary: '编辑成员（角色/岗位/天数/工时）' })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtTeam) })
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teams.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMS.project.teamManage, '移除团队成员')
  @ApiOperation({ summary: '移除成员（触发可见集缓存失效）' })
  @ApiOkResponse({
    description: '移除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.teams.remove(id);
  }
}
