/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'
import type { NewUser, User } from './users.types'

describe('UsersService', () => {
  let service: UsersService
  let repository: jest.Mocked<UsersRepository>

  const mockUser: User = {
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
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            findByProvider: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    repository = module.get(UsersRepository)
  })

  it('finds a user by id through the repository', async () => {
    repository.findById.mockResolvedValue(mockUser)

    await expect(service.findById('user-123')).resolves.toEqual(mockUser)
    expect(repository.findById).toHaveBeenCalledWith('user-123')
  })

  it('finds a user by provider account through the repository', async () => {
    repository.findByProvider.mockResolvedValue(mockUser)

    await expect(
      service.findByProvider('google', 'google-123'),
    ).resolves.toEqual(mockUser)
    expect(repository.findByProvider).toHaveBeenCalledWith(
      'google',
      'google-123',
    )
  })

  it('creates a user through the repository', async () => {
    const data: NewUser = {
      provider: 'github',
      providerId: 'github-456',
      email: 'github-user@example.com',
      name: 'Github User',
      avatarUrl: null,
      readingSpeed: null,
    }

    repository.create.mockResolvedValue(mockUser)

    await expect(service.create(data)).resolves.toEqual(mockUser)
    expect(repository.create).toHaveBeenCalledWith(data)
  })

  it('updates a user through the repository', async () => {
    const updateData: Partial<NewUser> = { readingSpeed: 120 }
    const updatedUser = { ...mockUser, readingSpeed: 120 }
    repository.update.mockResolvedValue(updatedUser)

    await expect(service.update('user-123', updateData)).resolves.toEqual(
      updatedUser,
    )
    expect(repository.update).toHaveBeenCalledWith('user-123', updateData)
  })

  it('propagates errors thrown by the repository', async () => {
    repository.findById.mockRejectedValue(new Error('lookup failed'))

    await expect(service.findById('missing-user')).rejects.toThrow(
      'lookup failed',
    )
  })
})
