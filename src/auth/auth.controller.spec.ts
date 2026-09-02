import { InternalServerErrorException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import type { OAuthProfile } from './auth.types'
import type { User } from '@/users/users.types'

describe('AuthController', () => {
  let controller: AuthController
  let authService: jest.Mocked<
    Pick<AuthService, 'authenticateOAuth' | 'generateToken'>
  >

  const user = {
    id: 'user-123',
    provider: 'google',
    providerId: 'google-123',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: null,
    readingSpeed: 90,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  } as User

  const profile: OAuthProfile = {
    providerId: 'google-123',
    provider: 'google',
    email: 'user@example.com',
    name: 'Test User',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            authenticateOAuth: jest.fn(),
            generateToken: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get(AuthService)
    delete process.env.FRONTEND_URL
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    delete process.env.FRONTEND_URL
    delete process.env.NODE_ENV
  })

  it('returns a public profile for the authenticated user', () => {
    expect(controller.me({ user } as never)).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      readingSpeed: user.readingSpeed,
    })
  })

  it('clears the access token cookie when logging out', () => {
    const response = { clearCookie: jest.fn() }

    expect(controller.logout(response as never)).toEqual({
      message: 'Logged out successfully',
    })
    expect(response.clearCookie).toHaveBeenCalledWith('access_token')
  })

  it('authenticates an OAuth callback, sets a cookie, and redirects home', async () => {
    process.env.FRONTEND_URL = 'https://app.example.com'
    process.env.NODE_ENV = 'production'
    authService.authenticateOAuth.mockResolvedValue(user)
    authService.generateToken.mockReturnValue('signed-token')
    const response = { cookie: jest.fn(), redirect: jest.fn() }

    await controller.googleCallback(
      { user: profile } as never,
      response as never,
    )

    expect(authService.authenticateOAuth).toHaveBeenCalledWith(profile)
    expect(authService.generateToken).toHaveBeenCalledWith(user)
    expect(response.cookie).toHaveBeenCalledWith(
      'access_token',
      'signed-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: expect.any(Number) as number,
      }),
    )
    expect(response.redirect).toHaveBeenCalledWith(
      'https://app.example.com/home',
    )
  })

  it('uses the local frontend URL by default for an OAuth callback', async () => {
    authService.authenticateOAuth.mockResolvedValue(user)
    authService.generateToken.mockReturnValue('signed-token')
    const response = { cookie: jest.fn(), redirect: jest.fn() }

    await controller.githubCallback(
      { user: profile } as never,
      response as never,
    )

    expect(response.redirect).toHaveBeenCalledWith('http://localhost:5173/home')
  })

  it('rejects an OAuth callback when authentication returns no user', async () => {
    authService.authenticateOAuth.mockResolvedValue(undefined as never)
    const response = { cookie: jest.fn(), redirect: jest.fn() }

    await expect(
      controller.googleCallback({ user: profile } as never, response as never),
    ).rejects.toThrow(
      new InternalServerErrorException('Failed to authenticate user.'),
    )
    expect(authService.generateToken).not.toHaveBeenCalled()
    expect(response.cookie).not.toHaveBeenCalled()
    expect(response.redirect).not.toHaveBeenCalled()
  })

  it('propagates OAuth service errors', async () => {
    authService.authenticateOAuth.mockRejectedValue(
      new Error('OAuth persistence failed'),
    )

    await expect(
      controller.githubCallback({ user: profile } as never, {} as never),
    ).rejects.toThrow('OAuth persistence failed')
  })
})
