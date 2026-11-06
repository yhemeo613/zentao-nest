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
import { CaselibService } from './caselib.service.js';
import { ZtCaseLib, ZtTestSuite } from './entities/caselib.entities.js';

const ERR = {
  status: 400,
  description: '业务校验失败(3007)/不存在(3005)',
  schema: { example: ERRORS.badRequest },
} as const;

@ApiTags('caselib')
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
export class CaselibController {
  constructor(private readonly caselib: CaselibService) {}

  // ---- 用例库 ----
  @Get('case-libs')
  @Permissions(PERMS.caselib.browse, '用例库列表')
  @ApiOperation({ summary: '用例库列表' })
  @ApiResponse({
    status: 200,
    description: '列表',
    schema: envelopedPage(ZtCaseLib),
  })
  listLibs() {
    return this.caselib.listLibs();
  }

  @Post('case-libs')
  @Permissions(PERMS.caselib.create, '创建用例库')
  @ApiOperation({ summary: '创建用例库' })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: envelopedPage(ZtCaseLib),
  })
  createLib(
    @CurrentUser() user: JwtUser,
    @Body() dto: { name: string; desc?: string },
  ) {
    return this.caselib.createLib(dto, user.id);
  }

  @Put('case-libs/:id')
  @Permissions(PERMS.caselib.edit, '编辑用例库')
  @ApiOperation({ summary: '编辑用例库' })
  updateLib(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { name?: string; desc?: string },
  ) {
    return this.caselib.updateLib(String(id), dto);
  }

  @Delete('case-libs/:id')
  @Permissions(PERMS.caselib.delete, '删除用例库')
  @ApiOperation({ summary: '删除用例库（软删）' })
  removeLib(@Param('id', ParseIntPipe) id: string) {
    return this.caselib.removeLib(String(id));
  }

  @Get('case-libs/:id/cases')
  @Permissions(PERMS.caselib.browse, '库用例列表')
  @ApiOperation({ summary: '库内用例（F3 页面完善复用 zt_case 语义）' })
  @ApiResponse({
    status: 200,
    description: '说明+用例',
    schema: envelopedInline({ type: 'object' }),
  })
  libCases(@Param('id', ParseIntPipe) id: string) {
    return this.caselib.libCases(String(id));
  }

  @Post('case-libs/:id/cases/import-to-product')
  @Permissions(PERMS.caselib.import, '库用例导入产品')
  @ApiOperation({ summary: '库用例导入产品（复制语义，fromCaseId 溯源）' })
  @ApiResponse({
    status: 200,
    description: '导入数',
    schema: envelopedInline({ type: 'integer' }),
  })
  importToProduct(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { productId: string; caseIds: string[] },
  ) {
    return this.caselib.importToProduct(
      String(id),
      dto.productId,
      dto.caseIds,
      user.id,
    );
  }

  // ---- 套件 ----
  @Get('products/:id/suites')
  @Permissions(PERMS.testsuite.browse, '套件列表')
  @ApiOperation({ summary: '产品套件列表' })
  @ApiResponse({
    status: 200,
    description: '套件列表',
    schema: envelopedPage(ZtTestSuite),
  })
  listSuites(@Param('id', ParseIntPipe) id: string) {
    return this.caselib.listSuites(String(id));
  }

  @Post('products/:id/suites')
  @Permissions(PERMS.testsuite.create, '创建套件')
  @ApiOperation({ summary: '创建套件' })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: envelopedPage(ZtTestSuite),
  })
  createSuite(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { name: string; type?: string; desc?: string },
  ) {
    return this.caselib.createSuite(String(id), dto, user.id);
  }

  @Post('suites/:id/cases')
  @Permissions(PERMS.testsuite.manageCases, '套件加用例')
  @ApiOperation({ summary: '套件添加用例（带版本快照，重复跳过）' })
  @ApiResponse({
    status: 200,
    description: '新增数',
    schema: envelopedInline({ type: 'integer' }),
  })
  @ApiResponse(ERR)
  addSuiteCases(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { caseIds: string[] },
  ) {
    return this.caselib.addSuiteCases(String(id), dto.caseIds);
  }

  @Delete('suites/:id/cases/:caseId')
  @Permissions(PERMS.testsuite.manageCases, '套件删用例')
  @ApiOperation({ summary: '移除套件用例' })
  removeSuiteCase(
    @Param('id', ParseIntPipe) id: string,
    @Param('caseId', ParseIntPipe) caseId: string,
  ) {
    return this.caselib.removeSuiteCase(String(id), String(caseId));
  }

  // ---- 测试报告 ----
  @Post('testreports')
  @Permissions(PERMS.testreport.create, '生成测试报告')
  @ApiOperation({
    summary: '从测试单生成报告',
    description: '聚合用例结果/通过率/关联 Bug（docs/03 §4.22）。',
  })
  @ApiResponse({
    status: 200,
    description: '报告',
    schema: envelopedPage(Object),
  })
  @ApiResponse(ERR)
  createReport(
    @CurrentUser() user: JwtUser,
    @Body() dto: { testTaskId: string; title: string; goal?: string },
  ) {
    return this.caselib.createReportFromTask(
      dto.testTaskId,
      { title: dto.title, goal: dto.goal },
      user.id,
    );
  }

  @Get('testreports')
  @Permissions(PERMS.testreport.browse, '报告列表')
  @ApiOperation({ summary: '报告列表（?productId=）' })
  listReports(@Query('productId') productId?: string) {
    return this.caselib.listReports(productId);
  }

  @Get('testreports/:id')
  @Permissions(PERMS.testreport.view, '报告详情')
  @ApiOperation({ summary: '报告详情' })
  getReport(@Param('id', ParseIntPipe) id: string) {
    return this.caselib.getReport(String(id));
  }
}
