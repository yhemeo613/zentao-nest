import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ZentaoSnakeNamingStrategy } from './database/naming.strategy.js';
import { RedisModule } from './common/redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SystemModule } from './modules/system/system.module.js';
import { ProgramModule } from './modules/program/program.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { ProjectModule } from './modules/project/project.module.js';
import { ExecutionModule } from './modules/execution/execution.module.js';
import { TeamModule } from './modules/team/team.module.js';
import { StoryModule } from './modules/story/story.module.js';
import { PlanModule } from './modules/plan/plan.module.js';
import { BuildModule } from './modules/build/build.module.js';
import { ReleaseModule } from './modules/release/release.module.js';
import { TaskModule } from './modules/task/task.module.js';
import { BugModule } from './modules/bug/bug.module.js';
import { CaseModule } from './modules/case-module/case.module.js';
import { TestTaskModule } from './modules/testtask/testtask.module.js';
import { ProjectStoryModule } from './modules/projectstory/projectstory.module.js';

@Module({
  imports: [
    // 环境变量：monorepo 下 turbo 以 apps/server 为 cwd，读取应用级 .env
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [join(process.cwd(), '.env')],
    }),
    // MySQL8（docker-compose 容器）；实体随模块 forFeature 注册（autoLoadEntities）
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
        namingStrategy: new ZentaoSnakeNamingStrategy(),
        autoLoadEntities: true,
        // 生产强制 false（docs/01 §13）；实体演进一律走 migration
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    RedisModule,
    HealthModule,
    AuthModule,
    SystemModule,
    ProgramModule,
    ProductModule,
    ProjectModule,
    ExecutionModule,
    TeamModule,
    StoryModule,
    PlanModule,
    BuildModule,
    ReleaseModule,
    TaskModule,
    BugModule,
    CaseModule,
    TestTaskModule,
    ProjectStoryModule,
  ],
})
export class AppModule {}
