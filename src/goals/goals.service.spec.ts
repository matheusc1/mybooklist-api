import { Test, TestingModule } from '@nestjs/testing'
import { GoalsService } from './goals.service'
import { GoalsRepository } from './goals.repository'
import { BooksService } from '@/books/books.service'

describe('GoalsService', () => {
  let service: GoalsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: GoalsRepository, useValue: {} },
        { provide: BooksService, useValue: {} },
      ],
    }).compile()

    service = module.get<GoalsService>(GoalsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
