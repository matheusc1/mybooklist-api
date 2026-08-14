import { ApiProperty } from '@nestjs/swagger'

export class PagesByDayDto {
  @ApiProperty()
  day: string

  @ApiProperty()
  pages: number
}

export class WeeklyStatsDto {
  @ApiProperty({ type: PagesByDayDto, isArray: true })
  pagesByDay: PagesByDayDto[]

  @ApiProperty()
  totalPagesRead: number

  @ApiProperty()
  totalReadingMinutes: number

  @ApiProperty({ nullable: true })
  mostActiveDay: string | null

  @ApiProperty()
  daysStreak: number
}
