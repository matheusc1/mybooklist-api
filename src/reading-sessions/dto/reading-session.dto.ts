import { ApiProperty } from '@nestjs/swagger'

export class ReadingSessionDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  bookId: string

  @ApiProperty()
  fromPage: number

  @ApiProperty()
  toPage: number

  @ApiProperty()
  durationSeconds: number

  @ApiProperty()
  readAt: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
