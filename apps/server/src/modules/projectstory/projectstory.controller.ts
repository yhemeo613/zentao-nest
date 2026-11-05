import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PERMS } from '@zentao/shared';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import {
  ERRORS,
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { ProjectStoryService } from './projectstory.service.js';

class ImportFromPlanDto {
  @ApiProperty({
    description: '计划 ID（按计划拉需求写入项目+执行两级范围）',
    example: '1',
  })
  @IsString()
  @MinLength(1)
  planId: string;
}

@ApiTags('projectstory')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: '未登录(2001)',
  schema: { example: ERRORS.unauthorized },
})
@ApiResponse({
  status: 403,
  description: '无功能权限(2003)/无数据权限(2004)',
  schema: { example: ERRORS.forbidden },
})
@Controller()
export class ProjectStoryController {
  constructor(private readonly projectStories: ProjectStoryService) {}

  /** 项目范围 */
  @Get('projects/:id/stories')
  @Permissions(PERMS.projectstory.browse, '项目范围需求')
  @ApiOperation({ summary: '项目范围需求列表' })
  @ApiResponse({
    status: 200,
    description: '范围列表',
    schema: envelopedPage(Object),
  })
  listProject(@Param('id', ParseIntPipe) id: string) {
    return this.projectStories.list('project', String(id));
  }

  @Post('projects/:id/stories')
  @Permissions(PERMS.projectstory.linkStory, '项目关联需求')
  @ApiOperation({
    summary: '项目关联需求',
    description:
      'draft/reviewing/closed 不可关联（3007）；触发 stage=projected。',
  })
  @ApiResponse({
    status: 200,
    description: '新关联数',
    schema: envelopedInline({ type: 'integer' }),
  })
  linkProject(
    @Param('id', ParseIntPipe) id: string,
    @Body('storyIds') storyIds: string[],
  ) {
    return this.projectStories.link('project', String(id), storyIds ?? []);
  }

  @Delete('projects/:id/stories/:storyId')
  @Permissions(PERMS.projectstory.unlinkStory, '项目解除需求')
  @ApiOperation({
    summary: '解除项目范围需求',
    description: '已被执行占用时拒绝（3007）。',
  })
  @ApiResponse({
    status: 200,
    description: '解除成功',
    schema: envelopedInline({ nullable: true }),
  })
  unlinkProject(
    @Param('id', ParseIntPipe) id: string,
    @Param('storyId', ParseIntPipe) storyId: string,
  ) {
    return this.projectStories.unlink('project', String(id), String(storyId));
  }

  /** 执行范围 */
  @Get('executions/:id/stories')
  @Permissions(PERMS.projectstory.browse, '执行范围需求')
  @ApiOperation({ summary: '执行范围需求列表' })
  @ApiResponse({
    status: 200,
    description: '范围列表',
    schema: envelopedPage(Object),
  })
  listExecution(@Param('id', ParseIntPipe) id: string) {
    return this.projectStories.list('execution', String(id));
  }

  @Post('executions/:id/stories')
  @Permissions(PERMS.projectstory.linkStory, '执行关联需求')
  @ApiOperation({
    summary: '执行关联需求',
    description: '触发 stage=projected（docs/02 §9 linkStory）。',
  })
  @ApiResponse({
    status: 200,
    description: '新关联数',
    schema: envelopedInline({ type: 'integer' }),
  })
  linkExecution(
    @Param('id', ParseIntPipe) id: string,
    @Body('storyIds') storyIds: string[],
  ) {
    return this.projectStories.link('execution', String(id), storyIds ?? []);
  }

  @Delete('executions/:id/stories/:storyId')
  @Permissions(PERMS.projectstory.unlinkStory, '执行解除需求')
  @ApiOperation({ summary: '解除执行范围需求' })
  @ApiResponse({
    status: 200,
    description: '解除成功',
    schema: envelopedInline({ nullable: true }),
  })
  unlinkExecution(
    @Param('id', ParseIntPipe) id: string,
    @Param('storyId', ParseIntPipe) storyId: string,
  ) {
    return this.projectStories.unlink('execution', String(id), String(storyId));
  }

  @Post('executions/:id/stories/import-from-plan')
  @Permissions(PERMS.projectstory.importPlanStories, '按计划导入需求')
  @ApiOperation({
    summary: '按计划导入需求',
    description:
      '同时写入项目与执行两级范围（docs/02 §9 linkStories）；draft/reviewing/closed 需求跳过并在 skipped 返回。',
  })
  @ApiResponse({
    status: 200,
    description: '导入结果',
    schema: envelopedInline({
      type: 'object',
      properties: {
        projectLinked: { type: 'integer', example: 2 },
        executionLinked: { type: 'integer', example: 2 },
        skipped: { type: 'array', items: { type: 'string' } },
      },
    }),
  })
  importFromPlan(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: ImportFromPlanDto,
    @CurrentUser() _user: JwtUser,
  ) {
    return this.projectStories.importFromPlan(String(id), dto.planId);
  }
}
