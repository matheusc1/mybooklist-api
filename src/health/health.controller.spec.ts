import { ServiceUnavailableException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController
  let db: { execute: jest.Mock }
  let logError: jest.SpyInstance

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DATABASE_CONNECTION, useValue: { execute: jest.fn() } },
      ],
    }).compile()

    controller = module.get(HealthController)
    db = module.get<{ execute: jest.Mock }>(DATABASE_CONNECTION)
    logError = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reports ok when the database answers the probe', async () => {
    db.execute.mockResolvedValue(undefined)

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    })
    expect(db.execute).toHaveBeenCalledTimes(1)
    expect(logError).not.toHaveBeenCalled()
  })

  it('answers 503 and logs the failure when the database is unavailable', async () => {
    const failure = new Error('connection refused')
    db.execute.mockRejectedValue(failure)

    const error = await controller.check().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ServiceUnavailableException)
    expect((error as ServiceUnavailableException).getStatus()).toBe(503)
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      status: 'error',
      database: 'unavailable',
    })
    expect(logError).toHaveBeenCalledWith('Health check failed:', failure)
  })
})
