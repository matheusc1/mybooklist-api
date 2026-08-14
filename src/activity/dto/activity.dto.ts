import { ApiProperty } from '@nestjs/swagger'
import { MonthlyStatsDto } from '@/reading-sessions/dto/monthly-stats.dto'
import { CalendarDayDto } from '@/reading-sessions/dto/monthly-activity.dto'

export class ActivityDto {
  @ApiProperty({ type: MonthlyStatsDto })
  monthlyStats: MonthlyStatsDto

  @ApiProperty({ type: CalendarDayDto, isArray: true })
  monthlyActivity: CalendarDayDto[]
}
