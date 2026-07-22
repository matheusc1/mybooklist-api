import { Module } from '@nestjs/common'
import { BooksService } from './books.service'
import { BooksController } from './books.controller'
import { DatabaseModule } from '@/database/database.module'

@Module({
  imports: [DatabaseModule],
  providers: [BooksService],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}
