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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import {
  ERRORS,
  enveloped,
  envelopedInline,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { TestTaskService } from './testtask.service.js';
import { ZtTestTask } from './entities/zt-test-task.entity.js';
import {
  CloseTestTaskDto,
  CreateTestTaskDto,
  LinkCasesDto,
  RunCaseBodyDto,
} from './dto/testtask.dto.js';

const TR_ERR = {
  status: 400,
  description: '非法流转(3006)/完成日期非法(4951)',
  schema: { example: ERRORS.invalidTransition },
} as const;

@ApiTags('testtask')
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
@Controller()
export class TestTaskController {
  constructor(private readonly testTasks: TestTaskService) {}

  @Get('testtasks')
  @Permissions(PERMS.testtask.browse, '测试单列表')
  @ApiOperation({ summary: '测试单列表（?productId=）' })
  @ApiOkResponse({
    description: '测试单列表',
    schema: envelopedPage(ZtTestTask),
  })
  list(@Query('productId') productId?: string) {
    return this.testTasks.list(productId);
  }

  @Get('testtasks/:id')
  @Permissions(PERMS.testtask.view, '测试单详情')
  @ApiOperation({ summary: '测试单详情（含用例执行记录）' })
  @ApiOkResponse({ description: '测试单详情', schema: enveloped(ZtTestTask) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@Param('id', ParseIntPipe) id: string) {
    return this.testTasks.get(id);
  }

  @Post('testtasks')
  @Permissions(PERMS.testtask.create, '创建测试单')
  @ApiOperation({
    summary: '创建测试单',
    description:
      '初始 wait；执行用例自动推进 doing（docs/02 §7.3）；无自动 done。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtTestTask) })
  create(@Body() dto: CreateTestTaskDto, @CurrentUser() user: JwtUser) {
    return this.testTasks.create(dto, user.id);
  }

  @Post('testtasks/:id/start')
  @Permissions(PERMS.testtask.start, '开始测试单')
  @ApiOperation({ summary: '开始测试单（仅 wait → doing）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTestTask) })
  @ApiResponse(TR_ERR)
  start(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.testTasks.start(user.id, id);
  }

  @Post('testtasks/:id/block')
  @Permissions(PERMS.testtask.block, '阻塞测试单')
  @ApiOperation({ summary: '阻塞测试单（wait/doing → blocked）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTestTask) })
  @ApiResponse(TR_ERR)
  block(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.testTasks.block(user.id, id);
  }

  @Post('testtasks/:id/activate')
  @Permissions(PERMS.testtask.activate, '激活测试单')
  @ApiOperation({ summary: '激活测试单（blocked/done → doing）' })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTestTask) })
  @ApiResponse(TR_ERR)
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.testTasks.activate(user.id, id);
  }

  @Post('testtasks/:id/close')
  @Permissions(PERMS.testtask.close, '关闭测试单')
  @ApiOperation({
    summary:
      '关闭测试单（非 done 可关；realFinishedDate 必填且晚于 begin，4951）',
  })
  @ApiOkResponse({ description: '流转成功', schema: enveloped(ZtTestTask) })
  @ApiResponse(TR_ERR)
  close(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: CloseTestTaskDto,
  ) {
    return this.testTasks.close(user.id, id, dto);
  }

  @Post('testtasks/:id/cases')
  @Permissions(PERMS.testtask.linkCase, '圈选用例')
  @ApiOperation({ summary: '圈选用例（replace 写 test_run，带版本快照）' })
  @ApiOkResponse({
    description: '返回执行记录列表',
    schema: envelopedPage(ZtTestTask),
  })
  linkCases(@Param('id', ParseIntPipe) id: string, @Body() dto: LinkCasesDto) {
    return this.testTasks.linkCases(id, dto);
  }

  @Post('testtasks/:id/runs/:runId/run-case')
  @Permissions(PERMS.testtask.runCase, '执行用例')
  @ApiOperation({
    summary: '执行用例',
    description:
      '三写（docs/02 §7.3）：case.lastRun* + test_result 明细 + test_run 更新；测试单 wait→doing 自动推进。',
  })
  @ApiOkResponse({
    description: '执行成功（返回聚合结果与任务状态）',
    schema: enveloped(ZtTestTask),
  })
  runCase(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Param('runId', ParseIntPipe) runId: string,
    @Body() dto: RunCaseBodyDto,
  ) {
    return this.testTasks.runCase(user.id, id, runId, dto);
  }

  @Get('testtasks/:id/runs/:runId/bug-prefill')
  @Permissions(PERMS.testtask.view, '失败转Bug预填')
  @ApiOperation({
    summary: '失败转 Bug 预填',
    description:
      '从测试结果拼装重现步骤模板（docs/02 §7.3 getBugInfoFromResult 精简版）。',
  })
  @ApiOkResponse({ description: '预填数据', schema: enveloped(ZtTestTask) })
  bugPrefill(
    @Param('id', ParseIntPipe) id: string,
    @Param('runId', ParseIntPipe) runId: string,
  ) {
    return this.testTasks.bugPrefill(id, runId);
  }

  @Delete('testtasks/:id')
  @Permissions(PERMS.testtask.delete, '删除测试单')
  @ApiOperation({ summary: '删除测试单（软删）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  async remove(@Param('id', ParseIntPipe) id: string) {
    await this.testTasks.removeWithGuard(id);
    return null;
  }
}
