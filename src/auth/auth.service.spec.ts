import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '@/users/users.service'
import { AuthService } from './auth.service'
import type { OAuthProfile } from './auth.types'
import type { User } from '@/users/users.types'

describe('AuthService', () => {
  let service: AuthService
  let usersService: jest.Mocked<Pick<UsersService, 'create'>>
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>

  const profile: OAuthProfile = {
    providerId: 'google-123',
    provider: 'google',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
  }

  const user = {
    id: 'user-123',
  } as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { create: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    usersService = module.get(UsersService)
    jwtService = module.get(JwtService)
  })

  it('creates or retrieves a user from an OAuth profile', async () => {
    usersService.create.mockResolvedValue(user)

    await expect(service.authenticateOAuth(profile)).resolves.toEqual(user)
    expect(usersService.create).toHaveBeenCalledWith(profile)
  })

  it('propagates user creation errors during OAuth authentication', async () => {
    usersService.create.mockRejectedValue(new Error('user persistence failed'))

    await expect(service.authenticateOAuth(profile)).rejects.toThrow(
      'user persistence failed',
    )
  })

  it('generates a token containing the user id as the subject', () => {
    jwtService.sign.mockReturnValue('signed-token')

    expect(service.generateToken(user)).toBe('signed-token')
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-123' })
  })
})
