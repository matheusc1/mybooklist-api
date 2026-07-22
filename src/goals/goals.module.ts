import { Module } from '@nestjs/common'
import { GoalsController } from './goals.controller'
import { GoalsService } from './goals.service'
import { DatabaseModule } from '@/database/database.module'
import { BooksModule } from '@/books/books.module'

@Module({
  imports: [DatabaseModule, BooksModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
