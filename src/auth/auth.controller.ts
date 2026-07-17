// auth.controller.ts
import {
  Controller,
  Get,
  InternalServerErrorException,
  Req,
  Res,
  UseGuards,
  UseFilters,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { GoogleAuthGuard } from './guards/google-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { AuthService } from './auth.service'
import { OAuthExceptionFilter } from './filters/oauth-exception.filter'
import type { OAuthProfile } from './types'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthExceptionFilter)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateOAuthLogin(
      req.user as OAuthProfile,
    )

    if (!user) {
      throw new InternalServerErrorException('Falha ao autenticar usuário')
    }

    const token = this.authService.generateToken(user)

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    })

    res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/home`)
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token')
    res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:5173')
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return req.user
  }
}
