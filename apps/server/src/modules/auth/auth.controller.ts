import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  ERRORS,
  enveloped,
  envelopedInline,
} from '../../common/swagger/swagger.helper.js';
import { AuthService } from './auth.service.js';
import {
  CurrentUserVo,
  LoginDto,
  RefreshDto,
  TokenPairVo,
} from './dto/auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '登录',
    description:
      '账密校验（bcrypt）→ 签发 access(2h) + refresh(7d, Redis 白名单)。连续失败 5 次锁定 15 分钟（2008）。',
  })
  @ApiOkResponse({
    description: '登录成功，返回双 token',
    schema: enveloped(TokenPairVo),
  })
  @ApiResponse({
    status: 400,
    description: '参数校验失败(3001)',
    schema: { example: ERRORS.badRequest },
  })
  @ApiResponse({
    status: 400,
    description: '账号或密码错误(2005)',
    schema: { example: ERRORS.unauthorized },
  })
  @ApiResponse({
    status: 429,
    description: '账号已锁定(2008)',
    schema: { example: ERRORS.unauthorized },
  })
  login(@Body() dto: LoginDto): Promise<TokenPairVo> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: '刷新访问令牌',
    description:
      '校验 refresh token（签名+白名单）→ 轮换签发新双 token；旧 refresh 即时失效（2007）。',
  })
  @ApiOkResponse({
    description: '轮换成功，返回新双 token',
    schema: enveloped(TokenPairVo),
  })
  @ApiResponse({
    status: 401,
    description: 'refresh 无效/已吊销(2007)',
    schema: { example: ERRORS.tokenInvalid },
  })
  refresh(@Body() dto: RefreshDto): Promise<TokenPairVo> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '登出',
    description:
      'access jti 进 denylist（TTL=剩余有效期）+ 删除 refresh 白名单。',
  })
  @ApiOkResponse({
    description: '登出成功，data=null',
    schema: envelopedInline({ nullable: true }),
  })
  @ApiResponse({
    status: 401,
    description: '未登录(2001)',
    schema: { example: ERRORS.unauthorized },
  })
  logout(@CurrentUser() user: JwtUser): Promise<void> {
    return this.auth.logout(user);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '当前用户信息',
    description: '返回用户 + 权限点集合（超管返回全部 active 权限点）。',
  })
  @ApiOkResponse({
    description: '当前用户（CurrentUserVo）',
    schema: enveloped(CurrentUserVo),
  })
  @ApiResponse({
    status: 401,
    description: '未登录(2001) 或用户不存在(2002)',
    schema: { example: ERRORS.unauthorized },
  })
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.id);
  }
}
