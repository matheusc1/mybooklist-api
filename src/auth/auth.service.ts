import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '@/users/users.service'
import type { OAuthProfile } from './types'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateOAuthLogin(profile: OAuthProfile) {
    const existingUser = await this.usersService.findByProvider(
      profile.provider,
      profile.providerId,
    )

    if (existingUser) {
      return existingUser
    }

    return this.usersService.create(profile)
  }

  generateToken(user: { id: string }) {
    return this.jwtService.sign({ sub: user.id })
  }
}
