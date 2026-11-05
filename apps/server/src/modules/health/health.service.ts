import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service.js';

/** 健康检查：DB / Redis 连通性（docs/01 §13 探活口径） */
@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<{ db: boolean; redis: boolean; uptime: number }> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    return { db, redis, uptime: Math.floor(process.uptime()) };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
