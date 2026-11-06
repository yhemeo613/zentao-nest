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
import { ZtBranch, ZtProductLine } from './entities/zt-branch.entity.js';
import { BranchService } from './branch.service.js';

/** 产品线/分支（docs/03 §4.18/4.19） */
@ApiTags('product-extras')
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
export class BranchController {
  constructor(private readonly extras: BranchService) {}

  // ---- 产品线 ----
  @Get('product-lines')
  @Permissions(PERMS.product.browse, '产品线列表')
  @ApiOperation({ summary: '产品线列表' })
  @ApiResponse({
    status: 200,
    description: '列表',
    schema: envelopedPage(ZtProductLine),
  })
  listLines() {
    return this.extras.listLines();
  }

  @Post('product-lines')
  @Permissions(PERMS.productline.manage, '创建产品线')
  @ApiOperation({ summary: '创建产品线' })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: envelopedPage(ZtProductLine),
  })
  createLine(
    @CurrentUser() user: JwtUser,
    @Body() dto: { name: string; sortNo?: number },
  ) {
    return this.extras.createLine(dto, user.id);
  }

  @Put('product-lines/:id')
  @Permissions(PERMS.productline.manage, '编辑产品线')
  @ApiOperation({ summary: '编辑产品线' })
  updateLine(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { name?: string; sortNo?: number },
  ) {
    return this.extras.updateLine(String(id), dto);
  }

  @Delete('product-lines/:id')
  @Permissions(PERMS.productline.manage, '删除产品线')
  @ApiOperation({ summary: '删除产品线（有产品引用拒绝 3007）' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: envelopedInline({ nullable: true }),
  })
  removeLine(@Param('id', ParseIntPipe) id: string) {
    return this.extras.removeLine(String(id));
  }

  // ---- 分支 ----
  @Get('products/:id/branches')
  @Permissions(PERMS.product.browse, '分支列表')
  @ApiOperation({ summary: '产品分支列表' })
  @ApiResponse({
    status: 200,
    description: '列表',
    schema: envelopedPage(ZtBranch),
  })
  listBranches(@Param('id', ParseIntPipe) id: string) {
    return this.extras.listBranches(String(id));
  }

  @Post('products/:id/branches')
  @Permissions(PERMS.branch.manage, '创建分支')
  @ApiOperation({ summary: '创建分支' })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: envelopedPage(ZtBranch),
  })
  createBranch(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { name: string; sortNo?: number },
  ) {
    return this.extras.createBranch(String(id), dto, user.id);
  }

  @Put('branches/:id')
  @Permissions(PERMS.branch.manage, '编辑分支')
  @ApiOperation({ summary: '编辑分支' })
  updateBranch(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: { name?: string; sortNo?: number },
  ) {
    return this.extras.updateBranch(String(id), dto);
  }

  @Delete('branches/:id')
  @Permissions(PERMS.branch.manage, '删除分支')
  @ApiOperation({ summary: '删除分支（主干/被引用拒绝 3007）' })
  removeBranch(@Param('id', ParseIntPipe) id: string) {
    return this.extras.removeBranch(String(id));
  }
}
