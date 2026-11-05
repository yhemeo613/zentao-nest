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
import { DocService } from './doc.service.js';
import { ZtDoc } from './entities/zt-doc.entity.js';
import { ZtDocLib } from './entities/zt-doc-lib.entity.js';
import { ZtDocSpace } from './entities/zt-doc-space.entity.js';
import {
  CreateDocDto,
  CreateDocLibDto,
  CreateSpaceDto,
  UpdateDocDto,
} from './dto/doc.dto.js';

@ApiTags('doc')
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
export class DocController {
  constructor(private readonly docs: DocService) {}

  // ---- 空间 ----
  @Get('doc-spaces')
  @Permissions(PERMS.doc.browseSpace, '文档空间列表')
  @ApiOperation({ summary: '文档空间列表' })
  @ApiOkResponse({ description: '空间列表', schema: envelopedPage(ZtDocSpace) })
  listSpaces() {
    return this.docs.listSpaces();
  }

  @Post('doc-spaces')
  @Permissions(PERMS.doc.manageSpace, '创建文档空间')
  @ApiOperation({
    summary: '创建文档空间（product/project/execution/personal）',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtDocSpace) })
  createSpace(@Body() dto: CreateSpaceDto, @CurrentUser() user: JwtUser) {
    return this.docs.createSpace(dto, user.id);
  }

  // ---- 库 ----
  @Get('doc-spaces/:id/libs')
  @Permissions(PERMS.doc.browseLib, '文档库列表')
  @ApiOperation({ summary: '空间下文档库列表' })
  @ApiOkResponse({ description: '库列表', schema: envelopedPage(ZtDocLib) })
  listLibs(@Param('id', ParseIntPipe) id: string) {
    return this.docs.listLibs(String(id));
  }

  @Post('doc-libs')
  @Permissions(PERMS.doc.manageLib, '创建文档库')
  @ApiOperation({ summary: '创建文档库' })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtDocLib) })
  createLib(@Body() dto: CreateDocLibDto, @CurrentUser() user: JwtUser) {
    return this.docs.createLib(dto, user.id);
  }

  // ---- 文档 ----
  @Get('doc-libs/:id/docs')
  @Permissions(PERMS.doc.browse, '文档列表')
  @ApiOperation({ summary: '库下文档列表' })
  @ApiOkResponse({ description: '文档列表', schema: envelopedPage(ZtDoc) })
  listDocs(@Param('id', ParseIntPipe) id: string) {
    return this.docs.listDocs(String(id));
  }

  @Get('docs/:id')
  @Permissions(PERMS.doc.view, '文档详情')
  @ApiOperation({
    summary: '文档详情',
    description:
      '含当前版本正文与版本历史；?version= 查历史版本；浏览计数 +1。',
  })
  @ApiOkResponse({
    description: '文档详情（含 content/contents）',
    schema: enveloped(ZtDoc),
  })
  @ApiResponse({
    status: 404,
    description: '不存在(3005)',
    schema: { example: ERRORS.notFound },
  })
  get(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Query('version') version?: string,
  ) {
    void user;
    return this.docs.getDoc(id, version ? Number(version) : undefined);
  }

  @Post('docs')
  @Permissions(PERMS.doc.create, '创建文档')
  @ApiOperation({
    summary: '创建文档',
    description: 'Markdown 正文写入 v1；type=link 时 content 为 URL。',
  })
  @ApiOkResponse({ description: '创建成功', schema: enveloped(ZtDoc) })
  createDoc(@Body() dto: CreateDocDto, @CurrentUser() user: JwtUser) {
    return this.docs.createDoc(dto, user.id);
  }

  @Put('docs/:id')
  @Permissions(PERMS.doc.edit, '编辑文档')
  @ApiOperation({
    summary: '编辑文档',
    description: '正文变化 → version+1（保留全部历史版本）。',
  })
  @ApiOkResponse({
    description: '更新成功（含新版本号）',
    schema: enveloped(ZtDoc),
  })
  updateDoc(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: UpdateDocDto,
  ) {
    return this.docs.updateDoc(id, dto, user.id);
  }

  @Delete('docs/:id')
  @Permissions(PERMS.doc.delete, '删除文档')
  @ApiOperation({ summary: '删除文档（软删 + 清正文版本）' })
  @ApiOkResponse({
    description: '删除成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  removeDoc(@Param('id', ParseIntPipe) id: string) {
    return this.docs.removeDoc(id);
  }

  @Get('docs/:id/versions')
  @Permissions(PERMS.doc.view, '文档版本历史')
  @ApiOperation({ summary: '版本历史列表' })
  @ApiOkResponse({ description: '版本列表', schema: envelopedPage(ZtDoc) })
  versions(@Param('id', ParseIntPipe) id: string) {
    return this.docs.docVersions(id);
  }
}
