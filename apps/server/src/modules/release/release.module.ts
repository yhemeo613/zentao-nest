import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtRelease } from './entities/zt-release.entity.js';
import { ZtReleaseRelated } from './entities/zt-release-related.entity.js';
import { ZtBuild } from '../build/entities/zt-build.entity.js';
import { ZtBuildStory } from '../build/entities/zt-build-story.entity.js';
import { ZtBuildBug } from '../build/entities/zt-build-bug.entity.js';
import { ZtBug } from '../bug/entities/zt-bug.entity.js';
import { BuildModule } from '../build/build.module.js';
import { StoryModule } from '../story/story.module.js';
import { ReleaseController } from './release.controller.js';
import { ReleaseService } from './release.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZtRelease,
      ZtReleaseRelated,
      ZtBuild,
      ZtBuildStory,
      ZtBuildBug,
      ZtBug,
    ]),
    BuildModule,
    StoryModule,
  ],
  controllers: [ReleaseController],
  providers: [ReleaseService],
  exports: [ReleaseService],
})
export class ReleaseModule {}
