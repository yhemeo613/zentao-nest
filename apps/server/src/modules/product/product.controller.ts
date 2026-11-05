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
import { ModuleNode, ProductService } from './product.service.js';
import { ZtProduct } from './entities/zt-product.entity.js';
import {
  CreateModuleDto,
  CreateProductDto,
  UpdateModuleDto,
  UpdateProductDto,
} from './dto/product.dto.js';

@ApiTags('product')
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
@Controller()
export class ProductController {
  constructor(private readonly products: ProductService) {}

  @Get('products')
  @Permissions(PERMS.product.browse, '产品列表')
  @ApiOperation({
    summary: '产品列表',
    description: '按可见性过滤（private 按 sys_acl 白名单）。',
  })
  @ApiOkResponse({ description: '产品列表', schema: envelopedPage(ZtProduct) })
  list(@CurrentUser() user: JwtUser) {
    return this.products.list(user.id);
  }

  @Get('products/:id')
  @Permissions(PERMS.product.view, '产品详情')
  @ApiOperation({ summary: '产品详情' })
  @ApiOkResponse({ description: '产品详情', schema: enveloped(ZtProduct) })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.products.get(user.id, id);
  }

  @Post('products')
  @Permissions(PERMS.product.create, '创建产品')
  @ApiOperation({
    summary: '创建产品',
    description: 'private 时白名单双写 sys_acl。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtProduct) })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtUser) {
    return this.products.create(dto, user.id);
  }

  @Put('products/:id')
  @Permissions(PERMS.product.edit, '编辑产品')
  @ApiOperation({ summary: '编辑产品' })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(ZtProduct) })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.id, id, dto);
  }

  @Post('products/:id/close')
  @Permissions(PERMS.product.close, '关闭产品')
  @ApiOperation({
    summary: '关闭产品',
    description: '禅道语义：产品不物理删除，关闭即终态。',
  })
  @ApiOkResponse({ description: '关闭成功', schema: enveloped(ZtProduct) })
  @ApiResponse({
    status: 400,
    description: '已关闭(3006)',
    schema: { example: ERRORS.invalidTransition },
  })
  close(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: string) {
    return this.products.close(user.id, id);
  }

  @Post('products/:id/activate')
  @Permissions(PERMS.product.close, '激活产品')
  @ApiOperation({ summary: '激活已关闭产品' })
  @ApiOkResponse({ description: '激活成功', schema: enveloped(ZtProduct) })
  activate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    return this.products.activate(user.id, id);
  }

  @Get('products/:id/modules')
  @Permissions(PERMS.product.browse, '模块树')
  @ApiOperation({ summary: '产品模块树（需求/用例共用）' })
  @ApiOkResponse({
    description: '模块树（children 嵌套）',
    schema: envelopedPage(Object),
  })
  moduleTree(@Param('id', ParseIntPipe) id: string) {
    return this.products.moduleTree(id);
  }

  @Post('modules')
  @Permissions(PERMS.product.manage, '创建模块')
  @ApiOperation({ summary: '创建模块（自动 grade/path）' })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(Object) })
  createModule(@Body() dto: CreateModuleDto, @CurrentUser() user: JwtUser) {
    return this.products.createModule(dto, user.id);
  }

  @Put('modules/:id')
  @Permissions(PERMS.product.manage, '编辑模块')
  @ApiOperation({ summary: '编辑模块' })
  @ApiOkResponse({ description: '更新成功', schema: enveloped(Object) })
  updateModule(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.products.updateModule(id, dto);
  }

  @Delete('modules/:id')
  @Permissions(PERMS.product.manage, '删除模块')
  @ApiOperation({ summary: '删除模块（软删；有子模块拒绝 4102）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  removeModule(@Param('id', ParseIntPipe) id: string) {
    return this.products.removeModule(id);
  }
}
