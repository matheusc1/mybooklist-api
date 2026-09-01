import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsUrl,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator'
import { statusEnum } from '@/database/schema/books.schema'

export class CreateBookDto {
  @ApiProperty({ description: 'Book title.' })
  @IsString()
  title: string

  @ApiProperty({ description: 'Book author name.' })
  @IsString()
  author: string

  @ApiProperty({ description: 'Primary genre or shelf label.' })
  @IsString()
  genre: string

  @ApiPropertyOptional({
    description: 'Optional cover image URL. Null when no cover is set.',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  coverUrl?: string | null

  @ApiProperty({
    description: 'Total number of pages in the book.',
    minimum: 1,
    example: 320,
  })
  @IsInt()
  @IsPositive()
  totalPages: number

  @ApiPropertyOptional({
    description: 'Current page progress. Defaults to 0 when omitted.',
    default: 0,
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentPage?: number

  @ApiProperty({
    enum: statusEnum.enumValues,
    description: 'Reading status for the book.',
    example: 'planned',
  })
  @IsEnum(statusEnum.enumValues)
  status: (typeof statusEnum.enumValues)[number]

  @ApiPropertyOptional({
    description: 'Optional rating from 0 to 5.',
    minimum: 0,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number

  @ApiPropertyOptional({
    description: 'Date the reading started. Format: YYYY-MM-DD.',
    format: 'date',
    example: '2026-08-31',
  })
  @IsOptional()
  @IsDateString()
  startedAt?: string

  @ApiPropertyOptional({
    description: 'Date the book was completed. Format: YYYY-MM-DD.',
    format: 'date',
    example: '2026-09-15',
  })
  @IsOptional()
  @IsDateString()
  completedAt?: string
}
