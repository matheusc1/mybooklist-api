import { Module } from '@nestjs/common'
import { BooksService } from './books.service'
import { BooksController } from './books.controller'
import { DatabaseModule } from '@/database/database.module'
import { DrizzleBooksRepository } from './books.drizzle-repository'
import { BooksRepository } from './books.repository'

@Module({
  imports: [DatabaseModule],
  providers: [
    BooksService,
    DrizzleBooksRepository,
    { provide: BooksRepository, useExisting: DrizzleBooksRepository },
  ],
  controllers: [BooksController],
  exports: [BooksService, DrizzleBooksRepository, BooksRepository],
})
export class BooksModule {}
