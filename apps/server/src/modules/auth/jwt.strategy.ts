import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { JwtUser } from '../../common/decorators/current-user.decorator.js';

export const ACCESS_TOKEN_TTL = '2h';
export const REFRESH_TOKEN_TTL = '7d';

interface JwtPayload {
  sub: string;
  account: string;
  jti: string;
  typ: 'access' | 'refresh';
  exp?: number;
}

/**
 * JWT 策略：payload 仅 {sub, account, jti, typ}（docs/01 §9 铁律，无角色/权限字段）。
 * 验签后检查 access denylist（登出/改密即时失效，docs/03 §8）。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') ?? 'dev-secret-do-not-use-in-prod',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (payload.typ !== 'access') {
      throw new BusinessException(
        ErrorCodes.AUTH.TOKEN_INVALID,
        '令牌类型错误',
      );
    }
    const denied = await this.redis.get(`token:denylist:${payload.jti}`);
    if (denied) {
      throw new BusinessException(ErrorCodes.AUTH.TOKEN_INVALID, '凭证已吊销');
    }
    return {
      id: payload.sub,
      account: payload.account,
      jti: payload.jti,
      typ: payload.typ,
      exp: payload.exp,
    };
  }
}
