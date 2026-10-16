import { ApiProperty } from '@nestjs/swagger'

export class CalendarSessionDto {
  @ApiProperty({ description: 'Unique reading session identifier.' })
  id: string

  @ApiProperty({ description: 'Associated book identifier.' })
  bookId: string

  @ApiProperty({ description: 'Book title at the time of the session.' })
  title: string

  @ApiProperty({ description: 'Book author at the time of the session.' })
  author: string

  @ApiProperty({
    description: 'Cover image URL, if any, for the session book.',
    type: String,
    nullable: true,
  })
  coverUrl: string | null

  @ApiProperty({
    description: 'Starting page of the session.',
    minimum: 0,
    example: 120,
  })
  fromPage: number

  @ApiProperty({
    description: 'Ending page of the session.',
    minimum: 0,
    example: 150,
  })
  toPage: number

  @ApiProperty({
    description: 'Session length in minutes, rounded to the nearest minute.',
    example: 45,
  })
  duration: number
}

export class CalendarDayDto {
  @ApiProperty({
    description: 'Calendar date in YYYY-MM-DD format.',
    example: '2026-08-30',
  })
  date: string

  @ApiProperty({
    type: CalendarSessionDto,
    isArray: true,
    description: 'All reading sessions recorded for this day.',
  })
  sessions: CalendarSessionDto[]
}
