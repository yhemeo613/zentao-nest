import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ZentaoSnakeNamingStrategy } from './naming.strategy.js';

/**
 * TypeORM CLI 数据源（迁移生成/执行专用，docs/01 §13 迁移纪律）
 * 生成：pnpm --filter @zentao/server exec tsx node_modules/typeorm/cli.js migration:generate src/database/migrations/<Name> -d src/database/data-source.ts
 * 执行：pnpm --filter @zentao/server exec tsx node_modules/typeorm/cli.js migration:run -d src/database/data-source.ts
 * （cwd 必须为 apps/server；经 tsx 直接加载 TS 实体）
 */
const env = process.env;

export const appDataSourceOptions = {
  type: 'mysql' as const,
  host: env.DB_HOST ?? '127.0.0.1',
  port: Number(env.DB_PORT ?? '3306'),
  username: env.DB_USERNAME ?? 'root',
  password: env.DB_PASSWORD ?? '',
  database: env.DB_DATABASE ?? 'zentao_nest',
  charset: 'utf8mb4',
  namingStrategy: new ZentaoSnakeNamingStrategy(),
  entities: ['src/modules/**/*.entity.ts', 'src/modules/**/*.entities.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'sys_migration',
};

export default new DataSource(appDataSourceOptions);
