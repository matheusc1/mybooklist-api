import {
  Controller,
  Get,
  InternalServerErrorException,
  Req,
  Res,
  UseGuards,
  UseFilters,
  HttpStatus,
  HttpCode,
  Post,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiFoundResponse,
} from '@nestjs/swagger'
import { GoogleAuthGuard } from './guards/google-auth.guard'
import { AuthService } from './auth.service'
import { OAuthExceptionFilter } from './filters/oauth-exception.filter'
import { Public } from './decorators/public.decorator'
import type { OAuthProfile } from './auth.types'
import { toPublicUser } from '@/users/users.mapper'
import type { User } from '@/users/users.types'
import { GithubAuthGuard } from './guards/github-auth.guard'
import { PublicUserDto } from '@/users/dto/public-user.dto'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Start Google OAuth login',
    description:
      'Redirects the browser to the Google consent screen. Must be opened directly in a browser, not testable via this API console.',
  })
  @ApiFoundResponse({ description: 'Redirects to Google.' })
  @Get('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Called by Google after consent. Sets an httpOnly session cookie and redirects to the frontend.',
  })
  @ApiFoundResponse({ description: 'Redirects to the frontend app.' })
  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthExceptionFilter)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res)
  }

  @ApiOperation({
    summary: 'Start GitHub OAuth login',
    description:
      'Redirects the browser to the GitHub consent screen. Must be opened directly in a browser, not testable via this API console.',
  })
  @ApiFoundResponse({ description: 'Redirects to GitHub.' })
  @Get('github')
  @Public()
  @UseGuards(GithubAuthGuard)
  githubLogin() {}

  @ApiOperation({
    summary: 'GitHub OAuth callback',
    description:
      'Called by GitHub after consent. Sets an httpOnly session cookie and redirects to the frontend.',
  })
  @ApiFoundResponse({ description: 'Redirects to the frontend app.' })
  @Get('github/callback')
  @Public()
  @UseGuards(GithubAuthGuard)
  @UseFilters(OAuthExceptionFilter)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res)
  }

  @ApiOperation({ summary: 'Log out' })
  @ApiOkResponse({ description: 'Clears the session cookie.' })
  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token')
    return { message: 'Logged out successfully' }
  }

  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'User not authenticated.' })
  @Get('me')
  me(@Req() req: Request) {
    return toPublicUser(req.user as User)
  }

  private async handleOAuthCallback(req: Request, res: Response) {
    const user = await this.authService.authenticateOAuth(
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
