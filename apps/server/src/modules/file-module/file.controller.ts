import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import { PERMS } from '@zentao/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import {
  ERRORS,
  enveloped,
  envelopedPage,
} from '../../common/swagger/swagger.helper.js';
import { FileService } from './file.service.js';
import { ZtFile } from './entities/zt-file.entity.js';

@ApiTags('file')
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
@Controller('files')
export class FileController {
  constructor(private readonly files: FileService) {}

  @Post()
  @Permissions(PERMS.file.upload, '上传附件')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '上传附件',
    description:
      '白名单扩展名 + 20MB 上限（5401/5402）；multipart 字段名 file。',
  })
  @ApiResponse({
    status: 200,
    description: '上传成功（返回元数据）',
    schema: enveloped(ZtFile),
  })
  upload(
    @CurrentUser() user: JwtUser,
    // @types/multer 未装，此处放宽（docs/06 §4.2 允许局部注释断言）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @UploadedFile() file: any,
    @Query('objectType') objectType?: string,
    @Query('objectId') objectId?: string,
  ) {
    return this.files.upload(
      { originalname: file.originalname, buffer: file.buffer, size: file.size },
      user.id,
      objectType,
      objectId,
    );
  }

  @Get()
  @Permissions(PERMS.file.download, '附件列表')
  @ApiOperation({ summary: '对象附件列表（?objectType=&objectId=）' })
  @ApiResponse({
    status: 200,
    description: '附件列表',
    schema: envelopedPage(ZtFile),
  })
  list(
    @Query('objectType') objectType: string,
    @Query('objectId') objectId: string,
  ) {
    return this.files.list(objectType, objectId);
  }

  @Get(':id/download')
  @Permissions(PERMS.file.download, '下载附件')
  @ApiOperation({ summary: '下载附件（鉴权直读，非公开 URL）' })
  async download(
    @Param('id', ParseIntPipe) id: string,
    @Res() res: ExpressResponse,
  ) {
    const f = await this.files.get(String(id));
    const content = this.files.read(f.storageKey);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(f.title)}"`,
    );
    res.send(content);
  }

  @Delete(':id')
  @Permissions(PERMS.file.delete, '删除附件')
  @ApiOperation({ summary: '删除附件（软删；仅上传人 2004）' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: envelopedPage(ZtFile),
  })
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: string,
  ) {
    await this.files.remove(String(id), user.id);
    return null;
  }
}
