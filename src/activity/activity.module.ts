import { Module } from '@nestjs/common'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import { ReadingSessionsModule } from '@/reading-sessions/reading-sessions.module'

@Module({
  imports: [ReadingSessionsModule],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
