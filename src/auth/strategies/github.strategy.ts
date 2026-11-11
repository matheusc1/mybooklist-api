import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, type Profile } from 'passport-github2'
import type { OAuthProfile } from '../auth.types'
import { CookieStateStore } from '../oauth-state.store'

type GithubEmail = { value: string; primary?: boolean; verified?: boolean }

// With the user:email scope GitHub returns every address of the account, in no
// guaranteed order. Prefer the primary verified one. The email is profile data
// only: accounts are identified by (provider, providerId), never by email.
function pickEmail(emails: GithubEmail[] = []) {
  return (
    emails.find((email) => email.primary && email.verified) ??
    emails.find((email) => email.verified) ??
    emails[0]
  )?.value
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
      store: new CookieStateStore('github'),
    })
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: OAuthProfile) => void,
  ) {
    const { id, displayName, username, emails, photos } = profile
    const email = pickEmail(emails)

    if (!email) {
      return done(
        new UnauthorizedException('GitHub account has no email address.'),
        undefined,
      )
    }

    const user = {
      providerId: id,
      provider: 'github',
      email,
      // The GitHub profile name is optional, and users.name is NOT NULL.
      name: displayName || username || email,
      avatarUrl: photos?.[0]?.value,
    } satisfies OAuthProfile

    done(null, user)
  }
}
