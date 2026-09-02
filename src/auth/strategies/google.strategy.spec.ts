import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { GoogleStrategy } from './google.strategy'

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => `configured-${key}`),
          },
        },
      ],
    }).compile()

    strategy = module.get(GoogleStrategy)
  })

  it('maps a Google profile to an OAuth profile', () => {
    const done = jest.fn()
    const profile = {
      id: 'google-123',
      emails: [{ value: 'user@example.com' }],
      displayName: 'Test User',
      photos: [{ value: 'https://example.com/avatar.png' }],
    }

    strategy.validate('access-token', 'refresh-token', profile as never, done)

    expect(done).toHaveBeenCalledWith(null, {
      providerId: 'google-123',
      provider: 'google',
      email: 'user@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('rejects a Google profile without a public email', () => {
    const done = jest.fn()

    strategy.validate(
      'access-token',
      'refresh-token',
      { id: 'google-123', emails: [], displayName: 'Test User' } as never,
      done,
    )

    expect(done).toHaveBeenCalledWith(
      new UnauthorizedException('Google account has no public email.'),
      false,
    )
  })

  it('allows a Google profile without an avatar', () => {
    const done = jest.fn()

    strategy.validate(
      'access-token',
      'refresh-token',
      {
        id: 'google-123',
        emails: [{ value: 'user@example.com' }],
        displayName: 'Test User',
      } as never,
      done,
    )

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ avatarUrl: undefined }),
    )
  })
})
