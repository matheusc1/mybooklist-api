import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20'
import type { OAuthProfile } from '../types'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    })
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName, photos } = profile
    const email = emails?.[0]?.value

    if (!email) {
      return done(
        new UnauthorizedException('Conta Google sem email público'),
        false,
      )
    }

    const user = {
      providerId: id,
      provider: 'google',
      email,
      name: displayName,
      avatarUrl: photos?.[0]?.value,
    } satisfies OAuthProfile

    done(null, user)
  }
}
