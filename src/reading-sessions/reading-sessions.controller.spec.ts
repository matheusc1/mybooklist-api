import { Test, TestingModule } from '@nestjs/testing'
import { ReadingSessionsController } from './reading-sessions.controller'
import { ReadingSessionsService } from './reading-sessions.service'
import type { User } from '@/users/users.types'

describe('ReadingSessionsController', () => {
  let controller: ReadingSessionsController
  let service: jest.Mocked<
    Pick<
      ReadingSessionsService,
      'findAll' | 'findOne' | 'create' | 'update' | 'delete'
    >
  >
  const user = { id: 'user-123' } as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadingSessionsController],
      providers: [
        {
          provide: ReadingSessionsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile()
    controller = module.get(ReadingSessionsController)
    service = module.get(ReadingSessionsService)
  })

  it('forwards the authenticated user when listing sessions', async () => {
    service.findAll.mockResolvedValue([])

    await controller.findAll(user)
    expect(service.findAll).toHaveBeenCalledWith('user-123')
  })

  it('forwards id and owner when finding a session', async () => {
    service.findOne.mockResolvedValue(undefined as never)

    await controller.findOne('session-123', user)

    expect(service.findOne).toHaveBeenCalledWith('session-123', 'user-123')
  })

  it('forwards the user and create DTO', async () => {
    const dto = { bookId: 'book-123', fromPage: 1, toPage: 5 }
    service.create.mockResolvedValue(undefined as never)

    await controller.create(user, dto)

    expect(service.create).toHaveBeenCalledWith(user, dto)
  })

  it('forwards id, user, and update DTO', async () => {
    const dto = { toPage: 20 }
    service.update.mockResolvedValue(undefined)

    await controller.update('session-123', user, dto)

    expect(service.update).toHaveBeenCalledWith('session-123', user, dto)
  })

  it('forwards the reset query option when deleting', async () => {
    service.delete.mockResolvedValue(undefined)

    await controller.delete('session-123', user, { resetToPlanned: true })

    expect(service.delete).toHaveBeenCalledWith('session-123', 'user-123', true)
  })

  it('propagates service errors', async () => {
    service.findOne.mockRejectedValue(new Error('session lookup failed'))

    await expect(controller.findOne('missing', user)).rejects.toThrow(
      'session lookup failed',
    )
  })
})
