import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { RedisService } from '../../common/redis/redis.service.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { SysAcl } from '../system/entities/sys-acl.entity.js';
import { ZtTeam } from '../team/entities/zt-team.entity.js';
import { ZtProgram } from '../program/entities/zt-program.entity.js';
import { ZtProject } from '../project/entities/zt-project.entity.js';
import { ZtExecution } from '../execution/entities/zt-execution.entity.js';

export type ScopeType = 'program' | 'project' | 'execution' | 'product';

const TTL = 600;
const viewKey = (userId: string, type: string) => `ds:user:${userId}:${type}`;

/** 对象的轻量归属投影（用于 ACL 失效与可见性断言） */
interface ScopeMeta {
  id: string;
  acl: string;
  programId?: number;
  projectId?: number;
}

/**
 * 数据权限服务（docs/02 §2.2 / ADR D005）：
 * 可见集 = open 对象 ∪ sys_acl 白名单含我 ∪ 我在 team 中的对象；
 * Redis 物化（key ds:user:{id}:{type}，TTL 10min，acl/team 变更主动失效）；
 * 列表统一 IN(可见集) 过滤；单对象 assertCanView 断言（2004）。
 */
@Injectable()
export class DataScopeService {
  constructor(
    private readonly redis: RedisService,
    @InjectRepository(SysAcl) private readonly aclRepo: Repository<SysAcl>,
    @InjectRepository(ZtTeam) private readonly teamRepo: Repository<ZtTeam>,
    @InjectRepository(ZtProgram)
    private readonly programRepo: Repository<ZtProgram>,
    @InjectRepository(ZtProject)
    private readonly projectRepo: Repository<ZtProject>,
    @InjectRepository(ZtExecution)
    private readonly executionRepo: Repository<ZtExecution>,
  ) {}

  /** 是否数据权限不受限（超管/管理员直通） */
  async isUnrestricted(userId: string): Promise<boolean> {
    const cached = await this.redis.get(`ds:user:${userId}:unrestricted`);
    if (cached !== null) return cached === '1';
    // P2 判定：拥有 acl.manage 或 group.updatePriv 权限点即不受限（管理员语义，docs/04 §9.2 管理员行）
    // 通过 PermissionCache 判定会形成循环依赖，这里直查角色表标记（super 或 manager 拥有的角色码）
    const rows = await this.aclRepo.manager.query(
      `SELECT COUNT(*) AS n FROM sys_user_role ur
       JOIN sys_role r ON r.id = ur.role_id AND r.deleted = 0
       WHERE ur.user_id = ? AND (r.is_super = 1 OR r.code IN ('manager')) AND ur.project_id = 0`,
      [userId],
    );
    const ok = Number(rows[0]?.n ?? 0) > 0;
    await this.redis.set(`ds:user:${userId}:unrestricted`, ok ? '1' : '0', TTL);
    return ok;
  }

  /** 可见对象 ID 集合（列表过滤用） */
  async getViewIds(userId: string, type: ScopeType): Promise<string[]> {
    if (await this.isUnrestricted(userId)) return [];
    // [] 表示不受限；null 表示受限制且无可见对象——约定：返回集合本身（可能为空数组=无可见）
    const cached = await this.redis.get(viewKey(userId, type));
    if (cached) {
      try {
        return JSON.parse(cached) as string[];
      } catch {
        // 缓存损坏回源
      }
    }
    const ids = await this.computeViewIds(userId, type);
    await this.redis.set(viewKey(userId, type), JSON.stringify(ids), TTL);
    return ids;
  }

  private async computeViewIds(
    userId: string,
    type: ScopeType,
  ): Promise<string[]> {
    const repo =
      type === 'program'
        ? this.programRepo
        : type === 'project'
          ? this.projectRepo
          : this.executionRepo;
    const all = await repo.find({ where: { deleted: 0 } });
    const metas: ScopeMeta[] = all.map((row) => ({
      id: row.id,
      acl: (row as unknown as { acl: string }).acl,
      programId:
        type === 'program'
          ? undefined
          : (row as unknown as { programId?: number }).programId,
    }));

    // ① open 直接过；② private/custom 进候选
    const result = new Set<string>();
    const candidates = new Set<string>();
    for (const m of metas) {
      if (m.acl === 'open') result.add(m.id);
      else candidates.add(m.id);
    }
    if (candidates.size === 0) return [...result];

    // ③ 白名单（sys_acl）
    const acls = await this.aclRepo.find({
      where: { userId, objectType: type, objectId: In([...candidates]) },
    });
    for (const a of acls) result.add(a.objectId);

    // ④ 团队成员（project/execution 用 team；program 无 team 语义，跳过）
    if (type !== 'program') {
      const teams = await this.teamRepo.find({
        where: { userId, rootType: type as 'project' | 'execution' },
      });
      for (const t of teams) if (candidates.has(t.rootId)) result.add(t.rootId);
    }

    // ⑤ 上级归属传递：execution 可见 → 所属 project 可见；project 可见 → 所属 program 可见（对齐禅道视图继承方向的反向推导在列表层处理，此处保证上层可见性不因下层泄露）
    return [...result];
  }

  /** 单对象断言：不存在抛 3005；存在但不可见抛 2004（docs/03 §2） */
  async assertCanView(
    userId: string,
    type: ScopeType,
    objectId: string,
  ): Promise<void> {
    const repo =
      type === 'program'
        ? this.programRepo
        : type === 'project'
          ? this.projectRepo
          : type === 'execution'
            ? this.executionRepo
            : this.executionRepo;
    const row = await repo.findOne({ where: { id: objectId, deleted: 0 } });
    if (!row)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        `${type} 不存在`,
      );
    if (await this.isUnrestricted(userId)) return;

    const acl = (row as unknown as { acl: string }).acl ?? 'open';
    if (acl === 'open') return;

    // private/custom：白名单 ∪ 团队
    const aclHit = await this.aclRepo.findOne({
      where: { userId, objectType: type, objectId },
    });
    if (aclHit) return;
    if (type !== 'program') {
      const teamHit = await this.teamRepo.findOne({
        where: {
          userId,
          rootType: type as 'project' | 'execution',
          rootId: objectId,
        },
      });
      if (teamHit) return;
    }
    throw new BusinessException(ErrorCodes.AUTH.DATA_FORBIDDEN, '无数据权限');
  }

  /** 白名单/团队/角色变更后：失效该用户（或全量）可见集缓存 */
  async invalidateUser(userId?: string): Promise<void> {
    if (userId) {
      await this.redis.del(
        viewKey(userId, 'program'),
        viewKey(userId, 'project'),
        viewKey(userId, 'execution'),
        viewKey(userId, 'product'),
        `ds:user:${userId}:unrestricted`,
      );
      return;
    }
    // 全量失效（角色表直查的 unrestricted 缓存随角色变更需全清；P2 数据量小可接受，P7 优化为按角色反查用户）
    const users: Array<{ user_id: string }> = await this.aclRepo.manager.query(
      'SELECT DISTINCT user_id FROM sys_user_role',
    );
    await Promise.all(users.map((u) => this.invalidateUser(u.user_id)));
  }
}
