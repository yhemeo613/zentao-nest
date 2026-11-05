import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtDocSpace } from './entities/zt-doc-space.entity.js';
import { ZtDocLib } from './entities/zt-doc-lib.entity.js';
import { ZtDoc } from './entities/zt-doc.entity.js';
import { ZtDocContent } from './entities/zt-doc-content.entity.js';
import {
  CreateDocDto,
  CreateDocLibDto,
  CreateSpaceDto,
  UpdateDocDto,
} from './dto/doc.dto.js';

export interface DocWithContent extends ZtDoc {
  content: string | null;
  contents?: ZtDocContent[];
}

/** 文档（docs/03 §4.15：空间→库→文档，正文版本化） */
@Injectable()
export class DocService {
  constructor(
    @InjectRepository(ZtDocSpace)
    private readonly spaceRepo: Repository<ZtDocSpace>,
    @InjectRepository(ZtDocLib) private readonly libRepo: Repository<ZtDocLib>,
    @InjectRepository(ZtDoc) private readonly docRepo: Repository<ZtDoc>,
    @InjectRepository(ZtDocContent)
    private readonly contentRepo: Repository<ZtDocContent>,
  ) {}

  // ---- 空间 ----
  async createSpace(
    dto: CreateSpaceDto,
    operatorId: string,
  ): Promise<ZtDocSpace> {
    return this.spaceRepo.save(
      this.spaceRepo.create({
        objectType: dto.objectType,
        objectId: Number(dto.objectId ?? 0),
        name: dto.name,
        acl: dto.acl ?? 'open',
        whitelist: dto.whitelist ?? null,
        createdBy: operatorId,
      }),
    );
  }

  async listSpaces(): Promise<ZtDocSpace[]> {
    return this.spaceRepo.find({ where: { deleted: 0 }, order: { id: 'ASC' } });
  }

  // ---- 库 ----
  async createLib(dto: CreateDocLibDto, operatorId: string): Promise<ZtDocLib> {
    const space = await this.mustFindSpace(dto.spaceId);
    return this.libRepo.save(
      this.libRepo.create({
        spaceId: space.id,
        name: dto.name,
        main: dto.main ?? 0,
        sortNo: dto.sortNo ?? 0,
        createdBy: operatorId,
      }),
    );
  }

  async listLibs(spaceId: string): Promise<ZtDocLib[]> {
    return this.libRepo.find({
      where: { spaceId, deleted: 0 },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
  }

  // ---- 文档 ----
  async createDoc(dto: CreateDocDto, operatorId: string): Promise<ZtDoc> {
    await this.mustFindLib(dto.libId);
    const created = await this.docRepo.save(
      this.docRepo.create({
        libId: dto.libId,
        moduleId: dto.moduleId ?? 0,
        title: dto.title,
        keywords: dto.keywords ?? '',
        type: dto.type ?? 'markdown',
        url: dto.type === 'link' ? (dto.content ?? '') : '',
        objectType: dto.objectType ?? '',
        objectId: dto.objectId ? Number(dto.objectId) : 0,
        openedBy: operatorId,
        createdBy: operatorId,
      }),
    );
    if (dto.type !== 'link') {
      await this.contentRepo.save(
        this.contentRepo.create({
          docId: created.id,
          version: 1,
          content: dto.content ?? '',
          editedBy: operatorId,
        }),
      );
    }
    return created;
  }

  async listDocs(libId: string) {
    return this.docRepo.find({
      where: { libId, deleted: 0 },
      order: { sortNo: 'ASC', id: 'DESC' },
    });
  }

  async getDoc(id: string, version?: number): Promise<DocWithContent> {
    const doc = await this.mustFindDoc(id);
    doc.views += 1;
    await this.docRepo.save(doc);
    const v = version ?? doc.version;
    const contentRow = await this.contentRepo.findOne({
      where: { docId: id, version: v },
    });
    const contents = await this.contentRepo.find({
      where: { docId: id },
      order: { version: 'DESC' },
    });
    return { ...doc, content: contentRow?.content ?? null, contents };
  }

  /** 编辑：内容变化 → version+1（docs/02 §11 版本化语义，docs/03 §4.15） */
  async updateDoc(
    id: string,
    dto: UpdateDocDto,
    operatorId: string,
  ): Promise<DocWithContent> {
    const doc = await this.mustFindDoc(id);
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.keywords !== undefined) doc.keywords = dto.keywords;
    if (dto.sortNo !== undefined) doc.sortNo = dto.sortNo;
    const saved = await this.docRepo.save(doc);

    if (dto.content !== undefined && dto.content !== null) {
      const current = await this.contentRepo.findOne({
        where: { docId: id, version: doc.version },
      });
      if (current && current.content === dto.content) return this.getDoc(id);
      const nextVersion = doc.version + 1;
      await this.contentRepo.save(
        this.contentRepo.create({
          docId: id,
          version: nextVersion,
          content: dto.content,
          editedBy: operatorId,
        }),
      );
      saved.version = nextVersion;
      await this.docRepo.save(saved);
    }
    return this.getDoc(id);
  }

  async removeDoc(id: string): Promise<void> {
    await this.mustFindDoc(id);
    await this.docRepo.update(id, { deleted: 1 });
    await this.contentRepo.delete({ docId: id });
  }

  /** 版本历史 */
  async docVersions(id: string): Promise<ZtDocContent[]> {
    await this.mustFindDoc(id);
    return this.contentRepo.find({
      where: { docId: id },
      order: { version: 'DESC' },
    });
  }

  private async mustFindSpace(id: string): Promise<ZtDocSpace> {
    const space = await this.spaceRepo.findOne({ where: { id, deleted: 0 } });
    if (!space)
      throw new BusinessException(
        ErrorCodes.DOC.LIB_TYPE_INVALID,
        '文档空间不存在',
      );
    return space;
  }

  private async mustFindLib(id: string): Promise<ZtDocLib> {
    const lib = await this.libRepo.findOne({ where: { id, deleted: 0 } });
    if (!lib)
      throw new BusinessException(
        ErrorCodes.DOC.LIB_TYPE_INVALID,
        '文档库不存在',
      );
    return lib;
  }

  private async mustFindDoc(id: string): Promise<ZtDoc> {
    const doc = await this.docRepo.findOne({ where: { id, deleted: 0 } });
    if (!doc)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '文档不存在',
      );
    return doc;
  }
}
