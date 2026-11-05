import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtDocSpace } from './entities/zt-doc-space.entity.js';
import { ZtDocLib } from './entities/zt-doc-lib.entity.js';
import { ZtDoc } from './entities/zt-doc.entity.js';
import { ZtDocContent } from './entities/zt-doc-content.entity.js';
import { DocController } from './doc.controller.js';
import { DocService } from './doc.service.js';

/** 文档模块（P5，docs/01 §6.7） */
@Module({
  imports: [
    TypeOrmModule.forFeature([ZtDocSpace, ZtDocLib, ZtDoc, ZtDocContent]),
  ],
  controllers: [DocController],
  providers: [DocService],
  exports: [DocService],
})
export class DocModule {}
