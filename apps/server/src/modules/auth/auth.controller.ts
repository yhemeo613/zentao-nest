import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto, RefreshDto } from './dto/auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '登录（双 token；失败 5 次锁 15 分钟）' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 access token（白名单轮换）' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: '登出（access 进 denylist + 删 refresh 白名单）' })
  logout(@CurrentUser() user: JwtUser) {
    return this.auth.logout(user);
  }

  @Get('me')
  @ApiOperation({ summary: '当前用户 + 权限点集合（CurrentUserVo）' })
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.id);
  }
}
