import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { JwtUser } from '../../common/decorators/current-user.decorator.js';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  JwtStrategy,
} from './jwt.strategy.js';
import { LoginDto } from './dto/auth.dto.js';
import { SysUser } from '../system/entities/sys-user.entity.js';
import { PermissionCacheService } from '../system/permission-cache.service.js';

const MAX_FAILS = 5; // docs/03 §8：连续失败 5 次锁 15 分钟
const LOCK_MINUTES = 15;
const whitelistKey = (userId: string) => `token:whitelist:${userId}`;
const denylistKey = (jti: string) => `token:denylist:${jti}`;

/** 认证服务（docs/03 §4.0）：双 token、失败锁定、refresh 白名单轮换、logout 吊销 */
@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly permCache: PermissionCacheService,
    @InjectRepository(SysUser) private readonly userRepo: Repository<SysUser>,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findOne({
      where: { account: dto.account, deleted: 0 },
    });
    // 统一错误文案，避免账号枚举（docs/06 §4.3 纪律）
    if (!user) throw new BusinessException(ErrorCodes.AUTH.BAD_CREDENTIALS);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new BusinessException(ErrorCodes.AUTH.LOGIN_LOCKED);
    }

    const passwordOk = await bcrypt.compare(dto.password, user.password);
    if (!passwordOk) {
      const fails = user.fails + 1;
      const lockedUntil =
        fails >= MAX_FAILS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000)
          : user.lockedUntil;
      await this.userRepo.update(user.id, { fails, lockedUntil });
      throw new BusinessException(ErrorCodes.AUTH.BAD_CREDENTIALS);
    }

    await this.userRepo.update(user.id, {
      fails: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      visits: user.visits + 1,
    });

    return this.issueTokens(user.id, user.account);
  }

  /** refresh 白名单轮换：旧 refresh 即时失效（单会话模型，多端共存随 P7 需求扩展） */
  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; account: string; jti: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken);
    } catch {
      throw new BusinessException(ErrorCodes.AUTH.REFRESH_TOKEN_INVALID);
    }
    if (payload.typ !== 'refresh')
      throw new BusinessException(ErrorCodes.AUTH.REFRESH_TOKEN_INVALID);

    const whitelist = await this.redis.get(whitelistKey(payload.sub));
    if (!whitelist || whitelist !== payload.jti) {
      throw new BusinessException(
        ErrorCodes.AUTH.REFRESH_TOKEN_INVALID,
        '登录已失效，请重新登录',
      );
    }
    return this.issueTokens(payload.sub, payload.account);
  }

  /** 登出：access jti 进 denylist（TTL=剩余有效期），删除 refresh 白名单 */
  async logout(user: JwtUser): Promise<void> {
    const remainSeconds = user.exp
      ? Math.max(user.exp - Math.floor(Date.now() / 1000), 1)
      : 300;
    await this.redis.set(denylistKey(user.jti), '1', remainSeconds);
    await this.redis.del(whitelistKey(user.id));
  }

  /** 当前用户 + 权限点（CurrentUserVo，docs/03 §4.0）；超管返回全量权限点供菜单渲染 */
  async me(userId: string): Promise<{
    id: string;
    account: string;
    realname: string;
    permissions: string[];
  }> {
    const user = await this.userRepo.findOne({
      where: { id: userId, deleted: 0 },
    });
    if (!user)
      throw new BusinessException(ErrorCodes.AUTH.TOKEN_INVALID, '用户不存在');
    const isSuper = await this.permCache.isSuper(userId);
    const permissions = isSuper
      ? await this.permCache.getAllActivePermKeys()
      : await this.permCache.getPermissions(userId);
    return {
      id: user.id,
      account: user.account,
      realname: user.realname || user.account,
      permissions,
    };
  }

  private async issueTokens(
    userId: string,
    account: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, account, jti: accessJti, typ: 'access' },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, account, jti: refreshJti, typ: 'refresh' },
      { expiresIn: REFRESH_TOKEN_TTL },
    );
    // refresh 白名单（docs/01 §10）：存当前有效 jti，7 天 TTL，登出/轮换时删除
    await this.redis.set(whitelistKey(userId), refreshJti, 7 * 24 * 3600);
    return { accessToken, refreshToken };
  }

  // 供策略注册（保留构造器注入路径一致）
  static readonly strategy = JwtStrategy;
}
