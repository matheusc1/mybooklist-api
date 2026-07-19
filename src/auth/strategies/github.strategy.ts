import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, type Profile } from 'passport-github2'
import type { OAuthProfile } from '../auth.types'

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    })
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: OAuthProfile) => void,
  ) {
    const { id, displayName, emails, photos } = profile
    const email = emails?.[0]?.value

    if (!email) {
      return done(
        new UnauthorizedException('Github account has no public email.'),
        undefined,
      )
    }

    const user = {
      providerId: id,
      provider: 'github',
      email,
      name: displayName,
      avatarUrl: photos?.[0]?.value,
    } satisfies OAuthProfile

    done(null, user)
  }
}
