import { Test, TestingModule } from '@nestjs/testing'
import { ReadingSessionsService } from './reading-sessions.service'

describe('ReadingSessionsService', () => {
  let service: ReadingSessionsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadingSessionsService],
    }).compile()

    service = module.get<ReadingSessionsService>(ReadingSessionsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
