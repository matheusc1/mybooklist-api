import { Test, TestingModule } from '@nestjs/testing'
import { ReadingSessionsController } from './reading-sessions.controller'

describe('ReadingSessionsController', () => {
  let controller: ReadingSessionsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadingSessionsController],
    }).compile()

    controller = module.get<ReadingSessionsController>(
      ReadingSessionsController,
    )
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
