import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { RedisModule } from './common/redis/redis.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    // 环境变量：monorepo 下 turbo 以 apps/server 为 cwd，读取应用级 .env
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [join(process.cwd(), '.env')],
    }),
    // MySQL8（docker-compose 容器）；实体随 P1 起经 autoLoadEntities 注册
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: Number(config.get<string>('DB_PORT', '3306')),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'zentao_nest'),
        charset: 'utf8mb4',
        autoLoadEntities: true,
        // 生产强制 false（docs/01 §13）；开发默认亦为 false，实体演进一律走 migration
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    RedisModule,
    HealthModule,
  ],
})
export class AppModule {}
