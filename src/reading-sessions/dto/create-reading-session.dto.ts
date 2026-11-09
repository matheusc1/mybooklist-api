import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsUUID,
  IsInt,
  Min,
  IsDateString,
  Matches,
  ValidateIf,
} from 'class-validator'

export class CreateReadingSessionDto {
  @ApiProperty({ description: 'Book identifier the session belongs to.' })
  @IsUUID()
  bookId: string

  @ApiProperty({
    description: 'Starting page of the reading interval.',
    minimum: 0,
    example: 120,
  })
  @IsInt()
  @Min(0)
  fromPage: number

  @ApiProperty({
    description: 'Ending page of the reading interval.',
    minimum: 0,
    example: 150,
  })
  @IsInt()
  @Min(0)
  toPage: number

  @ApiPropertyOptional({
    description: 'Date the reading happened. Defaults to today when omitted.',
    format: 'date',
    example: '2026-08-30',
  })
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'readAt must be in YYYY-MM-DD format',
  })
  @IsDateString({ strict: true })
  readAt?: string
}
