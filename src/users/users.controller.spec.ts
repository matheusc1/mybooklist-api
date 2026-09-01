import { Test, TestingModule } from '@nestjs/testing'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import type { User } from './users.types'

describe('UsersController', () => {
  let controller: UsersController
  let usersService: jest.Mocked<Pick<UsersService, 'update'>>

  const authenticatedUser: User = {
    id: 'user-123',
    provider: 'google',
    providerId: 'google-123',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    readingSpeed: 90,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<UsersController>(UsersController)
    usersService = module.get(UsersService)
  })

  it('updates the reading speed for the authenticated user and returns a public profile', async () => {
    const dto = { readingSpeed: 120 }
    const updatedUser = { ...authenticatedUser, readingSpeed: 120 }
    usersService.update.mockResolvedValue(updatedUser)

    const result = await controller.updateReadingSpeed(authenticatedUser, dto)

    expect(result).toEqual({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      readingSpeed: updatedUser.readingSpeed,
    })
    expect(result).not.toHaveProperty('provider')
    expect(result).not.toHaveProperty('providerId')
    expect(usersService.update).toHaveBeenCalledWith(authenticatedUser.id, dto)
  })

  it('propagates service errors when reading speed update fails', async () => {
    usersService.update.mockRejectedValue(new Error('update failed'))

    await expect(
      controller.updateReadingSpeed(authenticatedUser, { readingSpeed: 120 }),
    ).rejects.toThrow('update failed')
  })
})
