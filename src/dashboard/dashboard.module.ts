import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
import { BooksModule } from '@/books/books.module'
import { StatsModule } from '@/stats/stats.module'

@Module({
  imports: [BooksModule, StatsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
