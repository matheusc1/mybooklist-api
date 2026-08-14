import { ApiProperty } from '@nestjs/swagger'
import { BookDto } from '@/books/dto/book.dto'
import { WeeklyStatsDto } from '@/reading-sessions/dto/weekly-stats.dto'

export class DashboardDto {
  @ApiProperty({ type: BookDto, nullable: true })
  currentlyReading: BookDto | null

  @ApiProperty({ type: BookDto, isArray: true })
  recentActivity: BookDto[]

  @ApiProperty({ type: BookDto, isArray: true })
  lastCompleted: BookDto[]

  @ApiProperty({ type: WeeklyStatsDto })
  weeklyStats: WeeklyStatsDto
}
