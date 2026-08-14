import { ApiProperty } from '@nestjs/swagger'

export class CalendarSessionDto {
  @ApiProperty()
  bookId: string

  @ApiProperty()
  title: string

  @ApiProperty()
  author: string

  @ApiProperty({ nullable: true })
  coverUrl: string | null

  @ApiProperty()
  fromPage: number

  @ApiProperty()
  toPage: number

  @ApiProperty()
  duration: number
}

export class CalendarDayDto {
  @ApiProperty()
  date: string

  @ApiProperty({ type: CalendarSessionDto, isArray: true })
  sessions: CalendarSessionDto[]
}
