import { Module } from '@nestjs/common';
import { DataScopeModule } from '../data-scope/data-scope.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZtTeam } from './entities/zt-team.entity.js';
import { TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';

@Module({
  imports: [DataScopeModule, TypeOrmModule.forFeature([ZtTeam])],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
