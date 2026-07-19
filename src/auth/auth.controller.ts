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
import { AuthService } from './auth.service'
import { OAuthExceptionFilter } from './filters/oauth-exception.filter'
import { Public } from './decorators/public.decorator'
import type { OAuthProfile } from './auth.types'
import { toPublicUser } from '@/users/users.mapper'
import type { User } from '@/users/users.types'
import { GithubAuthGuard } from './guards/github-auth.guard'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthExceptionFilter)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res)
  }

  @Get('github')
  @Public()
  @UseGuards(GithubAuthGuard)
  githubLogin() {}

  @Get('github/callback')
  @Public()
  @UseGuards(GithubAuthGuard)
  @UseFilters(OAuthExceptionFilter)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res)
  }

  @Get('logout')
  @Public()
  logout(@Res() res: Response) {
    res.clearCookie('access_token')
    res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:5173')
  }

  @Get('me')
  me(@Req() req: Request) {
    return toPublicUser(req.user as User)
  }

  private async handleOAuthCallback(req: Request, res: Response) {
    const user = await this.authService.findOrCreateFromOAuth(
      req.user as OAuthProfile,
    )

    if (!user) {
      throw new InternalServerErrorException('Failed to authenticate user.')
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
}
