import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysConfig } from './entities/sys-config.entity.js';
import { ConfigController } from './config.controller.js';
import { ConfigService } from './config.service.js';

/** 配置模块（P5/P6 补齐，docs/03 §4.25） */
@Module({
  imports: [TypeOrmModule.forFeature([SysConfig])],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
