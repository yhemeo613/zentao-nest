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
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { ProgramService } from './program.service.js';
import { ZtProgram } from './entities/zt-program.entity.js';
import {
  CloseProgramDto,
  CreateProgramDto,
  UpdateProgramDto,
} from './dto/program.dto.js';

@ApiTags('program')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: '未登录(2001)',
  schema: { example: ERRORS.unauthorized },
})
@ApiResponse({
  status: 403,
  description: '无功能权限(2003) 或 无数据权限(2004)',
  schema: { example: ERRORS.forbidden },
})
@Controller('programs')
export class ProgramController {
  constructor(private readonly programs: ProgramService) {}

  @Get()
  @Permissions(PERMS.program.browse, '项目集列表')
  @ApiOperation({
    summary: '项目集树形列表',
    description: '按 DataScope 可见集过滤；sortNo,id 排序。',
  })
  @ApiOkResponse({
    description: '项目集列表',
    schema: envelopedPage(ZtProgram),
  })
  list(@CurrentUser() user: JwtUser) {
    return this.programs.list(user.id);
  }

  @Get(':id')
  @Permissions(PERMS.program.view, '项目集详情')
  @ApiOperation({ summary: '项目集详情（private 白名单外 2004）' })
  @ApiOkResponse({ description: '项目集详情', schema: enveloped(ZtProgram) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.programs.get(user.id, id);
  }

  @Post()
  @Permissions(PERMS.program.create, '创建项目集')
  @ApiOperation({
    summary: '创建项目集',
    description:
      'parentId 提供时自动 grade=父+1、path 物化路径；private 时白名单双写 sys_acl。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtProgram) })
  @ApiResponse({
    status: 400,
    description: '参数校验失败(3001)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 404,
    description: '父项目集不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  create(@Body() dto: CreateProgramDto, @CurrentUser() user: JwtUser) {
    return this.programs.create(dto, user.id);
  }

  @Put(':id')
  @Permissions(PERMS.program.edit, '编辑项目集')
  @ApiOperation({
    summary: '编辑项目集',
    description: 'acl/whitelist 变更触发全量可见集缓存失效。',
  })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtProgram) })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programs.update(user.id, id, dto);
  }

  @Delete(':id')
  @Permissions(PERMS.program.delete, '删除项目集')
  @ApiOperation({
    summary: '删除项目集（软删）',
    description: '存在子项目集/产品/项目时拒绝（4002）。',
  })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 400,
    description: '有子级(4002)',
    schema: { example: ERRORS.badRequest },
  })
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.programs.remove(user.id, id);
  }

  @Post(':id/start')
  @Permissions(PERMS.program.start, '项目集开始')
  @ApiOperation({
    summary: '开始项目集',
    description: 'wait/suspended → doing；记 realBegan。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProgram) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  start(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.programs.start(user.id, id);
  }

  @Post(':id/suspend')
  @Permissions(PERMS.program.suspend, '项目集挂起')
  @ApiOperation({ summary: '挂起项目集', description: 'doing → suspended。' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProgram) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  suspend(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.programs.suspend(user.id, id);
  }

  @Post(':id/close')
  @Permissions(PERMS.program.close, '关闭项目集')
  @ApiOperation({
    summary: '关闭项目集',
    description: '任意非 closed 状态可关；存在未关闭子项目集拒绝（4603）。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProgram) })
  @ApiResponse({
    status: 400,
    description: '级联不满足(4603)/非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  close(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: CloseProgramDto,
  ) {
    return this.programs.close(user.id, id, dto);
  }

  @Post(':id/activate')
  @Permissions(PERMS.program.activate, '激活项目集')
  @ApiOperation({
    summary: '激活项目集',
    description: 'closed/suspended → doing（有 realBegan）或 wait。',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtProgram) })
  @ApiResponse({
    status: 400,
    description: '非法流转(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.programs.activate(user.id, id);
  }

  @Get(':id/summary')
  @Permissions(PERMS.program.view, '项目集概览')
  @ApiOperation({
    summary: '项目集概览',
    description: '下辖产品/项目/子项目集计数。',
  })
  @ApiOkResponse({
    description: '概览计数',
    schema: envelopedInline({
      type: 'object',
      properties: {
        products: { type: 'integer', example: 2 },
        projects: { type: 'integer', example: 1 },
        childPrograms: { type: 'integer', example: 0 },
      },
    }),
  })
  summary(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.programs.summary(user.id, id);
  }
}
