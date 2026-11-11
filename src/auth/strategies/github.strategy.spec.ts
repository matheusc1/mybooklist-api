import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { GithubStrategy } from './github.strategy'
import { CookieStateStore } from '../oauth-state.store'

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

  const buildProfile = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'github-123',
      displayName: 'Test User',
      username: 'testuser',
      emails: [{ value: 'user@example.com' }],
      photos: [{ value: 'https://example.com/avatar.png' }],
      ...overrides,
    }) as never

  const validate = (profile: never) => {
    const done = jest.fn()
    strategy.validate('access-token', 'refresh-token', profile, done)
    return done
  }

  it('maps a GitHub profile to an OAuth profile', () => {
    const done = validate(buildProfile())

    expect(done).toHaveBeenCalledWith(null, {
      providerId: 'github-123',
      provider: 'github',
      email: 'user@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('prefers the primary verified email', () => {
    const done = validate(
      buildProfile({
        emails: [
          { value: 'old@example.com', primary: false, verified: true },
          { value: 'main@example.com', primary: true, verified: true },
        ],
      }),
    )

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ email: 'main@example.com' }),
    )
  })

  it('prefers a verified email over an unverified one when none is primary', () => {
    const done = validate(
      buildProfile({
        emails: [
          { value: 'unverified@example.com', primary: false, verified: false },
          { value: 'verified@example.com', primary: false, verified: true },
        ],
      }),
    )

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ email: 'verified@example.com' }),
    )
  })

  it('falls back to the first email when none is verified', () => {
    const done = validate(
      buildProfile({
        emails: [
          { value: 'first@example.com', primary: false, verified: false },
          { value: 'second@example.com', primary: false, verified: false },
        ],
      }),
    )

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ email: 'first@example.com' }),
    )
  })

  it.each([
    [{ displayName: null }, 'testuser'],
    [{ displayName: '' }, 'testuser'],
    [{ displayName: undefined }, 'testuser'],
    [{ displayName: '', username: undefined }, 'user@example.com'],
  ])(
    'falls back when the profile has no display name %p',
    (overrides, name) => {
      const done = validate(buildProfile(overrides))

      expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ name }))
    },
  )

  it('rejects a GitHub profile without any email address', () => {
    const done = validate(buildProfile({ emails: [] }))

    expect(done).toHaveBeenCalledWith(
      new UnauthorizedException('GitHub account has no email address.'),
      undefined,
    )
  })

  it('is configured with the cookie state store', () => {
    const { _stateStore } = strategy as unknown as { _stateStore: unknown }

    expect(_stateStore).toBeInstanceOf(CookieStateStore)
  })
})
