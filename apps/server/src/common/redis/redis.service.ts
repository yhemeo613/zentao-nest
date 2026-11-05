import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Redis 客户端封装（docker-compose 容器）。
 * 职责边界（docs/01 §10）：权限缓存 / 会话与 token / 统计缓存 / 看板 presence。
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: Number(config.get<string>('REDIS_PORT', '6379')),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }

  ping(): Promise<string> {
    return this.client.ping();
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    return ttlSeconds
      ? this.client.set(key, value, 'EX', ttlSeconds)
      : this.client.set(key, value);
  }

  del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
