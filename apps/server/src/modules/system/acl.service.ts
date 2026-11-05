import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysAcl } from './entities/sys-acl.entity.js';

export interface SetAclDto {
  objectType: string;
  objectId: string;
  userIds: string[];
}

/** 数据权限白名单（docs/03 §4.1 /acl；对齐禅道 zt_acl + personnel 语义） */
@Injectable()
export class AclService {
  constructor(
    @InjectRepository(SysAcl) private readonly aclRepo: Repository<SysAcl>,
  ) {}

  async list(objectType: string, objectId: string): Promise<SysAcl[]> {
    return this.aclRepo.find({ where: { objectType, objectId } });
  }

  /** 全量替换对象白名单（replace 语义，对齐禅道 updateWhitelist） */
  async set(dto: SetAclDto): Promise<void> {
    await this.aclRepo.delete({
      objectType: dto.objectType,
      objectId: dto.objectId,
    });
    if (dto.userIds.length > 0) {
      await this.aclRepo.save(
        dto.userIds.map((userId) =>
          this.aclRepo.create({
            userId,
            objectType: dto.objectType,
            objectId: dto.objectId,
            source: 'manual',
          }),
        ),
      );
    }
  }
}
