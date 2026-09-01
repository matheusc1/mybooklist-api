import { ApiProperty } from '@nestjs/swagger'
import { statusEnum } from '@/database/schema/books.schema'

export class BookDto {
  @ApiProperty({ description: 'Unique book identifier.' })
  id: string

  @ApiProperty({ description: 'Owner user identifier.' })
  userId: string

  @ApiProperty({ description: 'Book title.' })
  title: string

  @ApiProperty({ description: 'Book author.' })
  author: string

  @ApiProperty({ description: 'Reading category or genre.' })
  genre: string

  @ApiProperty({
    description: 'Cover image URL, or null if no cover was provided.',
    type: String,
    nullable: true,
    example: 'https://example.com/covers/book.jpg',
  })
  coverUrl: string | null

  @ApiProperty({
    description: 'Total number of pages in the book.',
    minimum: 1,
    example: 320,
  })
  totalPages: number

  @ApiProperty({
    description:
      'Current page progress. Practically defaults to 0 when the book is created without an explicit value.',
    default: 0,
    minimum: 0,
    example: 128,
  })
  currentPage: number

  @ApiProperty({
    enum: statusEnum.enumValues,
    description: 'Current reading status for the book.',
    example: 'reading',
  })
  status: (typeof statusEnum.enumValues)[number]

  @ApiProperty({
    description: 'Optional rating from 0 to 5.',
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 5,
    example: 4,
  })
  rating: number | null

  @ApiProperty({
    description: 'Date the reading started, if known.',
    type: String,
    nullable: true,
    format: 'date',
    example: '2026-08-01',
  })
  startedAt: string | null

  @ApiProperty({
    description: 'Date the book was completed, if applicable.',
    type: String,
    nullable: true,
    format: 'date',
    example: '2026-08-30',
  })
  completedAt: string | null

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
