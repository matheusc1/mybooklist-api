import { randomUUID } from 'node:crypto'
import { Body, Controller, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Public } from '@/auth/decorators/public.decorator'
import { AuthService } from '@/auth/auth.service'
import { CreateAndLoginDto } from './dto/create-and-login.dto'
import { UsersService } from '@/users/users.service'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

@Controller('test')
export class TestController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @Public()
  async createAndLogin(
    @Body() body: CreateAndLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.usersService.create({
      provider: 'google',
      providerId: `e2e-${body.suffix}-${randomUUID()}`,
      email: `e2e-${body.suffix}-${randomUUID()}@example.com`,
      name: `E2E ${body.suffix}`,
      avatarUrl: null,
      readingSpeed: body.readingSpeed === undefined ? 60 : body.readingSpeed,
    })

    const token = this.authService.generateToken(user)

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    })

    return user
  }
}
