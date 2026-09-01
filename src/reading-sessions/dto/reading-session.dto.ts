import { ApiProperty } from '@nestjs/swagger'

export class ReadingSessionDto {
  @ApiProperty({ description: 'Unique reading session identifier.' })
  id: string

  @ApiProperty({ description: 'Book associated with the session.' })
  bookId: string

  @ApiProperty({
    description: 'Starting page of the reading interval.',
    minimum: 0,
    example: 120,
  })
  fromPage: number

  @ApiProperty({
    description: 'Ending page of the reading interval.',
    minimum: 0,
    example: 150,
  })
  toPage: number

  @ApiProperty({
    description:
      'Estimated duration, in seconds, based on the user reading speed at session creation.',
    example: 5400,
  })
  durationSeconds: number

  @ApiProperty({
    description: 'Date the reading happened. Format: YYYY-MM-DD.',
    format: 'date',
    example: '2026-08-30',
  })
  readAt: string

  @ApiProperty({
    description: 'When the record was created.',
    type: String,
    format: 'date-time',
  })
  createdAt: Date

  @ApiProperty({
    description: 'When the record was last updated.',
    type: String,
    format: 'date-time',
  })
  updatedAt: Date
}
