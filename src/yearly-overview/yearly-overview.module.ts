import { Module } from '@nestjs/common'
import { BooksModule } from '@/books/books.module'
import { GoalsModule } from '@/goals/goals.module'
import { StatsModule } from '@/stats/stats.module'
import { YearlyOverviewController } from './yearly-overview.controller'
import { YearlyOverviewService } from './yearly-overview.service'

@Module({
  imports: [GoalsModule, StatsModule, BooksModule],
  controllers: [YearlyOverviewController],
  providers: [YearlyOverviewService],
})
export class YearlyOverviewModule {}
