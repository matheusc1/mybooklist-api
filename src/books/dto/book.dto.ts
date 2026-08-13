import { ApiProperty } from '@nestjs/swagger'
import { statusEnum } from '@/database/schema/books.schema'

export class BookDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  userId: string

  @ApiProperty()
  title: string

  @ApiProperty()
  author: string

  @ApiProperty({ nullable: true })
  coverUrl: string | null

  @ApiProperty()
  totalPages: number

  @ApiProperty({ nullable: true })
  currentPage: number | null

  @ApiProperty({ enum: statusEnum.enumValues })
  status: (typeof statusEnum.enumValues)[number]

  @ApiProperty({ nullable: true, minimum: 0, maximum: 5 })
  rating: number | null

  @ApiProperty({ nullable: true })
  startedAt: string | null

  @ApiProperty({ nullable: true })
  completedAt: string | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
