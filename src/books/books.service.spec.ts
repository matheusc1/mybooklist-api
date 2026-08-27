import { Test, TestingModule } from '@nestjs/testing'
import { BooksService } from './books.service'
import { BooksRepository } from './books.repository'

describe('BooksService', () => {
  let service: BooksService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BooksService, { provide: BooksRepository, useValue: {} }],
    }).compile()

    service = module.get<BooksService>(BooksService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
