import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtFile } from './entities/zt-file.entity.js';
import { FileController } from './file.controller.js';
import { FileService } from './file.service.js';

/** 附件模块（docs/03 §4.0 /files） */
@Module({
  imports: [TypeOrmModule.forFeature([ZtFile])],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
