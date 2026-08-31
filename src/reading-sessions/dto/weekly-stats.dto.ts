import { ApiProperty } from '@nestjs/swagger'

export class PagesByDayDto {
  @ApiProperty({ description: 'Day label in the current week.', example: 'Mon' })
  day: string

  @ApiProperty({ description: 'Pages read on this day.', example: 42 })
  pages: number
}

export class WeeklyStatsDto {
  @ApiProperty({
    type: PagesByDayDto,
    isArray: true,
    description: 'Pages read by weekday, ordered from Monday to Sunday.',
  })
  pagesByDay: PagesByDayDto[]

  @ApiProperty({ description: 'Total pages read this week.', example: 210 })
  totalPagesRead: number

  @ApiProperty({ description: 'Total reading time in minutes for the current week.', example: 180 })
  totalReadingMinutes: number

  @ApiProperty({
    description: 'Most active day by page count. Null when no pages were read this week.',
    nullable: true,
    example: 'Wed',
  })
  mostActiveDay: string | null

  @ApiProperty({ description: 'Current consecutive streak of read days.', example: 3 })
  daysStreak: number
}
