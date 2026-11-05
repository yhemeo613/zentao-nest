import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { PageQueryDto, toPageResult } from '../../common/dto/page.dto.js';
import { PermissionCacheService } from './permission-cache.service.js';
import { SysUser } from './entities/sys-user.entity.js';
import { SysUserRole } from './entities/sys-user-role.entity.js';
import {
  AssignRolesDto,
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user.dto.js';

/** 用户 CRUD（docs/03 §4.1；role 展示字段不参与鉴权 docs/02 §2.1） */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(SysUser) private readonly userRepo: Repository<SysUser>,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    private readonly permCache: PermissionCacheService,
  ) {}

  async create(dto: CreateUserDto, operatorId: string): Promise<SysUser> {
    const exists = await this.userRepo.findOne({
      where: { account: dto.account, deleted: 0 },
    });
    if (exists) throw new BusinessException(ErrorCodes.SYSTEM.ACCOUNT_EXISTS);
    const user = await this.userRepo.save(
      this.userRepo.create({
        account: dto.account,
        password: await bcrypt.hash(dto.password, 12),
        realname: dto.realname,
        nickname: dto.nickname ?? '',
        role: dto.role ?? '',
        deptId: String(dto.deptId ?? 0),
        email: dto.email ?? '',
        mobile: dto.mobile ?? '',
        createdBy: operatorId,
      }),
    );
    if (dto.roleIds?.length) {
      await this.assignRoles(user.id, dto.roleIds, 0);
    }
    return this.sanitize(user);
  }

  async list(query: UserQueryDto) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.deleted = 0')
      .orderBy('u.id', query.sortOrder);
    if (query.keyword) {
      qb.andWhere(
        '(u.account LIKE :kw OR u.realname LIKE :kw OR u.nickname LIKE :kw)',
        {
          kw: `%${query.keyword}%`,
        },
      );
    }
    if (query.deptId)
      qb.andWhere('u.dept_id = :deptId', { deptId: query.deptId });
    const [list, total] = await qb
      .skip(query.offset)
      .take(query.pageSize)
      .getManyAndCount();
    return toPageResult(
      list.map((u) => this.sanitize(u)),
      total,
      query,
    );
  }

  async get(id: string): Promise<SysUser> {
    const user = await this.userRepo.findOne({ where: { id, deleted: 0 } });
    if (!user) throw new BusinessException(ErrorCodes.VALIDATION.NOT_FOUND);
    const roles = await this.userRoleRepo.find({
      where: { userId: id, projectId: 0 },
    });
    return {
      ...this.sanitize(user),
      roleIds: roles.map((r) => Number(r.roleId)),
    } as SysUser & {
      roleIds: number[];
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    operatorId: string,
  ): Promise<SysUser> {
    const user = await this.get(id);
    const patch: Partial<SysUser> = { createdBy: operatorId };
    if (dto.realname !== undefined) patch.realname = dto.realname;
    if (dto.nickname !== undefined) patch.nickname = dto.nickname;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.deptId !== undefined) patch.deptId = String(dto.deptId);
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.mobile !== undefined) patch.mobile = dto.mobile;
    // 改密：bcrypt 重哈希 + 使该用户旧 access 失效由 denylist/短 TTL 兜底（docs/03 §8）
    if (dto.password) patch.password = await bcrypt.hash(dto.password, 12);
    const saved = await this.userRepo.save({ ...user, ...patch });
    await this.permCache.invalidateUser(id);
    return this.sanitize(saved);
  }

  /** 软删（deleted=1，docs/04 §1）；账号保留防重名 */
  async remove(id: string): Promise<void> {
    const user = await this.get(id);
    await this.userRepo.update(user.id, { deleted: 1 });
    await this.permCache.invalidateUser(id);
  }

  async assignRoles(
    userId: string,
    roleIds: number[],
    projectId: number,
  ): Promise<void> {
    await this.userRepo.findOneByOrFail({ id: userId });
    await this.userRoleRepo.delete({ userId, projectId });
    if (roleIds.length > 0) {
      await this.userRoleRepo.save(
        roleIds.map((roleId) =>
          this.userRoleRepo.create({
            userId,
            roleId: String(roleId),
            projectId,
          }),
        ),
      );
    }
    await this.permCache.invalidateUser(userId);
  }

  /** 摘除密码等敏感字段（docs/03 §8 安全清单） */
  private sanitize(user: SysUser): SysUser {
    const { password: _password, ...rest } = user;
    return rest as SysUser;
  }
}
