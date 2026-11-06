import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtFile } from './entities/zt-file.entity.js';

const ALLOWED_EXT = [
  'jpg',
  'png',
  'gif',
  'bmp',
  'jpeg',
  'webp',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'pdf',
  'txt',
  'md',
  'zip',
  'csv',
];
const MAX_SIZE = 20 * 1024 * 1024;

/** 附件（docs/03 §4.0 /files；本地磁盘 uploads/ + 元数据；下载走鉴权接口而非公开 URL） */
@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly storageDir = join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(ZtFile) private readonly fileRepo: Repository<ZtFile>,
  ) {
    mkdirSync(this.storageDir, { recursive: true });
  }

  async upload(
    file: { originalname: string; buffer: Buffer; size: number },
    operatorId: string,
    objectType?: string,
    objectId?: string,
  ): Promise<ZtFile> {
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      throw new BusinessException(
        ErrorCodes.FILE.EXT_NOT_ALLOWED,
        `扩展名 .${ext} 不在白名单`,
      );
    }
    if (file.size > MAX_SIZE)
      throw new BusinessException(
        ErrorCodes.FILE.SIZE_EXCEEDED,
        '超出 20MB 限制',
      );
    const storageKey = `${randomUUID()}.${ext}`;
    writeFileSync(join(this.storageDir, storageKey), file.buffer);
    const created = await this.fileRepo.save(
      this.fileRepo.create({
        storageKey,
        title: file.originalname,
        extension: ext,
        size: file.size,
        objectType: objectType ?? '',
        objectId: objectId ? Number(objectId) : 0,
        createdBy: operatorId,
      }),
    );
    this.logger.log(`[file] ${created.id} ${file.originalname} ${file.size}B`);
    return created;
  }

  /** 读取文件内容（鉴权后调用） */
  read(storageKey: string): Buffer {
    return readFileSync(join(this.storageDir, storageKey));
  }

  async get(id: string): Promise<ZtFile> {
    const f = await this.fileRepo.findOne({ where: { id, deleted: 0 } });
    if (!f)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '附件不存在',
      );
    return f;
  }

  async list(objectType: string, objectId: string): Promise<ZtFile[]> {
    return this.fileRepo.find({
      where: { objectType, objectId: Number(objectId), deleted: 0 },
      order: { id: 'DESC' },
    });
  }

  async remove(id: string, operatorId: string): Promise<void> {
    const f = await this.get(id);
    if (f.createdBy !== operatorId)
      throw new BusinessException(
        ErrorCodes.AUTH.DATA_FORBIDDEN,
        '仅上传人可删除',
      );
    await this.fileRepo.update(id, { deleted: 1 });
  }
}
