import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { BookDto } from '@/books/dto/book.dto'
import { WeeklyStatsDto } from '@/reading-sessions/dto/weekly-stats.dto'

export class DashboardDto {
  @ApiPropertyOptional({
    type: BookDto,
    description:
      'Currently active book. Omitted when none is marked as reading.',
  })
  currentlyReading?: BookDto

  @ApiProperty({
    type: BookDto,
    isArray: true,
    description: 'Most recent books touched by the user.',
  })
  recentActivity: BookDto[]

  @ApiProperty({
    type: BookDto,
    isArray: true,
    description: 'Most recent books finished by the user.',
  })
  lastCompleted: BookDto[]

  @ApiProperty({
    type: WeeklyStatsDto,
    description: 'Weekly reading summary for the current calendar week.',
  })
  weeklyStats: WeeklyStatsDto
}
