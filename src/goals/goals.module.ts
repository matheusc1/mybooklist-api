import { Module } from '@nestjs/common'
import { GoalsController } from './goals.controller'
import { GoalsService } from './goals.service'
import { DatabaseModule } from '@/database/database.module'
import { BooksModule } from '@/books/books.module'
import { DrizzleGoalsRepository } from './goals.drizzle-repository'
import { GoalsRepository } from './goals.repository'

@Module({
  imports: [DatabaseModule, BooksModule],
  controllers: [GoalsController],
  providers: [
    GoalsService,
    DrizzleGoalsRepository,
    { provide: GoalsRepository, useExisting: DrizzleGoalsRepository },
  ],
})
export class GoalsModule {}
