import { Module } from '@nestjs/common'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import { StatsModule } from '@/stats/stats.module'

@Module({
  imports: [StatsModule],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
