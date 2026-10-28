import { ApiProperty } from '@nestjs/swagger'
import { BookDto } from '../../books/dto/book.dto'
import { ReadingSessionDto } from '../../reading-sessions/dto/reading-session.dto'

export class BookDetailsStatsDto {
  @ApiProperty({
    description: 'Number of reading sessions recorded for this book.',
    example: 12,
  })
  sessions: number

  @ApiProperty({
    description: 'Total reading time for this book, in rounded minutes.',
    example: 540,
  })
  readingTime: number

  @ApiProperty({
    description: 'Number of distinct days with reading sessions for this book.',
    example: 9,
  })
  activeDays: number
}

export class BookDetailsDto {
  @ApiProperty({ type: BookDto, description: 'The requested book.' })
  book: BookDto

  @ApiProperty({
    type: ReadingSessionDto,
    isArray: true,
    description: 'All reading sessions recorded for the book.',
  })
  readingSessions: ReadingSessionDto[]

  @ApiProperty({
    type: BookDetailsStatsDto,
    description: 'On-demand reading statistics for the book.',
  })
  stats: BookDetailsStatsDto
}
