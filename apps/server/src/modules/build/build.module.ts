import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtBuild } from './entities/zt-build.entity.js';
import { ZtBuildStory } from './entities/zt-build-story.entity.js';
import { ZtBuildBug } from './entities/zt-build-bug.entity.js';
import { ZtStory } from '../story/entities/zt-story.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { BuildController } from './build.controller.js';
import { BuildService } from './build.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZtBuild, ZtBuildStory, ZtBuildBug, ZtStory, ZtBug]),
  ],
  controllers: [BuildController],
  providers: [BuildService],
  exports: [BuildService],
})
export class BuildModule {}
