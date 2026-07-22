import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '@/users/users.service'
import type { OAuthProfile } from './auth.types'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async authenticateOAuth(profile: OAuthProfile) {
    return this.usersService.create(profile)
  }

  generateToken(user: { id: string }) {
    return this.jwtService.sign({ sub: user.id })
  }
}
