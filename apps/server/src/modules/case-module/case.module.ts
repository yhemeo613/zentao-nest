import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtCase } from './entities/zt-case.entity.js';
import { ZtCaseStep } from './entities/zt-case-step.entity.js';
import { ZtCaseSpec } from './entities/zt-case-spec.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { CaseController } from './case.controller.js';
import { CaseService } from './case.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZtCase, ZtCaseStep, ZtCaseSpec, ZtStory]),
  ],
  controllers: [CaseController],
  providers: [CaseService],
  exports: [CaseService],
})
export class CaseModule {}
