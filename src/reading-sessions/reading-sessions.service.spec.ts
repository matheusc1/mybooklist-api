import { Test, TestingModule } from '@nestjs/testing'
import { ReadingSessionsService } from './reading-sessions.service'
import { ReadingSessionsRepository } from './reading-sessions.repository'
import { BooksService } from '@/books/books.service'

describe('ReadingSessionsService', () => {
  let service: ReadingSessionsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingSessionsService,
        { provide: ReadingSessionsRepository, useValue: {} },
        { provide: BooksService, useValue: {} },
      ],
    }).compile()

    service = module.get<ReadingSessionsService>(ReadingSessionsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
