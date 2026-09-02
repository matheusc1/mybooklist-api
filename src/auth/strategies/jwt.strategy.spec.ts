import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from '@/users/users.service'
import { JwtStrategy } from './jwt.strategy'

describe('JwtStrategy', () => {
  let strategy: JwtStrategy
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('jwt-secret') },
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile()

    strategy = module.get(JwtStrategy)
    usersService = module.get(UsersService)
  })

  it('returns the user identified by the JWT subject', async () => {
    const user = { id: 'user-123' }
    usersService.findById.mockResolvedValue(user as never)

    await expect(strategy.validate({ sub: 'user-123' })).resolves.toEqual(user)
    expect(usersService.findById).toHaveBeenCalledWith('user-123')
  })

  it('rejects a token whose user no longer exists', async () => {
    usersService.findById.mockResolvedValue(undefined)

    await expect(strategy.validate({ sub: 'missing-user' })).rejects.toThrow(
      'User not found.',
    )
  })

  it('propagates user lookup errors', async () => {
    usersService.findById.mockRejectedValue(new Error('user lookup failed'))

    await expect(strategy.validate({ sub: 'user-123' })).rejects.toThrow(
      'user lookup failed',
    )
  })
})
