import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsUrl,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  Matches,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import { statusEnum } from '@/database/schema/books.schema'

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export class CreateBookDto {
  @ApiProperty({ description: 'Book title.', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  @ApiProperty({ description: 'Book author name.', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author: string

  @ApiProperty({
    description: 'Primary genre or shelf label.',
    maxLength: 255,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  genre: string

  @ApiPropertyOptional({
    description:
      'Optional free-form notes, annotations, summaries, analyses, or reviews. Maximum 5000 characters.',
    type: String,
    nullable: true,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null

  @ApiPropertyOptional({
    description: 'Optional cover image URL. Null when no cover is set.',
    type: String,
    nullable: true,
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  coverUrl?: string | null

  @ApiProperty({
    description: 'Total number of pages in the book.',
    minimum: 1,
    maximum: 100000,
    example: 320,
  })
  @IsInt()
  @IsPositive()
  @Max(100000)
  totalPages: number

  @ApiPropertyOptional({
    description: 'Current page progress. Defaults to 0 when omitted.',
    default: 0,
    minimum: 0,
    example: 0,
  })
  @ValidateIf((_, value) => value !== undefined)
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
  @Matches(DATE_ONLY, { message: 'startedAt must be in YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  startedAt?: string

  @ApiPropertyOptional({
    description: 'Date the book was completed. Format: YYYY-MM-DD.',
    format: 'date',
    example: '2026-09-15',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'completedAt must be in YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  completedAt?: string
}
