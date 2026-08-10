import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
import { BooksModule } from '@/books/books.module'
import { ReadingSessionsModule } from '@/reading-sessions/reading-sessions.module'

@Module({
  imports: [BooksModule, ReadingSessionsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
