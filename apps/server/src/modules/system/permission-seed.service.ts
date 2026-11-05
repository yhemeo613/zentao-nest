import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { allPermKeys } from '@zentao/shared';
import { getPermissionRegistry } from '../../common/decorators/permissions.decorator.js';
import { ConfigService } from '@nestjs/config';
import { SysPermission } from './entities/sys-permission.entity.js';
import { SysRole } from './entities/sys-role.entity.js';
import { SysRolePermission } from './entities/sys-role-permission.entity.js';
import { SysUser } from './entities/sys-user.entity.js';
import { SysUserRole } from './entities/sys-user-role.entity.js';

/** 预置角色（docs/04 §9.1/§9.2；权限矩阵随模块落地逐步扩充，P1 仅管理员授权 system 域） */
const SEED_ROLES: Array<{ code: string; name: string; isSuper?: number }> = [
  { code: 'super', name: '超级管理员', isSuper: 1 },
  { code: 'manager', name: '管理员' },
  { code: 'po', name: '产品经理' },
  { code: 'pm', name: '项目经理' },
  { code: 'dev', name: '研发' },
  { code: 'qa', name: '测试' },
  { code: 'limited', name: '受限组' },
];

/**
 * 权限点/角色/管理员种子（docs/03 §3.1 + docs/04 §9）：
 * - 权限点来源 = shared allPermKeys()（唯一事实源），装饰器注册表做漂移告警；
 * - 幂等：upsert 权限点、缺失标记 deprecated、角色/管理员存在即跳过。
 */
@Injectable()
export class PermissionSeedService implements OnModuleInit {
  private readonly logger = new Logger(PermissionSeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(SysPermission)
    private readonly permRepo: Repository<SysPermission>,
    @InjectRepository(SysRole) private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysRolePermission)
    private readonly rolePermRepo: Repository<SysRolePermission>,
    @InjectRepository(SysUser) private readonly userRepo: Repository<SysUser>,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedAdmin();
  }

  private async seedPermissions(): Promise<void> {
    const declared = new Set<string>(allPermKeys());

    // 装饰器漂移告警：路由用了 shared 之外的裸串（AGENTS §4 违规信号）
    for (const { perm } of getPermissionRegistry()) {
      if (!declared.has(perm))
        this.logger.warn(`[seed] 权限点未在 shared 声明：${perm}`);
    }

    for (const perm of declared) {
      const [module, action] = perm.split('.');
      const existing = await this.permRepo.findOne({
        where: { module, action },
      });
      if (!existing) {
        await this.permRepo.insert({
          module,
          action,
          name: perm,
          status: 'active',
          sortNo: 0,
        });
      } else if (existing.status === 'deprecated') {
        await this.permRepo.update(existing.id, { status: 'active' });
      }
    }
    // 缺失标记 deprecated（不物理删，保留历史授权可追溯）
    const allRows = await this.permRepo.find();
    for (const row of allRows) {
      if (
        !declared.has(`${row.module}.${row.action}`) &&
        row.status !== 'deprecated'
      ) {
        await this.permRepo.update(row.id, { status: 'deprecated' });
        this.logger.warn(
          `[seed] 权限点已废弃标记：${row.module}.${row.action}`,
        );
      }
    }
    this.logger.log(`[seed] 权限点就绪（${declared.size} 个）`);
  }

  private async seedRoles(): Promise<void> {
    const codeToRole = new Map<string, SysRole>();
    for (const def of SEED_ROLES) {
      let role = await this.roleRepo.findOne({
        where: { code: def.code, deleted: 0 },
      });
      if (!role) {
        role = await this.roleRepo.save(
          this.roleRepo.create({
            code: def.code,
            name: def.name,
            isSuper: def.isSuper ?? 0,
          }),
        );
        this.logger.log(`[seed] 创建角色 ${def.name}(${def.code})`);
      }
      codeToRole.set(def.code, role);
    }
    // 管理员 = 全量权限点（docs/04 §9.2：user/role/dept/acl 行）
    const manager = codeToRole.get('manager');
    const allPerms = await this.permRepo.find({ where: { status: 'active' } });
    if (manager) {
      const existing = await this.rolePermRepo.find({
        where: { roleId: manager.id },
      });
      const existingIds = new Set(existing.map((e) => e.permissionId));
      const toAdd = allPerms.filter((p) => !existingIds.has(p.id));
      if (toAdd.length > 0) {
        await this.rolePermRepo.save(
          toAdd.map((p) =>
            this.rolePermRepo.create({
              roleId: manager.id,
              permissionId: p.id,
            }),
          ),
        );
        this.logger.log(`[seed] 管理员角色新增 ${toAdd.length} 个权限点`);
      }
    }
    // qa 角色：追加 todo 域全量动作（测试人员日常待办，docs/04 §9.2 矩阵注：随模块演进刷新）
    const qaRole = codeToRole.get('qa');
    if (qaRole) {
      const todoPerms = allPerms.filter((perm) => perm.module === 'todo');
      const qaExisting = await this.rolePermRepo.find({
        where: { roleId: qaRole.id },
      });
      const qaIds = new Set(qaExisting.map((e) => e.permissionId));
      const qaAdd = todoPerms.filter((perm) => !qaIds.has(perm.id));
      if (qaAdd.length > 0) {
        await this.rolePermRepo.save(
          qaAdd.map((perm) =>
            this.rolePermRepo.create({
              roleId: qaRole.id,
              permissionId: perm.id,
            }),
          ),
        );
        this.logger.log(`[seed] qa 角色追加 ${qaAdd.length} 个 todo 权限点`);
      }
    }
  }

  private async seedAdmin(): Promise<void> {
    const admin = await this.userRepo.findOne({
      where: { account: 'admin', deleted: 0 },
    });
    if (admin) return; // 已存在则跳过，绝不覆写密码（docs/04 §9.1）

    const password =
      this.config.get<string>('SEED_ADMIN_PASSWORD') ?? 'Admin@123456';
    const superRole = await this.roleRepo.findOne({
      where: { code: 'super', deleted: 0 },
    });
    const user = await this.userRepo.save(
      this.userRepo.create({
        account: 'admin',
        password: await bcrypt.hash(password, 12),
        realname: '系统管理员',
        role: 'top',
      }),
    );
    if (superRole) {
      await this.userRoleRepo.save(
        this.userRoleRepo.create({
          userId: user.id,
          roleId: superRole.id,
          projectId: 0,
        }),
      );
    }
    this.logger.log(
      `[seed] 初始管理员 admin 已创建（密码来自 SEED_ADMIN_PASSWORD 或默认值，首次登录后应修改）`,
    );
  }
}
