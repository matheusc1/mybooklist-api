import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsUUID, IsInt, Min, IsOptional, IsDateString } from 'class-validator'

export class CreateReadingSessionDto {
  @ApiProperty()
  @IsUUID()
  bookId: string

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  fromPage: number

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  toPage: number

  @ApiPropertyOptional({
    description: 'Date the reading happened. Defaults to today if omitted.',
  })
  @IsOptional()
  @IsDateString()
  readAt?: string
}
