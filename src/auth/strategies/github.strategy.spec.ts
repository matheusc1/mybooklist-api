import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { GithubStrategy } from './github.strategy'

describe('GithubStrategy', () => {
  let strategy: GithubStrategy

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GithubStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => `configured-${key}`),
          },
        },
      ],
    }).compile()

    strategy = module.get(GithubStrategy)
  })

  it('maps a GitHub profile to an OAuth profile', () => {
    const done = jest.fn()
    const profile = {
      id: 'github-123',
      emails: [{ value: 'user@example.com' }],
      displayName: 'Test User',
      photos: [{ value: 'https://example.com/avatar.png' }],
    }

    strategy.validate('access-token', 'refresh-token', profile as never, done)

    expect(done).toHaveBeenCalledWith(null, {
      providerId: 'github-123',
      provider: 'github',
      email: 'user@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('rejects a GitHub profile without a public email', () => {
    const done = jest.fn()

    strategy.validate(
      'access-token',
      'refresh-token',
      { id: 'github-123', emails: [], displayName: 'Test User' } as never,
      done,
    )

    expect(done).toHaveBeenCalledWith(
      new UnauthorizedException('Github account has no public email.'),
      undefined,
    )
  })
})
