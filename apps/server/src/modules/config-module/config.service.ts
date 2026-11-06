import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { SysConfig } from './entities/sys-config.entity.js';

/** 只读配置键（5503，环境/安全类不入库改） */
const READONLY_KEYS = ['system.common.secret'];

/** 配置服务（docs/03 §4.25；Redis 缓存 10min，变更失效）——needReview 等配置化的落点 */
@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(SysConfig)
    private readonly configRepo: Repository<SysConfig>,
    private readonly redis: RedisService,
  ) {}

  /** 读单键（缓存优先；未设置返回默认值） */
  async get(
    module: string,
    section: string,
    key: string,
    defaultValue?: string,
  ): Promise<string | null> {
    const cacheKey = `config:${module}.${section}.${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached === '__NULL__' ? null : cached;
    const row = await this.configRepo.findOne({
      where: {
        scope: 'system',
        owner: 'system',
        module,
        section,
        keyName: key,
      },
    });
    const value = row?.value ?? defaultValue ?? null;
    await this.redis.set(cacheKey, value ?? '__NULL__', 600);
    return value;
  }

  /** story.needReview 便捷方法（docs/02 §4.2 配置化落点） */
  async storyNeedReview(): Promise<boolean> {
    return (await this.get('story', 'common', 'needReview', '1')) === '1';
  }

  async list(): Promise<SysConfig[]> {
    return this.configRepo.find({
      order: { module: 'ASC', section: 'ASC', keyName: 'ASC' },
    });
  }

  /** 批量更新（只读键 5503 拒绝）+ 缓存失效 */
  async setMany(
    items: Array<{
      module: string;
      section: string;
      key: string;
      value: string;
    }>,
  ): Promise<number> {
    let changed = 0;
    for (const item of items) {
      if (
        READONLY_KEYS.includes(`${item.module}.${item.section}.${item.key}`)
      ) {
        throw new BusinessException(
          ErrorCodes.WEBHOOK_CONFIG.CONFIG_READONLY,
          `配置 ${item.module}.${item.key} 只读`,
        );
      }
      let row = await this.configRepo.findOne({
        where: {
          scope: 'system',
          owner: 'system',
          module: item.module,
          section: item.section,
          keyName: item.key,
        },
      });
      if (!row) {
        row = this.configRepo.create({
          scope: 'system',
          owner: 'system',
          module: item.module,
          section: item.section,
          keyName: item.key,
          value: item.value,
        });
      } else {
        row.value = item.value;
      }
      await this.configRepo.save(row);
      await this.redis.del(`config:${item.module}.${item.section}.${item.key}`);
      changed += 1;
    }
    return changed;
  }
}
