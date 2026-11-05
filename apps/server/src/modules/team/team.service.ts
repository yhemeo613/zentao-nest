import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { DataScopeService } from '../data-scope/data-scope.service.js';
import { ZtTeam } from './entities/zt-team.entity.js';
import { AddTeamMemberDto, UpdateTeamMemberDto } from './dto/team.dto.js';

/** 团队成员（docs/03 §4.8/4.9 team 端点；变更触发数据权限缓存失效） */
@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(ZtTeam) private readonly teamRepo: Repository<ZtTeam>,
    private readonly dataScope: DataScopeService,
  ) {}

  async list(
    rootType: 'project' | 'execution',
    rootId: string,
  ): Promise<ZtTeam[]> {
    return this.teamRepo.find({
      where: { rootType, rootId },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
  }

  async add(
    rootType: 'project' | 'execution',
    rootId: string,
    dto: AddTeamMemberDto,
  ): Promise<ZtTeam> {
    const dup = await this.teamRepo.findOne({
      where: { rootType, rootId, userId: dto.userId },
    });
    if (dup)
      throw new BusinessException(
        ErrorCodes.VALIDATION.DUPLICATED,
        '成员已存在',
      );
    const member = await this.teamRepo.save(
      this.teamRepo.create({
        rootType,
        rootId,
        userId: dto.userId,
        role: dto.role ?? '',
        position: dto.position ?? '',
        limited: dto.limited ?? 0,
        days: dto.days ?? 0,
        hours: dto.hours ?? 0,
        joinDate: new Date(),
      }),
    );
    // 团队变更影响该成员可见集（成员可看所属 private 项目/执行，docs/02 §2.2）
    await this.dataScope.invalidateUser(dto.userId);
    return member;
  }

  async update(memberId: string, dto: UpdateTeamMemberDto): Promise<ZtTeam> {
    const member = await this.teamRepo.findOneBy({ id: memberId });
    if (!member)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '成员记录不存在',
      );
    if (dto.role !== undefined) member.role = dto.role;
    if (dto.position !== undefined) member.position = dto.position;
    if (dto.days !== undefined) member.days = dto.days;
    if (dto.hours !== undefined) member.hours = dto.hours;
    return this.teamRepo.save(member);
  }

  async remove(memberId: string): Promise<void> {
    const member = await this.teamRepo.findOneBy({ id: memberId });
    if (!member)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '成员记录不存在',
      );
    await this.teamRepo.delete(memberId);
    await this.dataScope.invalidateUser(member.userId);
  }
}
